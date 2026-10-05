(function(){
  const esc=value=>window.CFS?.escape?CFS.escape(String(value??"")):String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]);
  function inner(product){
    const kind=String(product?.preview?.kind||"generic");
    if(kind==="twitch_widgets")return '<div class="shop-preview-twitch"><div class="sp-alert"><b>NEW FOLLOW</b><span>@creator_friend</span></div><div class="sp-chat"><i></i><span>Chat ist live</span><i></i><span>GG! 🔥</span></div><div class="sp-timer">LIVE <b>01:24:36</b></div></div>';
    if(kind==="tiktok_widgets")return '<div class="shop-preview-phone"><div class="sp-phone-head">LIVE</div><div class="sp-goal"><span>FOLLOWER GOAL</span><b>1.840 / 2.000</b><i><em></em></i></div><div class="sp-counter"><strong>12.4K</strong><small>LIVE LIKES</small></div><div class="sp-gift">🎁 <span>NEW GIFT</span></div></div>';
    if(kind==="twitch_panels")return '<div class="shop-preview-panels"><div><b>ÜBER MICH</b><span>CREATOR · GAMING · LIVE</span></div><div><b>SOCIALS</b><span>@cfs_zockt</span></div><div><b>SUPPORT</b><span>COMMUNITY FIRST</span></div></div>';
    if(kind==="tiktok_cards")return '<div class="shop-preview-tiktok-card"><div class="sp-avatar">CFS</div><span>TIKTOK CREATOR CARD</span><h3>ÜBER MICH</h3><p>Gaming · Streams · Community</p><div class="sp-card-lines"><i></i><i></i><i></i></div><small>720 × 1280 · 9:16</small></div>';
    if(kind==="overlay_landscape")return '<div class="shop-preview-overlay"><div class="sp-frame"><span>CAM</span></div><div class="sp-header">CFS_ZOCKT · LIVE</div><div class="sp-social">TWITCH · TIKTOK · DISCORD</div></div>';
    if(kind==="scene_dual")return '<div class="shop-preview-scenes"><div class="sp-scene-wide"><div>GAME</div><span>CAM</span></div><div class="sp-scene-tall"><span>CAM</span><div>GAME</div></div></div>';
    if(kind==="tools_flow")return '<div class="shop-preview-flow"><div>CFS STUDIO</div><i>→</i><div>SCENE</div><i>→</i><div>WIDGET</div><i>→</i><div>LAUNCHER</div></div>';
    if(kind==="bundle_twitch")return '<div class="shop-preview-bundle"><div class="sp-bundle-main">TWITCH<br><b>BRANDING</b></div><div class="sp-bundle-panel">PANELS</div><div class="sp-bundle-overlay">OVERLAYS</div><div class="sp-bundle-scene">SCENES</div></div>';
    if(kind==="bundle_tiktok")return '<div class="shop-preview-bundle vertical"><div class="sp-bundle-main">9:16<br><b>CREATOR</b></div><div class="sp-bundle-panel">CARDS</div><div class="sp-bundle-overlay">OVERLAY</div><div class="sp-bundle-scene">SCENE</div></div>';
    if(kind==="admin_bundle"){const cover=String(product?.preview?.cover_url||"");if(cover)return `<div class="shop-preview-admin-bundle rendered"><img class="sp-rendered-cover" src="${esc(cover)}" alt="${esc(product?.title||"Bundle Cover")}"></div>`;const urls=Array.isArray(product?.preview?.asset_urls)&&product.preview.asset_urls.length?product.preview.asset_urls:[product?.preview?.asset_url].filter(Boolean);return `<div class="shop-preview-admin-bundle ${urls.length>1?"multi":""}"><div class="sp-admin-images">${urls.slice(0,4).map(url=>`<img src="${esc(url)}" alt="">`).join("")}</div><div class="sp-admin-gradient"></div><div class="sp-admin-copy"><small>ADMIN BUNDLE FACTORY</small><b>${esc(product?.preview?.design_variant||"DESIGN").toUpperCase()}</b><span>${esc(product?.platform||"neutral").toUpperCase()} · ${urls.length} ASSET${urls.length===1?"":"S"}</span></div></div>`;}
    return '<div class="shop-preview-generic">CFS</div>';
  }
  function render(product,{compact=false}={}){
    const preview=product?.preview||{},ratio=String(preview.ratio||"16:9").replace(/[^0-9:]/g,"")||"16:9";
    return `<div class="shop-product-preview ${compact?"compact":""} preview-${esc(preview.kind||"generic")}" style="--product-accent:${esc(product?.accent||"#20c7ff")};--preview-ratio:${esc(ratio.replace(':',' / '))}"><div class="shop-preview-top"><span>${esc(preview.eyebrow||product?.category||"CFS")}</span><b>${esc(product?.platform||"neutral").toUpperCase()}</b></div><div class="shop-preview-canvas">${inner(product)}</div><div class="shop-preview-caption"><strong>${esc(preview.title||product?.title||"CFS Produkt")}</strong><span>v${esc(product?.version||"")}</span></div></div>`;
  }
  window.CFSShopPreview={render};
})();
