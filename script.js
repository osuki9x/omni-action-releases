const INSTALL_COMMAND =
  '/bin/bash -c "$(curl -fsSL https://github.com/osuki9x/omni-action-releases/releases/latest/download/install.sh)"';

const header = document.querySelector("[data-header]");

function updateHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 16);
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const revealElements = [
  ...document.querySelectorAll(".reveal, [data-reveal-group]"),
];

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
      panel.dispatchEvent(
        new CustomEvent(active ? "oa:tour-activate" : "oa:tour-deactivate"),
      );
    });

    if (restart) {
      const userIsEngaged =
        root.matches(":hover") ||
        (document.activeElement instanceof HTMLElement &&
          root.contains(document.activeElement));
      if (userIsEngaged) stop();
      else start();
    }
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
    timer = window.setInterval(() => select(activeIndex + 1, { restart: false }), 6500);
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

function setupTargetDemo(root) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stateLabel = root.querySelector("[data-target-state]");
  const targetName = root.querySelector("[data-target-name]");
  const instruction = root.querySelector("[data-target-instruction]");
  const coach = root.querySelector("[data-target-coach]");
  const targetApp = root.querySelector(".target-app");
  const controls = [...root.querySelectorAll("[data-target-key]")];
  const phases = [
    {
      key: "zoom",
      state: "aiming",
      label: "AIMING",
      name: "Inspector · Zoom",
      hold: 1450,
    },
    {
      key: "position",
      state: "aiming",
      label: "AIMING",
      name: "Inspector · Position",
      hold: 1450,
    },
    {
      key: "opacity",
      state: "aiming",
      label: "AIMING",
      name: "Inspector · Opacity",
      hold: 1600,
    },
    {
      key: "opacity",
      state: "locked",
      label: "LOCKED",
      name: "Inspector · Opacity",
      hold: 1150,
    },
    {
      key: "opacity",
      state: "captured",
      label: "CAPTURED",
      name: "Inspector · Opacity",
      hold: 1750,
    },
    {
      key: "opacity",
      state: "aiming",
      label: "AIMING",
      name: "Inspector · Opacity",
      hold: 320,
    },
  ];
  let phaseIndex = 0;
  let timer = 0;
  let inView = !("IntersectionObserver" in window);
  let currentPhase = phases[0];
  let geometryReady = false;
  let geometryReadyFrame = 0;

  function syncTargetGeometry(control) {
    if (!control || !targetApp) return;
    let left = 0;
    let top = 0;
    let node = control;

    while (node && node !== targetApp) {
      left += node.offsetLeft;
      top += node.offsetTop;
      node = node.offsetParent;
    }

    if (node !== targetApp) return;

    const controlStyle = window.getComputedStyle(control);
    const width = Number.parseFloat(controlStyle.width);
    const height = Number.parseFloat(controlStyle.height);
    root.style.setProperty("--target-outline-left", `${left}px`);
    root.style.setProperty("--target-outline-top", `${top}px`);
    root.style.setProperty("--target-outline-width", `${width}px`);
    root.style.setProperty("--target-outline-height", `${height}px`);
    root.style.setProperty("--target-crosshair-x", `${left + width / 2}px`);
    root.style.setProperty("--target-crosshair-y", `${top + height / 2}px`);

    if (!geometryReady && !geometryReadyFrame) {
      geometryReadyFrame = window.requestAnimationFrame(() => {
        geometryReady = true;
        geometryReadyFrame = 0;
        root.classList.add("is-target-geometry-ready");
      });
    }
  }

  function applyPhase(phase) {
    currentPhase = phase;
    root.classList.toggle("is-locked", phase.state === "locked");
    root.classList.toggle("is-captured", phase.state === "captured");
    const activeControl = controls.find((control) => control.dataset.targetKey === phase.key);
    syncTargetGeometry(activeControl);
    controls.forEach((control) => {
      control.classList.toggle("is-targeted", control.dataset.targetKey === phase.key);
    });
    if (stateLabel) stateLabel.textContent = phase.label;
    if (targetName) targetName.textContent = phase.name;

    if (phase.state === "locked") {
      if (instruction) instruction.textContent = "Click to select target";
      if (coach) coach.innerHTML = "Target locked. <b>Click</b> to capture this control.";
    } else if (phase.state === "captured") {
      if (instruction) instruction.textContent = "Target captured";
      if (coach) coach.innerHTML = "<b>Captured.</b> The macro can return to this control.";
    } else {
      if (instruction) instruction.innerHTML = "Hold <kbd>⌘</kbd> to lock target";
      if (coach) {
        coach.innerHTML =
          "Hold <b>⌘</b> or <b>fn</b> to lock the highlighted target, then <b>click</b> to select it.";
      }
    }
  }

  if ("ResizeObserver" in window && targetApp) {
    new ResizeObserver(() => {
      const activeControl = controls.find(
        (control) => control.dataset.targetKey === currentPhase.key,
      );
      syncTargetGeometry(activeControl);
    }).observe(targetApp);
  }

  function stop() {
    window.clearTimeout(timer);
    timer = 0;
  }

  function schedule(delay = 0) {
    stop();
    if (reducedMotion || !inView) return;
    timer = window.setTimeout(() => {
      const phase = phases[phaseIndex % phases.length];
      applyPhase(phase);
      phaseIndex = (phaseIndex + 1) % phases.length;
      schedule(phase.hold);
    }, delay);
  }

  if (reducedMotion) {
    applyPhase(phases[2]);
    return;
  }

  applyPhase(phases[0]);
  phaseIndex = 1;

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && entry.intersectionRatio > 0.35) {
          inView = true;
          phaseIndex = 0;
          schedule(120);
        } else {
          inView = false;
          stop();
        }
      },
      { threshold: [0.15, 0.35] },
    );
    observer.observe(root);
  } else {
    schedule(120);
  }
}

document.querySelectorAll("[data-target-demo]").forEach(setupTargetDemo);

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
