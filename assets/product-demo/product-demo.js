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
      repeat: "× 2",
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

  function createStepRow(step, index, callbacks) {
    const type = stepTypes[step.type] || stepTypes.command;
    const row = document.createElement("article");
    row.className = "oa-demo-step";
    row.dataset.stepId = step.id;
    row.dataset.stepType = step.type;
    row.draggable = false;
    row.style.setProperty("--step-rgb", type.color);

    const head = document.createElement("div");
    head.className = "oa-demo-step__head";

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

    head.append(number, icon, copy, repeat, actions);

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
    let openStepID = compact ? "" : "open-inspector";
    let repeatEditingID = "";
    let autoDemoTimer = 0;
    let autoDemoPhase = 0;
    const autoDemoPhases = [
      { openStepID: "open-inspector", repeatEditingID: "", hold: 3200 },
      { openStepID: "open-inspector", repeatEditingID: "select-effect", hold: 2200 },
      { openStepID: "open-inspector", repeatEditingID: "", hold: 650 },
      { openStepID: "select-effect", repeatEditingID: "", hold: 3600 },
    ];

    root.setAttribute("role", "region");
    root.setAttribute(
      "aria-label",
      compact ? "Interactive macro step preview" : "Interactive macro step timeline",
    );

    const list = document.createElement("div");
    list.className = "oa-demo-step-list";
    root.appendChild(list);

    function setOpenStep(stepID) {
      openStepID = stepID;
      list.querySelectorAll(".oa-demo-step").forEach((row) => {
        const isOpen = row.dataset.stepId === openStepID;
        row.classList.toggle("is-open", isOpen);
        row.classList.toggle("is-selected", isOpen);
        row.classList.toggle("is-demo-using", isOpen);
      });
    }

    function scheduleAutoDemo(delay) {
      window.clearTimeout(autoDemoTimer);
      if (compact || reducedMotion || root.matches(":hover") || root.contains(document.activeElement)) {
        return;
      }
      autoDemoTimer = window.setTimeout(() => {
        const phase = autoDemoPhases[autoDemoPhase % autoDemoPhases.length];
        setOpenStep(phase.openStepID);
        setRepeatEditing(phase.repeatEditingID);
        autoDemoPhase = (autoDemoPhase + 1) % autoDemoPhases.length;
        scheduleAutoDemo(phase.hold);
      }, delay == null ? 0 : delay);
    }

    function setRepeatEditing(stepID) {
      repeatEditingID = stepID || "";
      list.querySelectorAll(".oa-demo-step").forEach((row) => {
        row.classList.toggle("is-repeat-editing", row.dataset.stepId === repeatEditingID);
      });
    }

    function restartAutoDemo() {
      autoDemoPhase = 0;
      setOpenStep(autoDemoPhases[0].openStepID);
      setRepeatEditing(autoDemoPhases[0].repeatEditingID);
      autoDemoPhase = 1;
      scheduleAutoDemo(autoDemoPhases[0].hold);
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
        const row = createStepRow(step, index, {
          toggle(stepID) {
            window.clearTimeout(autoDemoTimer);
            setOpenStep(stepID);
            setRepeatEditing("");
          },
          toggleRepeat(stepID) {
            window.clearTimeout(autoDemoTimer);
            setRepeatEditing(repeatEditingID === stepID ? "" : stepID);
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

    render();
    if (!compact) {
      root.addEventListener("pointerenter", () => {
        window.clearTimeout(autoDemoTimer);
      });
      root.addEventListener("pointerleave", () => {
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLElement && root.contains(activeElement)) {
          activeElement.blur();
        }
        restartAutoDemo();
      });
      root.addEventListener("focusin", () => {
        window.clearTimeout(autoDemoTimer);
      });
      root.addEventListener("focusout", () => window.setTimeout(() => {
        if (!root.contains(document.activeElement) && !root.matches(":hover")) {
          restartAutoDemo();
        }
      }, 0));
      restartAutoDemo();
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
    const mode = root.dataset.radialMode || "run";
    const isTourRun = mode === "tour-run";
    const stage = document.createElement("div");
    const demoPointer = document.createElement("span");
    const replay = document.createElement("button");
    let arrangeDropHandler = null;
    let liveConfig = createRadialConfig(compact);
    if (mode === "arrange") {
      liveConfig = {
        ...liveConfig,
        submenuIndicator: {
          ...liveConfig.submenuIndicator,
          enabled: false,
        },
        items: liveConfig.items.map((item) => ({
          ...item,
          submenu: [],
        })),
        settings: {
          ...liveConfig.settings,
          mainSize: 62,
          mainRadius: 118,
        },
      };
    } else if (isTourRun) {
      liveConfig = {
        ...liveConfig,
        settings: {
          ...liveConfig.settings,
          animation: {
            ...liveConfig.settings.animation,
            openDuration: 0.46,
            submenuOpenDuration: 0.34,
            submenuCloseDuration: 0.28,
            staggerDelay: 0.035,
          },
        },
      };
    }
    let radialDemoTimer = 0;
    let radialPointerTimer = 0;
    let radialDemoPhase = 0;
    let radialDemoInView = !("IntersectionObserver" in window);
    replay.type = "button";
    replay.className = "oa-demo-radial__replay";
    replay.setAttribute("aria-label", "Replay radial menu animation");
    replay.innerHTML =
      '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15.6 6.2A7 7 0 1 0 17 10"></path><path d="M15.6 2.8v3.4h-3.4"></path></svg><span>Replay</span>';

    root.classList.add("oa-rp-runtime");
    root.setAttribute("role", "region");
    root.setAttribute(
      "aria-label",
      mode === "arrange"
        ? "Animated radial menu arrangement preview"
        : "Interactive radial menu preview",
    );
    demoPointer.className = "oa-demo-radial__pointer";
    demoPointer.innerHTML =
      '<svg viewBox="0 0 20 24" aria-hidden="true"><path d="M3.2 2.2v16.9l4.25-4.05 3.15 6.75 3.1-1.45-3.15-6.65h6.1L3.2 2.2z"></path></svg>';
    if (isTourRun) {
      stage.addEventListener(
        "pointerdown",
        (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
        },
        true,
      );
    }
    root.append(stage, demoPointer);
    if (mode === "run") root.append(replay);

    const instance = runtime.mount(
      stage,
      {
        config: liveConfig,
        animateOpen: !reducedMotion,
        showGuides: false,
        hasEmptyTempSlot: true,
      },
      {
        onDrop(payload) {
          arrangeDropHandler?.(payload);
        },
      },
    );

    if (mode === "arrange") {
      const baseItems = liveConfig.items.slice();
      const swaps = [["main.speed", "main.color"]];
      const arrangeTimers = new Set();
      let arrangeStep = 0;
      let arrangeFrameID = 0;
      const syntheticPointerID = 91;

      function later(callback, delay) {
        const timerID = window.setTimeout(() => {
          arrangeTimers.delete(timerID);
          callback();
        }, delay);
        arrangeTimers.add(timerID);
      }

      function clearArrangeTimers() {
        arrangeTimers.forEach((timerID) => window.clearTimeout(timerID));
        arrangeTimers.clear();
        if (arrangeFrameID) {
          window.cancelAnimationFrame(arrangeFrameID);
          arrangeFrameID = 0;
        }
      }

      function clearArrangeVisuals() {
        demoPointer.classList.remove("is-visible", "is-arrived", "is-dragging");
      }

      function slotPoint(slotID) {
        const slot = stage.querySelector(
          `.radial-preview-slot.main[data-slot-id="${CSS.escape(slotID)}"]`,
        );
        if (!slot) return null;
        const rootRect = root.getBoundingClientRect();
        const slotRect = slot.getBoundingClientRect();
        const clientX = slotRect.left + slotRect.width / 2;
        const clientY = slotRect.top + slotRect.height / 2;
        return {
          slot,
          clientX,
          clientY,
          left: clientX - rootRect.left + 10,
          top: clientY - rootRect.top + 8,
        };
      }

      function captureSlotPositions() {
        const positions = new Map();
        stage.querySelectorAll(".radial-preview-slot.main[data-slot-id]").forEach((slot) => {
          const rect = slot.getBoundingClientRect();
          positions.set(slot.dataset.slotId, {
            left: rect.left + rect.width / 2,
            top: rect.top + rect.height / 2,
          });
        });
        return positions;
      }

      function animateReorderedSlots(before) {
        stage.querySelectorAll(".radial-preview-slot.main[data-slot-id]").forEach((slot) => {
          const previous = before.get(slot.dataset.slotId);
          if (!previous || typeof slot.animate !== "function") return;
          const rect = slot.getBoundingClientRect();
          const dx = previous.left - (rect.left + rect.width / 2);
          const dy = previous.top - (rect.top + rect.height / 2);
          if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
          slot.animate(
            [
              {
                transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`,
              },
              { transform: "translate(-50%, -50%)" },
            ],
            {
              duration: 760,
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            },
          );
        });
      }

      function swapItems(firstSlotID, secondSlotID) {
        const before = captureSlotPositions();
        const nextItems = liveConfig.items.slice();
        const firstIndex = nextItems.findIndex((item) => item.slotID === firstSlotID);
        const secondIndex = nextItems.findIndex((item) => item.slotID === secondSlotID);
        if (firstIndex < 0 || secondIndex < 0) return;
        [nextItems[firstIndex], nextItems[secondIndex]] = [
          nextItems[secondIndex],
          nextItems[firstIndex],
        ];
        liveConfig = { ...liveConfig, items: nextItems };
        instance.update({ config: liveConfig });
        animateReorderedSlots(before);
      }

      function dispatchDragEvent(target, type, point, buttons) {
        target.dispatchEvent(
          new window.PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId: syntheticPointerID,
            pointerType: "mouse",
            isPrimary: true,
            button: 0,
            buttons,
            clientX: point.clientX,
            clientY: point.clientY,
          }),
        );
      }

      function cancelSyntheticDrag() {
        document.body.classList.remove("oa-demo-arrange-drag");
        document.dispatchEvent(
          new window.PointerEvent("pointercancel", {
            bubbles: true,
            cancelable: true,
            pointerId: syntheticPointerID,
            pointerType: "mouse",
            isPrimary: true,
          }),
        );
      }

      function pointOnDragArc(source, target, progress) {
        const controlX = (source.clientX + target.clientX) / 2;
        const controlY =
          Math.min(source.clientY, target.clientY) -
          Math.max(78, Math.abs(target.clientX - source.clientX) * 0.2);
        const inverse = 1 - progress;
        const clientX =
          inverse * inverse * source.clientX +
          2 * inverse * progress * controlX +
          progress * progress * target.clientX;
        const clientY =
          inverse * inverse * source.clientY +
          2 * inverse * progress * controlY +
          progress * progress * target.clientY;
        const rootRect = root.getBoundingClientRect();
        return {
          clientX,
          clientY,
          left: clientX - rootRect.left + 10,
          top: clientY - rootRect.top + 8,
        };
      }

      function animateArrangeDrag(source, target, duration, onComplete) {
        const startedAt = window.performance.now();

        function frame(now) {
          const elapsed = Math.min(1, (now - startedAt) / duration);
          const progress =
            elapsed < 0.5
              ? 2 * elapsed * elapsed
              : 1 - Math.pow(-2 * elapsed + 2, 2) / 2;
          const point = pointOnDragArc(source, target, progress);
          demoPointer.style.left = `${point.left}px`;
          demoPointer.style.top = `${point.top}px`;
          dispatchDragEvent(document, "pointermove", point, 1);

          if (elapsed < 1) {
            arrangeFrameID = window.requestAnimationFrame(frame);
            return;
          }

          arrangeFrameID = 0;
          onComplete();
        }

        arrangeFrameID = window.requestAnimationFrame(frame);
      }

      arrangeDropHandler = ({ slotID, targetSlotID }) => {
        swapItems(slotID, targetSlotID);
      };

      function scheduleArrangeDemo(delay = 1000) {
        clearArrangeTimers();
        if (reducedMotion || !radialDemoInView) return;

        later(() => {
          const [sourceID, targetID] = swaps[arrangeStep % swaps.length];
          const source = slotPoint(sourceID);
          const target = slotPoint(targetID);
          if (!source || !target) {
            scheduleArrangeDemo(500);
            return;
          }

          demoPointer.dataset.slotId = sourceID;
          demoPointer.style.left = `${source.left}px`;
          demoPointer.style.top = `${source.top}px`;
          demoPointer.classList.add("is-visible");
          demoPointer.classList.remove("is-arrived", "is-dragging");

          later(() => {
            document.body.classList.add("oa-demo-arrange-drag");
            dispatchDragEvent(source.slot, "pointerdown", source, 1);
            demoPointer.classList.add("is-arrived", "is-dragging");
            animateArrangeDrag(source, target, 1120, () => {
              dispatchDragEvent(document, "pointerup", target, 0);
              document.body.classList.remove("oa-demo-arrange-drag");
              demoPointer.classList.remove("is-dragging");
              demoPointer.classList.add("is-arrived");
              arrangeStep = (arrangeStep + 1) % swaps.length;
              later(() => scheduleArrangeDemo(0), 1450);
            });
          }, 420);
        }, delay);
      }

      function resetArrangeDemo() {
        clearArrangeTimers();
        cancelSyntheticDrag();
        clearArrangeVisuals();
        arrangeStep = 0;
        liveConfig = { ...liveConfig, items: baseItems.slice() };
        instance.update({ config: liveConfig });
      }

      if ("IntersectionObserver" in window && !reducedMotion) {
        const observer = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (entry?.isIntersecting && entry.intersectionRatio > 0.35) {
              radialDemoInView = true;
              resetArrangeDemo();
              scheduleArrangeDemo(900);
            } else {
              radialDemoInView = false;
              clearArrangeTimers();
              cancelSyntheticDrag();
              clearArrangeVisuals();
            }
          },
          { threshold: [0.15, 0.35] },
        );
        observer.observe(root);
      } else {
        scheduleArrangeDemo();
      }
      return;
    }

    let tourRunActive = !isTourRun;
    let tourRunOpenTimer = 0;
    const radialDemoSequence = [
      { slotID: "main.speed", hold: 1500 },
      { slotID: "main.rough-cut", hold: 1800 },
      { slotID: "sub.subtitle", hold: 1600 },
      { slotID: "main.color", hold: 1800 },
      { slotID: "sub.color.asset", hold: 1700 },
      { slotID: "main.reverb", hold: 1700 },
    ];
    const tourRunSequence = [
      { slotID: "main.color", hold: 1050 },
      { slotID: "sub.color.asset", hold: 1150 },
      { close: true },
    ];

    function clearSyntheticHover() {
      window.clearTimeout(radialPointerTimer);
      radialPointerTimer = 0;
      stage.dispatchEvent(new window.MouseEvent("mouseleave"));
      demoPointer.classList.remove("is-visible", "is-arrived");
      delete demoPointer.dataset.slotId;
    }

    function canAutoAnimate() {
      return (
        !reducedMotion &&
        radialDemoInView &&
        tourRunActive &&
        !root.matches(":hover") &&
        !root.contains(document.activeElement)
      );
    }

    function moveDemoPointer(slotID, onArrive) {
      const slot = stage.querySelector(
        `.radial-preview-slot[data-slot-id="${CSS.escape(slotID)}"]`,
      );
      if (!slot) return false;

      const rootRect = root.getBoundingClientRect();
      const slotRect = slot.getBoundingClientRect();
      const clientX = slotRect.left + slotRect.width / 2;
      const clientY = slotRect.top + slotRect.height / 2;
      demoPointer.dataset.slotId = slotID;
      demoPointer.style.left = `${clientX - rootRect.left}px`;
      demoPointer.style.top = `${clientY - rootRect.top}px`;
      demoPointer.classList.add("is-visible");
      demoPointer.classList.remove("is-arrived");
      window.clearTimeout(radialPointerTimer);
      radialPointerTimer = window.setTimeout(() => {
        radialPointerTimer = 0;
        if (!canAutoAnimate()) return;
        demoPointer.classList.add("is-arrived");
        stage.dispatchEvent(
          new window.MouseEvent("mousemove", { bubbles: true, clientX, clientY }),
        );
        onArrive?.();
      }, 620);
      return true;
    }

    function scheduleRadialDemo(delay = 1200) {
      window.clearTimeout(radialDemoTimer);
      if (!canAutoAnimate() || isTourRun) return;
      radialDemoTimer = window.setTimeout(() => {
        const phase = radialDemoSequence[radialDemoPhase % radialDemoSequence.length];
        if (!moveDemoPointer(phase.slotID, () => {
          radialDemoPhase += 1;
          scheduleRadialDemo(phase.hold);
        })) {
          scheduleRadialDemo(500);
        }
      }, delay);
    }

    function scheduleTourRunPhase(delay = 0) {
      window.clearTimeout(radialDemoTimer);
      if (!isTourRun || !canAutoAnimate()) return;

      radialDemoTimer = window.setTimeout(() => {
        const phase = tourRunSequence[radialDemoPhase];

        if (phase?.close) {
          clearSyntheticHover();
          instance.close();
          radialDemoPhase = 0;
          radialDemoTimer = window.setTimeout(() => {
            if (!canAutoAnimate()) return;
            root.classList.add("is-awaiting-open");
            startTourRun();
          }, 760);
          return;
        }

        if (!phase || !moveDemoPointer(phase.slotID, () => {
          radialDemoPhase += 1;
          scheduleTourRunPhase(phase.hold);
        })) {
          scheduleTourRunPhase(400);
        }
      }, delay);
    }

    function startTourRun() {
      if (!isTourRun || !canAutoAnimate()) return;
      window.clearTimeout(tourRunOpenTimer);
      window.clearTimeout(radialDemoTimer);
      clearSyntheticHover();
      radialDemoPhase = 0;
      root.classList.add("is-awaiting-open");
      tourRunOpenTimer = window.setTimeout(() => {
        if (!canAutoAnimate()) return;
        instance.replay();
        root.classList.remove("is-awaiting-open");
        scheduleTourRunPhase(980);
      }, 360);
    }

    function stopTourRun() {
      window.clearTimeout(tourRunOpenTimer);
      window.clearTimeout(radialDemoTimer);
      window.clearTimeout(radialPointerTimer);
      clearSyntheticHover();
      if (isTourRun) root.classList.add("is-awaiting-open");
    }

    if (mode === "run") {
      replay.addEventListener("click", () => {
        instance.replay();
        radialDemoPhase = 0;
        replay.blur();
        scheduleRadialDemo(1200);
      });
    }

    root.addEventListener("pointerenter", () => {
      window.clearTimeout(radialDemoTimer);
      window.clearTimeout(radialPointerTimer);
      clearSyntheticHover();
    });
    root.addEventListener("pointerleave", () => {
      radialDemoPhase = 0;
      if (isTourRun) startTourRun();
      else scheduleRadialDemo(900);
    });
    root.addEventListener("focusin", () => {
      window.clearTimeout(radialDemoTimer);
      window.clearTimeout(radialPointerTimer);
    });
    root.addEventListener("focusout", () => window.setTimeout(() => {
      if (root.contains(document.activeElement)) return;
      if (isTourRun) startTourRun();
      else scheduleRadialDemo(900);
    }, 0));

    if (isTourRun) {
      const tourPanel = root.closest("[data-tour-panel]");
      root.classList.add("is-awaiting-open");
      tourPanel?.addEventListener("oa:tour-activate", () => {
        tourRunActive = true;
        startTourRun();
      });
      tourPanel?.addEventListener("oa:tour-deactivate", () => {
        tourRunActive = false;
        stopTourRun();
      });
    }

    if ("IntersectionObserver" in window && !reducedMotion) {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && entry.intersectionRatio > 0.45) {
              const wasInView = radialDemoInView;
              radialDemoInView = true;
              if (!wasInView) {
                if (isTourRun) startTourRun();
                else {
                  instance.replay();
                  scheduleRadialDemo(900);
                }
              }
            } else if (!entry.isIntersecting || entry.intersectionRatio < 0.2) {
              radialDemoInView = false;
              if (isTourRun) stopTourRun();
              else {
                window.clearTimeout(radialDemoTimer);
                window.clearTimeout(radialPointerTimer);
                clearSyntheticHover();
              }
            }
          }
        },
        { threshold: [0.2, 0.45] },
      );
      observer.observe(root);
    } else {
      if (isTourRun) startTourRun();
      else scheduleRadialDemo();
    }
  }

  document.querySelectorAll("[data-step-demo]").forEach(setupStepDemo);
  document.querySelectorAll("[data-radial-demo]").forEach(setupRadialDemo);
})();
