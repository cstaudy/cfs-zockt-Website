import http from "node:http";

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? JSON.parse(text) : {});
      } catch (error) { reject(error); }
    });
    req.on("error", reject);
  });
}

function send(res, status, payload) {
  res.writeHead(status, {"content-type":"application/json"});
  res.end(JSON.stringify(payload));
}

export async function createFakeBridge({
  token = "test-token",
  failEventBatches = 0,
  latencyMs = 0
} = {}) {
  const state = {
    heartbeatCount: 0,
    startCount: 0,
    endCount: 0,
    eventBatchCount: 0,
    receivedEvents: [],
    receivedKeys: new Set(),
    duplicateKeys: [],
    actions: [],
    ackedActions: [],
    nackedActions: [],
    streamBot: {enabled:false,prefix:"!",commands:[]},
    widgetControls: {
      "wins-widget": {name:"Wins Counter",value:2,running:false},
      "timer-widget": {name:"Session Timer",value:90,running:false}
    },
    resumeProbeCount: 0,
    resumeCommitCount: 0,
    session: null,
    scenes: [
      {id:"scene-1",name:"TikTok Main",status:"live",profile:"tiktok_vertical",public_token:"cfss_test",source_url:"https://cfs-zockt.de/widgets/scene.html#token=cfss_test",version:2,published_at:new Date().toISOString()}
    ],
    game: {
      creator_id:"creator-test",
      public_token:"cfsg_test",
      source_url:"https://cfs-zockt.de/games/runtime.html#token=cfsg_test",
      status:"idle",
      title:"Community Battle",
      game_type:"chat_battle",
      config:{title:"Community Battle",game_type:"chat_battle",enabled:true,target_score:10,round_seconds:180,team_a_name:"TEAM A",team_b_name:"TEAM B"},
      state:{score_a:0,score_b:0,winner:"",round:1,target_score:10},
      canvas:{width:900,height:300},
      version:1
    },
    gameRules: [
      {id:"rule-1",label:"Follow Team A",enabled:true,event_type:"follow",team:"a",points:1,amount_mode:"fixed",min_amount:1,gift_name:"",gift_id:"",last_triggered_at:null},
      {id:"rule-2",label:"Rose Team B",enabled:true,event_type:"gift",team:"b",points:5,amount_mode:"multiply",min_amount:1,gift_name:"Rose",gift_id:"",last_triggered_at:null}
    ],
    gameRuleHits: [
      {id:"hit-1",rule_id:"rule-1",event_id:"event-1",event_type:"follow",team:"a",points:1,actor_name:"TestViewer",gift_name:"",created_at:new Date().toISOString()}
    ],
    cutProjects: [
      {id:"cut-1",title:"TikTok Highlight",status:"draft",format:"vertical",clip_count:2,updated_at:new Date().toISOString()}
    ],
    cutJobs: [
      {id:"job-1",project_id:"cut-1",status:"queued",bridge_id:null,attempts:0,manifest:{schema:1,project_id:"cut-1",project_title:"TikTok Highlight",source_name:"stream.mp4",format:"vertical",export_preset:{width:1080,height:1920,fps:30,quality:"high"},clips:[{clip_id:"clip-1",label:"Intro",in_ms:0,out_ms:15000,caption:""}]},result:{},error_message:"",requested_at:new Date().toISOString()}
    ],
    betaSessions: [],
    betaFeedback: [],
    creator: {
      display_name:"Test Creator",
      plan:"pro",
      beta:{status:"active",active:true},
      status:"active",
      profile:{
        connected:true,
        display_name:"TestCreator",
        avatar_url:"https://example.test/avatar.jpg",
        followers:156,
        likes_total:5000,
        updated_at:new Date().toISOString()
      },
      features:{widget_studio:true,launcher:true,live_bridge:true,local_output:true,stream_deck:true,alerts:true,auto_thanks:true,games:true,cut_studio:true,audio_studio:true,obs:true,custom_branding:true,max_stream_deck_buttons:12,max_cut_projects:25,max_cut_clips_per_project:100,max_game_rules:24,max_pending_cut_jobs:50}
    },
    releasePolicy: {
      channel:"stable",
      current_version:"0.23.0",
      minimum_version:"0.15.0",
      recommended_version:"0.23.0",
      build_target_version:"0.23.0",
      compatible:true,
      update_required:false,
      update_available:false,
      rollback_recommended:false,
      version_blocked:false,
      live_allowed:true,
      status:"compatible",
      action:"none",
      rollout:{percent:100,bucket:12,eligible:true,target_version:"0.23.0",assigned_version:"0.23.0",stage:"full"},
      safety:{revision:"test",maintenance:{active:false,message:""},blocked_current_version:false,pin:{version:"",missing:false}}
    },
    failEventBatches,
    online: true
  };

  const server = http.createServer(async (req,res) => {
    if (latencyMs) await new Promise(r => setTimeout(r, latencyMs));
    if (!state.online) return send(res,503,{ok:false,error:"synthetic outage"});
    if (req.headers.authorization !== `Bearer ${token}`) return send(res,401,{ok:false,error:"unauthorized"});

    const url = new URL(req.url, "http://127.0.0.1");
    const path = url.pathname;
    const now = new Date().toISOString();

    if (path === "/api/bridge/widget-studio/scenes" && req.method === "GET") {
      return send(res,200,{ok:true,scenes:state.scenes,server_time:now});
    }
    if (path === "/api/bridge/widget-studio/library" && req.method === "GET") {
      return send(res,200,{ok:true,creator:state.creator,widgets:[{id:"game_runtime",name:"Game · Community Battle",widget_type:"game_runtime",source_url:state.game.source_url}],scenes:state.scenes,game:state.game,game_rules:state.gameRules,game_rule_hits:state.gameRuleHits,cut_projects:state.cutProjects,cut_jobs:state.cutJobs,server_time:now});
    }
    if (path === "/api/bridge/games/rules" && req.method === "GET") {
      return send(res,200,{ok:true,rules:state.gameRules,recent_hits:state.gameRuleHits,limits:{max_rules:24}});
    }
    if (path === "/api/bridge/games/runtime" && req.method === "GET") {
      return send(res,200,{ok:true,runtime:state.game,profile:state.game.config});
    }
    if (path === "/api/bridge/games/runtime/start" && req.method === "POST") {
      state.game={...state.game,status:"running",state:{...state.game.state,score_a:0,score_b:0,winner:"",round:Number(state.game.state.round||1)+1},version:Number(state.game.version||1)+1,started_at:now};
      return send(res,200,{ok:true,runtime:state.game});
    }
    if (path === "/api/bridge/games/runtime/stop" && req.method === "POST") {
      state.game={...state.game,status:"idle",version:Number(state.game.version||1)+1,ended_at:now};
      return send(res,200,{ok:true,runtime:state.game});
    }
    if (path === "/api/bridge/games/runtime/reset" && req.method === "POST") {
      state.game={...state.game,state:{...state.game.state,score_a:0,score_b:0,winner:"",round:Number(state.game.state.round||1)+1},version:Number(state.game.version||1)+1};
      return send(res,200,{ok:true,runtime:state.game});
    }
    if (path === "/api/bridge/games/runtime/score" && req.method === "POST") {
      const body=await readJson(req),team=body.team==="b"?"b":"a",key=team==="b"?"score_b":"score_a",delta=Number(body.delta||1);
      state.game={...state.game,state:{...state.game.state,[key]:Math.max(0,Number(state.game.state[key]||0)+delta)},version:Number(state.game.version||1)+1};
      return send(res,200,{ok:true,runtime:state.game});
    }
    if (path === "/api/bridge/cut-studio/jobs" && req.method === "GET") {
      return send(res,200,{ok:true,jobs:state.cutJobs,limits:{max_pending_jobs:50}});
    }
    if (path.startsWith("/api/bridge/cut-studio/jobs/") && req.method === "POST") {
      const parts=path.split("/").filter(Boolean),id=parts[4],action=parts[5],job=state.cutJobs.find(j=>j.id===id);
      if(!job)return send(res,404,{ok:false,error:"job not found"});
      if(action==="claim"){job.status="claimed";job.bridge_id="bridge-test";job.attempts=Number(job.attempts||0)+1;job.claimed_at=now;}
      else if(action==="processing"){if(job.status!=="claimed")return send(res,409,{ok:false,error:"transition"});job.status="processing";job.started_at=now;}
      else if(action==="complete"){if(job.status!=="processing")return send(res,409,{ok:false,error:"transition"});const body=await readJson(req);job.status="completed";job.result=body.result||{};job.completed_at=now;}
      else if(action==="fail"){const body=await readJson(req);job.status="failed";job.error_message=body.error_message||"failed";}
      else if(action==="retry"){if(!["failed","claimed"].includes(job.status))return send(res,409,{ok:false,error:"transition"});job.status="queued";job.error_message="";}
      else return send(res,404,{ok:false,error:"action"});
      return send(res,200,{ok:true,job});
    }
    if (path === "/api/bridge/cut-studio/projects" && req.method === "GET") {
      return send(res,200,{ok:true,projects:state.cutProjects,limits:{max_projects:25,max_clips_per_project:100}});
    }
    if (path === "/api/bridge/beta/status" && req.method === "GET") return send(res,200,{ok:true,beta:{status:"active",active:true},active_session:state.betaSessions.find(s=>s.status==="active")||null,recent_feedback:state.betaFeedback.slice(-10).reverse()});
    if (path === "/api/bridge/beta/session/start" && req.method === "POST") {const body=await readJson(req);state.betaSessions.forEach(s=>{if(s.status==="active")s.status="abandoned"});const session={id:`beta-${state.betaSessions.length+1}`,label:body.label||"Beta Test",status:"active",started_at:now,launcher_version:body.launcher_version||"",platform:body.platform||"",provider:body.provider||""};state.betaSessions.push(session);return send(res,201,{ok:true,session})}
    if (path === "/api/bridge/beta/session/end" && req.method === "POST") {const body=await readJson(req),session=state.betaSessions.find(s=>s.id===body.session_id&&s.status==="active");if(!session)return send(res,404,{ok:false,error:"not found"});Object.assign(session,{status:"completed",ended_at:now,result_summary:body.result_summary||""});return send(res,200,{ok:true,session})}
    if (path === "/api/bridge/beta/feedback" && req.method === "POST") {const body=await readJson(req),feedback={id:`feedback-${state.betaFeedback.length+1}`,status:"new",created_at:now,...body};state.betaFeedback.push(feedback);return send(res,201,{ok:true,feedback})}
    if (path === "/api/bridge/widget-studio/status" && req.method === "GET") {
      return send(res,200,{ok:true,protocol:1,server_time:now,live:state.session || {connected:false,session_id:null},creator:state.creator,release_policy:state.releasePolicy,release_catalog:{ok:true,repo:"test/repo"}});
    }
    if (path === "/api/bridge/widget-studio/heartbeat" && req.method === "POST") {
      state.heartbeatCount++;
      return send(res,200,{ok:true,server_time:now,bridge:{connected:true},live:state.session || {connected:false,session_id:null},creator:state.creator,release_policy:state.releasePolicy,release_catalog:{ok:true,repo:"test/repo"}});
    }
    if (path === "/api/bridge/widget-studio/session/resume" && req.method === "POST") {
      const body = await readJson(req);
      if (!body.session_id) return send(res,400,{ok:false,allowed:false,error:"missing session"});
      if (state.releasePolicy.live_allowed === false || state.releasePolicy.version_blocked || state.releasePolicy.update_required || state.releasePolicy.safety?.maintenance?.active) {
        return send(res,200,{ok:true,allowed:false,reason:"release_policy",message:"blocked",release_policy:state.releasePolicy,release_catalog:{ok:true,repo:"test/repo"}});
      }
      if (body.dry_run === true) {
        state.resumeProbeCount++;
        return send(res,200,{ok:true,allowed:true,dry_run:true,session_id:body.session_id,live:state.session || {connected:false,session_id:body.session_id,likes:77},creator:state.creator,release_policy:state.releasePolicy,release_catalog:{ok:true,repo:"test/repo"}});
      }
      state.resumeCommitCount++;
      state.session = state.session || {connected:true,session_id:body.session_id,started_at:now,provider:"launcher_bridge",likes:77};
      state.session = {...state.session,connected:true,session_id:body.session_id};
      return send(res,200,{ok:true,allowed:true,recovered:true,session_id:body.session_id,live:state.session,creator:state.creator,release_policy:state.releasePolicy,release_catalog:{ok:true,repo:"test/repo"}});
    }
    if (path === "/api/bridge/widget-studio/session/start" && req.method === "POST") {
      const body = await readJson(req);
      state.startCount++;
      state.session = {connected:true,session_id:`session-${state.startCount}`,started_at:now,provider:body?.payload?.provider || "mock"};
      return send(res,200,{ok:true,server_time:now,live:state.session});
    }
    if (path === "/api/bridge/widget-studio/session/end" && req.method === "POST") {
      state.endCount++;
      const ended = state.session ? {...state.session,connected:false,ended_at:now} : {connected:false,session_id:null};
      state.session = null;
      return send(res,200,{ok:true,server_time:now,live:ended});
    }
    if (path === "/api/bridge/widget-studio/stream-bot" && req.method === "GET") {
      return send(res,200,{ok:true,stream_bot:state.streamBot});
    }
    if (path === "/api/bridge/widget-studio/stream-bot" && req.method === "POST") {
      const body=await readJson(req);
      state.streamBot={...(body.stream_bot||body||{})};
      return send(res,200,{ok:true,stream_bot:state.streamBot});
    }
    if (path.startsWith("/api/bridge/widget-studio/widgets/") && path.endsWith("/control") && req.method === "POST") {
      const parts=path.split("/").filter(Boolean);
      const id=decodeURIComponent(parts[4]||"");
      const body=await readJson(req);
      const current=state.widgetControls[id]||{name:id||"Widget",value:0,running:false};
      let value=Math.max(0,Number(current.value||0));
      let running=Boolean(current.running);
      const action=String(body.action||"increment");
      if(action==="reset"){value=0;running=false;}
      else if(action==="set")value=Math.max(0,Number(body.value||0));
      else if(action==="increment")value=Math.max(0,value+Number(body.amount||1));
      else if(action==="toggle")running=!running;
      else if(action==="start")running=true;
      else if(action==="pause")running=false;
      else return send(res,400,{ok:false,error:"unknown widget control"});
      state.widgetControls[id]={...current,value,running};
      return send(res,200,{ok:true,value,running,widget:{id,name:current.name}});
    }
    if (path === "/api/bridge/widget-studio/events" && req.method === "POST") {
      state.eventBatchCount++;
      if (state.failEventBatches > 0) {
        state.failEventBatches--;
        return send(res,503,{ok:false,error:"synthetic event outage"});
      }
      const body = await readJson(req);
      for (const event of body.events || []) {
        const key = String(event.event_key || "");
        if (state.receivedKeys.has(key)) state.duplicateKeys.push(key);
        else {
          state.receivedKeys.add(key);
          state.receivedEvents.push(event);
        }
      }
      return send(res,200,{ok:true,server_time:now,bridge:{connected:true},live:state.session || {connected:false,session_id:null}});
    }
    if (path === "/api/bridge/widget-studio/actions" && req.method === "GET") {
      return send(res,200,{ok:true,actions:state.actions.filter(x => !state.ackedActions.includes(String(x.id)))});
    }
    if (path === "/api/bridge/widget-studio/actions/ack" && req.method === "POST") {
      const body = await readJson(req);
      for (const id of body.ids || []) if (!state.ackedActions.includes(String(id))) state.ackedActions.push(String(id));
      return send(res,200,{ok:true,acked:(body.ids || []).length});
    }
    if (path === "/api/bridge/widget-studio/actions/nack" && req.method === "POST") {
      const body = await readJson(req);
      for (const id of body.ids || []) state.nackedActions.push({id:String(id),error:String(body.error||"")});
      return send(res,200,{ok:true,nacked:(body.ids||[]).length,retry_scheduled:(body.ids||[]).length,expired:0});
    }
    return send(res,404,{ok:false,error:`not found: ${path}`});
  });

  await new Promise((resolve,reject) => {
    server.listen(0,"127.0.0.1",resolve);
    server.once("error",reject);
  });

  const address = server.address();
  return {
    url:`http://127.0.0.1:${address.port}`,
    token,
    state,
    setOnline(value){ state.online = Boolean(value); },
    pushAction(action){ state.actions.push(action); },
    close(){ return new Promise(resolve => server.close(resolve)); }
  };
}
