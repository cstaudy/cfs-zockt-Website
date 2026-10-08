import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const checks={
  website_version:pkg.version==='3.20.71',
  admin_finance_module:fs.existsSync(path.join(root,'lib/admin-finance-v32071.js')),
  admin_finance_interface:fs.existsSync(path.join(root,'public/assets/js/admin-finance-v32071.js')),
  admin_cfs_ai_bridge:fs.existsSync(path.join(root,'public/assets/js/admin-cfs-ai-design-v32070.js')),
  original_design_reference:fs.existsSync(path.join(root,'resources/original-designs/Streaming-Gesamtpaket-31-Designs-496-Farbvarianten-Animiert-DE.zip'))
};
const codeArtifactsReady=Object.values(checks).every(Boolean);
const status=codeArtifactsReady?'BETA_TESTS_REQUIRED':'SOURCE_INCOMPLETE';
const report={release:'3.20.71',status,code_artifacts_checked:checks,public_release_approved:false,external_verification:'NOT_RUN',
  release_blockers:[
    'Echte bezahlte Shop-Paketkäufe: Checkout, Stripe-Webhooks, Entitlements, Refunds und E2E fehlen weiterhin.',
    'Stripe Live/Testmode mit echtem Account und Rechnungs-/Refund-Abgleich noch nicht abgenommen.',
    'Windows Launcher, OBS, Live-Provider, Mobile-/Desktop-Browser und KI-Bridge mit Ollama real testen.',
    'Korrekte Shop-Dateiimporte, Recovery/Backup, Rechte/Security und Live-Deployment auf Zielumgebung prüfen.',
    'Für einen öffentlichen Release sind klare Produkt-/Preisangaben, Lizenz/Rechtstexte und Steuer-/Abrechnungsworkflow zu prüfen.'
  ]};
console.log(JSON.stringify(report,null,2));
if(!codeArtifactsReady)process.exitCode=2;
