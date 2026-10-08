"""Regression tests for local integrated CFS AI design factory, no live model/network."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from xml.etree import ElementTree as ET

from app import design_factory as d

BLUEPRINT = dict(name='Cosmic Flux', description='Originaldesign fuer CFS Gaming und Streams',
                 category='scifi', colors=['#07111e','#27d3fd','#f1faff'], seed=4321, motif='orbits')

class DesignFactoryTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.root = Path(self.dir.name)
        d.save_settings({'enabled':False,'interval_hours':12,'max_per_day':2,'max_pending':12, 'hint':'Space theme'},self.root)
    def tearDown(self): self.dir.cleanup()

    def test_defaults_off_and_status(self):
        self.assertFalse(d.get_settings(self.root)['enabled'])
        self.assertEqual(d.status(self.root)['pending'],0)
        self.assertFalse(d.status(self.root)['automatic_publish'])

    def test_generated_scenes_well_formed_and_sandboxed(self):
        for kind in (*d.ELEMENTS, 'preview'):
            data=d.svg_art(BLUEPRINT,kind).encode()
            self.assertTrue(d.validate_generated_svg(data))
            ET.fromstring(data)
            self.assertNotIn(b'<script',data)

    def test_untrusted_svg_rejected(self):
        for payload in (b'<svg xmlns="http://www.w3.org/2000/svg"><script>bad()</script></svg>',
                        b'<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/x"/></svg>',
                        b'<!DOCTYPE svg><svg/>'):
            with self.assertRaises(ValueError): d.validate_generated_svg(payload)

    def test_no_fabricated_design_if_model_unavailable(self):
        d.save_settings({'enabled':True},self.root)
        with patch.object(d,'call_cfs_ai',side_effect=RuntimeError('offline')):
            result=d.run_once(root=self.root,triggered='scheduled')
        self.assertEqual(result['error_code'],'model_or_validation_failed')
        self.assertEqual(d.list_drafts(self.root),[])

    def test_opt_in_scheduling(self):
        self.assertEqual(d.maybe_run_background(self.root)['skipped'],'disabled')
        d.save_settings({'enabled':True},self.root)
        with patch.object(d,'call_cfs_ai',return_value=BLUEPRINT):
            result=d.maybe_run_background(self.root)
        self.assertTrue(result['ok'])
        self.assertEqual(d.maybe_run_background(self.root)['skipped'],'not_due')

    def test_review_and_approval_export_only(self):
        with patch.object(d,'call_cfs_ai',return_value=BLUEPRINT):
            result=d.run_once(root=self.root)
        self.assertTrue(result['ok'])
        ident=result['draft']['id']
        self.assertEqual(len(d.list_drafts(self.root)),1)
        self.assertFalse((self.root/'public').exists(), 'Website files must not be modified before approval')
        item=d.approve(self.root,ident)
        self.assertTrue(item['staged_only'])
        self.assertTrue(item['requires_deployment'])
        self.assertTrue((self.root/'data/cfs-ai-design-factory/export/public/assets/data/cfs-ai-designs-v32068.json').exists())
        self.assertFalse((self.root/'public').exists(), 'Even approval must not modify a website checkout')
        with self.assertRaises(ValueError): d.approve(self.root,ident)
        staged=d.export_zip(self.root)
        from zipfile import ZipFile
        with ZipFile(staged) as z:
            self.assertIsNone(z.testzip())
            entries=set(z.namelist())
            self.assertIn('public/assets/data/cfs-ai-designs-v32068.json',entries)
            self.assertIn(f'public/assets/ai-generated/{ident}.zip',entries)
            self.assertIn(f'public/assets/ai-generated/{ident}-preview.svg',entries)
            data=json.loads(z.read('public/assets/data/cfs-ai-designs-v32068.json'))
            self.assertEqual(data['kind'],'cfs-ai-reviewed-designs')
            self.assertEqual(data['designs'][0]['id'],ident)

    def test_daily_limit_and_queue_limit(self):
        d.save_settings({'enabled':True,'max_per_day':1},self.root)
        with patch.object(d,'call_cfs_ai',return_value=BLUEPRINT):
            self.assertTrue(d.run_once(root=self.root)['ok'])
        self.assertEqual(d.run_once(root=self.root)['skipped'],'daily_limit')

    def test_duplicate_design_rejected(self):
        d.save_settings({'enabled':True,'max_per_day':3},self.root)
        with patch.object(d,'call_cfs_ai',return_value=BLUEPRINT):
            self.assertTrue(d.run_once(root=self.root)['ok'])
            with self.assertRaises(ValueError): d.run_once(root=self.root)
        self.assertEqual(len(d.list_drafts(self.root)),1)

    def test_reject_hides_from_exports(self):
        with patch.object(d,'call_cfs_ai',return_value=BLUEPRINT):
            ident=d.run_once(root=self.root)['draft']['id']
        d.reject(self.root,ident)
        self.assertEqual(d.list_drafts(self.root)[0]['status'],'rejected')
        with self.assertRaises(ValueError): d.approve(self.root,ident)
        with self.assertRaises(ValueError): d.export_zip(self.root)

    def test_routes_local_only_and_ui(self):
        from fastapi.testclient import TestClient
        from app.main import app
        with TestClient(app) as client:
            self.assertEqual(client.get('/design-factory').status_code,200)
            self.assertIn('Design Factory',client.get('/design-factory').text)
            self.assertEqual(client.get('/api/design-factory/status').status_code,200)
            self.assertEqual(client.post('/api/design-factory/settings',json={'enabled':True},
                                         headers={'Origin':'https://evil.example'}).status_code,403)

    def test_model_input_validation(self):
        for bad in ({**BLUEPRINT,'motif':'<script>'}, {**BLUEPRINT,'colors':['bad','#fff','#abc']},
                    {**BLUEPRINT,'name':'x'}, {**BLUEPRINT,'category':'nonexistent'}):
            with self.assertRaises(ValueError): d.clean_blueprint(bad)

if __name__ == '__main__': unittest.main(verbosity=2)
