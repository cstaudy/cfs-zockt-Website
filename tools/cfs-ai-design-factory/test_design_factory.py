"""Offline test suite for CFS AI local design factory (no live model calls)."""
import contextlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parent))
import design_factory as d

FAKE_SPEC = {'name': 'Aurora Mirage', 'description': 'Neue geometrische Streamwelt mit klaren Kanten und Leuchteffekten',
             'category': 'scifi', 'colors': ['#101525', '#10e0f9', '#f5faff'], 'seed': 12345, 'motif': 'orbits'}

class FactoryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root/'public'/'pages').mkdir(parents=True)
        (self.root/'public'/'pages'/'shop.html').write_text('<html></html>')
    def tearDown(self):
        self.tmp.cleanup()

    def test_validate_blueprint(self):
        spec = d.clean_blueprint(FAKE_SPEC)
        self.assertEqual(spec['name'], 'Aurora Mirage')
        self.assertEqual(spec['colors'][1], '#10e0f9')
        with self.assertRaises(ValueError):
            d.clean_blueprint(dict(FAKE_SPEC, category='javascript:bad'))
        with self.assertRaises(ValueError):
            d.clean_blueprint(dict(FAKE_SPEC, colors=['red','green','blue']))
        with self.assertRaises(ValueError):
            d.clean_blueprint(dict(FAKE_SPEC, name='<script>alert(1)</script>'))
        with self.assertRaises(ValueError):
            d.clean_blueprint(dict(FAKE_SPEC, motif='external-image'))

    def test_extract_json_from_answer(self):
        spec = d.parse_ai_json({'answer': '```json\n' + json.dumps(FAKE_SPEC) + '\n```'})
        self.assertEqual(d.clean_blueprint(spec)['seed'], 12345)
        with self.assertRaises(ValueError):
            d.parse_ai_json({'answer': 'no json here'})
        with self.assertRaises(ValueError):
            d.parse_ai_json({'answer': 'x'*20000})

    def test_svg_is_valid_and_original_style(self):
        spec = d.clean_blueprint(FAKE_SPEC)
        for kind in (*d.ELEMENTS, 'preview'):
            doc = d.svg_art(spec, kind)
            ET.fromstring(doc)
            self.assertNotIn('<script', doc)
            self.assertNotIn('https://',doc)
            self.assertNotIn('http://', doc.replace('http://www.w3.org/2000/svg',''))
        other = dict(spec, motif='crystal', seed=987654)
        self.assertNotEqual(d.svg_art(spec,'starting'),d.svg_art(other,'starting'))

    def test_draft_then_manual_publish(self):
        mock_result = {'answer': json.dumps(FAKE_SPEC)}
        with patch.object(d,'call_cfs_ai',return_value=mock_result) as called:
            draft=d.make_draft(self.root, {'url':'http://127.0.0.1:8000'}, 'neue Designs')
        self.assertEqual(called.call_count,1)
        self.assertEqual(draft['status'],'draft')
        self.assertFalse(d.paths(self.root)['catalog'].exists(), 'Drafts must NEVER auto publish')
        self.assertEqual(len(d.list_drafts(self.root)),1)
        self.assertEqual(len(list(d.paths(self.root)['drafts'].glob('*/preview.svg'))),1)
        item=d.approve(self.root,draft['id'])
        self.assertTrue((self.root / 'public' / item['preview_url'].lstrip('/')).exists())
        self.assertTrue((self.root / 'public' / item['download_url'].lstrip('/')).exists())
        self.assertEqual(item['files'],8)
        catalog=d.load_json(d.paths(self.root)['catalog'])
        self.assertEqual(catalog['designs'][0]['id'],draft['id'])
        with zipfile.ZipFile(self.root/'public'/item['download_url'].lstrip('/')) as archive:
            self.assertIsNone(archive.testzip())
            self.assertEqual(len(archive.namelist()),10)
            self.assertIn('gameplay.svg',archive.namelist())
        with self.assertRaises(ValueError):
            d.approve(self.root,draft['id'])

    def test_review_page_is_private_and_escape_safe(self):
        with patch.object(d,'call_cfs_ai',return_value={'answer':json.dumps(FAKE_SPEC)}):
            draft=d.make_draft(self.root,{'url':'http://127.0.0.1:8000'})
        page=d.create_review_page(self.root)
        self.assertTrue(str(page).startswith(str(self.root/'data')))
        content=page.read_text(encoding='utf-8')
        self.assertIn(draft['id'],content)
        self.assertIn('Aurora Mirage',content)
        self.assertIn('private Entwürfe',content)
        self.assertNotIn('fetch(', content)

    def test_reject_never_shows_in_catalog(self):
        with patch.object(d,'call_cfs_ai',return_value={'answer':json.dumps(FAKE_SPEC)}):
            draft=d.make_draft(self.root,{'url':'http://127.0.0.1:8000'})
        d.reject(self.root,draft['id'])
        with self.assertRaises(ValueError):
            d.approve(self.root,draft['id'])
        self.assertFalse(d.paths(self.root)['catalog'].exists())

    def test_model_error_does_not_create_fake_design(self):
        with patch.object(d,'call_cfs_ai',side_effect=RuntimeError('offline')):
            with self.assertRaises(RuntimeError):
                d.make_draft(self.root,{'url':'http://127.0.0.1:8000'})
        self.assertFalse(d.paths(self.root)['drafts'].exists())

    def test_urls_are_loopback_only(self):
        with self.assertRaises(ValueError):
            d.call_cfs_ai('hello','https://evil.example')
        with self.assertRaises(ValueError):
            d.call_cfs_ai('hello','http://127.0.0.1:8000/malicious')

    def test_invalid_id_cannot_escape_drafts(self):
        with self.assertRaises(ValueError):
            d.draft_dir(self.root,'../../etc/passwd')
        with self.assertRaises(ValueError):
            d.draft_dir(self.root,'arbitrary')

if __name__=='__main__':
    unittest.main(verbosity=2)
