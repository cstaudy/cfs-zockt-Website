import fs from "node:fs";
import path from "node:path";
const root=path.resolve(".");
const args=process.argv.slice(2);const value=n=>{const i=args.indexOf(n);return i>=0?args[i+1]||"":""};
const duration=Math.max(60,Math.min(360,Number(value("--minutes")||60)||60));
const targets=Math.max(1,Math.min(8,Number(value("--targets")||2)||2));
const plan={schema:1,tooling_version:"v191",generated_at:new Date().toISOString(),real_test_executed:false,duration_minutes:duration,expected_targets:targets,sample_interval_seconds:2,scenarios:[
 {id:"baseline",minute:0,action:"Stream/Multistream starten und Baseline markieren."},
 {id:"provider_drop",minute:15,action:"Genau ein Provider-Ziel kontrolliert unterbrechen; andere Ziele müssen weiterlaufen."},
 {id:"network_drop",minute:30,action:"Kurze Netzwerkunterbrechung durchführen; Reconnect protokollieren."},
 {id:"launcher_restart",minute:45,action:"Launcher kontrolliert neu starten und Recovery dokumentieren."},
 {id:"finish",minute:duration,action:"Soak beenden, Runtime-Evidence/Support-Bundle erzeugen und secret-frei prüfen."}
],required_acceptance_ids:["multistream.parallel","multistream.isolation","stability.network_drop","stability.provider_drop","stability.launcher_restart","stability.soak","stability.watchdog"]};
fs.writeFileSync(path.join(root,"reports/rc-soak-plan-v191.json"),JSON.stringify(plan,null,2)+"\n","utf8");
console.log(JSON.stringify({ok:true,file:"reports/rc-soak-plan-v191.json",minutes:duration,targets}));
