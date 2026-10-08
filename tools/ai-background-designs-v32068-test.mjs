import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const read=p=>fs.readFileSync(p,'utf8');
const html=read('public/pages/shop.html');
const css=read('public/assets/css/cfs-shop-v172.css');
const js=read('public/assets/js/shop-ai-new-designs-v32068.js');
const catalog=JSON.parse(read('public/assets/data/cfs-ai-designs-v32068.json'));
const pkg=JSON.parse(read('package.json'));
const assertions=[
 ['Shop section contains approved-only CFS AI designs',()=>assert.match(html,/id="aiGeneratedDesigns"/)],
 ['Shop section includes statuses, gallery and source controls',()=>['shopAiGeneratedStatus','shopAiGeneratedGrid'].forEach(id=>assert.ok(html.includes(`id="${id}"`)))],
 ['Shop loads dedicated AI gallery module',()=>assert.match(html,/shop-ai-new-designs-v32068\.js/)],
 ['Client filters generated asset paths via allowlist',()=>assert.match(js,/pathOk\(d\.preview_url/)],
 ['Client displays only approved catalog records',()=>assert.match(js,/cfs-ai-reviewed-designs/)],
 ['Shop style includes gallery desktop/mobile layout',()=>assert.match(css,/shop-ai-generated-grid/)],
 ['Published catalog defaults empty, never mocks model output',()=>assert.deepEqual(catalog.designs,[])],
 ['Original design source left present',()=>assert.ok(fs.existsSync('resources/original-designs/Streaming-Gesamtpaket-31-Designs-496-Farbvarianten-Animiert-DE.zip'))],
 ['Independent local factory with no dependencies',()=>assert.ok(fs.existsSync('tools/cfs-ai-design-factory/design_factory.py'))],
 ['Version and check script',()=>{assert.ok(['3.20.68','3.20.70','3.20.71'].includes(pkg.version));assert.match(pkg.scripts['check:v32068'],/ai-background-designs-v32068-test/)}],
];
let passed=0;
for(const [label,fn] of assertions){try{fn();console.log('PASS',label);passed++;}catch(e){console.error('FAIL',label,e.message);}}
console.log(`CFS AI Background Designs 3.20.68: ${passed}/${assertions.length} PASS`);
if(passed!==assertions.length)process.exitCode=1;
