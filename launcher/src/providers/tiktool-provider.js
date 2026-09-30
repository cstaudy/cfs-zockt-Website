const { EventEmitter } = require("node:events");
const { GiftStreakTracker } = require("../gift-streak-tracker");

function actor(event = {}) {
  const user = event.user || {};
  return {
    name: String(user.uniqueId || user.nickname || event.uniqueId || "").slice(0,100),
    avatar: String(
      user.avatarUrl ||
      user.profilePictureUrl ||
      user.avatarThumb?.urlList?.[0] ||
      user.avatarMedium?.urlList?.[0] ||
      ""
    ).slice(0,2000)
  };
}

function eventKey(type, event = {}) {
  const raw =
    event.msgId ||
    event.id ||
    event.messageId ||
    event.common?.msgId ||
    event.common?.messageId;
  return raw ? `tiktool-${type}-${raw}` : `tiktool-${type}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
}

class TikToolProvider extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger;
    this.client = null;
    this.running = false;
    this.username = "";
    this.status = "idle";
    this.lastConnectedAt = null;
    this.lastDisconnectedAt = null;
    this.lastEventAt = null;
    this.lastError = "";
    this.metrics = {events:0,connectAttempts:0};
    this.giftTracker = new GiftStreakTracker({
      logger,
      timeoutMs: 1800,
      emit: event => this.emitGift(event)
    });
  }

  info() {
    return {
      key: "tiktool",
      label: "TikTok LIVE · TikTool",
      ready: true,
      connected: Boolean(this.client?.connected),
      username: this.username,
      status: this.status,
      lastConnectedAt: this.lastConnectedAt,
      lastDisconnectedAt: this.lastDisconnectedAt,
      lastEventAt: this.lastEventAt,
      lastError: this.lastError,
      reconnectManaged: true,
      metrics: {...this.metrics},
      thirdParty: true,
      official: false,
      capabilities: ["follow","like","gift","share","viewer_update","chat"]
    };
  }

  emitNormalized(event) {
    this.lastEventAt = new Date().toISOString();
    this.metrics.events += 1;
    this.emit("event", event);
  }

  emitGift(e = {}) {
    const a = actor(e);
    const amount = Math.max(1, Number(e.repeatCount || 1));
    const diamonds = Math.max(0, Number(e.diamondCount || e.gift?.diamondCount || 0));
    this.emitNormalized({
      event_key: eventKey("gift", e),
      event_type: "gift",
      actor_name: a.name,
      actor_avatar: a.avatar,
      amount,
      value: diamonds * amount,
      payload: {
        gift_name: String(e.giftName || e.gift?.name || "Gift").slice(0,120),
        gift_id: String(e.giftId || e.gift?.id || "").slice(0,120),
        repeat_count: amount,
        repeat_end: e.repeatEnd === true,
        provider_value_unit: "diamonds"
      }
    });
  }

  async start(context = {}) {
    const username = String(context.username || "").trim().replace(/^@/,"");
    const apiKey = String(context.apiKey || "").trim();
    if (!username) throw new Error("TikTok Username fehlt.");
    if (!apiKey) throw new Error("TikTool API-Key fehlt.");

    await this.stop();

    let TikTokLive;
    try {
      ({ TikTokLive } = require("tiktok-live-api"));
    } catch (error) {
      throw new Error("Provider-Paket `tiktok-live-api` ist nicht installiert. Bitte im Launcher `npm install` ausführen bzw. den Installer neu bauen.");
    }

    this.username = username;
    this.status = "connecting";
    this.lastError = "";
    this.metrics.connectAttempts += 1;
    this.client = new TikTokLive(username, {
      apiKey,
      autoReconnect: true,
      maxReconnectAttempts: 8
    });

    this.client.on("connected", () => {
      this.running = true;
      this.status = "connected";
      this.lastConnectedAt = new Date().toISOString();
      this.lastError = "";
      this.emit("state", { ready:true, connected:true, status:this.status, message:`Verbunden mit @${username}` });
      this.logger?.info("TikTool LIVE provider connected", `@${username}`);
    });

    this.client.on("disconnected", () => {
      this.running = false;
      this.lastDisconnectedAt = new Date().toISOString();
      this.status = this.client ? "reconnecting" : "idle";
      this.emit("state", { ready:true, connected:false, status:this.status, message:`LIVE Provider getrennt · @${username}` });
      this.logger?.warn("TikTool LIVE provider disconnected", `@${username}`);
    });

    this.client.on("follow", e => {
      const a=actor(e);
      this.emitNormalized({event_key:eventKey("follow",e),event_type:"follow",actor_name:a.name,actor_avatar:a.avatar,amount:1,payload:{}});
    });

    this.client.on("like", e => {
      const a=actor(e);
      this.emitNormalized({
        event_key:eventKey("like",e),
        event_type:"like",
        actor_name:a.name,
        actor_avatar:a.avatar,
        amount:Math.max(1,Number(e.likeCount||1)),
        payload:{ total_likes:Number(e.totalLikes||0) }
      });
    });

    this.client.on("share", e => {
      const a=actor(e);
      this.emitNormalized({event_key:eventKey("share",e),event_type:"share",actor_name:a.name,actor_avatar:a.avatar,amount:1,payload:{}});
    });

    this.client.on("chat", e => {
      const a=actor(e);
      const message=String(e.comment || e.message || e.text || "").replace(/[\r\n\t]+/g," ").trim().slice(0,280);
      if(!message) return;
      this.emitNormalized({
        event_key:eventKey("chat",e),
        event_type:"chat",
        actor_name:a.name,
        actor_avatar:a.avatar,
        amount:1,
        payload:{ message }
      });
    });

    this.client.on("gift", e => {
      this.giftTracker.handle(e);
    });

    this.client.on("roomUserSeq", e => {
      this.emitNormalized({
        event_key:eventKey("viewer_update",e),
        event_type:"viewer_update",
        amount:Math.max(0,Number(e.viewerCount||0)),
        payload:{}
      });
    });

    this.client.on("status", e => {
      const message=String(e?.message||e?.status||"Provider status").slice(0,300);
      this.emit("state", { ready:true, connected:Boolean(this.client?.connected), status:this.status, message });
    });

    try {
      await this.client.connect();
      this.running = true;
      if (this.status !== "connected") this.status = "connected";
      return this.info();
    } catch (error) {
      this.running = false;
      this.status = "error";
      this.lastError = String(error?.message||error).slice(0,500);
      this.emit("state", {ready:true,connected:false,status:this.status,message:this.lastError});
      throw error;
    }
  }

  async stop() {
    const current=this.client;
    this.giftTracker.flushAll("provider_stop");
    this.client=null;
    this.running=false;
    this.status="idle";
    if(current){
      try { await current.disconnect(); } catch {}
    }
    this.emit("state",{ready:true,connected:false,status:this.status,message:"Provider gestoppt"});
    return this.info();
  }
}

module.exports={TikToolProvider};
