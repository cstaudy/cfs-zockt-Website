const PROVIDERS = Object.freeze({
  youtube: Object.freeze({
    key:"youtube",
    label:"YouTube",
    support:"supported",
    transport:"RTMPS",
    credentialMode:"stream_key",
    serverHint:"RTMPS-Server-URL aus YouTube Live Control Room",
    keyHint:"Stream-Key aus YouTube Live Control Room",
    setupHint:"YouTube Live im Kanal aktivieren, im Live Control Room Stream anlegen und RTMPS-URL plus Stream-Key lokal im CFS Launcher eintragen.",
    docs:"https://support.google.com/youtube/answer/10364924"
  }),
  twitch: Object.freeze({
    key:"twitch",
    label:"Twitch",
    support:"supported",
    transport:"RTMP",
    credentialMode:"stream_key",
    serverHint:"rtmp://<TWITCH-INGEST-SERVER>/app",
    keyHint:"Stream-Key aus Twitch Creator Dashboard → Einstellungen → Stream",
    setupHint:"Twitch nutzt RTMP-Ingest. Wähle einen Twitch-Ingest-Server und speichere Stream-Key und Server nur lokal im CFS Launcher.",
    docs:"https://dev.twitch.tv/docs/video-broadcast/"
  }),
  tiktok: Object.freeze({
    key:"tiktok",
    label:"TikTok",
    support:"conditional",
    transport:"RTMP/RTMPS",
    credentialMode:"stream_key_if_available",
    serverHint:"LIVE-Server-URL, falls TikTok sie deinem Konto bereitstellt",
    keyHint:"LIVE Stream-Key, falls für dein TikTok-Konto verfügbar",
    setupHint:"TikTok benötigt LIVE-Zugriff. CFS kann TikTok nur direkt beliefern, wenn dein Konto eine nutzbare LIVE-/Encoder-Server-URL und einen Stream-Key erhält. CFS umgeht keine TikTok-Zugriffsregeln.",
    docs:"https://www.tiktok.com/live/studio/help"
  }),
  kick: Object.freeze({
    key:"kick",
    label:"Kick",
    support:"manual",
    transport:"RTMP/RTMPS",
    credentialMode:"stream_key",
    serverHint:"Streaming-Server aus deinem Kick Creator-Bereich",
    keyHint:"Stream-Key aus deinem Kick Creator-Bereich",
    setupHint:"Server-URL und Stream-Key werden manuell und ausschließlich lokal im Launcher gespeichert.",
    docs:""
  }),
  facebook: Object.freeze({
    key:"facebook",
    label:"Facebook",
    support:"manual",
    transport:"RTMPS",
    credentialMode:"stream_key",
    serverHint:"Server-URL aus Facebook Live Producer",
    keyHint:"Stream-Key aus Facebook Live Producer",
    setupHint:"Server-URL und Stream-Key werden manuell und ausschließlich lokal im Launcher gespeichert.",
    docs:""
  }),
  custom_rtmp: Object.freeze({
    key:"custom_rtmp",
    label:"Custom RTMP/RTMPS",
    support:"manual",
    transport:"RTMP/RTMPS",
    credentialMode:"stream_key",
    serverHint:"rtmp:// oder rtmps:// Server-URL",
    keyHint:"Stream-Key des Zielsystems",
    setupHint:"Für eigene kompatible RTMP/RTMPS-Ziele. Zugangsdaten bleiben lokal.",
    docs:""
  })
});

function providerInfo(provider) {
  return PROVIDERS[String(provider || "").toLowerCase()] || PROVIDERS.custom_rtmp;
}

function providerCatalogPublic() {
  return Object.values(PROVIDERS).map(item=>({ ...item }));
}

module.exports = { PROVIDERS, providerInfo, providerCatalogPublic };
