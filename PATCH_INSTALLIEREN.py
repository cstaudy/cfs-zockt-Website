#!/usr/bin/env python3
"""Sicheres, auf exakt einen CFS Website Upload zugeschnittenes Dateiergaenzungs-Update.
Kein Deployment, keine Netzwerkanfragen, kein geloeschter Projektcode.
"""
import argparse, hashlib, json, os, shutil, sys, tempfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
HERE=Path(__file__).resolve().parent
PATCH=HERE/'ZUM-EINFUEGEN'
MANIFEST=HERE/'PATCH-MANIFEST.json'
def file_hash(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):
            h.update(block)
    return h.hexdigest()
def inside(root, rel):
    p=PurePosixPath(rel)
    if p.is_absolute() or not p.parts or any(x in {'','..','.'} for x in p.parts):raise RuntimeError('Ungueltiger Dateipfad: '+rel)
    dest=root.joinpath(*p.parts)
    here=dest
    while here != root:
        if here.is_symlink():raise RuntimeError('Symlink verboten: '+str(here))
        here=here.parent
    if root.is_symlink():raise RuntimeError('Website-Ordner ist ein Symlink')
    return dest
def run():
    ap=argparse.ArgumentParser(description='CFS Zockt 3.20.71 fehlende Website-Dateien ergaenzen')
    ap.add_argument('mode',choices=['check','apply'])
    ap.add_argument('website_ordner')
    ap.add_argument('--designarchiv',default='')
    args=ap.parse_args([sys.argv[1].lstrip('-'),*sys.argv[2:]] if len(sys.argv)>1 else None)
    root=Path(args.website_ordner).expanduser().absolute()
    if not root.is_dir() or root.is_symlink():raise RuntimeError('Website-Ordner nicht vorhanden oder Symlink')
    pkg=json.loads((root/'package.json').read_text('utf-8'))
    if pkg.get('name')!='cfs-zockt-creator-suite-web' or pkg.get('version')!='3.20.71':
        raise RuntimeError('Falsche Website oder falsche Version; erwartet CFS 3.20.71')
    manifest=json.loads(MANIFEST.read_text('utf-8'))
    pending=[]
    for item in manifest['files']:
        dest=inside(root,item['path']);source=PATCH.joinpath(*PurePosixPath(item['path']).parts)
        if not source.is_file() or file_hash(source)!=item['sha256']:
            raise RuntimeError('Paket-Datei fehlt oder ist beschaedigt: '+item['path'])
        if dest.exists():
            if not dest.is_file():raise RuntimeError('Ziel ist keine Datei: '+item['path'])
            h=file_hash(dest)
            if h==item['sha256']:continue
            if h!=item['original_sha256']:
                raise RuntimeError('DATEIKONFLIKT: '+item['path']+' (eigene Aenderung, kein automatisches Ueberschreiben)')
        elif item['status']!='fehlend':
            raise RuntimeError('Erwartete Originaldatei fehlt: '+item['path'])
        pending.append((item,source,dest))
    design=manifest['design_archive']
    design_dest=inside(root,design['path'])
    have_design=design_dest.is_file() and file_hash(design_dest)==design['sha256']
    design_src=None
    if args.designarchiv:
        design_src=Path(args.designarchiv).expanduser().absolute()
        if not design_src.is_file() or file_hash(design_src)!=design['sha256']:
            raise RuntimeError('Designarchiv fehlt oder SHA-256 ungueltig')
        if design_dest.exists() and not have_design:
            raise RuntimeError('Am Designarchiv-Ziel liegt schon eine andere Datei; bitte manuell pruefen.')
    elif design_dest.exists() and not have_design:
        raise RuntimeError('Das Originaldesignarchiv ist vorhanden, aber weicht vom erwarteten Hash ab.')
    print('Website: CFS 3.20.71')
    print('Ergaenzungen/Aktualisierungen offen:',len(pending),'von',len(manifest['files']))
    print('Originaldesigns:', 'OK' if have_design else 'FEHLEN (bereits vorhandenes ZIP bitte extra hinzufuegen)')
    if not args.designarchiv and not have_design:
        print('TIPP: mit --designarchiv "Pfad zur Originaldesign-ZIP" direkt ergaenzen.')
    if args.mode=='check':
        print('PRUEFUNG BESTANDEN: Es wurde nichts geaendert.');return
    if not pending and (have_design or not design_src):
        print('Keine weiteren Website-Code-Aenderungen notwendig.');return
    backup_root=root.parent/(root.name+'-PATCH-BACKUPS')/('3.20.71-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    backup_root.mkdir(parents=True,exist_ok=False)
    completed=[]
    try:
        for item,src,dst in pending:
            before=dst.read_bytes() if dst.exists() else None
            if before is not None:
                backup=backup_root.joinpath(*PurePosixPath(item['path']).parts)
                backup.parent.mkdir(parents=True,exist_ok=True); backup.write_bytes(before)
            dst.parent.mkdir(parents=True,exist_ok=True)
            # atomic replace to prevent half-written files
            tmp=dst.with_name(dst.name+'.cfs-patch.tmp')
            shutil.copyfile(src,tmp);os.replace(tmp,dst)
            completed.append((dst,before))
        if design_src and not have_design:
            design_dest.parent.mkdir(parents=True,exist_ok=True)
            tmp=design_dest.with_name(design_dest.name+'.cfs-patch.tmp')
            with open(design_src,'rb') as r,open(tmp,'wb') as w:
                shutil.copyfileobj(r,w,length=4*1024*1024)
            if file_hash(tmp)!=design['sha256']:raise RuntimeError('Designarchiv-Pruefsumme bei Kopie falsch')
            os.replace(tmp,design_dest)
            completed.append((design_dest,None))
        (backup_root/'aenderungen.json').write_text(json.dumps({'files':[x[0]['path'] for x in pending],'design_kopiert':bool(design_src and not have_design)},indent=2),encoding='utf-8')
    except Exception:
        for dst,before in reversed(completed):
            try:
                if before is None:dst.unlink(missing_ok=True)
                else:dst.write_bytes(before)
            except Exception as exc:print('WARNUNG: Ruecksetzen misslungen:',dst,exc,file=sys.stderr)
        raise
    print('INSTALLATION ERFOLGREICH. Aktualisierte Dateien:',len(pending))
    print('Sicherung unter:',backup_root)
    print('Als naechstes im Website-Ordner: npm run check:v32071')
if __name__=='__main__':
    try:run()
    except Exception as exc:print('ABBRUCH:',exc,file=sys.stderr);sys.exit(1)
