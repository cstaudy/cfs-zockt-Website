import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const root = path.resolve(process.argv[2] || ".");
const require = createRequire(import.meta.url);
const modulePath = path.join(root, "lib", "creator-state-snapshot.js");
const serverPath = path.join(root, "server.js");
const homepageJsPath = path.join(root, "public", "assets", "js", "cfs-gaming-home-v112.js");
const techPagePath = path.join(root, "public", "pages", "technical-status.html");

const checks = [];
const pass = (label, fn) => {
  fn();
  checks.push(label);
  console.log(`PASS  ${label}`);
};

pass("creator-state module exists", () => assert.equal(fs.existsSync(modulePath), true));
pass("technical status page exists", () => assert.equal(fs.existsSync(techPagePath), true));

const { buildPublicCreatorState, buildCreatorTechnicalState } = require(modulePath);
const publicState = buildPublicCreatorState({
  community:{
    ok:true,
    refresh_seconds:900,
    tiktok:{available:true,followers:220,url:"https://www.tiktok.com/@cfs_zockt"},
    discord:{available:true,members:26,online:6,url:"https://discord.gg/example"},
    recent_games:{source:"playstation_network",playtime_scope:"lifetime",recent:[{name:"Skyrim",platform:"playstation_5"}],games:[{name:"Skyrim",platform:"playstation_5"}]}
  },
  liveSession:{ok:true,live:true,status:"live",live_source:"recent_live_event",profile_name:"cfs_zockt",viewers:12,current_game:{name:"Skyrim",platform:"playstation_5"}}
});
pass("public snapshot merges live and community data", () => {
  assert.equal(publicState.live.active, true);
  assert.equal(publicState.game.current.name, "Skyrim");
  assert.equal(publicState.social.tiktok.followers, 220);
  assert.equal(publicState.social.discord.members, 26);
});
pass("public snapshot has no token-shaped fields", () => {
  const serialized = JSON.stringify(publicState).toLowerCase();
  assert.equal(serialized.includes("access_token"), false);
  assert.equal(serialized.includes("refresh_token"), false);
  assert.equal(serialized.includes("npsso"), false);
});

const technical = buildCreatorTechnicalState({
  website:{ok:true,status:"online"},
  database:{ok:true,latency_ms:12},
  tiktok:{configured:true,connected:true,stats_scope:true,followers:220},
  launcher:{configured:true,online:true,client_version:"0.47.14"},
  live:{active:true,status:"live",source:"recent_live_event",viewers:12},
  game:{active:true,name:"Skyrim",platform:"playstation_5"},
  playstation:{configured:true,available:true,recent_count:3},
  discord:{available:true,members:26,online:6}
});
pass("technical snapshot resolves healthy system as ready", () => assert.equal(technical.overall, "ready"));
pass("technical snapshot stays secret-free", () => {
  const serialized = JSON.stringify(technical).toLowerCase();
  assert.equal(serialized.includes("token"), false);
  assert.equal(serialized.includes("npsso"), false);
});

const server = fs.readFileSync(serverPath, "utf8");
const homepage = fs.readFileSync(homepageJsPath, "utf8");
pass("server exposes central public creator-state route", () => assert.match(server, /\/api\/public\/creator-state/));
pass("server protects creator technical-status route", () => assert.match(server, /"\/api\/creator\/technical-status"[\s\S]{0,160}requireCreatorAccount/));
pass("technical query does not use decrypted getConnection in its Promise block", () => {
  const block = server.slice(server.indexOf("async function getCreatorTechnicalStatusSnapshot"), server.indexOf("async function refreshPublicCommunityStats"));
  assert.equal(/getConnection\(creatorId\)/.test(block), false);
});
pass("homepage prefers central creator-state endpoint", () => assert.match(homepage, /\/api\/public\/creator-state/));
pass("homepage keeps legacy fallback endpoints", () => {
  assert.match(homepage, /\/api\/public\/community-stats/);
  assert.match(homepage, /\/api\/public\/live-session/);
});

console.log(`\nCreator State v131: ${checks.length}/${checks.length} PASS`);
