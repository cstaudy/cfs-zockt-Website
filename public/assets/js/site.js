"use strict";

const header = document.querySelector(".topbar");
const menu = document.querySelector(".menu");

if (menu && header) {
  menu.addEventListener("click", () => {
    const open = header.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(open));
  });
}

document
  .querySelectorAll('nav a[href^="#"]')
  .forEach(link => {
    link.addEventListener("click", () => {
      header?.classList.remove("open");
      menu?.setAttribute("aria-expanded", "false");
    });
  });

const sections = [
  ...document.querySelectorAll("main section[id]")
];

const navLinks = [
  ...document.querySelectorAll('.topbar nav a[href^="#"]')
];

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        navLinks.forEach(link => {
          link.classList.toggle(
            "active",
            link.getAttribute("href") === `#${entry.target.id}`
          );
        });
      });
    },
    {
      rootMargin: "-35% 0px -55% 0px"
    }
  );

  sections.forEach(section => observer.observe(section));
}

// ======================================================
// TikTok Website-Status
//
// Dieser Request enthält absichtlich KEINEN API-Key.
// /api/tiktok/status gibt nur connected + updated_at aus.
// Tokens und Profildaten bleiben serverseitig.
// ======================================================

async function updateTikTokStatus() {
  const statusElement = document.getElementById("tiktokStatus");
  const metaElement = document.getElementById("tiktokStatusMeta");
  const connectButton = document.getElementById("tiktokConnectButton");

  if (!statusElement) return;

  try {
    const response = await fetch("/api/tiktok/status", {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const connected = data?.connected === true;

    statusElement.dataset.state = connected
      ? "connected"
      : "disconnected";

    statusElement.textContent = connected
      ? "TIKTOK VERBUNDEN"
      : "TIKTOK NICHT VERBUNDEN";

    if (metaElement) {
      if (connected && data?.updated_at) {
        const date = new Date(data.updated_at);

        metaElement.textContent = Number.isNaN(date.getTime())
          ? "Die serverseitige TikTok-Verbindung ist aktiv."
          : `Serverseitig aktiv · Stand ${date.toLocaleString("de-DE")}`;
      } else {
        metaElement.textContent = connected
          ? "Die serverseitige TikTok-Verbindung ist aktiv."
          : "TikTok kann über den sicheren Login verbunden werden.";
      }
    }

    if (connectButton) {
      connectButton.textContent = connected
        ? "TIKTOK NEU VERBINDEN"
        : "TIKTOK VERBINDEN";
    }
  } catch (error) {
    statusElement.dataset.state = "error";
    statusElement.textContent = "STATUS NICHT VERFÜGBAR";

    if (metaElement) {
      metaElement.textContent =
        "Der TikTok-Status konnte gerade nicht geladen werden.";
    }

    console.warn("TikTok Status konnte nicht geladen werden:", error);
  }
}

updateTikTokStatus();
