const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function safeReason(value) {
  return String(value || "manual")
    .replace(/[^a-zA-Z0-9._-]+/g,"_")
    .replace(/^_+|_+$/g,"")
    .slice(0,60) || "manual";
}

class RecoveryManager {
  constructor({ rootDir, settingsPath, spoolPath, logger, maxPoints = 6 }) {
    this.rootDir = rootDir;
    this.settingsPath = settingsPath;
    this.spoolPath = spoolPath;
    this.logger = logger;
    this.maxPoints = Math.max(3, Math.min(20, Number(maxPoints) || 6));
    fs.mkdirSync(this.rootDir, {recursive:true});
  }

  create(reason = "manual", appVersion = "") {
    const id = `${new Date().toISOString().replace(/[:.]/g,"-")}_${safeReason(reason)}`;
    const dir = path.join(this.rootDir,id);
    fs.mkdirSync(dir,{recursive:true});

    const files = {};
    for (const [key,source,name] of [
      ["settings",this.settingsPath,"settings.json"],
      ["spool",this.spoolPath,"pending-events.json"]
    ]) {
      if (!source || !fs.existsSync(source)) continue;
      const target = path.join(dir,name);
      fs.copyFileSync(source,target);
      files[key] = {name,sha256:sha256File(target),bytes:fs.statSync(target).size};
    }

    const meta = {
      schema:1,
      id,
      reason:safeReason(reason),
      created_at:new Date().toISOString(),
      launcher_version:String(appVersion || ""),
      machine_local:true,
      files
    };
    fs.writeFileSync(path.join(dir,"restore-point.json"),JSON.stringify(meta,null,2),"utf8");
    this.prune();
    this.logger?.info("Restore point created", id);
    return meta;
  }

  readMeta(dir) {
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(dir,"restore-point.json"),"utf8"));
      if (meta?.schema !== 1 || !meta.id) return null;
      return meta;
    } catch { return null; }
  }

  list() {
    const entries = [];
    for (const name of fs.readdirSync(this.rootDir,{withFileTypes:true})) {
      if (!name.isDirectory()) continue;
      const dir = path.join(this.rootDir,name.name);
      const meta = this.readMeta(dir);
      if (meta) entries.push(meta);
    }
    return entries.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
  }

  verify(id) {
    const safe = path.basename(String(id || ""));
    const dir = path.join(this.rootDir,safe);
    const meta = this.readMeta(dir);
    if (!meta || meta.id !== safe) throw new Error("Restore Point nicht gefunden.");
    const checks = [];
    for (const [key,info] of Object.entries(meta.files || {})) {
      const file = path.join(dir,path.basename(info.name));
      const exists = fs.existsSync(file);
      const hash = exists ? sha256File(file) : "";
      checks.push({key,ok:exists && hash === info.sha256,exists,hash,expected:info.sha256});
    }
    return {ok:checks.every(x=>x.ok),meta,checks};
  }

  restore(id) {
    const verified = this.verify(id);
    if (!verified.ok) throw new Error("Restore Point ist beschädigt und wurde nicht wiederhergestellt.");
    const dir = path.join(this.rootDir,path.basename(id));

    const mapping = [
      ["settings",this.settingsPath],
      ["spool",this.spoolPath]
    ];
    for (const [key,target] of mapping) {
      const info = verified.meta.files?.[key];
      if (!info || !target) continue;
      const source = path.join(dir,path.basename(info.name));
      fs.mkdirSync(path.dirname(target),{recursive:true});
      const tmp = `${target}.restore.tmp`;
      fs.copyFileSync(source,tmp);
      fs.renameSync(tmp,target);
    }
    this.logger?.warn("Restore point restored", String(id));
    return verified.meta;
  }

  prune() {
    const list = this.list();
    for (const item of list.slice(this.maxPoints)) {
      fs.rmSync(path.join(this.rootDir,item.id),{recursive:true,force:true});
    }
  }
}

module.exports = { RecoveryManager, sha256File };
