(() => {
  const root = document.querySelector('[data-merch-feedback]');
  if (!root) return;

  const appealButtons = [...root.querySelectorAll('[data-appeal]')];
  const ratingButtons = [...root.querySelectorAll('[data-rating]')];
  const voteButtons = [...root.querySelectorAll('[data-vote]')];
  const summary = root.querySelector('[data-feedback-summary]');
  const copyButton = root.querySelector('[data-copy-feedback]');
  const submitButton = root.querySelector('[data-submit-review]');
  const reviewStatus = root.querySelector('[data-review-status]');
  const reviewName = root.querySelector('[data-review-name]');
  const reviewComment = root.querySelector('[data-review-comment]');
  const reviewWebsite = root.querySelector('[data-review-website]');

  const publicRoot = document.querySelector('[data-public-reviews]');
  const averageNode = publicRoot?.querySelector('[data-review-average]');
  const countNode = publicRoot?.querySelector('[data-review-count]');
  const listNode = publicRoot?.querySelector('[data-review-list]');

  const localKey = 'cfs_zockt_merch_feedback_v3';
  const clientKey = 'cfs_zockt_public_review_client_v1';

  const labels = {
    appeal: {
      yes: 'Spricht mich an',
      maybe: 'Interessant, noch unsicher',
      no: 'Eher nicht mein Stil'
    },
    vote: {
      schwarz: 'Schwarz',
      blau: 'Blau',
      beide: 'Beide Varianten',
      ueberarbeiten: 'Noch überarbeiten'
    }
  };

  const safeText = (value, fallback = '') => String(value ?? fallback);

  const createClientToken = () => {
    try {
      const existing = localStorage.getItem(clientKey);
      if (existing && /^[A-Za-z0-9_-]{20,120}$/.test(existing)) return existing;
      const token = globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID().replace(/-/g, '')
        : `r${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(clientKey, token);
      return token;
    } catch (_) {
      return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    }
  };

  const clientToken = createClientToken();
  let value = { appeal: '', rating: '', vote: '', display_name: '', comment: '' };

  try {
    const saved = JSON.parse(localStorage.getItem(localKey) || '{}');
    value = { ...value, ...(saved && typeof saved === 'object' ? saved : {}) };
  } catch (_) {}

  if (reviewName) reviewName.value = safeText(value.display_name);
  if (reviewComment) reviewComment.value = safeText(value.comment);

  const persist = () => {
    value.display_name = safeText(reviewName?.value).trim().slice(0, 40);
    value.comment = safeText(reviewComment?.value).trim().slice(0, 600);
    try { localStorage.setItem(localKey, JSON.stringify(value)); } catch (_) {}
  };

  const applyGroup = (buttons, activeValue, attr) => {
    buttons.forEach((button) => {
      const active = String(button.dataset[attr] || '') === String(activeValue || '');
      button.classList.toggle('is-selected', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      if (attr === 'rating') button.setAttribute('aria-checked', active ? 'true' : 'false');
    });
  };

  const feedbackText = () => {
    const parts = [];
    if (value.appeal && labels.appeal[value.appeal]) parts.push(labels.appeal[value.appeal]);
    if (value.rating) parts.push(`${value.rating}/5`);
    if (value.vote && labels.vote[value.vote]) parts.push(`Favorit: ${labels.vote[value.vote]}`);
    return parts.length ? parts.join(' · ') : 'Noch keine Auswahl getroffen.';
  };

  const setStatus = (text, kind = '') => {
    if (!reviewStatus) return;
    reviewStatus.textContent = text;
    reviewStatus.dataset.state = kind;
  };

  const render = () => {
    applyGroup(appealButtons, value.appeal, 'appeal');
    applyGroup(ratingButtons, value.rating, 'rating');
    applyGroup(voteButtons, value.vote, 'vote');
    if (summary) summary.textContent = feedbackText();
  };

  const setStat = (selector, value) => {
    const node = publicRoot?.querySelector(selector);
    if (node) node.textContent = String(Number(value || 0));
  };

  const renderPublicSummary = (data) => {
    const summaryData = data && typeof data === 'object' ? data : {};
    const total = Number(summaryData.total_reviews || 0);
    const average = Number(summaryData.average_rating || 0);

    if (countNode) countNode.textContent = String(total);
    if (averageNode) averageNode.textContent = total ? average.toFixed(1) : '–';

    setStat('[data-stat-appeal-yes]', summaryData.appeal?.yes);
    setStat('[data-stat-appeal-maybe]', summaryData.appeal?.maybe);
    setStat('[data-stat-appeal-no]', summaryData.appeal?.no);
    setStat('[data-stat-variant-schwarz]', summaryData.variants?.schwarz);
    setStat('[data-stat-variant-blau]', summaryData.variants?.blau);

    if (!listNode) return;
    const reviews = Array.isArray(summaryData.reviews) ? summaryData.reviews : [];
    if (!reviews.length) {
      listNode.innerHTML = '<p class="brand-merch-review-empty">Noch keine freigegebenen Text-Rezensionen vorhanden.</p>';
      return;
    }

    listNode.innerHTML = reviews.map((review) => {
      const name = safeText(review.display_name || 'Gast').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
      const comment = safeText(review.comment).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
      const rating = Math.max(1, Math.min(5, Number(review.rating || 0)));
      const variant = labels.vote[review.variant] || review.variant || '';
      return `<article class="brand-merch-review-item"><div><strong>${name}</strong><span>${rating}/5 · ${variant}</span></div><p>${comment}</p></article>`;
    }).join('');
  };

  const loadPublicReviews = async () => {
    try {
      const response = await fetch('/api/public/reviews/merch', { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || 'Rezensionen konnten nicht geladen werden.');
      renderPublicSummary(data.summary);
    } catch (_) {
      if (publicRoot) publicRoot.classList.add('is-offline');
    }
  };

  appealButtons.forEach((button) => button.addEventListener('click', () => {
    value.appeal = button.dataset.appeal || '';
    persist();
    render();
  }));

  ratingButtons.forEach((button) => button.addEventListener('click', () => {
    value.rating = button.dataset.rating || '';
    persist();
    render();
  }));

  voteButtons.forEach((button) => button.addEventListener('click', () => {
    value.vote = button.dataset.vote || '';
    persist();
    render();
  }));

  reviewName?.addEventListener('input', persist);
  reviewComment?.addEventListener('input', persist);

  submitButton?.addEventListener('click', async () => {
    persist();
    if (!value.appeal || !value.rating || !value.vote) {
      setStatus('Bitte zuerst Eindruck, Bewertung und Designrichtung auswählen.', 'error');
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'WIRD GESPEICHERT…';
    setStatus('Deine Rezension wird sicher gespeichert…', 'loading');

    try {
      const response = await fetch('/api/public/reviews/merch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_token: clientToken,
          display_name: value.display_name,
          rating: Number(value.rating),
          appeal: value.appeal,
          variant: value.vote,
          comment: value.comment,
          website: safeText(reviewWebsite?.value)
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || 'Rezension konnte nicht gespeichert werden.');

      setStatus(data.message || 'Danke! Deine Rezension wurde gespeichert.', 'success');
      renderPublicSummary(data.summary);
      submitButton.textContent = 'REZENSION AKTUALISIEREN';
    } catch (error) {
      setStatus(error?.message || 'Server nicht erreichbar. Deine Auswahl bleibt lokal gespeichert.', 'error');
      submitButton.textContent = 'ERNEUT VERSUCHEN';
    } finally {
      submitButton.disabled = false;
    }
  });

  copyButton?.addEventListener('click', async () => {
    persist();
    const comment = value.comment ? ` · Meinung: ${value.comment}` : '';
    const text = `cfs_zockt Merch-Rezension: ${feedbackText()}${comment}`;
    try {
      await navigator.clipboard.writeText(text);
      copyButton.textContent = 'KOPIERT ✓';
      setTimeout(() => { copyButton.textContent = 'FEEDBACK KOPIEREN'; }, 1600);
    } catch (_) {
      copyButton.textContent = 'KOPIEREN NICHT MÖGLICH';
      setTimeout(() => { copyButton.textContent = 'FEEDBACK KOPIEREN'; }, 1800);
    }
  });

  render();
  loadPublicReviews();
})();
