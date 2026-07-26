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
      summary: "Workspace · Show Inspector",
      detail: "Opens the panel used by the next actions.",
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
    repeat.textContent = step.repeat || "";
    repeat.hidden = !step.repeat;

    const actions = document.createElement("span");
    actions.className = "oa-demo-step__actions";
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
    actions.append(duplicate, remove);

    head.append(handle, number, icon, copy, repeat, actions);

    const body = document.createElement("div");
    body.className = "oa-demo-step__body";
    body.innerHTML = `
      <span>
        <small>Action</small>
        <strong>${step.detail}</strong>
      </span>
      <span class="oa-demo-step__field" aria-hidden="true"></span>
    `;

    head.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      const next = !row.classList.contains("is-open");
      row.parentElement
        ?.querySelectorAll(".oa-demo-step.is-open")
        .forEach((openRow) => openRow.classList.remove("is-open"));
      row.classList.toggle("is-open", next);
    });

    row.append(head, body);
    return row;
  }

  function setupStepDemo(root) {
    const compact = root.hasAttribute("data-compact");
    let steps = sampleSteps.slice(0, compact ? 4 : sampleSteps.length).map((step) => ({ ...step }));
    let draggedID = "";
    let pointerDrag = null;
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
          duplicate(stepID) {
            const sourceIndex = steps.findIndex((candidate) => candidate.id === stepID);
            if (sourceIndex < 0) return;
            const copy = { ...steps[sourceIndex], id: `${steps[sourceIndex].id}-${Date.now()}` };
            steps.splice(sourceIndex + 1, 0, copy);
            render({ animateID: copy.id });
          },
          remove(stepID) {
            if (steps.length <= 2) return;
            const sourceIndex = steps.findIndex((candidate) => candidate.id === stepID);
            if (sourceIndex < 0) return;
            steps.splice(sourceIndex, 1);
            render();
          },
        });
        if (step.id === animateID) row.classList.add("is-entering");
        list.appendChild(row);
      });
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
  }

  function rgba(red, green, blue, alpha) {
    return { red, green, blue, alpha };
  }

  function radialItem(slotID, name, icon, submenu) {
    return {
      slotID,
      name,
      actionID: `demo.${slotID}`,
      image: `assets/product-demo/radial-icons/${icon}`,
      previewImage: `assets/product-demo/radial-icons/${icon}`,
      submenu: submenu || [],
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
      radialItem("main.color", "Clip Color", "clip-color.svg"),
      radialItem("main.scale", "Scale Level", "scale-level.svg"),
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
    const replay = document.createElement("button");
    replay.type = "button";
    replay.className = "oa-demo-radial__replay";
    replay.setAttribute("aria-label", "Replay radial menu animation");
    replay.innerHTML =
      '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15.6 6.2A7 7 0 1 0 17 10"></path><path d="M15.6 2.8v3.4h-3.4"></path></svg><span>Replay</span>';

    root.classList.add("oa-rp-runtime");
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", "Interactive radial menu preview");
    root.append(stage, replay);

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

    if ("IntersectionObserver" in window && !reducedMotion) {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && entry.intersectionRatio > 0.45) {
              instance.replay();
            }
          }
        },
        { threshold: [0.45] },
      );
      observer.observe(root);
    }
  }

  document.querySelectorAll("[data-step-demo]").forEach(setupStepDemo);
  document.querySelectorAll("[data-radial-demo]").forEach(setupRadialDemo);
})();
