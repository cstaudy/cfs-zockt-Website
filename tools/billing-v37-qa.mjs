import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const must = (value, message) => {
  if (!value) throw new Error(message);
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const explicitRoot = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : null;

const candidates = [
  explicitRoot,
  path.resolve(scriptDir, ".."),
  process.cwd(),
  path.resolve(process.cwd(), ".."),
].filter(Boolean);

const uniqueCandidates = [...new Set(candidates)];
const requiredRootFiles = [
  "server.js",
  "package.json",
  path.join("lib", "creator-billing.js"),
  path.join("public", "pages", "plans.html"),
];

const root = uniqueCandidates.find((candidate) =>
  requiredRootFiles.every((relative) => fs.existsSync(path.join(candidate, relative)))
);

if (!root) {
  const diagnostics = uniqueCandidates.map((candidate) => ({
    candidate,
    files: Object.fromEntries(
      requiredRootFiles.map((relative) => [
        relative,
        fs.existsSync(path.join(candidate, relative)),
      ])
    ),
  }));
  throw new Error(`Creator Suite repository root not found: ${JSON.stringify(diagnostics)}`);
}

const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const billing = fs.readFileSync(path.join(root, "lib/creator-billing.js"), "utf8");
const plans = fs.readFileSync(path.join(root, "public/pages/plans.html"), "utf8");
const plansJs = fs.readFileSync(path.join(root, "public/assets/js/billing-plans.js"), "utf8");
const admin = fs.readFileSync(path.join(root, "public/assets/js/admin-creators.js"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

must(pkg.dependencies?.stripe, "stripe dependency");
must(server.indexOf('"/api/billing/stripe/webhook"') < server.indexOf("express.json({"), "raw webhook before json");
must(server.includes("webhooks.constructEvent") && server.includes("STRIPE_WEBHOOK_SECRET"), "signature verification");
must(server.includes("creator_billing_events") && server.includes("last_event_created"), "webhook dedupe/order storage");
must(server.includes('mode:"subscription"') && server.includes("subscription_data") && server.includes("client_reference_id"), "hosted checkout subscription metadata");
must(server.includes("billingPortal.sessions.create") && server.includes("return_url"), "customer portal");
must(server.includes("invoice.payment_failed") && server.includes("BILLING_GRACE_DAYS") && server.includes("invoice.paid"), "grace/payment recovery");
must(server.includes("effectiveBillingPlan") && server.includes('billingRaised?"billing_plus_beta":"plan_plus_beta"') && server.includes("entitlements.access_source=accessSource"), "billing entitlement source");
must(server.includes("/api/admin/creator-suite/production-readiness") && server.includes("PRODUCTION_VERIFICATION_FLAGS"), "production readiness");
must(billing.includes("current_period_end") && billing.includes("payment_grace") && billing.includes("trialing"), "billing state machine");
must(plans.includes('data-checkout-plan="creator"') && plans.includes('data-checkout-plan="pro"') && plans.includes("openBillingPortal"), "plans billing UI");
must(plansJs.includes("/api/creator/billing/checkout") && plansJs.includes("/api/creator/billing/portal") && plansJs.includes("payment_grace"), "plans billing JS");
must(admin.includes("production-readiness") && admin.includes("billing-center"), "admin release/billing UI");
must(!plansJs.includes("CFS_STRIPE_SECRET_KEY") && !plansJs.includes("whsec_") && !plans.includes("sk_"), "no browser secrets");

console.log(JSON.stringify({
  ok: true,
  root,
  checkout: true,
  webhook_signature: true,
  event_dedupe: true,
  portal: true,
  grace: true,
  production_gate: true,
  no_browser_secrets: true,
}));
