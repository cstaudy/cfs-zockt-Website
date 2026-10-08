/* CFS Zockt 3.20.62 – reine, lokale PCM-Bearbeitung; keine Netzwerk- oder Dateizugriffe. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CFSAudioSampleCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MAX_SOURCE_SECONDS = 120;
  const MAX_CLIP_SECONDS = 30;
  const MAX_FILE_BYTES = 20 * 1024 * 1024;
  const ALLOWED_EXTENSIONS = /\.(wav|mp3|ogg|m4a|aac|flac|opus|webm)$/i;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  function checkFile(file) {
    if (!file || typeof file.name !== 'string' || !ALLOWED_EXTENSIONS.test(file.name)) throw new Error('Wähle eine Audiodatei: WAV, MP3, OGG, M4A, AAC, FLAC, OPUS oder WebM.');
    if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_FILE_BYTES) throw new Error('Audiodatei muss zwischen 1 Byte und 20 MB groß sein.');
    if (file.type && !/^audio\//i.test(file.type) && file.type !== 'application/ogg' && file.type !== 'application/octet-stream') throw new Error('Dieser Dateityp ist keine Audiodatei.');
    return true;
  }

  function validateBuffer(buffer) {
    if (!buffer || !Number.isFinite(buffer.duration) || buffer.duration <= 0 || buffer.duration > MAX_SOURCE_SECONDS) throw new Error('Der Originalsound darf maximal 120 Sekunden lang sein.');
    if (!Number.isInteger(buffer.numberOfChannels) || buffer.numberOfChannels < 1 || buffer.numberOfChannels > 2) throw new Error('Nur Mono- und Stereo-Sounds werden unterstützt.');
    if (!Number.isInteger(buffer.sampleRate) || buffer.sampleRate < 8000 || buffer.sampleRate > 192000) throw new Error('Nicht unterstützte Audio-Abtastrate.');
    if (!Number.isInteger(buffer.length) || buffer.length <= 0) throw new Error('Keine Audio-Samples gefunden.');
    return true;
  }

  // Explizite Auswahl: niemals eine längere Datei stillschweigend vollständig exportieren.
  function sanitizeSelection(buffer, options = {}) {
    validateBuffer(buffer);
    const length = buffer.length, rate = buffer.sampleRate;
    const start = clamp(finite(options.start, 0), 0, Math.max(0, (length - 1) / rate));
    const end = clamp(finite(options.end, Math.min(buffer.duration, MAX_CLIP_SECONDS)), 0, length / rate);
    const from = Math.min(length - 1, Math.round(start * rate));
    const to = Math.min(length, Math.round(end * rate));
    if (to <= from) throw new Error('Das Ende muss nach dem Start des Ausschnitts liegen.');
    if (to - from > MAX_CLIP_SECONDS * rate) throw new Error('Der Ausschnitt darf maximal 30 Sekunden dauern.');
    const seconds = (to - from) / rate;
    return {
      from, to, frames: to - from, sampleRate: rate, duration: seconds,
      gainDb: clamp(finite(options.gainDb, 0), -24, 12),
      fadeIn: clamp(finite(options.fadeIn, 0), 0, seconds),
      fadeOut: clamp(finite(options.fadeOut, 0), 0, seconds),
      peakLimit: options.peakLimit !== false
    };
  }

  function process(buffer, options) {
    const p = sanitizeSelection(buffer, options), channels = [];
    let peakBeforeLimit = 0, peak = 0, limited = false;
    const gain = Math.pow(10, p.gainDb / 20);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const source = buffer.getChannelData(c);
      if (!source || source.length < p.to) throw new Error('Audiodaten sind unvollständig.');
      const dst = new Float32Array(p.frames);
      for (let i = 0; i < p.frames; i++) {
        const t = i / p.sampleRate;
        const fadeIn = p.fadeIn > 0 ? clamp(t / p.fadeIn, 0, 1) : 1;
        const fadeOut = p.fadeOut > 0 ? clamp((p.duration - t) / p.fadeOut, 0, 1) : 1;
        const value = (Number.isFinite(source[p.from + i]) ? source[p.from + i] : 0) * gain * fadeIn * fadeOut;
        dst[i] = value;
        peakBeforeLimit = Math.max(peakBeforeLimit, Math.abs(value));
      }
      channels.push(dst);
    }
    // Reine Peak-Absenkung, keine unkontrollierte Lautheitsverstärkung leiser Samples.
    const ceiling = Math.pow(10, -1 / 20);
    const attenuation = p.peakLimit && peakBeforeLimit > ceiling ? ceiling / peakBeforeLimit : 1;
    limited = attenuation < 1;
    for (const data of channels) {
      for (let i = 0; i < data.length; i++) {
        data[i] = clamp(data[i] * attenuation, -1, 1);
        peak = Math.max(peak, Math.abs(data[i]));
      }
    }
    return {channels, sampleRate: p.sampleRate, frames: p.frames, duration: p.duration, peak, limited, peakBeforeLimit};
  }

  function encodeWav(edited) {
    const {channels, sampleRate, frames} = edited;
    if (!Array.isArray(channels) || channels.length < 1 || channels.length > 2 || !Number.isInteger(frames) || frames < 1 || frames > MAX_CLIP_SECONDS * sampleRate || !Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000 || channels.some(ch => !(ch instanceof Float32Array) || ch.length !== frames)) throw new Error('Ungültiger WAV-Ausschnitt.');
    const count = channels.length, bytes = frames * count * 2;
    const buffer = new ArrayBuffer(44 + bytes), view = new DataView(buffer);
    const label = (offset, text) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
    label(0, 'RIFF'); view.setUint32(4, 36 + bytes, true); label(8, 'WAVE'); label(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, count, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * count * 2, true);
    view.setUint16(32, count * 2, true); view.setUint16(34, 16, true); label(36, 'data'); view.setUint32(40, bytes, true);
    let o = 44;
    for (let i = 0; i < frames; i++) for (const channel of channels) {
      const sample = clamp(Number.isFinite(channel[i]) ? channel[i] : 0, -1, 1);
      view.setInt16(o, sample < 0 ? Math.round(sample * 32768) : Math.round(sample * 32767), true);
      o += 2;
    }
    return buffer;
  }

  function buildPreviewBuffer(context, edited) {
    const output = context.createBuffer(edited.channels.length, edited.frames, edited.sampleRate);
    for (let i = 0; i < edited.channels.length; i++) output.copyToChannel(edited.channels[i], i);
    return output;
  }

  function safeFilename(name) {
    const bare = String(name || 'alert-sound').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    return `${bare || 'alert-sound'}-cfs-alert.wav`;
  }

  return {MAX_SOURCE_SECONDS, MAX_CLIP_SECONDS, MAX_FILE_BYTES, checkFile, validateBuffer, sanitizeSelection, process, encodeWav, buildPreviewBuffer, safeFilename};
});
