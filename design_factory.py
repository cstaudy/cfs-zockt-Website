#!/usr/bin/env python3
"""CFS AI background design factory. Local, review-first; no website auto-publication.

Python 3.10+ standard library only. The website source folder is passed explicitly.
The worker calls the EXISTING CFS AI /api/chat route, never pretends to be a model.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone, timedelta
from html import escape
import json
import os
from pathlib import Path
import random
import re
import sys
import time
import urllib.error
import urllib.request
import uuid
import zipfile
from xml.etree import ElementTree as ET
import threading

from .config import ROOT

SCHEMA = 1
CATEGORIES = ('scifi', 'premium', 'fantasy', 'nature', 'retro', 'sport', 'atmo')
ELEMENTS = ('starting', 'pause', 'ending', 'gameplay', 'camera', 'alert', 'panel')
CAT_LABELS = dict(zip(CATEGORIES, ('Sci-Fi & Tech', 'Premium & Elegant', 'Fantasy & Abenteuer',
                                   'Natur & Organisch', 'Retro & Pixel', 'Sport & Action', 'Atmosphäre & Mood')))
HEX = re.compile(r'^#[0-9a-fA-F]{6}$')
DESIGN_ID = re.compile(r'^[a-f0-9]{32}$')
CHAT_LIMIT = 12 * 1024


def utcnow():
    return datetime.now(timezone.utc)


def iso():
    return utcnow().isoformat(timespec='seconds')


def atomic_write(path: Path, contents: bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name('.' + path.name + '.' + uuid.uuid4().hex + '.tmp')
    try:
        with open(temporary, 'xb') as f:
            f.write(contents)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def save_json(path: Path, value):
    atomic_write(path, (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))


def load_json(path: Path, default=None):
    if not path.is_file():
        return default
    return json.loads(path.read_text(encoding='utf-8'))


def paths(root: Path):
    return {
        'drafts': root / 'data' / 'cfs-ai-design-factory' / 'drafts',
        'state': root / 'data' / 'cfs-ai-design-factory' / 'worker-state.json',
        'log': root / 'data' / 'cfs-ai-design-factory' / 'worker.log',
        'lock': root / 'data' / 'cfs-ai-design-factory' / 'worker.lock',
        'catalog': root / 'data' / 'cfs-ai-design-factory' / 'export' / 'public' / 'assets' / 'data' / 'cfs-ai-designs-v32068.json',
        'assets': root / 'data' / 'cfs-ai-design-factory' / 'export' / 'public' / 'assets' / 'ai-generated',
        'settings': root / 'data' / 'cfs-ai-design-factory' / 'settings.json',
    }


def log(path: Path, message: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('a', encoding='utf-8') as file:
        file.write(f'{iso()} · {message[:500]}\n')
    if path.stat().st_size > 400_000:
        atomic_write(path, path.read_bytes()[-150_000:])


def blueprint_prompt(hint: str, prior_names: list[str]):
    return ("Du bist CFS AI Design Factory. Erstelle EINEN NEUEN, EIGENSTÄNDIGEN Designentwurf "
            "für ein Streaming-Grafikpaket, nicht eine Kopie bestehender Designwelten. "
            "Gib AUSSCHLIESSLICH ein JSON-Objekt aus, ohne Markdown und ohne Erklärungen: "
            '{"name":"...","description":"...","category":"scifi",'
            '"colors":["#112233","#22aaff","#ffffff"],"seed":123456,"motif":"orbits"}. '
            "category muss einer von scifi,premium,fantasy,nature,retro,sport,atmo sein. "
            "motif muss einer von orbits,grid,crystal,lines,waves,beams sein. "
            "Name höchstens 48 Zeichen, Beschreibung höchstens 160 Zeichen; "
            "Farben mit gutem Kontrast. Keine Marken, Logos, urheberrechtlich geschützten Figuren, "
            "Live-Zahlen oder Versprechen. Keine eingebetteten Bilder, Links, Skripte oder Dateien. "
            f"Bereits vorhandene Entwürfe: {json.dumps(prior_names[-25:], ensure_ascii=False)}. "
            f"Kreative Richtung: {json.dumps(hint[:280], ensure_ascii=False)}")


def parse_ai_json(response: dict):
    if not isinstance(response, dict):
        raise ValueError('CFS AI lieferte kein JSON-Objekt.')
    if all(key in response for key in ('name','description','category','colors','seed','motif')):
        return response
    raw = response.get('answer') or response.get('response') or response.get('text')
    if isinstance(raw, dict):
        return raw
    if not isinstance(raw, str) or len(raw) > CHAT_LIMIT:
        raise ValueError('CFS AI lieferte keine unterstützte Textantwort.')
    text = raw.strip()
    if text.startswith('```'):
        text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.I).rstrip('`').strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find('{'), text.rfind('}')
        if start < 0 or end < start:
            raise ValueError('CFS AI lieferte kein JSON-Design.')
        return json.loads(text[start:end + 1])


def clean_blueprint(raw):
    if not isinstance(raw, dict):
        raise ValueError('Design muss ein JSON-Objekt sein.')
    name = ' '.join(str(raw.get('name') or '').split())[:48]
    description = ' '.join(str(raw.get('description') or '').split())[:160]
    if len(name) < 3 or not re.fullmatch(r'[\wÄÖÜäöüß -]{3,48}', name, flags=re.U):
        raise ValueError('Ungültiger Designname.')
    if len(description) < 8:
        raise ValueError('Designbeschreibung fehlt.')
    category = str(raw.get('category') or '').lower()
    motif = str(raw.get('motif') or '').lower()
    if category not in CATEGORIES or motif not in ('orbits', 'grid', 'crystal', 'lines', 'waves', 'beams'):
        raise ValueError('Designstil oder Motiv ist nicht freigegeben.')
    colors = raw.get('colors')
    if not isinstance(colors, list) or len(colors) != 3 or not all(isinstance(x, str) and HEX.fullmatch(x) for x in colors):
        raise ValueError('Genau drei gültige Hex-Farben nötig.')
    try:
        seed = int(raw.get('seed'))
    except (ValueError, TypeError):
        raise ValueError('Design-Seed muss numerisch sein.')
    if not 0 <= seed <= 2 ** 31 - 1:
        raise ValueError('Seed außerhalb des erlaubten Bereichs.')
    if colors[0].lower() == colors[1].lower():
        raise ValueError('Akzent und Hintergrund müssen unterschiedlich sein.')
    return {'name': name, 'description': description, 'category': category,
            'colors': [c.lower() for c in colors], 'seed': seed, 'motif': motif}


def call_cfs_ai(message: str, base_url: str = "internal-ollama", token: str = "", timeout: int = 100):
    """Use the installed CFS AI Ollama client directly: no loopback HTTP server required."""
    from .ollama_client import chat_json
    from .template_factory import template_catalog
    seeds = template_catalog("overlays")[:4]
    context = "; ".join(f"{row['title']}: {row['focus']}" for row in seeds)
    result = chat_json([
        {"role": "system", "content": "Du bist CFS AI Design Factory. Erfinde ein neues Stream-Design. "
         "Antworte ausschließlich als strukturiertes JSON ohne Code, Markennamen oder Live-Zahlen. "
         "Erstelle keine Kopien vorhandener Designs. Priorisiere ruhige Lesbarkeit in 16:9 und 9:16, "
         "kontrollierte Akzentfarben und OBS-taugliche Statik."},
        {"role": "user", "content": message + "\n\nBestehende Template-Factory-Archetypen nur als Qualitätskontext: " + context}
    ])
    if not isinstance(result, dict):
        raise ValueError("CFS AI lieferte kein JSON-Objekt.")
    return result


def svg_art(blueprint, kind: str):
    if kind not in ELEMENTS and kind != 'preview':
        raise ValueError('Unbekannter Grafiktyp.')
    w, h = {'preview': (1280, 720), 'starting': (1920, 1080), 'pause': (1920, 1080),
            'ending': (1920, 1080), 'gameplay': (1920, 1080), 'camera': (960, 540),
            'alert': (900, 320), 'panel': (640, 300)}[kind]
    bg, ac, fg = blueprint['colors']
    rng = random.Random(blueprint['seed'] + sum(ord(c) for c in kind))
    motif = blueprint['motif']
    title = escape(blueprint['name'])
    kind_title = {'preview': 'STREAM STARTET', 'starting': 'STREAM STARTET', 'pause': 'GLEICH ZURÜCK',
                  'ending': 'DANKE FÜRS ZUSCHAUEN', 'gameplay': 'GAMEPLAY', 'camera': 'CAM',
                  'alert': 'NEW ALERT', 'panel': 'ÜBER MICH'}[kind]
    line = f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{escape(blueprint["name"])} {kind}">'
    defs = (f'<defs><linearGradient id="back" x1="0" y1="0" x2="1" y2="1">'
            f'<stop stop-color="{bg}"/><stop offset="1" stop-color="#050915"/></linearGradient>'
            f'<linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">'
            f'<stop stop-color="{ac}" stop-opacity="0.25"/>'
            f'<stop offset="0.6" stop-color="{ac}" stop-opacity="0.95"/>'
            f'<stop offset="1" stop-color="{fg}" stop-opacity="0.2"/></linearGradient>'
            f'<pattern id="fine" width="42" height="42" patternUnits="userSpaceOnUse">'
            f'<path d="M 42 0 L 0 0 0 42" fill="none" stroke="{ac}" opacity="0.13"/></pattern></defs>')
    is_transparent = kind in ('camera', 'gameplay', 'alert', 'panel')
    lines = [line, defs]
    if not is_transparent:
        lines.extend([f'<rect width="{w}" height="{h}" fill="url(#back)"/>',
                      f'<rect width="{w}" height="{h}" fill="url(#fine)"/>'])
    # Intentional geometric variation tied to the AI-selected motif and seed.
    for i in range(10 if kind in ('starting', 'preview', 'pause', 'ending') else 5):
        cx, cy = int(rng.uniform(0, w)), int(rng.uniform(0, h))
        scale = rng.uniform(0.03, 0.2) * min(w, h)
        op = round(rng.uniform(0.11, 0.43), 2)
        if motif in ('orbits', 'waves'):
            lines.append(f'<circle cx="{cx}" cy="{cy}" r="{int(scale)}" fill="none" stroke="{ac}" stroke-width="3" opacity="{op}"/>')
            if motif == 'waves':
                lines.append(f'<circle cx="{cx}" cy="{cy}" r="{int(scale*1.4)}" fill="none" stroke="{fg}" opacity="0.14"/>')
        elif motif in ('crystal', 'beams'):
            lines.append(f'<path d="M {cx} {int(cy-scale)} L {int(cx+scale)} {cy} L {cx} {int(cy+scale)} L {int(cx-scale)} {cy} Z" fill="{ac}" fill-opacity="0.06" stroke="{ac}" stroke-opacity="{op}" stroke-width="3"/>')
        elif motif in ('grid', 'lines'):
            lines.append(f'<path d="M {cx} {cy} l {int(scale*1.8)} {-int(scale*.8)} m {-int(scale*.4)} {int(scale*.18)} l {-int(scale*1.1)} {int(scale*.9)}" fill="none" stroke="{ac}" stroke-opacity="{op}" stroke-width="4"/>')
    thick = max(4, int(min(w,h)*0.009))
    if kind == 'camera':
        pad = int(h*.055)
        lines += [f'<rect x="{pad}" y="{pad}" width="{w-2*pad}" height="{h-2*pad}" rx="22" fill="none" stroke="url(#accent)" stroke-width="{thick}"/>',
                  f'<path d="M {pad} {pad+100} V {pad} H {pad+130} M {w-pad-130} {h-pad} H {w-pad} V {h-pad-100}" fill="none" stroke="{ac}" stroke-width="{thick*2}"/>']
    elif kind == 'gameplay':
        lines += [f'<path d="M 0 {int(h*.91)} H {w} V {h} H 0 Z" fill="{bg}" fill-opacity="0.83"/>',
                  f'<rect x="32" y="28" width="{w-64}" height="{h-56}" rx="22" fill="none" stroke="{ac}" stroke-opacity="0.75" stroke-width="{thick}"/>']
    elif kind in ('alert','panel'):
        lines += [f'<rect x="12" y="12" width="{w-24}" height="{h-24}" rx="28" fill="{bg}" fill-opacity="0.91" stroke="url(#accent)" stroke-width="{thick}"/>',
                  f'<rect x="38" y="32" width="{int(w*.27)}" height="5" fill="{ac}"/>']
    else:
        lines += [f'<path d="M 0 {int(h*.93)} H {w} V {h} H 0 Z" fill="{ac}" fill-opacity="0.19"/>',
                  f'<rect x="{int(w*.06)}" y="{int(h*.09)}" width="{int(w*.88)}" height="{int(h*.82)}" rx="28" fill="none" stroke="url(#accent)" stroke-width="{thick}"/>']
    font_large = max(28, int(h*.095))
    if kind in ('starting','preview','pause','ending'):
        lines += [f'<text x="{w//2}" y="{int(h*.46)}" font-family="Arial,sans-serif" font-size="{font_large}" font-weight="900" fill="{fg}" text-anchor="middle">{escape(kind_title)}</text>',
                  f'<text x="{w//2}" y="{int(h*.57)}" font-family="Arial,sans-serif" font-size="{int(h*.034)}" letter-spacing="6" fill="{ac}" text-anchor="middle">{title}</text>']
    elif kind != 'camera':
        lines += [f'<text x="{int(w*.08)}" y="{int(h*.75)}" font-family="Arial,sans-serif" font-size="{max(22,int(h*.14))}" fill="{fg}" font-weight="800">{escape(kind_title)}</text>']
    lines.append('</svg>')
    out = ''.join(lines)
    ET.fromstring(out)  # fail before publishing invalid SVG
    return out


SVG_ALLOWED_TAGS = frozenset({'svg', 'defs', 'linearGradient', 'stop', 'pattern', 'path',
                              'circle', 'rect', 'text'})
SVG_ALLOWED_ATTRS = frozenset({'xmlns', 'width', 'height', 'viewBox', 'role', 'aria-label',
                               'id', 'x1', 'y1', 'x2', 'y2', 'offset', 'stop-color',
                               'stop-opacity', 'patternUnits', 'd', 'fill', 'fill-opacity',
                               'stroke', 'stroke-opacity', 'stroke-width', 'opacity', 'cx',
                               'cy', 'r', 'x', 'y', 'rx', 'font-family', 'font-size',
                               'font-weight', 'text-anchor', 'letter-spacing'})


def validate_generated_svg(data: bytes):
    if len(data) > 350_000 or b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():
        raise ValueError('SVG enthält verbotene Ressourcen oder ist zu groß.')
    root_element = ET.fromstring(data)
    for element in root_element.iter():
        tag = element.tag.split('}')[-1]
        if tag not in SVG_ALLOWED_TAGS or any(k.split('}')[-1] not in SVG_ALLOWED_ATTRS for k in element.attrib):
            raise ValueError('SVG enthält nicht erlaubte Tags oder Attribute.')
        for value in element.attrib.values():
            if 'url(' in value.lower() and value.lower().strip() not in ('url(#back)', 'url(#fine)', 'url(#accent)'):
                raise ValueError('SVG enthält fremde Ressourcen.')
            if 'javascript:' in value.lower() or 'data:' in value.lower() or 'http:' in value.lower() or 'https:' in value.lower():
                raise ValueError('SVG enthält nicht erlaubte Referenzen.')
    return True

def make_draft(root: Path, settings: dict, hint: str = ''):
    p = paths(root)
    existing = sorted(p['drafts'].glob('*/manifest.json')) if p['drafts'].exists() else []
    names = [load_json(path, {}).get('blueprint', {}).get('name', '') for path in existing[-25:]]
    response = call_cfs_ai(blueprint_prompt(hint, names))
    blueprint = clean_blueprint(parse_ai_json(response))
    if blueprint['name'].casefold() in {x.casefold() for x in names}:
        raise ValueError('Doppeltes KI-Design: neuer Entwurf wurde nicht gespeichert.')
    ident = uuid.uuid4().hex
    target = p['drafts'] / ident
    target.mkdir(parents=True)
    manifest = {'schema': SCHEMA, 'id': ident, 'status': 'draft', 'origin': 'cfs-ai-local-ollama',
                'created_at': iso(), 'blueprint': blueprint, 'source': 'CFS AI chat_json (lokales Ollama)',
                'requires_human_approval': True, 'never_auto_publish': True}
    for kind in (*ELEMENTS, 'preview'):
        art = svg_art(blueprint, kind).encode('utf-8')
        validate_generated_svg(art)
        atomic_write(target / f'{kind}.svg', art)
    save_json(target / 'manifest.json', manifest)
    return manifest



def create_review_page(root: Path):
    """Human-in-the-loop preview; file:// page cannot approve or publish by itself."""
    drafts = list_drafts(root)
    target = paths(root)['drafts'].parent / 'review.html'
    cards = []
    for entry in drafts:
        ident = entry.get('id', '')
        if not DESIGN_ID.fullmatch(ident):
            continue
        bp = entry.get('blueprint') or {}
        name = escape(str(bp.get('name', 'Unbenannt')))
        desc = escape(str(bp.get('description', '')))
        status = escape(str(entry.get('status', 'draft')))
        cards.append(f'<article><img src="drafts/{ident}/preview.svg" alt="{name}">'
                     f'<div><strong>{name}</strong><small>{desc}</small>'
                     f'<p>Status: <b>{status}</b></p><code>{ident}</code></div></article>')
    style = ('body{background:#07111e;color:#e6f7ff;font:16px Arial,sans-serif;padding:30px;}'
             'h1{font-size:32px}section{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}'
             'article{background:#0f2436;border:1px solid #30628a;border-radius:16px;overflow:hidden}'
             'img{width:100%;aspect-ratio:16/9;object-fit:contain;background:#010811}article div{padding:16px}'
             'small{display:block;margin:10px 0;color:#bdd5e5}code{display:block;word-break:break-word;color:#8df9f9}')
    html = ('<!doctype html><html lang="de"><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>CFS AI · Entwürfe prüfen</title><style>' + style + '</style>'
            '<h1>CFS AI Design Factory · private Entwürfe</h1>'
            '<p>Diese Datei liegt nur lokal auf deinem PC. Designs erscheinen erst nach Freigabe und Deployment im Shop.</p>'
            '<p>Freigeben im Terminal: <code>POST /api/design-factory/drafts/ENTWURFS_ID/approve (lokaler CFS AI Dienst)</code></p>'
            '<section>' + ''.join(cards) + '</section></html>')
    atomic_write(target, html.encode('utf-8'))
    return target


def draft_dir(root: Path, ident: str):
    if not DESIGN_ID.fullmatch(ident):
        raise ValueError('Ungültige Entwurfs-ID.')
    return paths(root)['drafts'] / ident


def list_drafts(root: Path):
    p = paths(root)['drafts']
    if not p.is_dir():
        return []
    return [entry for f in sorted(p.glob('*/manifest.json'), reverse=True)
            if isinstance((entry := load_json(f, {})), dict)]


def approve(root: Path, ident: str):
    p = paths(root)
    draft = draft_dir(root, ident)
    manifest = load_json(draft / 'manifest.json')
    if not manifest:
        raise ValueError('Entwurf nicht gefunden.')
    if manifest.get('status') != 'draft':
        raise ValueError('Nur offene Entwürfe dürfen freigegeben werden.')
    clean_blueprint(manifest['blueprint'])
    for kind in (*ELEMENTS, 'preview'):
        validate_generated_svg((draft / f'{kind}.svg').read_bytes())
    catalog = load_json(p['catalog'], {'kind': 'cfs-ai-reviewed-designs', 'schema': SCHEMA, 'designs': []})
    if catalog.get('kind') != 'cfs-ai-reviewed-designs' or catalog.get('schema') != SCHEMA:
        raise ValueError('Bestehender KI-Katalog ist ungültig.')
    if not isinstance(catalog.get('designs'), list):
        raise ValueError('Katalog enthält keine gültige Designliste.')
    published = {d.get('id') for d in catalog['designs'] if isinstance(d, dict)}
    if ident in published:
        raise ValueError('Design wurde bereits freigegeben.')
    if len(catalog['designs']) >= 120:
        raise ValueError('Shop-Katalog ist voll; zunächst Designs archivieren.')
    zip_dest = p['assets'] / f'{ident}.zip'
    preview_dest = p['assets'] / f'{ident}-preview.svg'
    p['assets'].mkdir(parents=True, exist_ok=True)
    tmp_zip = zip_dest.with_suffix('.zip.tmp')
    try:
        with zipfile.ZipFile(tmp_zip, 'w', zipfile.ZIP_DEFLATED, compresslevel=8) as archive:
            for kind in (*ELEMENTS, 'preview'):
                archive.write(draft / f'{kind}.svg', arcname=f'{kind}.svg')
            archive.writestr('README.txt', 'CFS AI Originalentwurf – nach manueller Freigabe.\n'
                             'Statische SVG-Grafiken; keine Live-Zahlen, Provider oder Sounds.\n'
                             'SVG in OBS als Browser-Quelle oder per Konvertierung nutzen.\n')
            archive.writestr('manifest.json', json.dumps({**manifest, 'status':'approved',
                                                          'requires_deployment':True}, ensure_ascii=False, indent=2))
        with zipfile.ZipFile(tmp_zip) as archive:
            if archive.testzip():
                raise RuntimeError('Exportiertes ZIP ist beschädigt.')
        os.replace(tmp_zip, zip_dest)
        atomic_write(preview_dest, (draft / 'preview.svg').read_bytes())
        item = {'id': ident, 'name': manifest['blueprint']['name'], 'description': manifest['blueprint']['description'],
                'category': manifest['blueprint']['category'], 'colors': manifest['blueprint']['colors'],
                'preview_url': f'/assets/ai-generated/{ident}-preview.svg',
                'download_url': f'/assets/ai-generated/{ident}.zip', 'approved_at': iso(),
                'source': 'cfs-ai-local-ollama', 'files': len(ELEMENTS) + 1,
                'staged_only': True, 'requires_deployment': True}
        catalog['designs'].insert(0, item)
        save_json(p['catalog'], catalog)
        manifest['status'] = 'approved'
        manifest['approved_at'] = item['approved_at']
        save_json(draft / 'manifest.json', manifest)
        return item
    finally:
        tmp_zip.unlink(missing_ok=True)


def reject(root: Path, ident: str):
    draft = draft_dir(root, ident)
    manifest = load_json(draft / 'manifest.json')
    if not manifest or manifest.get('status') != 'draft':
        raise ValueError('Nur offene Entwürfe können abgelehnt werden.')
    manifest['status'] = 'rejected'
    save_json(draft / 'manifest.json', manifest)



# v3.20.69 — Integrated scheduling via the existing autonomous_studio worker.
# The background mode is opt-in and NEVER writes into the website checkout.
DEFAULT_FACTORY_SETTINGS = {
    'enabled': False, 'interval_hours': 12, 'max_per_day': 2,
    'max_pending': 12, 'hint': 'Eigenständiges Premium-Gaming-Streamdesign',
}
_factory_lock = threading.Lock()


def get_settings(root: Path = ROOT):
    raw = load_json(paths(root)['settings'], {})
    if not isinstance(raw, dict):
        raw = {}
    return {
        'enabled': raw.get('enabled') is True,
        'interval_hours': max(1, min(168, int(raw.get('interval_hours', 12)))),
        'max_per_day': max(1, min(12, int(raw.get('max_per_day', 2)))),
        'max_pending': max(1, min(40, int(raw.get('max_pending', 12)))),
        'hint': str(raw.get('hint', DEFAULT_FACTORY_SETTINGS['hint'])).strip()[:280],
    }


def save_settings(input_data: dict, root: Path = ROOT):
    settings = get_settings(root)
    settings.update(input_data)
    settings = {key: settings[key] for key in DEFAULT_FACTORY_SETTINGS}
    settings['enabled'] = settings['enabled'] is True
    for key, lo, hi in [('interval_hours', 1, 168), ('max_per_day', 1, 12), ('max_pending', 1, 40)]:
        settings[key] = max(lo, min(hi, int(settings[key])))
    settings['hint'] = str(settings['hint']).strip()[:280]
    save_json(paths(root)['settings'], settings)
    return settings


def status(root: Path = ROOT):
    p = paths(root)
    settings = get_settings(root)
    state = load_json(p['state'], {}) or {}
    drafts = list_drafts(root)
    approved = [d for d in drafts if d.get('status') == 'approved']
    return {
        'schema': SCHEMA, 'settings': settings,
        'total': len(drafts), 'pending': sum(1 for d in drafts if d.get('status') == 'draft'),
        'approved': len(approved), 'last_run_at': state.get('last_run_at'),
        'next_run_at': state.get('next_run_at'), 'last_result': state.get('last_result'),
        'running': _factory_lock.locked(), 'staged_export_available': p['catalog'].is_file(),
        'automatic_publish': False, 'automatic_apply': False, 'local_ollama_required': True,
    }


def run_once(*, root: Path = ROOT, triggered: str = 'manual'):
    if not _factory_lock.acquire(blocking=False):
        raise RuntimeError('CFS AI arbeitet bereits an einem Design.')
    p = paths(root)
    try:
        settings = get_settings(root)
        state = load_json(p['state'], {}) or {}
        today = utcnow().date().isoformat()
        made = [x for x in state.get('created_dates', []) if x == today]
        if triggered == 'scheduled' and not settings['enabled']:
            return {'ok': False, 'skipped': 'disabled'}
        if len(made) >= settings['max_per_day']:
            return {'ok': False, 'skipped': 'daily_limit'}
        if sum(d.get('status') == 'draft' for d in list_drafts(root)) >= settings['max_pending']:
            return {'ok': False, 'skipped': 'pending_limit'}
        try:
            draft = make_draft(root, settings, settings['hint'])
            made.append(today)
            state['last_result'] = 'created'
            result = {'ok': True, 'draft': draft}
        except Exception as exc:
            # Never expose local tokens, prompts, secrets, or raw model outputs.
            state['last_result'] = type(exc).__name__
            if triggered == 'manual':
                raise
            result = {'ok': False, 'error_code': 'model_or_validation_failed'}
        finally:
            state['created_dates'] = made
            state['last_run_at'] = iso()
            state['next_run_at'] = (utcnow() + timedelta(hours=settings['interval_hours'])).isoformat()
            save_json(p['state'], state)
        return result
    finally:
        _factory_lock.release()


def maybe_run_background(root: Path = ROOT):
    settings = get_settings(root)
    if not settings['enabled']:
        return {'ok': False, 'skipped': 'disabled'}
    p = paths(root)
    state = load_json(p['state'], {}) or {}
    next_run = state.get('next_run_at')
    if next_run:
        try:
            if utcnow() < datetime.fromisoformat(next_run):
                return {'ok': False, 'skipped': 'not_due'}
        except (ValueError, TypeError):
            pass
    return run_once(root=root, triggered='scheduled')


def export_zip(root: Path = ROOT):
    """Build a ZIP of approved/staged assets; NEVER deploy to the website automatically."""
    p = paths(root)
    catalog = load_json(p['catalog'], {})
    if not isinstance(catalog, dict) or catalog.get('kind') != 'cfs-ai-reviewed-designs':
        raise ValueError('Noch keine freigegebenen Designs vorhanden.')
    files = [p['catalog']]
    for row in catalog.get('designs', []):
        ident = str(row.get('id') or '')
        if not DESIGN_ID.fullmatch(ident):
            raise ValueError('Ungültiger Katalogeintrag.')
        files.extend([p['assets'] / f'{ident}.zip', p['assets'] / f'{ident}-preview.svg'])
    export_root = p['catalog'].parent.parent.parent.parent  # /.../export
    result = p['drafts'].parent / 'cfs-ai-approved-shop-assets.zip'
    result.parent.mkdir(parents=True, exist_ok=True)
    temp = result.with_suffix('.zip.tmp')
    try:
        with zipfile.ZipFile(temp, 'w', zipfile.ZIP_DEFLATED, compresslevel=8) as archive:
            for file in files:
                if not file.is_file():
                    raise ValueError('Freigegebenes Designpaket unvollständig.')
                archive.write(file, arcname=file.relative_to(export_root).as_posix())
        with zipfile.ZipFile(temp) as archive:
            if archive.testzip() is not None:
                raise ValueError('Shop-Export enthält beschädigte Datei.')
        os.replace(temp, result)
    finally:
        temp.unlink(missing_ok=True)
    return result
