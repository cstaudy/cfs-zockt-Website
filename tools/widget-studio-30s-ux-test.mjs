import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('public/pages/widget-studio.html');
const js=read('public/assets/js/widget-studio.js');
const css=read('public/assets/css/widget-studio.css');
const server=read('server.js');
const pkg=JSON.parse(read('package.json'));
const checks=[];
const check=(name,ok)=>{checks.push([name,Boolean(ok)]);if(!ok)process.exitCode=1};

for(const kind of ['goal','counter','timer','chat','camera']){
  check(`Quickstart ${kind} vorhanden`,html.includes(`data-quick-create="${kind}"`));
}
check('Quickstarts nur im Einfach-Modus',/ws-quickstart-30[^>]+data-experience-scope="simple"/.test(html));
check('Quickstart veröffentlicht nicht automatisch',html.includes('Es wird nichts automatisch veröffentlicht.'));
check('Direkter Handler vorhanden',js.includes("function createQuickStart(kind)"));
check('Quickstart erstellt über bestehenden Create-Flow',js.includes('await createWidget({quickStartKind:kind})'));
check('Neues Widget überspringt doppelte Vorlagenstufe',js.includes('state.simpleSection=newWidget?newSimpleSection:"template"'));
check('Kamera startet im Design-Schritt',js.includes('if(quickStartKind==="camera")state.simpleSection="design"'));
check('Goal Rezept',js.includes('if(kind==="goal")return"goal_clear"'));
check('Counter Rezept',js.includes('if(kind==="counter")return"counter_clean"'));
check('Timer Rezept',js.includes('"timer_live":"timer_clean"'));
check('Chat Rezept',js.includes('if(kind==="chat")return"chat_balanced"'));
check('Kamera Rezept',js.includes('if(kind==="camera")return"camera_soft"'));
check('OBS Goal bleibt manuell',js.includes('state.platformFilter==="obs"?["manual_goal"]'));
check('OBS Counter bleibt manuell',js.includes('state.platformFilter==="obs"?["manual_counter"]'));
check('OBS Timer bleibt manuell',js.includes('state.platformFilter==="obs"?["stream_timer"]'));
check('TikTok Kamera bevorzugt 9:16',js.includes('["camera_frame_portrait","camera_frame"]'));
check('Plan-Sperre wird respektiert',js.includes('button.disabled=!d||d.available===false'));
check('Keine Auto-Publish-Funktion im Quickstart',!js.match(/function createQuickStart[\s\S]{0,900}publishNow\(/));

for(const key of ['manual_goal','follower_goal','manual_counter','follower_counter','stream_timer','live_timer','chat_overlay','camera_frame','camera_frame_portrait']){
  check(`Registry enthält ${key}`,server.includes(`${key}: {`));
}
for(const label of ['Klar & direkt','Clean Zahl','Clean Timer','Ausgewogen','Soft Rounded']){
  check(`Einfach-Preset ${label}`,js.includes(label));
}
check('Sechs Einfach-Schritte bleiben erhalten',js.includes('const SIMPLE_EDITOR_ORDER=["template","content","design","position","effects","test"]'));
check('Profi-Modus bleibt vorhanden',html.includes('data-experience-mode="pro"'));
check('Responsive Quickstart CSS',css.includes('.ws-quickstart-30-grid')&&css.includes('@media(max-width:620px)'));
check('Backend-Version unverändert 3.12.0',pkg.version==='3.12.0');

const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks)console.log(`${ok?'PASS':'FAIL'}  ${name}`);
console.log(`\n${checks.length-failed.length}/${checks.length} Checks bestanden.`);
if(failed.length)process.exit(1);
