"use strict";
const crypto=require("node:crypto");
function clean(v){return String(v??"").trim()}
function bool(v){return v===true||clean(v).toLowerCase()==="true"}
function int(v){const n=Number(v);return Number.isFinite(n)?Math.trunc(n):0}
function evaluateDrill(state={}){
  const checks=[
    ['platform',clean(state.platform)==='win32'],
    ['release_version',/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(clean(state.release_version))],
    ['windows_build',int(state.windows_build)>=19045],
    ['arch',['x64','arm64'].includes(clean(state.arch))],
    ['artifact_sha256',/^[a-f0-9]{64}$/i.test(clean(state.artifact_sha256))],
    ['signature_valid',clean(state.signature_status).toLowerCase()==='valid'],
    ['signer_thumbprint',/^[a-f0-9]{40,64}$/i.test(clean(state.actual_signer_thumbprint))&&clean(state.actual_signer_thumbprint).toLowerCase()===clean(state.expected_signer_thumbprint).toLowerCase()],
    ['clean_install',bool(state.clean_install_verified)],
    ['launcher_started',bool(state.launcher_started_verified)],
    ['device_link',bool(state.device_link_verified)],
    ['updater',bool(state.updater_verified)],
    ['audio_hardware',bool(state.audio_hardware_verified)],
    ['game_capture_hardware',bool(state.game_capture_hardware_verified)]
  ];
  const errors=checks.filter(([,ok])=>!ok).map(([name])=>name);return{ok:errors.length===0,errors,steps:{passed:checks.length-errors.length,total:checks.length},checks:Object.fromEntries(checks)};
}
function stateSha256(state){return crypto.createHash('sha256').update(JSON.stringify(state)).digest('hex')}
module.exports={evaluateDrill,stateSha256};
