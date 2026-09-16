"use strict";

const PAGE_ACTIONS=Object.freeze({
  open_dashboard:"/pages/dashboard.html",
  open_widget_studio:"/pages/widget-studio.html",
  open_scene_studio:"/pages/scene-studio.html",
  open_games:"/pages/games.html",
  open_cut_studio:"/pages/cut-studio.html"
});

async function executeStreamDeckAction(button,ctx={}){
  if(!button||!button.action)throw new Error("Stream-Deck Button ist ungültig.");
  const action=String(button.action);
  const target=String(button.target||"");

  switch(action){
    case "none":
      return {ok:true,action,message:"Button ist nicht belegt."};

    case "live_toggle":
      if(await ctx.isLive?.()){
        await ctx.endLive?.();
        return {ok:true,action,message:"LIVE beendet."};
      }
      await ctx.startLive?.();
      return {ok:true,action,message:"LIVE gestartet."};

    case "scene_next":{
      const scene=await ctx.startNextScene?.();
      return {ok:true,action,message:scene?.name?`Scene gestartet: ${scene.name}`:"Nächste Scene gestartet.",scene};
    }

    case "scene_start":{
      if(!target)throw new Error("Diesem Button ist noch keine Scene zugewiesen.");
      const scene=await ctx.startScene?.(target);
      return {ok:true,action,message:scene?.name?`Scene gestartet: ${scene.name}`:"Scene gestartet.",scene};
    }

    case "output_stop":
      await ctx.stopOutput?.();
      return {ok:true,action,message:"Local Output gestoppt."};

    case "output_reload":
      await ctx.reloadOutput?.();
      return {ok:true,action,message:"Local Output wird neu geladen."};

    case "alert_follow":
      await ctx.testAlert?.("follow");
      return {ok:true,action,message:"Follow Test-Alert ausgelöst."};

    case "alert_gift":
      await ctx.testAlert?.("gift");
      return {ok:true,action,message:"Gift Test-Alert ausgelöst."};

    case "alert_share":
      await ctx.testAlert?.("share");
      return {ok:true,action,message:"Share Test-Alert ausgelöst."};

    case "autothanks_toggle":{
      const enabled=await ctx.toggleAutoThanks?.();
      return {ok:true,action,message:`AutoThanks ${enabled?"AN":"AUS"}.`,enabled};
    }

    case "widget_toggle":{
      if(!target)throw new Error("Diesem Button ist noch kein Widget zugewiesen.");
      const result=await ctx.toggleWidget?.(target);
      return {ok:true,action,message:`Widget ${result?.visible===false?"AUS":"AN"}.`,...result};
    }

    case "counter_plus_1":
    case "counter_minus_1":
    case "counter_plus_5":
    case "counter_reset":{
      if(!target)throw new Error("Diesem Button ist noch kein Counter-Widget zugewiesen.");
      const control=action==="counter_reset"
        ? {action:"reset"}
        : {action:"increment",amount:action==="counter_plus_5"?5:action==="counter_minus_1"?-1:1};
      const result=await ctx.controlWidget?.(target,control);
      const name=result?.widget?.name||"Counter";
      return {ok:true,action,message:`${name}: ${Number(result?.value||0)}`,widget_control:result};
    }

    case "timer_toggle":
    case "timer_reset":
    case "timer_plus_60":
    case "timer_minus_60":{
      if(!target)throw new Error("Diesem Button ist noch kein Timer-Widget zugewiesen.");
      const control=action==="timer_toggle"
        ? {action:"toggle"}
        : action==="timer_reset"
          ? {action:"reset"}
          : {action:"increment",amount:action==="timer_plus_60"?60:-60};
      const result=await ctx.controlWidget?.(target,control);
      const total=Math.max(0,Number(result?.value||0));
      const minutes=Math.floor(total/60),seconds=Math.floor(total%60);
      const stamp=`${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
      const timerState=result?.running?"LÄUFT":"PAUSE";
      return {ok:true,action,message:`Timer ${timerState} · ${stamp}`,widget_control:result};
    }

    case "refresh_library":
      await ctx.refreshLibrary?.();
      return {ok:true,action,message:"Creator-Daten aktualisiert."};

    case "game_toggle":{
      const running=Boolean((await ctx.gameStatus?.())?.status==="running");
      const game=running?await ctx.gameStop?.():await ctx.gameStart?.();
      return{ok:true,action,message:running?"Game gestoppt.":"Game gestartet.",game};
    }

    case "game_score_a":{
      const game=await ctx.gameScore?.("a",1);
      return{ok:true,action,message:"Team A +1",game};
    }

    case "game_score_b":{
      const game=await ctx.gameScore?.("b",1);
      return{ok:true,action,message:"Team B +1",game};
    }

    case "game_reset":{
      const game=await ctx.gameReset?.();
      return{ok:true,action,message:"Game-Runde zurückgesetzt.",game};
    }

    case "open_cut_project":{
      if(!target)throw new Error("Diesem Button ist noch kein Cut-Projekt zugewiesen.");
      await ctx.openCutProject?.(target);
      return{ok:true,action,message:"Cut-Projekt geöffnet.",project_id:target};
    }

    default:
      if(PAGE_ACTIONS[action]){
        await ctx.openPage?.(PAGE_ACTIONS[action]);
        return {ok:true,action,message:"Creator Tool geöffnet.",path:PAGE_ACTIONS[action]};
      }
      throw new Error("Diese Stream-Deck Aktion wird nicht unterstützt.");
  }
}

module.exports={executeStreamDeckAction,PAGE_ACTIONS};
