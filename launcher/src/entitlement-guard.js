"use strict";

const ACTION_REQUIREMENTS=Object.freeze({
  live_toggle:"live_bridge",
  scene_next:"local_output",
  scene_start:"local_output",
  output_stop:"local_output",
  output_reload:"local_output",
  alert_follow:"alerts",
  alert_gift:"alerts",
  alert_share:"alerts",
  autothanks_toggle:"auto_thanks",
  widget_toggle:"local_output",
  counter_plus_1:"widget_studio",
  counter_minus_1:"widget_studio",
  counter_plus_5:"widget_studio",
  counter_reset:"widget_studio",
  timer_toggle:"widget_studio",
  timer_reset:"widget_studio",
  timer_plus_60:"widget_studio",
  timer_minus_60:"widget_studio",
  game_toggle:"games",
  game_score_a:"games",
  game_score_b:"games",
  game_reset:"games",
  open_cut_project:"cut_studio"
});

function featureAllowed(features={},feature){return !feature||features?.[feature]===true;}
function requiredFeatureForAction(action){return ACTION_REQUIREMENTS[String(action||"")]||"";}
function deckSlotIndex(buttonId){const match=/^slot_(\d+)$/.exec(String(buttonId||""));return match?Number(match[1]):0;}
function assertFeature(features,feature,label="Diese Funktion"){
  if(featureAllowed(features,feature))return true;
  const error=new Error(`${label} ist in deinem aktuellen Creator-Zugriff nicht freigeschaltet.`);
  error.code="entitlement_locked";error.feature=feature;throw error;
}
function assertStreamDeckButton(features,button){
  assertFeature(features,"stream_deck","CFS Stream Deck");
  const index=deckSlotIndex(button?.id),max=Math.max(0,Number(features?.max_stream_deck_buttons||0));
  if(!index||index>max){const error=new Error(`Dein Creator-Zugriff erlaubt ${max} Stream-Deck Tasten.`);error.code="deck_limit";error.max=max;throw error;}
  const required=requiredFeatureForAction(button?.action);
  if(required)assertFeature(features,required,button?.label||"Diese Stream-Deck Aktion");
  return true;
}
module.exports={ACTION_REQUIREMENTS,featureAllowed,requiredFeatureForAction,deckSlotIndex,assertFeature,assertStreamDeckButton};
