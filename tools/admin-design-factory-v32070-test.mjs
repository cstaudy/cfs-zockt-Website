import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const allowed=require('../lib/cfs-ai-bridge-policy.js').isAllowedBridgeRequest;
const html=fs.readFileSync('public/pages/admin-creators.html','utf8');
const server=fs.readFileSync('server.js','utf8');
const js=fs.readFileSync('public/assets/js/admin-cfs-ai-design-v32070.js','utf8');
const css=fs.readFileSync('public/assets/css/admin-cfs-ai-design-v32070.css','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const id='a'.repeat(32);
const checks=[
 ['New admin panel has quick link',()=>assert.match(html,/data-admin-open="adminAiDesignPanel"/)],
 ['New details panel exists',()=>assert.match(html,/id="adminAiDesignPanel"/)],
 ['Status, gallery, settings, actions, export exist',()=>['aiAdminConnection','aiAdminGallery','aiAdminEnabled','aiAdminSave','aiAdminRun','aiAdminExport'].forEach(key=>assert.ok(html.includes(`id="${key}"`)))],
 ['Correct scripts and CSS loaded',()=>{assert.ok(html.includes('/assets/js/admin-cfs-ai-design-v32070.js'));assert.ok(html.includes('/assets/css/admin-cfs-ai-design-v32070.css'));}],
 ['Responsive CSS',()=>assert.match(css,/@media\(max-width:580px\)/)],
 ['Model names escaped',()=>assert.match(js,/const esc=/)],
 ['Strict draft identifier',()=>assert.match(js,/\^\[a-f0-9\]\{32\}\$/)],
 ['No auto-publish action in JS',()=>assert.doesNotMatch(js,/\/publish["'`]/)],
 ['Website gallery auth',()=>assert.match(server,/app\.get\("\/api\/admin\/cfs-ai\/design-factory\/drafts",requireCreatorAccount,requireCreatorAdmin/)],
 ['Website preview auth',()=>assert.match(server,/app\.get\("\/api\/admin\/cfs-ai\/design-factory\/drafts\/:id\/preview",requireCreatorAccount,requireCreatorAdmin/)],
 ['Website export strong auth',()=>assert.match(server,/app\.get\("\/api\/admin\/cfs-ai\/design-factory\/export",requireCreatorAccount,requireCreatorAdmin,requireCreatorAdminElevation/)],
 ['Website manual run strong auth',()=>assert.match(server,/app\.post\("\/api\/admin\/cfs-ai\/design-factory\/run-now",requireCreatorAccount,requireCreatorAdmin,requireCreatorAdminElevation/)],
 ['Website settings strong auth',()=>assert.match(server,/app\.post\("\/api\/admin\/cfs-ai\/design-factory\/settings",requireCreatorAccount,requireCreatorAdmin,requireCreatorAdminElevation/)],
 ['Write actions strong auth',()=>assert.match(server,/action}`,requireCreatorAccount,requireCreatorAdmin,requireCreatorAdminElevation/)],
 ['SVG response sandboxed',()=>assert.match(server,/default-src 'none'; sandbox/)],
 ['Bridge allowed status',()=>assert.ok(allowed('GET','/api/design-factory/status'))],
 ['Bridge allowed preview',()=>assert.ok(allowed('GET',`/api/design-factory/drafts/${id}/preview-data`))],
 ['Bridge allowed user approval',()=>assert.ok(allowed('POST',`/api/design-factory/drafts/${id}/approve`))],
 ['Bridge disallows malformed draft ID',()=>assert.ok(!allowed('POST','/api/design-factory/drafts/x/approve'))],
 ['Bridge disallows arbitrary file reads',()=>assert.ok(!allowed('GET','/api/design-factory/config'))],
 ['Bridge disallows local patch/install',()=>assert.ok(!allowed('POST','/api/design-factory/auto-publish'))],
 ['Bridge prevents path traversal',()=>assert.ok(!allowed('GET','/api/design-factory/drafts/../preview-data'))],
 ['Version/check script wired',()=>{assert.ok(['3.20.70','3.20.71'].includes(pkg.version));assert.match(pkg.scripts['check:v32070'],/admin-design-factory-v32070-test/);}],
];
let passed=0;for(const [label,fn] of checks){try{fn();console.log('PASS',label);passed++;}catch(e){console.error('FAIL',label,e.message);}}
console.log(`CFS Admin Design Factory 3.20.70: ${passed}/${checks.length} PASS`);if(passed!==checks.length)process.exitCode=1;
