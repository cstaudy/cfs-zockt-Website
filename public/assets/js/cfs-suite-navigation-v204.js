/* CFS v204 · deep links for the standard creator workflow. */
(() => {
  const params = new URLSearchParams(window.location.search);
  const open = params.get("open");
  if (!open || !["converter", "tools"].includes(open)) return;

  const targetId = open === "converter" ? "wsWidgetConverter" : "wsPanelSets";
  let attempts = 0;
  const reveal = () => {
    attempts += 1;
    const createView = document.querySelector('[data-view="create"]');
    const openCreate = document.querySelector('[data-action="open-create"]');
    if (!createView || !openCreate) {
      if (attempts > 80) clearInterval(timer);
      return;
    }
    if (createView.hidden) {
      openCreate.click();
      return;
    }
    const target = document.getElementById(targetId);
    if (!target) {
      if (attempts > 80) clearInterval(timer);
      return;
    }
    clearInterval(timer);
    target.scrollIntoView({behavior:"smooth", block:"start"});
    target.setAttribute("data-cfs-deep-link", "1");
  };
  const timer = window.setInterval(reveal, 180);
  reveal();
})();
