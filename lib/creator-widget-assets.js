"use strict";

const path = require("path");

const MAX_ASSET_COUNT = 120;
const MAX_TOTAL_BYTES = 128 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const CATEGORY_LABELS = Object.freeze({
  frame_overlay: "Rahmen & Overlay",
  background: "Hintergrund",
  logo_badge: "Logo & Badge",
  alert_visual: "Alert-Grafik",
  image: "Bild",
  alert_sound: "Alert-Sound",
  audio: "Audio",
  animated_overlay: "Animiertes Overlay",
  video_background: "Video-Hintergrund",
  video: "Video",
  other: "Sonstiges"
});

const EDITABLE_CATEGORIES = new Set(Object.keys(CATEGORY_LABELS));

function safeName(value, fallback = "creator-datei") {
  const base = path.basename(String(value || "")).replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (base || fallback).slice(0, 140);
}

function safeLabel(value, fallback = "Creator Datei") {
  const text = String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return (text || fallback).slice(0, 100);
}

function extFromName(name) {
  return path.extname(String(name || "")).slice(1).toLowerCase().slice(0, 12);
}

function jpegSize(buffer) {
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) break;
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker) && length >= 7) {
      return { width: buffer.readUInt16BE(offset + 5), height: buffer.readUInt16BE(offset + 3) };
    }
    offset += length;
  }
  return { width: 0, height: 0 };
}

function webpMeta(buffer) {
  if (buffer.length < 30) return { width:0,height:0,hasAlpha:false,animated:false };
  const chunk = buffer.toString("ascii",12,16);
  if (chunk === "VP8X" && buffer.length >= 30) {
    const flags = buffer[20];
    const width = 1 + buffer.readUIntLE(24,3);
    const height = 1 + buffer.readUIntLE(27,3);
    return { width, height, hasAlpha:Boolean(flags & 0x10), animated:Boolean(flags & 0x02) };
  }
  if (chunk === "VP8 " && buffer.length >= 30) {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff, hasAlpha:false, animated:false };
  }
  if (chunk === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return { width:1+(bits&0x3fff), height:1+((bits>>14)&0x3fff), hasAlpha:true, animated:false };
  }
  return { width:0,height:0,hasAlpha:false,animated:false };
}

function imageCategory({width=0,height=0,hasAlpha=false,animated=false}={}) {
  const ratio = width > 0 && height > 0 ? width / height : 1;
  const large = width >= 1000 || height >= 1000;
  if (animated) return "animated_overlay";
  if (hasAlpha && (width >= 300 || height >= 300)) return "frame_overlay";
  if (large || (ratio >= 1.7 && width >= 640)) return "background";
  if (ratio >= .78 && ratio <= 1.28 && Math.max(width,height) <= 1200) return "logo_badge";
  return "image";
}

function actionsFor(meta) {
  const actions = [];
  if (meta.kind === "image") {
    actions.push({key:"add_image",label:"Als Bild einfügen"});
    actions.push({key:"set_background",label:"Als Hintergrund verwenden"});
    if (meta.hasAlpha) actions.push({key:"add_overlay",label:"Als transparentes Overlay einfügen"});
    actions.push({key:"alert_visual",label:"Für Alert-Grafik verwenden"});
  } else if (meta.kind === "audio") {
    actions.push({key:"alert_sound",label:"Als Alert-Sound verwenden"});
    actions.push({key:"preview_audio",label:"Sound testen"});
  } else if (meta.kind === "video") {
    actions.push({key:"add_video",label:"Als Video-Element einfügen"});
    actions.push({key:"video_background",label:"Als Video-Hintergrund verwenden"});
    actions.push({key:"preview_video",label:"Video ansehen"});
  }
  return actions;
}

function detectWidgetAsset(buffer, {filename="", mimeHint=""}={}) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    const error = new Error("Die Datei ist leer."); error.code="asset_empty"; throw error;
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    const error = new Error("Die Datei ist größer als 20 MB."); error.code="asset_too_large"; throw error;
  }

  let meta = null;
  if (buffer.length >= 33 && buffer.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])) && buffer.toString("ascii",12,16)==="IHDR") {
    const colorType = buffer[25];
    meta = {kind:"image",format:"png",mime:"image/png",width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20),hasAlpha:[4,6].includes(colorType)||buffer.includes(Buffer.from("tRNS")),animated:buffer.includes(Buffer.from("acTL"))};
    if (!meta.width || !meta.height) meta = null;
  } else if (buffer.length >= 10 && buffer[0]===0xff && buffer[1]===0xd8 && buffer[2]===0xff) {
    const dimensions=jpegSize(buffer);
    if (dimensions.width && dimensions.height) meta = {kind:"image",format:"jpg",mime:"image/jpeg",...dimensions,hasAlpha:false,animated:false};
  } else if (buffer.length >= 13 && ["GIF87a","GIF89a"].includes(buffer.toString("ascii",0,6))) {
    const width=buffer.readUInt16LE(6),height=buffer.readUInt16LE(8);
    let frames = 0; for (let i=13;i<buffer.length;i++) if (buffer[i]===0x2c) frames += 1;
    let hasAlpha=false;
    for(let i=0;i+7<buffer.length;i++){if(buffer[i]===0x21&&buffer[i+1]===0xf9&&buffer[i+2]===0x04){hasAlpha=Boolean(buffer[i+3]&0x01);if(hasAlpha)break}}
    if(width&&height)meta = {kind:"image",format:"gif",mime:"image/gif",width,height,hasAlpha,animated:frames>1||buffer.includes(Buffer.from("NETSCAPE2.0"))};
  } else if (buffer.length >= 16 && buffer.toString("ascii",0,4)==="RIFF" && buffer.toString("ascii",8,12)==="WEBP") {
    const webp=webpMeta(buffer);
    if(webp.width&&webp.height)meta = {kind:"image",format:"webp",mime:"image/webp",...webp};
  } else if (buffer.length >= 12 && buffer.toString("ascii",0,4)==="RIFF" && buffer.toString("ascii",8,12)==="WAVE") {
    meta = {kind:"audio",format:"wav",mime:"audio/wav",width:0,height:0,hasAlpha:false,animated:false};
  } else if (buffer.length >= 4 && buffer.toString("ascii",0,4)==="OggS") {
    meta = {kind:"audio",format:"ogg",mime:"audio/ogg",width:0,height:0,hasAlpha:false,animated:false};
  } else if ((buffer.length >= 3 && buffer.toString("ascii",0,3)==="ID3") || (buffer.length >= 2 && buffer[0]===0xff && (buffer[1]&0xe0)===0xe0)) {
    meta = {kind:"audio",format:"mp3",mime:"audio/mpeg",width:0,height:0,hasAlpha:false,animated:false};
  } else if (buffer.length >= 16 && buffer.toString("ascii",4,8)==="ftyp") {
    const majorBrand=buffer.toString("ascii",8,12).toLowerCase();
    const imageBrands=new Set(["heic","heix","hevc","hevx","mif1","msf1","avif","avis"]);
    if(!imageBrands.has(majorBrand))meta = {kind:"video",format:"mp4",mime:"video/mp4",width:0,height:0,hasAlpha:false,animated:true};
  } else if (buffer.length >= 4 && buffer.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]))) {
    meta = {kind:"video",format:"webm",mime:"video/webm",width:0,height:0,hasAlpha:false,animated:true};
  }

  if (!meta) {
    const error = new Error("Dateityp nicht unterstützt. Erlaubt sind PNG, JPG, WebP, GIF, MP3, WAV, OGG, MP4 und WebM.");
    error.code="asset_unsupported"; throw error;
  }

  const originalName = safeName(filename, `creator-datei.${meta.format}`);
  meta.originalName = originalName;
  meta.ext = meta.format;
  meta.size = buffer.length;
  meta.mimeHint = String(mimeHint||"").slice(0,120);

  const filenameHint = originalName.toLowerCase();
  if (meta.kind === "image") {
    if (/\b(alert|notification|meldung)\b/.test(filenameHint)) meta.autoCategory = "alert_visual";
    else if (/(camera|cam|frame|rahmen|overlay)/.test(filenameHint)) meta.autoCategory = "frame_overlay";
    else if (/(background|hintergrund|wallpaper|\bbg\b)/.test(filenameHint)) meta.autoCategory = "background";
    else if (/(logo|badge|icon|emblem)/.test(filenameHint)) meta.autoCategory = "logo_badge";
    else meta.autoCategory = imageCategory(meta);
  } else if (meta.kind === "audio") {
    meta.autoCategory = /(music|musik|bgm|song|track)/.test(filenameHint) ? "audio" : "alert_sound";
  } else {
    meta.autoCategory = /(background|hintergrund|wallpaper|\bbg\b)/.test(filenameHint) ? "video_background" : "animated_overlay";
  }
  meta.actions = actionsFor(meta);
  return meta;
}

function publicWidgetAsset(row, basePath="/widget-assets/") {
  if (!row) return null;
  const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : {};
  const actions = actionsFor({kind:row.media_type,hasAlpha:Boolean(metadata.hasAlpha)});
  return {
    id:String(row.id||""),
    name:safeLabel(row.label,row.original_name||"Creator Datei"),
    original_name:safeName(row.original_name||"creator-datei"),
    media_type:String(row.media_type||"other"),
    category:EDITABLE_CATEGORIES.has(String(row.category||""))?String(row.category):String(row.auto_category||"other"),
    auto_category:String(row.auto_category||"other"),
    category_label:CATEGORY_LABELS[String(row.category||row.auto_category||"other")]||CATEGORY_LABELS.other,
    mime_type:String(row.mime_type||"application/octet-stream"),
    format:String(row.file_ext||""),
    size:Number(row.byte_size||0),
    width:Number(metadata.width||0),
    height:Number(metadata.height||0),
    has_alpha:Boolean(metadata.hasAlpha),
    animated:Boolean(metadata.animated),
    actions,
    url:`${basePath}${encodeURIComponent(String(row.public_token||""))}`,
    created_at:row.created_at||null,
    updated_at:row.updated_at||null
  };
}

function normalizeAssetCategory(value, fallback="other") {
  const key=String(value||"").trim();
  return EDITABLE_CATEGORIES.has(key)?key:fallback;
}

module.exports={
  MAX_ASSET_COUNT,MAX_TOTAL_BYTES,MAX_UPLOAD_BYTES,CATEGORY_LABELS,EDITABLE_CATEGORIES,
  safeName,safeLabel,detectWidgetAsset,publicWidgetAsset,normalizeAssetCategory
};
