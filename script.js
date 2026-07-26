const INSTALL_COMMAND =
  '/bin/bash -c "$(curl -fsSL https://github.com/osuki9x/omni-action-releases/releases/latest/download/install.sh)"';

const header = document.querySelector("[data-header]");

function updateHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 16);
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const revealElements = [...document.querySelectorAll(".reveal")];

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );

  for (const element of revealElements) {
    revealObserver.observe(element);
  }
} else {
  for (const element of revealElements) {
    element.classList.add("is-visible");
  }
}

function setupProductTour() {
  const root = document.querySelector("[data-product-tour]");
  if (!root) return;

  const tabs = [...root.querySelectorAll("[data-tour-tab]")];
  const panels = [...root.querySelectorAll("[data-tour-panel]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.classList.contains("is-active")),
  );
  let timer = null;

  function select(index, { restart = true } = {}) {
    activeIndex = (index + tabs.length) % tabs.length;

    tabs.forEach((tab, tabIndex) => {
      const active = tabIndex === activeIndex;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.tabIndex = active ? 0 : -1;
    });

    panels.forEach((panel, panelIndex) => {
      const active = panelIndex === activeIndex;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
      panel.setAttribute("aria-hidden", active ? "false" : "true");
    });

    if (restart) start();
  }

  function stop() {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function start() {
    stop();
    if (reducedMotion) return;
    timer = window.setInterval(() => select(activeIndex + 1, { restart: false }), 5200);
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => select(index));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const nextIndex =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabs.length - 1
            : activeIndex + (event.key === "ArrowRight" ? 1 : -1);
      select(nextIndex);
      tabs[(nextIndex + tabs.length) % tabs.length].focus();
    });
  });

  root.addEventListener("pointerenter", stop);
  root.addEventListener("pointerleave", start);
  root.addEventListener("focusin", stop);
  root.addEventListener("focusout", (event) => {
    if (!root.contains(event.relatedTarget)) start();
  });

  select(activeIndex);
}

setupProductTour();

document.querySelector("[data-copy-command]")?.addEventListener("click", async (event) => {
  const button = event.currentTarget;
  const label = button.querySelector("[data-copy-label]");

  try {
    await navigator.clipboard.writeText(INSTALL_COMMAND);
  } catch {
    const textArea = document.createElement("textarea");
    textArea.value = INSTALL_COMMAND;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
  }

  label.textContent = "Copied";
  button.setAttribute("aria-label", "Install command copied");

  window.setTimeout(() => {
    label.textContent = "Copy";
    button.setAttribute("aria-label", "Copy install command");
  }, 1800);
});

const year = document.querySelector("[data-year]");
if (year) year.textContent = new Date().getFullYear();

async function updateReleaseIdentity() {
  try {
    const response = await fetch(
      "https://api.github.com/repos/osuki9x/omni-action-releases/releases/latest",
      { headers: { Accept: "application/vnd.github+json" } },
    );

    if (!response.ok) return;
    const release = await response.json();
    const version = String(release.tag_name || "").replace(/^v/i, "");
    if (!version) return;

    for (const element of document.querySelectorAll("[data-version-label]")) {
      element.textContent = `Omni Action ${version}`;
    }

    for (const element of document.querySelectorAll("[data-version-short]")) {
      element.textContent = `v${version}`;
    }

    const shortcutAsset = Array.isArray(release.assets)
      ? release.assets.find((asset) => asset.name === "Omni.Action.Installer.shortcut")
      : null;

    if (shortcutAsset?.browser_download_url) {
      document
        .querySelector("[data-shortcut-link]")
        ?.setAttribute("href", shortcutAsset.browser_download_url);
    }
  } catch {
    // The bundled version and release links remain usable offline.
  }
}

updateReleaseIdentity();
