"use strict";

/**
 * Minimal server-side PlayStation recent-games client for the cfs_zockt homepage.
 *
 * Important:
 * - The NPSSO value is a secret and must only exist in a server environment variable.
 * - Nothing in this module exposes the NPSSO or access token to the browser.
 * - The endpoints used here are community-documented PlayStation Network endpoints,
 *   not a public Sony developer API contract. Keep the launcher fallback enabled.
 */

const PSN_AUTH_BASE_URL = "https://ca.account.sony.com/api/authz/v3/oauth";
const PSN_GAMES_URL = "https://m.np.playstation.com/api/gamelist/v2/users/me/titles";
const PSN_CLIENT_ID = "09515159-7237-4370-9b40-3806e67c0891";
const PSN_REDIRECT_URI = "com.scee.psxandroid.scecompcall://redirect";
const PSN_SCOPE = "psn:mobile.v2.core psn:clientapp";
const PSN_BASIC_AUTH = "Basic MDk1MTUxNTktNzIzNy00MzcwLTliNDAtMzgwNmU2N2MwODkxOnVjUGprYTV0bnRCMktxc1A=";

let tokenCache = {
    accessToken: "",
    expiresAt: 0
};

function safeInteger(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, Math.round(number)));
}

function cleanText(value, max = 180) {
    return String(value || "")
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max);
}

function safeHttpsImage(value) {
    try {
        const parsed = new URL(String(value || ""));
        if (parsed.protocol !== "https:") return "";
        const host = parsed.hostname.toLowerCase();
        if (host !== "playstation.com" && !host.endsWith(".playstation.com")) return "";
        return parsed.toString();
    } catch {
        return "";
    }
}

function parseIsoDurationSeconds(value) {
    const match = /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(String(value || "").trim());
    if (!match) return 0;
    const days = Number(match[1] || 0);
    const hours = Number(match[2] || 0);
    const minutes = Number(match[3] || 0);
    const seconds = Number(match[4] || 0);
    const total = days * 86400 + hours * 3600 + minutes * 60 + seconds;
    return Number.isFinite(total) && total > 0 ? Math.round(total) : 0;
}

function platformFromCategory(value) {
    const category = String(value || "").toLowerCase();
    if (category === "ps5_native_game") return "playstation_5";
    if (category === "ps4_game") return "playstation_4";
    if (category === "pspc_game") return "pc";
    return "unknown";
}

function normalizeGameKey(title) {
    return cleanText(title, 160)
        .replace(/[™®©]/g, "")
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[^a-z0-9äöüß]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120);
}

function bestImage(title) {
    const direct = safeHttpsImage(title?.localizedImageUrl) || safeHttpsImage(title?.imageUrl);
    if (direct) return direct;
    const images = Array.isArray(title?.concept?.media?.images) ? title.concept.media.images : [];
    for (const image of images) {
        const url = safeHttpsImage(image?.url);
        if (url) return url;
    }
    return "";
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 7000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(1000, safeInteger(timeoutMs, 7000, 1000, 20000)));
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function exchangeNpssoForAccessToken(npsso, timeoutMs) {
    const token = String(npsso || "").trim();
    if (!token || token.length < 32 || token.length > 512) {
        throw new Error("PlayStation NPSSO fehlt oder hat ein unerwartetes Format.");
    }

    const authorizeUrl = new URL(`${PSN_AUTH_BASE_URL}/authorize`);
    authorizeUrl.search = new URLSearchParams({
        access_type: "offline",
        client_id: PSN_CLIENT_ID,
        redirect_uri: PSN_REDIRECT_URI,
        response_type: "code",
        scope: PSN_SCOPE
    }).toString();

    const authorizeResponse = await fetchWithTimeout(authorizeUrl, {
        method: "GET",
        headers: {
            Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
            Cookie: `npsso=${token}`,
            "User-Agent": "cfs-zockt-playstation-games/1.0"
        },
        redirect: "manual"
    }, timeoutMs);

    const location = authorizeResponse.headers.get("location") || "";
    let code = "";
    try {
        const redirectUrl = new URL(location);
        code = redirectUrl.searchParams.get("code") || "";
    } catch {
        const marker = location.indexOf("?code=");
        if (marker >= 0) code = new URLSearchParams(location.slice(marker + 1)).get("code") || "";
    }
    if (!code) throw new Error("PlayStation-Anmeldung konnte keinen Access-Code liefern. NPSSO erneuern.");

    const tokenResponse = await fetchWithTimeout(`${PSN_AUTH_BASE_URL}/token`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: PSN_BASIC_AUTH,
            "User-Agent": "cfs-zockt-playstation-games/1.0"
        },
        body: new URLSearchParams({
            code,
            redirect_uri: PSN_REDIRECT_URI,
            grant_type: "authorization_code",
            token_format: "jwt"
        }).toString()
    }, timeoutMs);

    let payload = null;
    try { payload = await tokenResponse.json(); } catch { payload = null; }
    const accessToken = cleanText(payload?.access_token, 4096);
    const expiresIn = safeInteger(payload?.expires_in, 3600, 60, 24 * 60 * 60);
    if (!tokenResponse.ok || !accessToken) {
        throw new Error(`PlayStation Access-Token konnte nicht erstellt werden (HTTP ${tokenResponse.status}).`);
    }

    tokenCache = {
        accessToken,
        expiresAt: Date.now() + expiresIn * 1000
    };
    return accessToken;
}

async function getAccessToken(npsso, timeoutMs) {
    if (tokenCache.accessToken && tokenCache.expiresAt - Date.now() > 90 * 1000) {
        return tokenCache.accessToken;
    }
    return exchangeNpssoForAccessToken(npsso, timeoutMs);
}

function mapPlayedGame(title) {
    const name = cleanText(title?.localizedName || title?.name, 180);
    if (!name) return null;
    const lastPlayed = cleanText(title?.lastPlayedDateTime, 80);
    const lastPlayedMs = Date.parse(lastPlayed);
    if (!Number.isFinite(lastPlayedMs)) return null;
    const durationSeconds = parseIsoDurationSeconds(title?.playDuration);
    return {
        key: normalizeGameKey(name),
        name,
        minutes: Math.max(0, Math.round(durationSeconds / 60)),
        sessions: safeInteger(title?.playCount, 0, 0, 1_000_000),
        last_played_at: new Date(lastPlayedMs).toISOString(),
        platform: platformFromCategory(title?.category),
        source: "playstation_network",
        image_url: bestImage(title),
        title_id: cleanText(title?.titleId, 96),
        concept_id: title?.concept?.id === undefined || title?.concept?.id === null ? "" : cleanText(title.concept.id, 64)
    };
}

function dedupeAndSortTitles(titles, limit) {
    const mapped = (Array.isArray(titles) ? titles : [])
        .map(mapPlayedGame)
        .filter(Boolean)
        .sort((a, b) => Date.parse(b.last_played_at) - Date.parse(a.last_played_at));
    const seen = new Set();
    const out = [];
    for (const game of mapped) {
        const identity = game.concept_id ? `concept:${game.concept_id}` : `name:${game.key}`;
        if (!game.key || seen.has(identity)) continue;
        seen.add(identity);
        out.push(game);
        if (out.length >= limit) break;
    }
    return out;
}

async function fetchPublicPlayStationRecentGames({ npsso, limit = 6, timeoutMs = 7000 } = {}) {
    const safeLimit = safeInteger(limit, 6, 3, 12);
    const accessToken = await getAccessToken(npsso, timeoutMs);
    const requestUrl = new URL(PSN_GAMES_URL);
    requestUrl.search = new URLSearchParams({
        limit: String(safeLimit * 2),
        offset: "0",
        categories: "ps5_native_game,ps4_game"
    }).toString();

    let response = await fetchWithTimeout(requestUrl, {
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "cfs-zockt-playstation-games/1.0"
        }
    }, timeoutMs);

    if (response.status === 401) {
        tokenCache = { accessToken: "", expiresAt: 0 };
        const retryToken = await getAccessToken(npsso, timeoutMs);
        response = await fetchWithTimeout(requestUrl, {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${retryToken}`,
                "User-Agent": "cfs-zockt-playstation-games/1.0"
            }
        }, timeoutMs);
    }

    let payload = null;
    try { payload = await response.json(); } catch { payload = null; }
    if (!response.ok) {
        const message = cleanText(payload?.error?.message || payload?.message, 180);
        throw new Error(`PlayStation-Spieldaten nicht verfügbar (HTTP ${response.status})${message ? `: ${message}` : "."}`);
    }

    const games = dedupeAndSortTitles(payload?.titles, safeLimit).map((game, index) => ({
        ...game,
        rank: index + 1
    }));
    const recent = games.slice(0, 3).map((game, index) => ({
        ...game,
        position: index + 1
    }));

    return {
        available: games.length > 0,
        window_days: null,
        source: "playstation_network",
        playtime_scope: "lifetime",
        updated_at: new Date().toISOString(),
        active: null,
        games,
        recent
    };
}

function resetPlayStationTokenCache() {
    tokenCache = { accessToken: "", expiresAt: 0 };
}

module.exports = {
    fetchPublicPlayStationRecentGames,
    parseIsoDurationSeconds,
    platformFromCategory,
    resetPlayStationTokenCache,
    _test: { mapPlayedGame, dedupeAndSortTitles, safeHttpsImage }
};
