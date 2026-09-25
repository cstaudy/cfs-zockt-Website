
(() => {
  "use strict";

  if (location.pathname !== "/" && location.pathname !== "/index.html") return;

  const LOGO = "/assets/img/brand/cfs-zockt-mark-original.png";

  function enhanceBody() {
    document.body.classList.add("cfs-home-v13");
  }

  function enhanceStage() {
    const stage = document.querySelector(".brand-hero-stage");
    if (!stage || stage.querySelector(".cfs-home-v13-stage")) return;

    // Keep the original stage in the DOM for existing content/tests, but replace the
    // visible presentation with a product-oriented example workflow.
    Array.from(stage.children).forEach(child => {
      child.hidden = true;
      child.setAttribute("aria-hidden","true");
    });

    const preview = document.createElement("div");
    preview.className = "cfs-home-v13-stage";
    preview.setAttribute("aria-label","Beispiel für einen cfs_zockt Creator-Workflow");
    preview.innerHTML = `
      <div class="cfs-home-v13-stage-head">
        <div class="cfs-home-v13-stage-brand">
          <img src="${LOGO}" alt="">
          <div>
            <strong>cfs_zockt Creator Suite</strong>
            <span>Beispiel-Workflow für den Einstieg</span>
          </div>
        </div>
        <span class="cfs-home-v13-preview-note">KEINE LIVE-DATEN</span>
      </div>

      <div class="cfs-home-v13-workflow">
        <article class="primary">
          <span class="cfs-home-v13-step">01</span>
          <div>
            <strong>Widget Studio</strong>
            <p>Ein erstes Widget erstellen und mit Beispieldaten in der Vorschau testen.</p>
          </div>
          <span class="cfs-home-v13-workflow-badge">START</span>
        </article>

        <article>
          <span class="cfs-home-v13-step">02</span>
          <div>
            <strong>Stream Studio</strong>
            <p>Szenen, Quellen und Widgets zu einem Stream-Workflow zusammenführen.</p>
          </div>
          <span class="cfs-home-v13-workflow-badge">ERWEITERN</span>
        </article>

        <article class="optional">
          <span class="cfs-home-v13-step">03</span>
          <div>
            <strong>TikTok &amp; Launcher</strong>
            <p>Erst verbinden, wenn dein Workflow Live-Daten oder Desktop-Funktionen braucht.</p>
          </div>
          <span class="cfs-home-v13-workflow-badge">OPTIONAL</span>
        </article>
      </div>

      <div class="cfs-home-v13-stage-foot">
        <span>Produktansicht zur Orientierung.<br>Keine Nutzer-, Live- oder Erfolgsstatistik.</span>
        <strong>ACCOUNT → WIDGET → ERWEITERN</strong>
      </div>`;

    stage.appendChild(preview);
  }

  function injectEntryPath() {
    if (document.getElementById("cfsHomeV13Entry")) return;

    const hero = document.querySelector(".brand-hero");
    if (!hero) return;

    const section = document.createElement("section");
    section.className = "cfs-home-v13-entry";
    section.id = "cfsHomeV13Entry";
    section.setAttribute("aria-label","So startest du mit cfs_zockt");
    section.innerHTML = `
      <div class="cfs-home-v13-entry-inner">
        <article class="cfs-home-v13-entry-card">
          <b>01</b>
          <span>KOSTENLOSER START</span>
          <strong>Account erstellen</strong>
          <p>Für den normalen Einstieg werden keine Zahlungsdaten abgefragt. Danach bestätigst du deine E-Mail.</p>
        </article>

        <article class="cfs-home-v13-entry-card">
          <b>02</b>
          <span>ERSTES ERGEBNIS</span>
          <strong>Widget bauen &amp; testen</strong>
          <p>Manuelle Widgets funktionieren auch ohne TikTok-Verbindung. Du kannst zuerst gestalten und Vorschauen testen.</p>
        </article>

        <article class="cfs-home-v13-entry-card">
          <b>03</b>
          <span>SPÄTER ERWEITERN</span>
          <strong>Stream, TikTok &amp; Desktop</strong>
          <p>Stream Studio, TikTok und Launcher kommen erst dazu, wenn du sie für deinen Workflow wirklich brauchst.</p>
        </article>
      </div>

      <div class="cfs-home-v13-entry-actions">
        <div class="cfs-home-v13-entry-actions-copy">
          <strong>Du musst nicht alles auf einmal einrichten.</strong>
          <span>Beginne mit Account + Widget. Erweiterungen bleiben getrennte, bewusste Schritte.</span>
        </div>
        <div class="actions">
          <a class="btn primary" href="/pages/login.html#regForm" data-auth-cta data-funnel-cta="v13-path-register">KOSTENLOS STARTEN</a>
          <a class="btn" href="#produktbeweis">WAS FUNKTIONIERT HEUTE?</a>
        </div>
      </div>`;

    hero.insertAdjacentElement("afterend",section);
  }

  function focusProductProof() {
    const section = document.getElementById("produktbeweis");
    const heading = section?.querySelector(".marketing-heading");
    if (!section || !heading || section.querySelector(".cfs-home-v13-proof-focus")) return;

    const note = document.createElement("div");
    note.className = "cfs-home-v13-proof-focus";
    note.innerHTML = `
      <strong>Für den Einstieg wichtig: Du kannst zuerst lokal/manuell bauen und testen.</strong>
      <p>Verbindungen wie TikTok und Launcher sind Erweiterungen des Workflows und keine Voraussetzung, um die Creator Suite kennenzulernen.</p>`;
    heading.insertAdjacentElement("afterend",note);
  }

  function moveRuntimeStrip() {
    const runtime = document.querySelector(".home-runtime-strip");
    const proof = document.getElementById("produktbeweis");
    if (!runtime || !proof || runtime.dataset.cfsV13Moved === "1") return;

    runtime.dataset.cfsV13Moved = "1";
    proof.insertAdjacentElement("afterend",runtime);
  }

  function improveFirstViewportLabels() {
    const eyebrow = document.querySelector(".brand-eyebrow");
    if (eyebrow) {
      eyebrow.innerHTML = 'CREATOR SUITE · <span>WIDGETS.</span> STREAM. CONTENT.';
    }

    const primary = document.querySelector('.brand-hero-actions [data-funnel-cta="hero-register"]');
    if (primary) primary.textContent = "KOSTENLOS MIT WIDGETS STARTEN";

    const secondary = document.querySelector('.brand-hero-actions [data-funnel-cta="hero-suite"]');
    if (secondary) secondary.textContent = "TOOLS ANSEHEN";
  }

  function init() {
    enhanceBody();
    improveFirstViewportLabels();
    enhanceStage();
    injectEntryPath();
    focusProductProof();
    moveRuntimeStrip();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();
