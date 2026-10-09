#!/usr/bin/env python3
"""cfs_zockt R11 cumulative, SHA-256 checked, no force overwrite, atomic rollback."""
import argparse,datetime,hashlib,json,os,pathlib,shutil,sys,tempfile
BASE=pathlib.Path(__file__).resolve().parent
MAN=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'))

def sha(p):
    with p.open('rb') as stream:
        digest=hashlib.sha256()
        for chunk in iter(lambda:stream.read(1<<20),b''):digest.update(chunk)
        return digest.hexdigest()

def resolve_site(candidate):
    p=pathlib.Path(candidate).expanduser().resolve()
    possibilities=[p,p/'cfs-zockt-Website-main']
    for t in possibilities:
        if (t/'server.js').is_file() and (t/'package.json').is_file() and (t/'public'/'pages'/'widget-studio.html').is_file():
            try:package=json.loads((t/'package.json').read_text(encoding='utf-8'))
            except (OSError,ValueError):continue
            if package.get('version')=='3.20.71' and package.get('name')=='cfs-zockt-creator-suite-web':return t
    raise ValueError('Website 3.20.71 nicht gefunden. Bitte den Ordner mit server.js + package.json wählen.')

def get_site(user):
    if user:return resolve_site(user.strip().strip('"'))
    print('Website-Ordner 3.20.71 eingeben (der Ordner mit server.js und public):')
    try:s=input('Pfad> ').strip().strip('"')
    except EOFError:raise ValueError('Kein Website-Ordner übergeben.')
    if not s:raise ValueError('Kein Ordner angegeben.')
    return resolve_site(s)

def compute(site,verify=False):
    rows=[]
    for entry in MAN['entries']:
        r=pathlib.PurePosixPath(entry['path'])
        if r.is_absolute() or '..' in r.parts or not r.parts:raise ValueError('Ungültiger Manifestpfad.')
        dest=site.joinpath(*r.parts)
        # Refuse symlink jumps; do not operate on a repository containing symlinked update paths.
        for part in [dest]+list(dest.parents):
            if part==site.parent:break
            if part.is_symlink():raise ValueError(f'Verknüpfter Zielpfad wird nicht überschrieben: {r}')
        source=BASE/'payload'/r
        if not source.is_file() or sha(source)!=entry['sha256']:raise ValueError(f'Payload beschädigt: {r}')
        if dest.exists():
            if not dest.is_file():rows.append((str(r),'KONFLIKT','Kein regulärer Dateipfad'))
            else:
                old=sha(dest)
                if old==entry['sha256']:rows.append((str(r),'AKTUELL',''))
                elif not verify and old in entry['accepted_prior_sha256']:rows.append((str(r),'UPDATE',''))
                else:rows.append((str(r),'KONFLIKT','Unbekannter Dateistand' if not verify else 'Datei stimmt nicht mit R11 überein'))
        else:
            if entry.get('create') and not verify:rows.append((str(r),'NEU',''))
            else:rows.append((str(r),'KONFLIKT','Datei fehlt'))
    return rows

def main():
    pa=argparse.ArgumentParser(description='cfs_zockt Website 3.20.71-R11 Gesamtupdate')
    group=pa.add_mutually_exclusive_group(required=True)
    group.add_argument('--check',action='store_true');group.add_argument('--apply',action='store_true');group.add_argument('--verify',action='store_true')
    pa.add_argument('--target',default='')
    args=pa.parse_args()
    try:site=get_site(args.target)
    except ValueError as e:print('FEHLER:',e);return 2
    try:rows=compute(site,verify=args.verify)
    except ValueError as e:print('SICHERHEITSSTOPP:',e);return 2
    from collections import Counter
    c=Counter(s for _,s,_ in rows)
    print('Website:',site,'\nPaket: cfs_zockt 3.20.71-R11','\nDateien:',len(rows),'· Neu:',c['NEU'],'· Update:',c['UPDATE'],'· Aktuell:',c['AKTUELL'],'· Konflikt:',c['KONFLIKT'])
    if c['KONFLIKT']:
        for r,s,msg in rows:
            if s=='KONFLIKT':print('KONFLIKT:',r,'-',msg)
        print('ABBRUCH: Nichts überschrieben. Bitte lokalen Dateistand gesondert abgleichen.')
        return 3
    if args.verify:
        print('OK – alle R11-Dateien mit SHA-256 bestätigt. Keine reale OBS- oder Beta-Abnahme.')
        return 0
    if args.check:
        for r,s,_ in rows:
            if s in ('NEU','UPDATE'):print(s+':',r)
        print('OK – installierbarer bekannter Versionsstand. Keine Dateien verändert.')
        return 0
    changes=[r for r,s,_ in rows if s in ('NEU','UPDATE')]
    if not changes:
        print('Bereits aktuell. Es wurde nichts verändert.');return 0
    stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
    backup=site.parent/'_cfs_zockt_update_backups'/f'R11-{stamp}'
    # One consistent write phase. Files in the site are only touched after full preflight.
    # Backups are outside site root so they cannot accidentally become public downloads.
    originals=[]; created=[]
    try:
        for r in changes:
            target=site/r
            if target.exists():
                orig=backup/r;orig.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(target,orig)
                originals.append((target,orig))
            else:created.append(target)
        for r in changes:
            dest=site/r;src=BASE/'payload'/r;dest.parent.mkdir(parents=True,exist_ok=True)
            fd,tmp=tempfile.mkstemp(prefix='.cfs-r11-',dir=str(dest.parent))
            try:
                with os.fdopen(fd,'wb') as f:f.write(src.read_bytes());f.flush();os.fsync(f.fileno())
                os.replace(tmp,dest)
            finally:
                if os.path.exists(tmp):os.unlink(tmp)
        rows=compute(site,verify=True)
        if any(s=='KONFLIKT' for _,s,_ in rows):raise RuntimeError('Prüfsummenvergleich nach Einbau fehlgeschlagen.')
    except Exception as exc:
        print('FEHLER beim Einspielen:',str(exc),'– Wiederherstellung wird versucht.')
        for dest,orig in reversed(originals):
            try:shutil.copy2(orig,dest)
            except OSError as e:print('Wiederherstellung fehlgeschlagen:',dest,str(e))
        for dest in reversed(created):
            try:dest.unlink(missing_ok=True)
            except OSError as e:print('Neu angelegte Datei konnte nicht entfernt werden:',dest,str(e))
        return 4
    print('OK –',len(changes),'Dateien installiert. Backup unter:',backup if originals else 'keine bestehenden Dateien ersetzt')
    print('Hinweis: Browser Strg+F5. OBS/Launcher und Beta-Prüfungen weiterhin manuell.')
    return 0
if __name__=='__main__':sys.exit(main())
