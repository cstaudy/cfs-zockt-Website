"use strict";

const CONTRACTS = Object.freeze({
  twitch:Object.freeze({
    provider:"twitch",
    label:"Twitch",
    status:"oauth_implemented",
    flow:"authorization_code",
    authorization_url:"https://id.twitch.tv/oauth2/authorize",
    token_url:"https://id.twitch.tv/oauth2/token",
    revoke_url:"https://id.twitch.tv/oauth2/revoke",
    validate_url:"https://id.twitch.tv/oauth2/validate",
    config:{client_id_env:"TWITCH_CLIENT_ID",client_secret_env:"TWITCH_CLIENT_SECRET",redirect_uri_env:"TWITCH_REDIRECT_URI"},
    scope_policy:"feature_derived_least_privilege",
    planned_capabilities:["account_link","live_status","chat_read","chat_send","eventsub"],
    implemented_capabilities:["account_link","token_refresh","token_validate","profile_sync","disconnect","live_status","eventsub","chat_read"],
    token_policy:{access_token:"server_encrypted",refresh_token:"server_encrypted",rotation:"required",revoke_on_disconnect:true,validate_interval_minutes:55},
    oauth_implemented:true,
    production_ready:false
  }),
  youtube:Object.freeze({
    provider:"youtube",
    label:"YouTube",
    status:"oauth_live_chat_implemented",
    flow:"authorization_code",
    authorization_url:"https://accounts.google.com/o/oauth2/v2/auth",
    token_url:"https://oauth2.googleapis.com/token",
    revoke_url:"https://oauth2.googleapis.com/revoke",
    config:{client_id_env:"GOOGLE_CLIENT_ID",client_secret_env:"GOOGLE_CLIENT_SECRET",redirect_uri_env:"YOUTUBE_REDIRECT_URI"},
    scope_policy:"staged_least_privilege",
    read_scope:"https://www.googleapis.com/auth/youtube.readonly",
    manage_scopes:["https://www.googleapis.com/auth/youtube","https://www.googleapis.com/auth/youtube.force-ssl"],
    planned_capabilities:["broadcast_stream_bind","stream_target"],
    implemented_capabilities:["channel_link","token_refresh","profile_sync","disconnect","live_broadcast_read","live_status","live_chat_read","membership_events","super_chat_events"],
    token_policy:{access_token:"server_encrypted",refresh_token:"server_encrypted",rotation:"required",revoke_on_disconnect:true,offline_access:"required_for_persistent_connection"},
    oauth_implemented:true,
    production_ready:false
  })
});

function configured(env, contract) {
  const source=env&&typeof env==="object"?env:{};
  const config=contract.config||{};
  return {
    client_id:Boolean(String(source[config.client_id_env]||"").trim()),
    client_secret:Boolean(String(source[config.client_secret_env]||"").trim()),
    redirect_uri:Boolean(String(source[config.redirect_uri_env]||"").trim())
  };
}

function publicProviderOAuthContracts(env=process.env) {
  return Object.values(CONTRACTS).map(contract=>({
    provider:contract.provider,
    label:contract.label,
    status:contract.status,
    flow:contract.flow,
    authorization_url:contract.authorization_url,
    token_url:contract.token_url,
    revoke_url:contract.revoke_url,
    ...(contract.validate_url?{validate_url:contract.validate_url}:{}),
    scope_policy:contract.scope_policy,
    ...(contract.read_scope?{read_scope:contract.read_scope}:{}),
    ...(contract.manage_scopes?{manage_scopes:[...contract.manage_scopes]}:{}),
    planned_capabilities:[...contract.planned_capabilities],
    ...(contract.implemented_capabilities?{implemented_capabilities:[...contract.implemented_capabilities]}:{}),
    token_policy:{...contract.token_policy},
    configuration:configured(env,contract),
    oauth_implemented:Boolean(contract.oauth_implemented),
    production_ready:Boolean(contract.production_ready),
    secrets_exposed:false
  }));
}

module.exports={CONTRACTS,configured,publicProviderOAuthContracts};
