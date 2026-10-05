(() => {
  'use strict';

  const body = document.body;
  if (!body) return;
  body.dataset.cfsProductV199 = '1';

  // Creator navigation: keep six primary choices. Provider/device details remain reachable via Verbindungen / Mehr.
  const nav = document.querySelector('[data-creator-nav]');
  if (nav) {
    const direct = [...nav.querySelectorAll(':scope > a[data-creator-link]')];
    for (const link of direct) {
      const href = link.getAttribute('href') || '';
      if (href === '/pages/stream-studio.html') link.textContent = 'STUDIO';
      if (href === '/pages/integrations.html') link.textContent = 'VERBINDUNGEN';
      if (href === '/pages/tiktok.html' || href === '/pages/launcher.html') link.hidden = true;
    }
    const more = nav.querySelector('.creator-nav-more-menu');
    if (more) {
      const ensure = (href, label) => {
        if (!more.querySelector(`a[href="${href}"]`)) {
          const a = document.createElement('a');
          a.href = href;
          a.textContent = label;
          a.setAttribute('data-creator-link','');
          more.prepend(a);
        }
      };
      ensure('/pages/launcher.html','LAUNCHER');
      ensure('/pages/tiktok.html','TIKTOK');
    }
  }

  // Compact legal area header on registration without changing the four explicit confirmations.
  const legalList = document.querySelector('.public-auth-page .legal-consent-list');
  if (legalList && !legalList.querySelector('.cfs-v199-legal-head')) {
    const head = document.createElement('div');
    head.className = 'cfs-v199-legal-head';
    head.innerHTML = '<strong>Kurz bestätigen</strong><small>Beta · Datenschutz · 18+</small>';
    legalList.prepend(head);
  }

  // Account/Beta status on Dashboard and Account page.
  const statusTarget = document.querySelector('#accessBadges') || document.querySelector('.account-profile-hero, .account-shell');
  if (statusTarget) {
    fetch('/api/account/me', { credentials:'same-origin', cache:'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.authenticated || !data?.account) return;
        const wrap = document.createElement('div');
        wrap.className = 'cfs-v199-account-status';
        const display = data.account.display_name || 'Creator';
        const plan = String(data.access?.effective_plan || data.account.plan || 'free').toUpperCase();
        const beta = Boolean(data.access?.beta?.active);
        wrap.innerHTML = `<span class="cfs-v199-status-chip"><strong>${escapeHtml(display)}</strong></span><span class="cfs-v199-status-chip"><strong>${escapeHtml(plan)}</strong> PLAN</span>${beta ? '<span class="cfs-v199-status-chip is-beta"><strong>BETA TESTER</strong></span>' : ''}`;
        if (statusTarget.id === 'accessBadges') statusTarget.after(wrap); else statusTarget.prepend(wrap);
      })
      .catch(() => {});
  }

  // CFS Studio: one screen at a time. Existing controls/IDs stay untouched.
  if (body.classList.contains('stream-studio-page')) {
    const strip = document.querySelector('.stream-status-strip');
    if (strip && !document.querySelector('.cfs-studio-tabs-v199')) {
      const tabs = document.createElement('nav');
      tabs.className = 'cfs-studio-tabs-v199';
      tabs.setAttribute('aria-label','CFS Studio Ansicht');
      tabs.innerHTML = [
        ['overview','ÜBERSICHT'],
        ['scenes','SZENEN & QUELLEN'],
        ['audio','AUDIO'],
        ['live','LIVE'],
        ['advanced','ERWEITERT']
      ].map(([id,label]) => `<button type="button" data-studio-v199-tab="${id}">${label}</button>`).join('') + '<span class="cfs-studio-tabs-spacer"></span><small>Kompaktansicht · alle Funktionen bleiben erhalten</small>';
      strip.after(tabs);
      const setView = view => {
        body.dataset.studioV199View = view;
        for (const b of tabs.querySelectorAll('[data-studio-v199-tab]')) b.classList.toggle('active', b.dataset.studioV199Tab === view);
        try { sessionStorage.setItem('cfs-studio-v199-view', view); } catch {}
      };
      tabs.addEventListener('click', e => {
        const b = e.target.closest('[data-studio-v199-tab]');
        if (b) setView(b.dataset.studioV199Tab);
      });
      let initial = 'overview';
      try { initial = sessionStorage.getItem('cfs-studio-v199-view') || initial; } catch {}
      if (!['overview','scenes','audio','live','advanced'].includes(initial)) initial = 'overview';
      setView(initial);
    }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }
})();
