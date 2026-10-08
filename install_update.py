#!/usr/bin/env python3
"""Preflighted SHA256 installer, with backups and conflict protection."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
import sys
import uuid

HERE=Path(__file__).resolve().parent

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def build_plan(root, files):
    if not (root/'app'/'main.py').is_file() or not (root/'app'/'template_factory.py').is_file() or not (root/'app'/'ollama_client.py').is_file():
        raise RuntimeError('CFS AI Hauptordner nicht erkannt (app/main.py, app/template_factory.py, app/ollama_client.py fehlen).')
    plan=[]
    for entry in files:
        name=entry['path']
        rel=Path(name)
        if rel.is_absolute() or not rel.parts or any(part in {'.','..'} for part in rel.parts):
            raise RuntimeError('Unsicherer Pfad im Manifest.')
        dest=(root/rel).resolve()
        if root.resolve() not in dest.parents:
            raise RuntimeError('Zieldatei liegt außerhalb des CFS-AI-Ordners.')
        payload=HERE/'payload'/rel
        if not payload.is_file() or digest(payload)!=entry['after_sha256']:
            raise RuntimeError('Update-Payload fehlt oder ist beschädigt: '+name)
        current=digest(dest) if dest.is_file() else None
        status='unchanged' if current==entry['after_sha256'] else 'pending' if current==entry['before_sha256'] else 'CONFLICT'
        plan.append((name,payload,dest,status))
    return plan

def main():
    parser=argparse.ArgumentParser(description='CFS AI Design Factory 3.20.69 installieren')
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--check',action='store_true')
    group.add_argument('--apply',action='store_true')
    parser.add_argument('project_dir',type=Path)
    args=parser.parse_args()
    try:
        root=args.project_dir.resolve(strict=True)
        manifest=json.loads((HERE/'manifest.json').read_text(encoding='utf-8'))
        if manifest.get('format')!=1 or len(manifest.get('files',[]))!=5:
            raise RuntimeError('Ungültiges Manifest.')
        plan=build_plan(root,manifest['files'])
        for name,_,_,status in plan:
            print(f'{status:9s} {name}')
        if any(status=='CONFLICT' for _,_,_,status in plan):
            raise RuntimeError('Abgebrochen: geänderte oder unerwartete Dateien werden nicht überschrieben.')
        if args.check:
            print('Preflight OK. Ausstehend:',sum(status=='pending' for _,_,_,status in plan))
            return 0
        changed=[(name,payload,dest) for name,payload,dest,status in plan if status=='pending']
        if not changed:
            print('Bereits installiert. 0 Änderungen.')
            return 0
        stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+uuid.uuid4().hex[:6]
        backup=root/'data'/'update-backups'/'design-factory-v32069'/stamp
        original={}
        for name,_,dest in changed:
            if dest.exists():
                target=backup/name
                target.parent.mkdir(parents=True,exist_ok=True)
                shutil.copy2(dest,target)
                original[name]=target
            else:
                original[name]=None
        written=[]
        try:
            for name,payload,dest in changed:
                dest.parent.mkdir(parents=True,exist_ok=True)
                tmp=dest.with_name('.'+dest.name+'.'+uuid.uuid4().hex+'.tmp')
                try:
                    shutil.copy2(payload,tmp)
                    tmp.replace(dest)
                finally:
                    tmp.unlink(missing_ok=True)
                written.append((name,dest))
        except Exception:
            for name,dest in reversed(written):
                if original[name] is None:
                    dest.unlink(missing_ok=True)
                else:
                    shutil.copy2(original[name],dest)
            raise
        print(f'Installiert: {len(written)} Dateien. Backup:',backup)
        print('CFS AI nach dem Update neu starten. Keine Auto-Veröffentlichung aktiviert.')
        return 0
    except (ValueError,OSError,RuntimeError,KeyError) as exc:
        print('ERROR:',exc,file=sys.stderr)
        return 1
if __name__=='__main__':sys.exit(main())
