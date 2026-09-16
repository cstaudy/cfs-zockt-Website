"use strict";

function text(value,max=500){return String(value??"").trim().slice(0,max)}
function bool(v){return v===true}

function buildGithubBootstrapPlan(options={}){
  const backendVersion=text(options.backendVersion||"3.12.0",80);
  const launcherVersion=text(options.launcherVersion||"0.42.0",80);
  const repo=text(options.repo||"cstaudy/CFS-TikTok-Backend",200);
  const productionUrl=text(options.productionUrl||"",500);
  const hasLocks=bool(options.rootLock)&&bool(options.launcherLock);
  const steps=[
    {
      id:"source_sync",order:1,title:"V41 Source ins aktive Repository übernehmen",
      location:`GitHub Repository ${repo}`,
      action:"Kumulativen Gesamtstand entpacken und dessen Inhalt committen; ZIP/EXE nicht als Source committen.",
      required:true,automated:false
    },
    {
      id:"quality_gate",order:2,title:"Quality Gate auf main prüfen",
      location:"GitHub Actions → Creator Suite Quality Gate",
      action:"Repository Quality und Launcher Release Gate müssen PASS sein.",
      required:true,automated:true
    },
    {
      id:"production_environment",order:3,title:"Production Environment konfigurieren",
      location:"GitHub Settings → Environments → production",
      action:"Secret RENDER_DEPLOY_HOOK_URL und Variable CFS_PRODUCTION_URL setzen.",
      required:true,automated:false
    },
    {
      id:"windows_environment",order:4,title:"Windows Release Environment konfigurieren",
      location:"GitHub Settings → Environments → windows-release",
      action:"Für signierte Builds CSC_LINK und CSC_KEY_PASSWORD setzen.",
      required:true,automated:false
    },
    {
      id:"render_runtime",order:5,title:"Render Runtime prüfen",
      location:"Render → Service → Environment",
      action:`Runtime-Konfiguration für Backend ${backendVersion} vollständig setzen; keine Secrets in GitHub Source.`,
      required:true,automated:false
    },
    {
      id:"labels",order:6,title:"GitHub Labels initialisieren",
      location:"GitHub Actions → Setup Creator Suite Labels",
      action:"Manuellen Label-Workflow einmal ausführen.",
      required:false,automated:true
    },
    {
      id:"main_rules",order:7,title:"main Ruleset aktivieren",
      location:"GitHub Settings → Rules → Rulesets",
      action:"Force Push/Delete blockieren und Quality Checks verpflichtend machen, sobald Workflow-Namen sichtbar sind.",
      required:true,automated:false
    },
    {
      id:"windows_release",order:8,title:`Windows Release ${launcherVersion} bauen`,
      location:"GitHub Actions / Release Tag",
      action:`Tag v${launcherVersion} erst für echten Windows Build verwenden.`,
      required:true,automated:false
    },
    {
      id:"acceptance",order:9,title:"Real-World Acceptance abarbeiten",
      location:"Creator Admin → Release Operations",
      action:"Windows, Updater, Stripe Testmode, OBS, TikTok LIVE sowie Pilot/Expanded Beta real abschließen.",
      required:true,automated:false
    },
    {
      id:"production_go",order:10,title:"Production Go/No-Go prüfen",
      location:"Creator Admin → Release Operations",
      action:"GO darf erst gespeichert werden, wenn das automatische Gate vollständig READY ist.",
      required:true,automated:true
    },
    {
      id:"production_deploy",order:11,title:`Backend ${backendVersion} manuell deployen`,
      location:"GitHub Actions → Production Deploy",
      action:"workflow_dispatch starten und Canary-Evidence prüfen.",
      required:true,automated:false
    },
    {
      id:"lockfiles",order:12,title:"Dependency Lockfiles nachziehen",
      location:"lokale Entwickler-/CI-Umgebung mit npm Registry",
      action:hasLocks?"Root und Launcher Lockfiles vorhanden; Build-Workflows auf npm ci prüfen.":"Root und Launcher package-lock.json erzeugen und danach Build-Workflows auf npm ci umstellen.",
      required:false,automated:false
    }
  ];
  return{
    schema:1,
    generated_at:new Date().toISOString(),
    repository:repo,
    backend_version:backendVersion,
    launcher_version:launcherVersion,
    production_url_configured:Boolean(productionUrl),
    lockfiles_ready:hasLocks,
    steps
  };
}

function planMarkdown(plan={}){
  const lines=[
    "# CFS Creator Suite — GitHub Bootstrap Plan",
    "",
    `Repository: \`${plan.repository||""}\``,
    "",
    `Backend: \`${plan.backend_version||""}\``,
    "",
    `Launcher: \`${plan.launcher_version||""}\``,
    ""
  ];
  for(const step of plan.steps||[]){
    lines.push(`## ${step.order}. ${step.title}`);
    lines.push("");
    lines.push(`Ort: **${step.location}**`);
    lines.push("");
    lines.push(step.action);
    lines.push("");
  }
  return lines.join("\n");
}

module.exports={buildGithubBootstrapPlan,planMarkdown};
