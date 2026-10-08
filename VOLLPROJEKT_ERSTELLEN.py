#!/usr/bin/env python3
"""Rekonstruiert Website 3.20.68 aus Code-Paket + bereits vorhandenem Originaldesignarchiv.
Schreibt ausschliesslich in einen NEUEN Zielordner, nie in den produktiven Webroot.
"""
import argparse
import hashlib
import json
import shutil
import stat
import sys
import zipfile
from pathlib import Path, PurePosixPath

ROOT=Path(__file__).resolve().parent
ARCHIVE=ROOT/'01-Website'/'CFS-Zockt-Website-Code-v3.20.68.zip'
EXPECTED_ORIGINAL_SHA256='ed07b455972eebb320d0210eca6729e6478ad363573213006415e70fb7381f4b'
EXPECTED_ORIGINAL_NAME='Streaming-Gesamtpaket-31-Designs-496-Farbvarianten-Animiert-DE.zip'

def file_hash(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for buf in iter(lambda:f.read(1024*1024),b''):h.update(buf)
    return h.hexdigest()

def verify_code_archive():
    manifest=json.loads((ROOT/'RELEASE-MANIFEST.json').read_text(encoding='utf8'))
    row=next(item for item in manifest['files'] if item['path'].endswith('Website-Code-v3.20.68.zip'))
    if ARCHIVE.stat().st_size!=row['bytes'] or file_hash(ARCHIVE)!=row['sha256']:
        raise RuntimeError('Website-Code-Archiv passt nicht zur SHA-256-Paketliste.')

def extract_safe(z,root):
    for info in z.infolist():
        p=PurePosixPath(info.filename)
        parts=p.parts
        if not parts or p.is_absolute() or any(x in ('','..','.') for x in parts) or ':' in info.filename or chr(92) in info.filename:
            raise RuntimeError('Unsicherer ZIP-Pfad.')
        if len(parts)<2 or parts[0]!='cfs-zockt-Website-main':
            raise RuntimeError('Unerwarteter Projektpfad.')
        mode=info.external_attr>>16
        if stat.S_ISLNK(mode):raise RuntimeError('Symlinks werden nicht entpackt.')
        dst=root.joinpath(*parts)
        if not dst.resolve().is_relative_to(root.resolve()):raise RuntimeError('Dateipfad verlaesst Zielordner.')
        if info.is_dir():dst.mkdir(parents=True,exist_ok=True);continue
        dst.parent.mkdir(parents=True,exist_ok=True)
        with z.open(info) as inp,dst.open('xb') as fout:shutil.copyfileobj(inp,fout,1024*1024)


def main():
    cli=argparse.ArgumentParser(description='Website-Code v3.20.68 mit Originaldesign-Archiv zusammenfuehren')
    cli.add_argument('--design-archiv',type=Path,required=True)
    cli.add_argument('--ziel',type=Path,help='NEUER, bisher nicht existierender Zielordner')
    cli.add_argument('--check',action='store_true',help='Nur Dateien pruefen; nichts extrahieren')
    args=cli.parse_args()
    design=args.design_archiv.expanduser().resolve()
    if not design.is_file():raise RuntimeError('Originaldesignarchiv nicht gefunden.')
    if design.name!=EXPECTED_ORIGINAL_NAME:raise RuntimeError('Unerwarteter Originaldesign-Dateiname.')
    if file_hash(design)!=EXPECTED_ORIGINAL_SHA256:raise RuntimeError('Originaldesignarchiv stimmt nicht mit dem gelieferten Stand ueberein.')
    verify_code_archive()
    print('OK: Website-Code- und Originaldesignarchiv erfolgreich geprueft.')
    if args.check:return
    if args.ziel is None:cli.error('--ziel ist ohne --check erforderlich')
    dest=args.ziel.expanduser().resolve()
    if dest.exists():raise RuntimeError('Zielordner existiert bereits; kein Ueberschreiben!')
    dest.mkdir(parents=True,exist_ok=False)
    try:
        with zipfile.ZipFile(ARCHIVE,'r') as z:extract_safe(z,dest)
        target=dest/'cfs-zockt-Website-main'/'resources'/'original-designs'/EXPECTED_ORIGINAL_NAME
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(design,target)
        platzhalter=target.parent/'ORIGINALDESIGNS-HIER-EINFUEGEN.txt'
        if platzhalter.exists():platzhalter.unlink()
        if file_hash(target)!=EXPECTED_ORIGINAL_SHA256:raise RuntimeError('Kopiervorgang fehlgeschlagen: Originaldesignarchiv-Pruefsumme falsch.')
        if not (dest/'cfs-zockt-Website-main'/'server.js').is_file():raise RuntimeError('server.js fehlt im rekonstruierten Website-Projekt.')
        print('FERTIG:',dest/'cfs-zockt-Website-main')
        print('Nur Staging-Quellcode: noch NICHT live deployed.')
    except Exception:
        shutil.rmtree(dest,ignore_errors=True)
        raise

if __name__=='__main__':
    try:main()
    except Exception as exc:
        print('FEHLER:',exc,file=sys.stderr)
        sys.exit(1)
