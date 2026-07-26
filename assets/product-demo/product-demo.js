(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stepTypes = {
    command: {
      icon: "assets/builder-icons/step-command.svg",
      title: "App Command",
      color: "154, 83, 255",
    },
    axAction: {
      icon: "assets/builder-icons/step-silent.svg",
      title: "Silent Action",
      color: "52, 199, 89",
    },
    key: {
      icon: "assets/builder-icons/step-keyboard.svg",
      title: "Keyboard",
      color: "80, 150, 255",
    },
    pause: {
      icon: "assets/builder-icons/step-pause.svg",
      title: "Pause",
      color: "255, 184, 77",
    },
    input: {
      icon: "assets/builder-icons/step-input.svg",
      title: "Input",
      color: "255, 88, 190",
    },
    mouse: {
      icon: "assets/builder-icons/step-mouse.svg",
      title: "Mouse",
      color: "54, 205, 190",
    },
  };

  const sampleSteps = [
    {
      id: "open-inspector",
      type: "command",
      summary: "Edit · Multicam · Video and Audio",
      detail: "Runs an application menu command.",
    },
    {
      id: "select-effect",
      type: "axAction",
      summary: "Select Warp Stabilizer",
      detail: "Presses a captured interface control without moving the pointer.",
    },
    {
      id: "wait",
      type: "pause",
      summary: "Wait 0.3 seconds",
      detail: "Gives the interface time to finish updating.",
    },
    {
      id: "set-value",
      type: "input",
      summary: "Enter 50 in Speed",
      detail: "Replaces the current value in the captured field.",
      repeat: "× 2",
    },
    {
      id: "confirm",
      type: "key",
      summary: "Press Return",
      detail: "Confirms the new value.",
    },
  ];

  function createIconButton(label, body, danger) {
    const button = document.createElement("button");
    button.className = `oa-demo-step__action${danger ? " is-danger" : ""}`;
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.innerHTML = body;
    return button;
  }

  function createStepRow(step, index, compact, callbacks) {
    const type = stepTypes[step.type] || stepTypes.command;
    const row = document.createElement("article");
    row.className = "oa-demo-step";
    row.dataset.stepId = step.id;
    row.dataset.stepType = step.type;
    row.draggable = !compact;
    row.style.setProperty("--step-rgb", type.color);

    const head = document.createElement("div");
    head.className = "oa-demo-step__head";

    const handle = document.createElement("span");
    handle.className = "oa-demo-step__handle";
    handle.setAttribute("aria-hidden", "true");

    const number = document.createElement("span");
    number.className = "oa-demo-step__index";
    number.textContent = String(index + 1);

    const icon = document.createElement("span");
    icon.className = "oa-demo-step__type-icon";
    icon.innerHTML = `<img src="${type.icon}" alt="" />`;

    const copy = document.createElement("span");
    copy.className = "oa-demo-step__copy";
    copy.innerHTML = `<strong>${type.title}</strong><small>${step.summary}</small>`;

    const repeat = document.createElement("span");
    repeat.className = "oa-demo-step__repeat";
    repeat.hidden = !step.repeat;
    if (step.repeat) {
      repeat.innerHTML = `
        <button class="oa-demo-repeat__badge" type="button" aria-label="Edit repeat settings">
          <span>${step.repeat}</span>
        </button>
        <span class="oa-demo-repeat__editor" aria-hidden="true">
          <span class="oa-demo-repeat__field"><small>Repeat</small><b>2×</b></span>
          <span class="oa-demo-repeat__field"><small>Gap</small><b>0.2s</b></span>
          <span class="oa-demo-repeat__tool">↺</span>
          <span class="oa-demo-repeat__tool is-confirm">✓</span>
          <span class="oa-demo-repeat__tool is-cancel">×</span>
        </span>
      `;
      repeat.querySelector(".oa-demo-repeat__badge")?.addEventListener("click", (event) => {
        event.stopPropagation();
        callbacks?.toggleRepeat(step.id);
      });
    }

    const actions = document.createElement("span");
    actions.className = "oa-demo-step__actions";
    const play = createIconButton(
      `Test ${type.title}`,
      '<svg class="is-play" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.4c0-.8.9-1.3 1.6-.9l6 4.1c.6.4.6 1.4 0 1.8l-6 4.1c-.7.4-1.6-.1-1.6-.9V3.4z"></path></svg>',
    );
    play.addEventListener("click", (event) => {
      event.stopPropagation();
      callbacks?.test(step.id);
    });
    const duplicate = createIconButton(
      `Duplicate ${type.title}`,
      '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6.5" y="3.5" width="10" height="10" rx="2"></rect><path d="M13.5 13.5v1a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h1"></path></svg>',
    );
    duplicate.addEventListener("click", (event) => {
      event.stopPropagation();
      callbacks?.duplicate(step.id);
    });
    const remove = createIconButton(
      `Remove ${type.title}`,
      '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 6h11M8 3.5h4M6.5 6l.6 10h5.8l.6-10"></path></svg>',
      true,
    );
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      callbacks?.remove(step.id);
    });
    actions.append(play, duplicate, remove);

    head.append(handle, number, icon, copy, repeat, actions);

    const body = document.createElement("div");
    body.className = "oa-demo-step__body";
    if (step.type === "command") {
      body.innerHTML = `
        <div class="oa-demo-step-editor">
          <span class="oa-demo-step-editor__label">Command</span>
          <span class="oa-demo-step-editor__control">
            <img src="${type.icon}" alt="" />
            <span>Edit › Multicam › Video and Audio</span>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.5 5 5 5-5 5"></path></svg>
          </span>
        </div>
        <kbd class="oa-demo-step-editor__shortcut">⌥⌘V</kbd>
      `;
    } else if (step.type === "axAction") {
      body.classList.add("oa-demo-step__body--target");
      body.innerHTML = `
        <div class="oa-demo-target is-captured">
          <span class="oa-demo-target__icon" aria-hidden="true">
            <svg viewBox="0 0 20 20"><path d="m5.7 10.2 2.6 2.6 6-6"></path></svg>
          </span>
          <span class="oa-demo-target__copy">
            <strong>Stabilize</strong>
            <small>Inspector › Stabilization</small>
          </span>
          <button class="oa-demo-target__capture" type="button">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="8" cy="8" r="4.6"></circle>
              <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"></circle>
              <path d="M8 1.4v2.2M8 12.4v2.2M1.4 8h2.2M12.4 8h2.2"></path>
            </svg>
            <span>Capture</span>
          </button>
        </div>
      `;
    } else {
      body.innerHTML = `
        <div class="oa-demo-step-editor">
          <span class="oa-demo-step-editor__label">Action</span>
          <span class="oa-demo-step-editor__control">${step.detail}</span>
        </div>
      `;
    }

    head.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      callbacks?.toggle(step.id);
    });

    row.append(head, body);
    return row;
  }

  function setupStepDemo(root) {
    const compact = root.hasAttribute("data-compact");
    let steps = sampleSteps.slice(0, compact ? 4 : sampleSteps.length).map((step) => ({ ...step }));
    let draggedID = "";
    let pointerDrag = null;
    let openStepID = compact ? "" : "select-effect";
    let repeatEditingID = "";
    let autoDemoTimer = 0;
    let repeatDemoTimer = 0;
    const autoDemoSteps = ["select-effect", "open-inspector"];
    const dropIndicator = document.createElement("div");
    dropIndicator.className = "oa-demo-drop-indicator";

    root.setAttribute("role", "region");
    root.setAttribute(
      "aria-label",
      compact ? "Interactive macro step preview" : "Interactive macro step timeline",
    );

    const list = document.createElement("div");
    list.className = "oa-demo-step-list";
    root.appendChild(list);

    function setOpenStep(stepID, { restart = false } = {}) {
      openStepID = stepID;
      list.querySelectorAll(".oa-demo-step").forEach((row) => {
        const isOpen = row.dataset.stepId === openStepID;
        row.classList.toggle("is-open", isOpen);
        row.classList.toggle("is-selected", isOpen);
        row.classList.toggle("is-demo-using", isOpen);
      });
      if (restart) scheduleAutoDemo();
    }

    function scheduleAutoDemo() {
      window.clearTimeout(autoDemoTimer);
      if (compact || reducedMotion || root.matches(":hover") || root.contains(document.activeElement)) {
        return;
      }
      autoDemoTimer = window.setTimeout(() => {
        const currentIndex = autoDemoSteps.indexOf(openStepID);
        const nextID = autoDemoSteps[(currentIndex + 1 + autoDemoSteps.length) % autoDemoSteps.length];
        setOpenStep(nextID);
        scheduleAutoDemo();
      }, 4600);
    }

    function setRepeatEditing(stepID) {
      repeatEditingID = stepID || "";
      list.querySelectorAll(".oa-demo-step").forEach((row) => {
        row.classList.toggle("is-repeat-editing", row.dataset.stepId === repeatEditingID);
      });
    }

    function scheduleRepeatDemo(delay = 2600) {
      window.clearTimeout(repeatDemoTimer);
      if (compact || reducedMotion || root.matches(":hover") || root.contains(document.activeElement)) {
        return;
      }
      repeatDemoTimer = window.setTimeout(() => {
        setRepeatEditing(repeatEditingID ? "" : "set-value");
        scheduleRepeatDemo(repeatEditingID ? 2200 : 3900);
      }, delay);
    }

    root.addEventListener("pointermove", (event) => {
      const row = event.target.closest(".oa-demo-step");
      if (!row) return;
      const rect = row.getBoundingClientRect();
      row.style.setProperty("--oa-demo-pointer-x", `${event.clientX - rect.left}px`);
      row.style.setProperty("--oa-demo-pointer-y", `${event.clientY - rect.top}px`);
    });

    function render({ animateID = "" } = {}) {
      list.innerHTML = "";
      steps.forEach((step, index) => {
        const row = createStepRow(step, index, compact, {
          toggle(stepID) {
            setOpenStep(stepID, { restart: true });
          },
          toggleRepeat(stepID) {
            setRepeatEditing(repeatEditingID === stepID ? "" : stepID);
            scheduleRepeatDemo();
          },
          test(stepID) {
            const testedRow = list.querySelector(`[data-step-id="${CSS.escape(stepID)}"]`);
            if (!testedRow) return;
            testedRow.classList.remove("is-testing");
            void testedRow.offsetWidth;
            testedRow.classList.add("is-testing");
            window.setTimeout(() => testedRow.classList.remove("is-testing"), 1100);
          },
          duplicate(stepID) {
            const sourceIndex = steps.findIndex((candidate) => candidate.id === stepID);
            if (sourceIndex < 0) return;
            const copy = { ...steps[sourceIndex], id: `${steps[sourceIndex].id}-${Date.now()}` };
            steps.splice(sourceIndex + 1, 0, copy);
            openStepID = copy.id;
            render({ animateID: copy.id });
          },
          remove(stepID) {
            if (steps.length <= 2) return;
            const sourceIndex = steps.findIndex((candidate) => candidate.id === stepID);
            if (sourceIndex < 0) return;
            steps.splice(sourceIndex, 1);
            if (openStepID === stepID) openStepID = "";
            render();
          },
        });
        if (step.id === animateID) row.classList.add("is-entering");
        list.appendChild(row);
      });
      setOpenStep(openStepID);
      setRepeatEditing(repeatEditingID);
    }

    if (!compact) {
      function positionDropIndicator(clientY) {
        const candidates = [...list.querySelectorAll(".oa-demo-step:not(.is-dragging)")];
        const before = candidates.find((row) => {
          const rect = row.getBoundingClientRect();
          return clientY < rect.top + rect.height / 2;
        });
        if (before) list.insertBefore(dropIndicator, before);
        else list.appendChild(dropIndicator);
      }

      function applyDropOrder() {
        if (dropIndicator.parentElement !== list || !draggedID) return;
        const moved = steps.find((step) => step.id === draggedID);
        const remaining = steps.filter((step) => step.id !== draggedID);
        const children = [...list.children];
        const indicatorPosition = children.indexOf(dropIndicator);
        const insertIndex = children
          .slice(0, indicatorPosition)
          .filter(
            (element) =>
              element.classList.contains("oa-demo-step") &&
              element.dataset.stepId !== draggedID,
          ).length;
        if (moved) remaining.splice(insertIndex, 0, moved);
        steps = remaining;
      }

      root.addEventListener("pointerdown", (event) => {
        const handle = event.target.closest(".oa-demo-step__handle");
        const row = handle?.closest(".oa-demo-step");
        if (!handle || !row || event.button !== 0) return;
        event.preventDefault();
        draggedID = row.dataset.stepId || "";
        pointerDrag = {
          pointerID: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          active: false,
          handle,
          row,
        };
        handle.setPointerCapture?.(event.pointerId);
      });

      root.addEventListener("pointermove", (event) => {
        if (!pointerDrag || pointerDrag.pointerID !== event.pointerId) return;
        event.preventDefault();
        const dx = event.clientX - pointerDrag.startX;
        const dy = event.clientY - pointerDrag.startY;
        if (!pointerDrag.active && dx * dx + dy * dy < 25) return;
        if (!pointerDrag.active) {
          pointerDrag.active = true;
          pointerDrag.row.classList.add("is-dragging");
        }

        positionDropIndicator(event.clientY);
      });

      function finishPointerDrag(event, cancelled) {
        if (!pointerDrag || (event.pointerId != null && pointerDrag.pointerID !== event.pointerId)) return;
        const active = pointerDrag.active;
        pointerDrag.handle.releasePointerCapture?.(pointerDrag.pointerID);

        if (active && !cancelled && dropIndicator.parentElement === list) {
          applyDropOrder();
        }

        dropIndicator.remove();
        draggedID = "";
        pointerDrag = null;
        render();
      }

      root.addEventListener("pointerup", (event) => finishPointerDrag(event, false));
      root.addEventListener("pointercancel", (event) => finishPointerDrag(event, true));

      root.addEventListener("dragstart", (event) => {
        const row = event.target.closest(".oa-demo-step");
        if (!row) return;
        draggedID = row.dataset.stepId || "";
        row.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", draggedID);
      });

      root.addEventListener("dragover", (event) => {
        if (!draggedID) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        positionDropIndicator(event.clientY);
      });

      root.addEventListener("drop", (event) => {
        if (!draggedID) return;
        event.preventDefault();
        applyDropOrder();
        dropIndicator.remove();
        draggedID = "";
        pointerDrag = null;
        render();
      });

      root.addEventListener("dragend", () => {
        dropIndicator.remove();
        draggedID = "";
        pointerDrag = null;
        render();
      });
    }

    render();
    if (!compact) {
      root.addEventListener("pointerenter", () => {
        window.clearTimeout(autoDemoTimer);
        window.clearTimeout(repeatDemoTimer);
      });
      root.addEventListener("pointerleave", () => {
        scheduleAutoDemo();
        scheduleRepeatDemo();
      });
      root.addEventListener("focusin", () => {
        window.clearTimeout(autoDemoTimer);
        window.clearTimeout(repeatDemoTimer);
      });
      root.addEventListener("focusout", () => window.setTimeout(() => {
        scheduleAutoDemo();
        scheduleRepeatDemo();
      }, 0));
      scheduleAutoDemo();
      scheduleRepeatDemo();
    }
  }

  function rgba(red, green, blue, alpha) {
    return { red, green, blue, alpha };
  }

  function radialItem(slotID, name, icon, submenu, options) {
    return {
      slotID,
      name,
      actionID: `demo.${slotID}`,
      image: `assets/product-demo/radial-icons/${icon}`,
      previewImage: `assets/product-demo/radial-icons/${icon}`,
      submenu: submenu || [],
      ...(options || {}),
    };
  }

  function createRadialConfig(compact) {
    const items = [
      radialItem("main.remove", "Remove Attributes", "remove-attributes.svg"),
      radialItem("main.speed", "50% Speed", "speed-half.svg"),
      radialItem("main.reverb", "Audio Reverb", "audio-reverb.svg"),
      radialItem("main.zoom", "Dynamic Zoom", "dynamic-zoom.svg"),
      radialItem("main.stabilize", "Stabilize", "stabilize.svg"),
      radialItem("main.rough-cut", "Rough Cut", "rough-cut.svg", [
        radialItem("sub.subtitle", "Create Subtitles", "create-subtitles.svg"),
        radialItem("sub.silence", "Ripple Delete Silence", "ripple-delete.svg"),
      ]),
      radialItem("main.color", "Clip Color", "clip-color.svg", [
        radialItem("sub.color.effect", "Effect", "clip-effect.svg"),
        radialItem("sub.color.b-roll", "B-Roll", "clip-b-roll.svg"),
        radialItem("sub.color.temp-vo", "Temp VO", "clip-temp-vo.svg"),
        radialItem("sub.color.asset", "Asset", "clip-asset.svg"),
      ]),
      radialItem("main.scale", "Scale Level", "scale-level.svg", [
        radialItem("sub.scale.1", "1.1×", "scale-level.svg"),
        radialItem("sub.scale.2", "1.2×", "scale-level.svg"),
        radialItem("sub.scale.3", "1.5×", "scale-level.svg"),
      ]),
    ];

    const light = rgba(0.922, 0.922, 0.922, 0.902);
    const orange = rgba(1, 0.478, 0.094, 1);
    const black = rgba(0, 0, 0, 1);
    const clear = rgba(0, 0, 0, 0);

    return {
      settings: {
        mainSize: compact ? 42 : 45,
        submenuSize: compact ? 42 : 45,
        mainRadius: compact ? 73 : 80,
        submenuRadius: compact ? 150 : 177,
        layout: {
          useAutoMainLayout: true,
          mainSlotCount: 8,
          mainMaxItems: 16,
          useAutoSubmenuLayout: true,
          submenuFullCircleSlots: 19,
          submenuMaxItems: 38,
          minItemGap: 8,
        },
        animation: {
          openDuration: 0.18,
          closeDuration: 0.18,
          submenuOpenDuration: 0.18,
          submenuCloseDuration: 0.18,
          staggerDelay: 0.02,
          bounceIntensity: 0,
          mainFadeStart: 0,
          mainFadeEnd: 1,
        },
      },
      theme: {
        item: {
          fill: light,
          hoverFill: orange,
          stroke: clear,
          hoverStroke: clear,
          textColor: black,
          iconTint: black,
          hoverIconTint: black,
          borderWidth: 0,
          hoverBorderWidth: 0,
          fontSize: 21,
          imageScale: 0.58,
          showLabelWithImage: false,
          minFontSize: 10,
          autoFitText: true,
        },
        submenu: { minFontSize: 9 },
        close: {
          fill: rgba(0.102, 0.102, 0.102, 1),
          hoverFill: rgba(1, 0, 0, 0.502),
          stroke: rgba(0.102, 0.102, 0.102, 1),
          hoverStroke: rgba(1, 0, 0, 0.502),
          textColor: rgba(1, 1, 1, 1),
          borderWidth: 0,
        },
      },
      closeItem: { slotID: "system.close", name: "Close" },
      submenuIndicator: { enabled: true, size: 3, offsetGap: 2 },
      hotkeyBadge: { enabled: false },
      nameTooltip: {
        enabled: true,
        delay: compact ? 0.36 : 0.22,
        fadeDuration: 0.16,
        gap: 8,
        maxWidth: 180,
        paddingX: 10,
        paddingY: 5,
        fontSize: 12,
        fillColor: rgba(0.102, 0.102, 0.102, 0.92),
        textColor: rgba(0.957, 0.957, 0.961, 1),
        strokeColor: rgba(1, 1, 1, 0.18),
        strokeWidth: 1,
      },
      items,
    };
  }

  function setupRadialDemo(root) {
    const runtime = window.OA?.radialPreviewRuntime;
    if (!runtime?.mount) return;
    const compact = root.hasAttribute("data-compact");
    const stage = document.createElement("div");
    const demoPointer = document.createElement("span");
    const replay = document.createElement("button");
    let radialDemoTimer = 0;
    let radialDemoPhase = 0;
    let radialDemoInView = !("IntersectionObserver" in window);
    replay.type = "button";
    replay.className = "oa-demo-radial__replay";
    replay.setAttribute("aria-label", "Replay radial menu animation");
    replay.innerHTML =
      '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15.6 6.2A7 7 0 1 0 17 10"></path><path d="M15.6 2.8v3.4h-3.4"></path></svg><span>Replay</span>';

    root.classList.add("oa-rp-runtime");
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", "Interactive radial menu preview");
    demoPointer.className = "oa-demo-radial__pointer";
    demoPointer.innerHTML =
      '<svg viewBox="0 0 20 24" aria-hidden="true"><path d="M3.2 2.2v16.9l4.25-4.05 3.15 6.75 3.1-1.45-3.15-6.65h6.1L3.2 2.2z"></path></svg>';
    root.append(stage, demoPointer, replay);

    const instance = runtime.mount(
      stage,
      {
        config: createRadialConfig(compact),
        animateOpen: !reducedMotion,
        showGuides: false,
        hasEmptyTempSlot: true,
      },
      {},
    );

    replay.addEventListener("click", () => instance.replay());

    const radialDemoSequence = [
      { slotID: "main.speed", hold: 1500 },
      { slotID: "main.rough-cut", hold: 1800 },
      { slotID: "sub.subtitle", hold: 1600 },
      { slotID: "main.color", hold: 1800 },
      { slotID: "sub.color.asset", hold: 1700 },
      { slotID: "main.reverb", hold: 1700 },
    ];

    function clearSyntheticHover() {
      stage.dispatchEvent(new window.MouseEvent("mouseleave"));
      demoPointer.classList.remove("is-visible", "is-arrived");
    }

    function scheduleRadialDemo(delay = 1200) {
      window.clearTimeout(radialDemoTimer);
      if (
        reducedMotion ||
        !radialDemoInView ||
        root.matches(":hover") ||
        root.contains(document.activeElement)
      ) return;
      radialDemoTimer = window.setTimeout(() => {
        const phase = radialDemoSequence[radialDemoPhase % radialDemoSequence.length];
        const slot = stage.querySelector(
          `.radial-preview-slot[data-slot-id="${CSS.escape(phase.slotID)}"]`,
        );
        if (!slot) {
          scheduleRadialDemo(500);
          return;
        }
        const rootRect = root.getBoundingClientRect();
        const slotRect = slot.getBoundingClientRect();
        const clientX = slotRect.left + slotRect.width / 2;
        const clientY = slotRect.top + slotRect.height / 2;
        demoPointer.dataset.slotId = phase.slotID;
        demoPointer.style.left = `${clientX - rootRect.left}px`;
        demoPointer.style.top = `${clientY - rootRect.top}px`;
        demoPointer.classList.add("is-visible");
        demoPointer.classList.remove("is-arrived");
        window.setTimeout(() => {
          if (root.matches(":hover")) return;
          demoPointer.classList.add("is-arrived");
          stage.dispatchEvent(
            new window.MouseEvent("mousemove", { bubbles: true, clientX, clientY }),
          );
        }, 620);
        radialDemoPhase += 1;
        scheduleRadialDemo(phase.hold + 620);
      }, delay);
    }

    root.addEventListener("pointerenter", () => {
      window.clearTimeout(radialDemoTimer);
      clearSyntheticHover();
    });
    root.addEventListener("pointerleave", () => scheduleRadialDemo(900));

    if ("IntersectionObserver" in window && !reducedMotion) {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && entry.intersectionRatio > 0.45) {
              const wasInView = radialDemoInView;
              radialDemoInView = true;
              if (!wasInView) {
                instance.replay();
                scheduleRadialDemo(900);
              }
            } else if (!entry.isIntersecting || entry.intersectionRatio < 0.2) {
              radialDemoInView = false;
              window.clearTimeout(radialDemoTimer);
              clearSyntheticHover();
            }
          }
        },
        { threshold: [0.2, 0.45] },
      );
      observer.observe(root);
    } else {
      scheduleRadialDemo();
    }
  }

  document.querySelectorAll("[data-step-demo]").forEach(setupStepDemo);
  document.querySelectorAll("[data-radial-demo]").forEach(setupRadialDemo);
})();
