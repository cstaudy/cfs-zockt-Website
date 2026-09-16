"use strict";

const crypto = require("node:crypto");

function parseVersion(value) {
    const raw = String(value || "").trim().replace(/^v/i, "");
    const match = raw.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
    if (!match) return null;
    return {
        raw,
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
        prerelease: match[4] || ""
    };
}

function comparePrerelease(a, b) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    const aa = a.split(".");
    const bb = b.split(".");
    for (let i = 0; i < Math.max(aa.length, bb.length); i += 1) {
        const av = aa[i];
        const bv = bb[i];
        if (av === undefined) return -1;
        if (bv === undefined) return 1;
        if (av === bv) continue;
        const an = /^\d+$/.test(av) ? Number(av) : null;
        const bn = /^\d+$/.test(bv) ? Number(bv) : null;
        if (an !== null && bn !== null) return an < bn ? -1 : 1;
        if (an !== null) return -1;
        if (bn !== null) return 1;
        return av.localeCompare(bv);
    }
    return 0;
}

function compareVersions(a, b) {
    const aa = parseVersion(a);
    const bb = parseVersion(b);
    if (!aa || !bb) return 0;
    for (const key of ["major", "minor", "patch"]) {
        if (aa[key] !== bb[key]) return aa[key] < bb[key] ? -1 : 1;
    }
    return comparePrerelease(aa.prerelease, bb.prerelease);
}

function versionFromRelease(release) {
    const candidates = [release?.tag_name, release?.name];
    for (const candidate of candidates) {
        const text = String(candidate || "");
        const match = text.match(/v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/);
        if (match && parseVersion(match[1])) return match[1];
    }
    return "";
}

function publicAsset(asset = {}) {
    const name = String(asset.name || "").slice(0, 240);
    const url = String(asset.browser_download_url || "");
    if (!/^https:\/\/github\.com\//i.test(url) && !/^https:\/\/objects\.githubusercontent\.com\//i.test(url)) {
        return null;
    }
    let kind = "other";
    if (/setup.*\.exe$/i.test(name) || /creator-suite-setup/i.test(name)) kind = "setup";
    else if (/portable.*\.exe$/i.test(name) || /creator-suite-portable/i.test(name)) kind = "portable";
    else if (/release-manifest\.json$/i.test(name)) kind = "manifest";
    else if (/sha256sums\.txt$/i.test(name)) kind = "checksums";
    else if (/\.blockmap$/i.test(name)) kind = "blockmap";
    else if (/\.ya?ml$/i.test(name)) kind = "update_metadata";
    return {
        name,
        kind,
        size: Math.max(0, Number(asset.size || 0)),
        download_count: Math.max(0, Number(asset.download_count || 0)),
        url
    };
}

function normalizeRelease(release = {}) {
    if (release.draft) return null;
    const version = versionFromRelease(release);
    if (!version) return null;
    const assets = (Array.isArray(release.assets) ? release.assets : [])
        .map(publicAsset)
        .filter(Boolean);
    const launcherAssets = assets.filter(asset => ["setup", "portable"].includes(asset.kind));
    if (!launcherAssets.length) return null;
    return {
        id: String(release.id || ""),
        version,
        tag: String(release.tag_name || ""),
        name: String(release.name || `Creator Suite ${version}`).slice(0, 200),
        prerelease: Boolean(release.prerelease),
        channel: release.prerelease ? "beta" : "stable",
        published_at: release.published_at || release.created_at || null,
        page_url: /^https:\/\/github\.com\//i.test(String(release.html_url || "")) ? release.html_url : "",
        notes: String(release.body || "").slice(0, 12000),
        assets
    };
}

function sortNewest(releases) {
    return [...releases].sort((a, b) => {
        const byVersion = compareVersions(b.version, a.version);
        if (byVersion !== 0) return byVersion;
        return String(b.published_at || "").localeCompare(String(a.published_at || ""));
    });
}

function channelReleases(releases, channel = "stable") {
    const safeChannel = channel === "beta" ? "beta" : "stable";
    return sortNewest((releases || []).filter(release =>
        safeChannel === "beta" ? true : !release.prerelease
    ));
}

function selectRelease(releases, channel = "stable") {
    return channelReleases(releases, channel)[0] || null;
}

function selectVersion(releases, version, channel = "stable") {
    const parsed = parseVersion(version);
    if (!parsed) return null;
    return channelReleases(releases, channel)
        .find(release => compareVersions(release.version, parsed.raw) === 0) || null;
}

function selectPreviousRelease(releases, version, channel = "stable") {
    const parsed = parseVersion(version);
    if (!parsed) return null;
    return channelReleases(releases, channel)
        .find(release => compareVersions(release.version, parsed.raw) < 0) || null;
}

function releaseSummary(release) {
    if (!release) return null;
    const find = kind => release.assets.find(asset => asset.kind === kind) || null;
    return {
        ...release,
        setup: find("setup"),
        portable: find("portable"),
        manifest: find("manifest"),
        checksums: find("checksums")
    };
}

function normalizedVersionList(value) {
    const source = Array.isArray(value) ? value : String(value || "").split(",");
    return [...new Set(source.map(item => parseVersion(item)?.raw).filter(Boolean))];
}

function clampPercent(value, fallback = 100) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, Math.min(100, Math.round(number)));
}

function cohortBucket(value) {
    const text = String(value || "").trim();
    if (!text) return null;
    const hash = crypto.createHash("sha256").update(text).digest();
    return hash.readUInt32BE(0) % 100;
}

function buildPolicy({
    releases = [],
    currentVersion = "",
    channel = "stable",
    minStable = "0.15.0",
    minBeta = "0.15.0",
    buildTarget = "",
    blockedVersions = [],
    maintenanceMode = false,
    maintenanceMessage = "",
    rolloutStable = 100,
    rolloutBeta = 100,
    pinnedStable = "",
    pinnedBeta = "",
    cohortKey = "",
    safetyRevision = ""
} = {}) {
    const safeChannel = channel === "beta" ? "beta" : "stable";
    const current = parseVersion(currentVersion);
    const minimumVersion = safeChannel === "beta" ? minBeta : minStable;
    const minimum = parseVersion(minimumVersion);

    const latestRelease = selectRelease(releases, safeChannel);
    const pinnedVersion = safeChannel === "beta" ? pinnedBeta : pinnedStable;
    const pinnedRelease = pinnedVersion ? selectVersion(releases, pinnedVersion, safeChannel) : null;
    const pinMissing = Boolean(pinnedVersion && !pinnedRelease);
    const targetRelease = pinnedRelease || latestRelease;

    const rolloutPercent = clampPercent(
        safeChannel === "beta" ? rolloutBeta : rolloutStable,
        100
    );
    const bucket = cohortBucket(cohortKey);
    const rolloutEligible =
        rolloutPercent >= 100 ||
        (rolloutPercent > 0 && bucket !== null && bucket < rolloutPercent);

    let assignedRelease = targetRelease;
    if (targetRelease && !rolloutEligible) {
        assignedRelease = selectPreviousRelease(releases, targetRelease.version, safeChannel);
    }

    const targetVersion = targetRelease?.version || "";
    const recommendedVersion = assignedRelease?.version || "";
    const blockedList = normalizedVersionList(blockedVersions);
    const versionBlocked = Boolean(
        current && blockedList.some(version => compareVersions(current.raw, version) === 0)
    );
    const belowMinimum = Boolean(
        current && minimum && compareVersions(current.raw, minimum.raw) < 0
    );
    const updateAvailable = Boolean(
        current && recommendedVersion && compareVersions(current.raw, recommendedVersion) < 0
    );
    const rollbackRecommended = Boolean(
        current && recommendedVersion && compareVersions(current.raw, recommendedVersion) > 0
    );
    const maintenanceActive = maintenanceMode === true;
    const liveAllowed = !maintenanceActive && !versionBlocked && !belowMinimum;

    let status = "unknown";
    if (maintenanceActive) status = "maintenance";
    else if (versionBlocked) status = "version_blocked";
    else if (!current) status = "current_unknown";
    else if (belowMinimum) status = "update_required";
    else if (rollbackRecommended) status = "rollback_recommended";
    else if (updateAvailable) status = "update_available";
    else if (targetRelease && !rolloutEligible) status = "rollout_pending";
    else if (current && minimum) status = "compatible";

    let action = "none";
    if (maintenanceActive) action = "wait";
    else if (versionBlocked && rollbackRecommended) action = "downgrade_required";
    else if (versionBlocked || belowMinimum) action = "update_required";
    else if (rollbackRecommended) action = "rollback_recommended";
    else if (updateAvailable) action = "update_available";

    const policyMessage = maintenanceActive
        ? (String(maintenanceMessage || "").trim().slice(0, 500) || "Creator Suite LIVE-Starts sind vorübergehend im Wartungsmodus.")
        : versionBlocked
            ? `Launcher ${current?.raw || ""} wurde serverseitig gesperrt. Bitte vor dem nächsten LIVE wechseln.`
            : belowMinimum
                ? `Launcher ${current?.raw || ""} liegt unter der Mindestversion ${minimum?.raw || minimumVersion}.`
                : rollbackRecommended
                    ? `Für diesen Kanal wird aktuell Version ${recommendedVersion} empfohlen.`
                    : targetRelease && !rolloutEligible
                        ? `Version ${targetVersion} wird gestaffelt ausgerollt. Dieser Creator bleibt vorerst auf ${recommendedVersion || "dem bisherigen Release"}.`
                        : "";

    return {
        channel: safeChannel,
        current_version: current?.raw || "",
        minimum_version: minimum?.raw || minimumVersion,
        recommended_version: recommendedVersion,
        target_version: targetVersion,
        latest_published_version: latestRelease?.version || "",
        build_target_version: parseVersion(buildTarget)?.raw || "",
        compatible: current && minimum ? !belowMinimum && !versionBlocked : null,
        update_required: belowMinimum || versionBlocked,
        update_available: updateAvailable,
        rollback_recommended: rollbackRecommended,
        version_blocked: versionBlocked,
        live_allowed: liveAllowed,
        status,
        action,
        message: policyMessage,
        release: releaseSummary(assignedRelease),
        target_release: releaseSummary(targetRelease),
        safety: {
            revision: String(safetyRevision || "").slice(0, 120),
            maintenance: {
                active: maintenanceActive,
                message: maintenanceActive
                    ? (String(maintenanceMessage || "").trim().slice(0, 500) || "Wartungsmodus aktiv.")
                    : ""
            },
            blocked_current_version: versionBlocked,
            pin: {
                version: parseVersion(pinnedVersion)?.raw || "",
                missing: pinMissing
            }
        },
        rollout: {
            percent: rolloutPercent,
            bucket,
            eligible: rolloutEligible,
            target_version: targetVersion,
            assigned_version: recommendedVersion,
            stage: rolloutPercent <= 0 ? "paused" : rolloutPercent >= 100 ? "full" : "staged"
        },
        channels: {
            stable: releaseSummary(selectRelease(releases, "stable")),
            beta: releaseSummary(selectRelease(releases, "beta"))
        }
    };
}

class LauncherReleaseCatalog {
    constructor({
        repo,
        token = "",
        cacheTtlMs = 10 * 60 * 1000,
        fetchImpl = global.fetch,
        logger = console
    } = {}) {
        this.repo = String(repo || "").trim();
        this.token = String(token || "").trim();
        this.cacheTtlMs = Math.max(60_000, Number(cacheTtlMs) || 600_000);
        this.fetchImpl = fetchImpl;
        this.logger = logger;
        this.cache = null;
        this.pending = null;
    }

    async fetch({ force = false } = {}) {
        const now = Date.now();
        if (!force && this.cache && now - this.cache.time < this.cacheTtlMs) {
            return { ...this.cache.value, cache: "fresh" };
        }
        if (this.pending) return this.pending;
        this.pending = this.#load().finally(() => { this.pending = null; });
        return this.pending;
    }

    async #load() {
        const fetchedAt = new Date().toISOString();
        try {
            if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(this.repo)) {
                throw new Error("Launcher Release Repository ist ungültig.");
            }
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 8000);
            try {
                const headers = {
                    "Accept": "application/vnd.github+json",
                    "User-Agent": "cfs-zockt-creator-suite-release-center",
                    "X-GitHub-Api-Version": "2022-11-28"
                };
                if (this.token) headers.Authorization = `Bearer ${this.token}`;
                const response = await this.fetchImpl(
                    `https://api.github.com/repos/${this.repo}/releases?per_page=20`,
                    { headers, signal: controller.signal }
                );
                const payload = await response.json().catch(() => []);
                if (!response.ok || !Array.isArray(payload)) {
                    throw new Error(`GitHub Releases HTTP ${response.status}`);
                }
                const releases = payload.map(normalizeRelease).filter(Boolean);
                const value = {
                    ok: true,
                    repo: this.repo,
                    fetched_at: fetchedAt,
                    stale: false,
                    error: "",
                    releases: sortNewest(releases)
                };
                this.cache = { time: Date.now(), value };
                return { ...value, cache: "network" };
            } finally {
                clearTimeout(timer);
            }
        } catch (error) {
            const message = error?.name === "AbortError"
                ? "GitHub Release-Abfrage hat zu lange gedauert."
                : String(error?.message || error);
            this.logger?.warn?.("Launcher Release Catalog", message);
            if (this.cache?.value) {
                return {
                    ...this.cache.value,
                    ok: true,
                    stale: true,
                    error: message,
                    cache: "stale"
                };
            }
            return {
                ok: false,
                repo: this.repo,
                fetched_at: fetchedAt,
                stale: false,
                error: message,
                releases: [],
                cache: "none"
            };
        }
    }
}

module.exports = {
    parseVersion,
    compareVersions,
    normalizeRelease,
    selectRelease,
    selectVersion,
    selectPreviousRelease,
    releaseSummary,
    normalizedVersionList,
    cohortBucket,
    buildPolicy,
    LauncherReleaseCatalog
};
