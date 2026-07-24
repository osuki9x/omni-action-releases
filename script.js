const INSTALL_COMMAND =
  '/bin/bash -c "$(curl -fsSL https://github.com/osuki9x/omni-action-releases/releases/latest/download/install.sh)"';

const header = document.querySelector("[data-header]");

function updateHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 16);
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

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

for (const element of document.querySelectorAll(".reveal")) {
  revealObserver.observe(element);
}

document.querySelector("[data-copy-command]")?.addEventListener("click", async (event) => {
  const button = event.currentTarget;
  const label = button.querySelector("[data-copy-label]");

  try {
    await navigator.clipboard.writeText(INSTALL_COMMAND);
    label.textContent = "Copied";
    button.setAttribute("aria-label", "Install command copied");
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
    label.textContent = "Copied";
  }

  window.setTimeout(() => {
    label.textContent = "Copy";
    button.setAttribute("aria-label", "Copy install command");
  }, 1800);
});

document.querySelector("[data-year]").textContent = new Date().getFullYear();

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
      document.querySelector("[data-shortcut-link]")?.setAttribute(
        "href",
        shortcutAsset.browser_download_url,
      );
    }
  } catch {
    // The page remains fully usable with its bundled release fallback.
  }
}

updateReleaseIdentity();
