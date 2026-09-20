import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const root=path.resolve(process.argv[2]||path.join(path.dirname(fileURLToPath(import.meta.url)),'..'));
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
let passed=0,failed=0;async function ok(name,fn){try{await fn();console.log('PASS',name);passed++}catch(error){console.error('FAIL',name);console.error(error?.stack||error);failed++}}

const {CutMediaEngine}=require(path.join(root,'launcher/src/cut-media-engine.js'));
const cut=require(path.join(root,'lib/creator-cut-studio.js'));
const jobs=require(path.join(root,'lib/creator-cut-jobs.js'));
const engine=new CutMediaEngine({outputRoot:path.join(root,'.tmp-zero-cross-test')});
function pcm(values){const b=Buffer.alloc(values.length*2);values.forEach((v,i)=>b.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(v))),i*2));return b}

const sr=8000,values=new Array(160).fill(2000);for(let i=40;i<80;i++)values[i]=-1800;for(let i=80;i<values.length;i++)values[i]=1500;
const exact=engine.nearestZeroCrossingFromPcm(pcm(values),{windowStartMs:995,targetMs:1000,sampleRate:sr});
await ok('PCM helper returns original marker',()=>assert.equal(exact.original_ms,1000));
await ok('PCM helper finds real sign crossing',()=>assert.equal(exact.crossing,true));
await ok('PCM helper snaps first boundary to 1000ms',()=>assert.equal(exact.suggested_ms,1000));
await ok('PCM helper delta is zero at exact crossing',()=>assert.equal(exact.delta_ms,0));
await ok('PCM helper reports bounded dBFS',()=>assert.ok(exact.level_dbfs>=-96&&exact.level_dbfs<=0));
await ok('PCM helper reports sample count',()=>assert.equal(exact.samples,160));

const nearest=engine.nearestZeroCrossingFromPcm(pcm(values),{windowStartMs:995,targetMs:1002,sampleRate:sr});
await ok('Nearest crossing prefers closest crossing',()=>assert.equal(nearest.suggested_ms,1000));
await ok('Nearest crossing delta remains small',()=>assert.equal(nearest.delta_ms,-2));

const positive=new Array(160).fill(2200);positive[64]=3;const fallback=engine.nearestZeroCrossingFromPcm(pcm(positive),{windowStartMs:995,targetMs:1003,sampleRate:sr});
await ok('No sign crossing uses lowest-level fallback',()=>assert.equal(fallback.crossing,false));
await ok('Lowest-level fallback selects quiet sample',()=>assert.equal(fallback.suggested_ms,1003));
await ok('Lowest-level fallback level is very quiet',()=>assert.ok(fallback.level_dbfs<-70));
await ok('Empty PCM stays on original marker',()=>assert.equal(engine.nearestZeroCrossingFromPcm(Buffer.alloc(0),{targetMs:1234}).suggested_ms,1234));
await ok('Empty PCM marks no crossing',()=>assert.equal(engine.nearestZeroCrossingFromPcm(Buffer.alloc(0),{targetMs:1234}).crossing,false));

const projectDefault=cut.sanitizeCutProject({export_preset:{}}).export_preset;
const projectHigh=cut.sanitizeCutProject({export_preset:{audition_zero_cross_radius_ms:999}}).export_preset;
const projectLow=cut.sanitizeCutProject({export_preset:{audition_zero_cross_radius_ms:-9}}).export_preset;
await ok('Project defaults Zero-Cross radius to 20ms',()=>assert.equal(projectDefault.audition_zero_cross_radius_ms,20));
await ok('Project clamps Zero-Cross radius to 50ms',()=>assert.equal(projectHigh.audition_zero_cross_radius_ms,50));
await ok('Project clamps Zero-Cross radius to 5ms',()=>assert.equal(projectLow.audition_zero_cross_radius_ms,5));
const manifest=jobs.buildCutJobManifest({id:'p1',title:'x',export_preset:{audition_zero_cross_radius_ms:30}},[]);
await ok('Cut job manifest preserves sanitized Zero-Cross radius',()=>assert.equal(manifest.export_preset.audition_zero_cross_radius_ms,30));

const cleanResult=jobs.sanitizeCutJobResult({output_name:'local',zero_cross:{radius_ms:999,sample_rate:999999,analyzed_at:'2026-09-20T00:00:00.000Z',a:{original_ms:1000,suggested_ms:1040,delta_ms:999,level_dbfs:5,crossing:true,filePath:'C:/secret.mkv'},b:{original_ms:2000,suggested_ms:1950,delta_ms:-999,level_dbfs:-999,crossing:false}},filePath:'C:/secret.mkv',pcm:'secret'});
await ok('Result sanitizer preserves Zero-Cross object',()=>assert.ok(cleanResult.zero_cross));
await ok('Result sanitizer clamps radius to 50ms',()=>assert.equal(cleanResult.zero_cross.radius_ms,50));
await ok('Result sanitizer clamps sample rate to 96kHz',()=>assert.equal(cleanResult.zero_cross.sample_rate,96000));
await ok('Result sanitizer clamps positive delta to +50ms',()=>assert.equal(cleanResult.zero_cross.a.delta_ms,50));
await ok('Result sanitizer clamps negative delta to -50ms',()=>assert.equal(cleanResult.zero_cross.b.delta_ms,-50));
await ok('Result sanitizer clamps level above 0dBFS',()=>assert.equal(cleanResult.zero_cross.a.level_dbfs,0));
await ok('Result sanitizer clamps level below -96dBFS',()=>assert.equal(cleanResult.zero_cross.b.level_dbfs,-96));
await ok('Result sanitizer preserves crossing boolean',()=>assert.equal(cleanResult.zero_cross.a.crossing,true));
await ok('Result sanitizer drops local file path',()=>assert.ok(!JSON.stringify(cleanResult).includes('C:/secret.mkv')));
await ok('Result sanitizer drops PCM-shaped extra payload',()=>assert.ok(!JSON.stringify(cleanResult).includes('secret')));

const server=read('server.js'),main=read('launcher/main.js'),engineSrc=read('launcher/src/cut-media-engine.js'),cutJs=read('public/assets/js/cut-studio.js'),cutHtml=read('public/pages/cut-studio.html'),cutCss=read('public/assets/css/cut-studio.css'),cutLib=read('lib/creator-cut-studio.js'),jobLib=read('lib/creator-cut-jobs.js'),pkg=JSON.parse(read('package.json')),check=read('CFS_MASTER_CHECKLIST_PASS21.md'),doc=read('STREAM_STUDIO_ZERO_CROSS_PASS21_10_34.md');
await ok('Media engine includes Zero-Cross mix inspector',()=>assert.ok(engineSrc.includes('async inspectMixZeroCrossings')));
await ok('Media engine uses current source-track mix graph',()=>assert.ok(engineSrc.includes('this.sourceTrackAudioGraph({source_tracks:Array.isArray(tracks)?tracks:[]}')));
await ok('Media engine downmixes inspector window to mono',()=>assert.ok(engineSrc.includes('pan=mono|c0=0.5*c0+0.5*c1')));
await ok('Media engine analyzes 48kHz by default',()=>assert.ok(engineSrc.includes('sampleRate=48000')));
await ok('Media engine hard-clamps search radius to 50ms',()=>assert.ok(engineSrc.includes('Math.min(50,Math.round(Number(radiusMs)||20))')));
await ok('Media engine uses binary stdout for tiny PCM window',()=>assert.ok(engineSrc.includes('this.runBinaryProcess(this.ffmpegPath')));
await ok('Media engine limits PCM stdout to 64KiB',()=>assert.ok(engineSrc.includes('maxBytes:64*1024')));
await ok('Media engine does not write inspector PCM to disk',()=>{const a=engineSrc.indexOf('async inspectMixZeroCrossings');const b=engineSrc.indexOf('async analyzeEmbeddedAudio',a);const block=engineSrc.slice(a,b);assert.ok(!/writeFile|outputPath|\.pcm/.test(block))});
await ok('Media engine crossing test uses sign changes',()=>assert.ok(engineSrc.includes('(left<0&&right>0)||(left>0&&right<0)')));
await ok('Media engine has controlled lowest-level fallback',()=>assert.ok(engineSrc.includes('if(!best){for(let i=0;i<samples;i++')));

await ok('Server audition protocol advances to schema 13',()=>assert.ok(server.includes('schema:13')));
await ok('Server accepts inspect_zero_cross action',()=>assert.ok(server.includes('"inspect_zero_cross"')));
await ok('Server clamps requested search radius to 5-50ms',()=>assert.ok(server.includes('Math.max(5,Math.min(50,Math.round(Number(input?.search_radius_ms??20)||20)))')));
await ok('Server stores search radius only for inspector action',()=>assert.ok(server.includes('search_radius_ms:action==="inspect_zero_cross"?zeroCrossRadiusMs:0')));
await ok('Server inspector endpoint is exact job-id scoped',()=>assert.ok(server.includes('/audition-inspector/:jobId')));
await ok('Server inspector query verifies creator project job and action',()=>assert.ok(server.includes("manifest->'audition'->>'action'='inspect_zero_cross'")));
await ok('Server inspector response exposes only sanitized inspection',()=>assert.ok(server.includes('inspection:clean.zero_cross||null')));
await ok('Server request path has no local file input',()=>{const a=server.indexOf('async function createCutAuditionJob');const b=server.indexOf('async function transitionCutExportJob',a);assert.ok(!/file_path|filePath|preview_path|recording_path|cache_path/.test(server.slice(a,b)))});
await ok('Zero-Cross job remains cut_audition kind',()=>assert.ok(server.includes('kind:"cut_audition"')));
await ok('Regular export slot count still excludes cut_audition',()=>assert.ok(server.includes("COALESCE(manifest->>'kind','cut_export')<>'cut_audition'")));

await ok('Launcher accepts inspector action',()=>assert.ok(main.includes('"inspect_zero_cross"')));
await ok('Launcher clamps inspector radius locally',()=>assert.ok(main.includes('zeroCrossRadiusMs=Math.max(5,Math.min(50')));
await ok('Launcher reuses verified recording handoff boundary',()=>assert.ok(main.includes('const handoff=auditionRecordingHandoff(job)')));
await ok('Launcher maps cloud track keys back to local stream indexes',()=>assert.ok(main.includes('stream_index:Number(local.stream_index)')));
await ok('Launcher calls local mix Zero-Cross analyzer',()=>assert.ok(main.includes('engine.inspectMixZeroCrossings(handoff.filePath,tracks')));
await ok('Launcher completion result contains only zero_cross analysis metadata',()=>assert.ok(main.includes('zero_cross:zeroCross')));
await ok('Launcher marks inspector codec as analysis',()=>assert.ok(main.includes('codec:"analysis"')));
await ok('Launcher does not send inspector PCM to renderer',()=>{const a=main.indexOf('if(action==="inspect_zero_cross")');const b=main.indexOf('if(["pause","resume","stop"]',a);assert.ok(!/send\(|pcm|previewPath|filePath:/.test(main.slice(a,b))) });

await ok('Cut project sanitizer persists Zero-Cross radius',()=>assert.ok(cutLib.includes('audition_zero_cross_radius_ms')));
await ok('Cut job result sanitizer has dedicated Zero-Cross point sanitizer',()=>assert.ok(jobLib.includes('function sanitizeZeroCrossPoint')));
await ok('Cut job result sanitizer clamps delta to ±50ms',()=>assert.ok(jobLib.includes('Math.max(-50,Math.min(50')));
await ok('Cut job result sanitizer clamps level to -96..0dBFS',()=>assert.ok(jobLib.includes('Math.max(-96,Math.min(0')));

await ok('Cut Studio exposes Zero-Cross inspector panel',()=>assert.ok(cutHtml.includes('id="cutZeroCrossInspector"')));
await ok('Cut Studio exposes 10ms search radius',()=>assert.ok(cutHtml.includes('<option value="10">±10 ms</option>')));
await ok('Cut Studio exposes 20ms search radius',()=>assert.ok(cutHtml.includes('<option value="20">±20 ms</option>')));
await ok('Cut Studio exposes 50ms search radius',()=>assert.ok(cutHtml.includes('<option value="50">±50 ms</option>')));
await ok('Cut Studio exposes A SNAP action',()=>assert.ok(cutHtml.includes('id="cutAuditionSnapA"')));
await ok('Cut Studio exposes B SNAP action',()=>assert.ok(cutHtml.includes('id="cutAuditionSnapB"')));
await ok('Cut Studio exposes BEIDE SNAP action',()=>assert.ok(cutHtml.includes('id="cutAuditionSnapBoth"')));
await ok('Cut Studio explicitly states PCM stays local',()=>assert.ok(/PCM-Samples.*bleiben im Launcher/.test(cutHtml)));
await ok('Cut Studio CSS contains Pass 21.10.34 marker',()=>assert.ok(cutCss.includes('Pass 21.10.34')));
await ok('Cut Studio CSS styles Zero-Cross inspector',()=>assert.ok(cutCss.includes('.cut-zero-cross-inspector')));

await ok('Cut Studio request supports inspect action',()=>assert.ok(cutJs.includes('action==="inspect_zero_cross"')));
await ok('Cut Studio request sends only search radius milliseconds',()=>assert.ok(cutJs.includes('search_radius_ms:action==="inspect_zero_cross"?zeroRadius:0')));
await ok('Cut Studio polls exact inspector job id',()=>assert.ok(cutJs.includes('/audition-inspector/${encodeURIComponent(jobId)}')));
await ok('Cut Studio marks old suggestions unusable after marker changes',()=>assert.ok(cutJs.includes('Math.round(Number(point.original_ms||0))===Math.round(Number(marker.value||0))')));
await ok('Cut Studio invalidates inspector after source-track edits',()=>assert.ok(cutJs.includes('if(row){clearZeroCrossInspection();')));
await ok('Cut Studio invalidates inspector when A is reset',()=>assert.ok(cutJs.includes('cutAuditionA").value=String(auditionClamp(auditionPlayhead.value));clearZeroCrossInspection()')));
await ok('Cut Studio invalidates inspector when B is reset',()=>assert.ok(cutJs.includes('cutAuditionB").value=String(auditionClamp(auditionPlayhead.value));clearZeroCrossInspection()')));
await ok('Cut Studio persists Zero-Cross search radius',()=>assert.ok(cutJs.includes('audition_zero_cross_radius_ms:auditionZeroCrossRadiusMs()')));
await ok('Cut Studio restores Zero-Cross search radius',()=>assert.ok(cutJs.includes('p.export_preset?.audition_zero_cross_radius_ms??20')));
await ok('Cut Studio shows crossing versus lowest-level mode',()=>assert.ok(cutJs.includes('point.crossing?"ZERO CROSS":"LOWEST LEVEL"')));
await ok('Cut Studio inspector request has no local path argument',()=>{const a=cutJs.indexOf('async function inspectZeroCrossings');const b=cutJs.indexOf('async function applyZeroCrossSnap',a);assert.ok(!/filePath|previewPath|recordingPath|cachePath|pcm/i.test(cutJs.slice(a,b))) });

await ok('Root package registers Pass 21.10.34 test',()=>assert.equal(pkg.scripts['studio-zero-cross21:check'],'node tools/stream-studio-zero-cross-pass21-10-34-test.mjs .'));
await ok('Combined Stream Studio check includes Pass 21.10.34',()=>assert.ok(pkg.scripts['stream-studio21:check'].includes('studio-zero-cross21:check')));
await ok('Master checklist advances to Pass 21.10.34',()=>assert.ok(/Aktueller Entwicklungsstand:\*\* Pass 21\.10\.34/.test(check)));
await ok('Master checklist contains Pass 21.10.34 section',()=>assert.ok(check.includes('## Pass 21.10.34 Update')));
await ok('Pass detail documentation exists',()=>assert.ok(doc.length>2500));
await ok('Docs explain advisory non-destructive behavior',()=>assert.ok(/beratend|niemals automatisch/i.test(doc)));
await ok('Docs explain genuine sign crossing plus fallback',()=>assert.ok(/Vorzeichenwechsel[\s\S]*kleinsten Absolutpegel/i.test(doc)));
await ok('Docs state no PCM or local paths cross web boundary',()=>assert.ok(/PCM-Buffer[\s\S]*nicht in Job, API oder Projekt/i.test(doc)));
await ok('Docs keep real Windows acceptance open',()=>assert.ok(/Reale Windows-Abnahme bleibt offen/.test(doc)));
await ok('Docs do not claim universally click-free Windows result',()=>assert.ok(/nicht behauptet.*automatisch hörbar klickfrei/i.test(doc)));

console.log(`\nStream Studio Zero-Cross Pass 21.10.34: ${passed}/${passed+failed} PASS`);if(failed)process.exit(1);
