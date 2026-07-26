/* ============================================================
   Radial runtime-preview primitives.

   This module owns only the preview island: public draft config ->
   runtime-shaped preview config, runtime-matching geometry/rendering,
   hover/submenu/tooltip/open-close animation, and lightweight edit callbacks.

   It intentionally does not know how Builder v3 persists radial edits.
   ============================================================ */
(function () {
  "use strict";

  const OA = window.OA;
  const api = (OA.radialPreviewRuntime = {});

  function clamp(value, minValue, maxValue) {
    value = Number(value) || 0;
    return Math.max(minValue, Math.min(maxValue, value));
  }

  function merge(target, source) {
    target = target || {};
    source = source || {};
    Object.keys(source).forEach(function (key) {
      const value = source[key];
      if (value && typeof value === "object" && !Array.isArray(value) && target[key] && typeof target[key] === "object" && !Array.isArray(target[key])) {
        target[key] = merge(Object.assign({}, target[key]), value);
      } else {
        target[key] = deepClone(value);
      }
    });
    return target;
  }

  function deepClone(value) {
    if (value == null) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function color(value, fallback) {
    value = value && typeof value === "object" ? value : (fallback || {});
    return {
      red: Number(value.red) || 0,
      green: Number(value.green) || 0,
      blue: Number(value.blue) || 0,
      alpha: value.alpha == null ? 1 : Number(value.alpha),
    };
  }

  function colorWithOpacity(value, opacity) {
    const c = color(value, { red: 1, green: 1, blue: 1, alpha: 1 });
    c.alpha = (c.alpha == null ? 1 : c.alpha) * clamp(opacity == null ? 1 : opacity, 0, 1);
    return c;
  }

  function mixNumber(from, to, progress) {
    const p = clamp(progress, 0, 1);
    return (Number(from) || 0) + (((Number(to) || 0) - (Number(from) || 0)) * p);
  }

  function mixColor(from, to, progress) {
    from = color(from, to);
    to = color(to, from);
    return {
      red: mixNumber(from.red, to.red, progress),
      green: mixNumber(from.green, to.green, progress),
      blue: mixNumber(from.blue, to.blue, progress),
      alpha: mixNumber(from.alpha == null ? 1 : from.alpha, to.alpha == null ? 1 : to.alpha, progress),
    };
  }

  function styleForConfig(config, kind, item, hoverProgress) {
    const theme = config.theme || {};
    let style = kind === "close" ? merge({}, theme.close || {}) : merge({}, theme.item || {});
    if (kind === "submenu") style = merge(style, theme.submenu || {});
    style = merge(style, item && item.style ? item.style : {});
    const progress = clamp(typeof hoverProgress === "number" ? hoverProgress : (hoverProgress ? 1 : 0), 0, 1);
    if (progress > 0) {
      const baseFill = style.fill;
      const baseStroke = style.stroke || style.fill;
      style.fill = mixColor(baseFill, style.hoverFill || baseFill, progress);
      style.stroke = mixColor(baseStroke, style.hoverStroke || baseStroke, progress);
      style.textColor = mixColor(style.textColor, style.hoverTextColor || style.textColor, progress);
      if (style.hoverBorderWidth != null) style.borderWidth = mixNumber(style.borderWidth || 0, style.hoverBorderWidth, progress);
    }
    const styleOpacity = style.opacity == null ? 1 : style.opacity;
    style.fill = colorWithOpacity(style.fill, styleOpacity);
    style.stroke = colorWithOpacity(style.stroke || style.fill, styleOpacity);
    style.textColor = colorWithOpacity(style.textColor, styleOpacity);
    return style;
  }

  function cssColor(value, opacity) {
    const c = opacity == null ? color(value) : colorWithOpacity(value, opacity);
    return "rgba(" + Math.round(clamp(c.red, 0, 1) * 255) + "," +
      Math.round(clamp(c.green, 0, 1) * 255) + "," +
      Math.round(clamp(c.blue, 0, 1) * 255) + "," +
      clamp(c.alpha == null ? 1 : c.alpha, 0, 1).toFixed(4).replace(/0+$/, "").replace(/\.$/, "") + ")";
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function cssFontFamily(fontName) {
    fontName = String(fontName || "");
    if (!fontName || fontName.indexOf("AppleSystem") >= 0) {
      return "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Helvetica, Arial, sans-serif";
    }
    return "'" + fontName.replace(/'/g, "\\'") + "', -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif";
  }

  function textLength(text) {
    return Array.from(String(text || "")).length;
  }

  function defaultUserConfig(value) {
    value = deepClone(value || {});
    const order = value.order && typeof value.order === "object" ? value.order : {};
    return {
      version: Number(value.version) || 1,
      schema: value.schema || "davinci.radial_menu.user_overrides.v1",
      settings: value.settings && typeof value.settings === "object" ? value.settings : {},
      theme: value.theme && typeof value.theme === "object" ? value.theme : {},
      hiddenSlots: value.hiddenSlots && typeof value.hiddenSlots === "object" && !Array.isArray(value.hiddenSlots) ? value.hiddenSlots : {},
      slotOverrides: value.slotOverrides && typeof value.slotOverrides === "object" && !Array.isArray(value.slotOverrides) ? value.slotOverrides : {},
      order: {
        main: Array.isArray(order.main) ? order.main : [],
        submenus: order.submenus && typeof order.submenus === "object" && !Array.isArray(order.submenus) ? order.submenus : {},
      },
      items: Array.isArray(value.items) ? value.items : [],
    };
  }

  function hasOwn(value, key) {
    return !!value && Object.prototype.hasOwnProperty.call(value, key);
  }

  function firstDefined(primary, fallback) {
    return primary !== undefined && primary !== null ? primary : fallback;
  }

  function applyFeatureOverride(runtime, key, value) {
    if (typeof value === "boolean") {
      runtime[key] = merge(runtime[key] || {}, { enabled: value });
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      runtime[key] = merge(runtime[key] || {}, value);
    }
  }

  function applyPublicSettings(runtime, settingsPublic) {
    if (!settingsPublic || typeof settingsPublic !== "object") return;

    const runtimeSettings = runtime.settings = runtime.settings || {};
    const shortcut = settingsPublic.triggerShortcut;
    if (shortcut && typeof shortcut === "object") {
      const runtimeShortcut = runtimeSettings.triggerShortcut = merge({}, runtimeSettings.triggerShortcut || {});
      if (hasOwn(shortcut, "key")) runtimeShortcut.key = shortcut.key;
      if (hasOwn(shortcut, "modifiers") || hasOwn(shortcut, "mods")) {
        runtimeShortcut.mods = deepClone(firstDefined(shortcut.modifiers, shortcut.mods));
      }
    }

    ["canvasPadding", "screenPadding", "hoverPadding"].forEach(function (key) {
      if (hasOwn(settingsPublic, key)) runtimeSettings[key] = deepClone(settingsPublic[key]);
    });

    const size = settingsPublic.size && typeof settingsPublic.size === "object" ? settingsPublic.size : {};
    if (hasOwn(size, "main")) runtimeSettings.mainSize = deepClone(size.main);
    else if (hasOwn(settingsPublic, "mainSize")) runtimeSettings.mainSize = deepClone(settingsPublic.mainSize);
    if (hasOwn(size, "submenu")) runtimeSettings.submenuSize = deepClone(size.submenu);
    else if (hasOwn(settingsPublic, "submenuSize")) runtimeSettings.submenuSize = deepClone(settingsPublic.submenuSize);

    const radius = settingsPublic.radius && typeof settingsPublic.radius === "object" ? settingsPublic.radius : {};
    if (hasOwn(radius, "main")) runtimeSettings.mainRadius = deepClone(radius.main);
    else if (hasOwn(settingsPublic, "mainRadius")) runtimeSettings.mainRadius = deepClone(settingsPublic.mainRadius);
    if (hasOwn(radius, "submenu")) runtimeSettings.submenuRadius = deepClone(radius.submenu);
    else if (hasOwn(settingsPublic, "submenuRadius")) runtimeSettings.submenuRadius = deepClone(settingsPublic.submenuRadius);

    const layout = settingsPublic.layout && typeof settingsPublic.layout === "object" ? settingsPublic.layout : null;
    if (layout) {
      const runtimeLayout = runtimeSettings.layout = merge({}, runtimeSettings.layout || {});
      const main = layout.main && typeof layout.main === "object" ? layout.main : {};
      const submenu = layout.submenu && typeof layout.submenu === "object" ? layout.submenu : {};

      if (hasOwn(layout, "keepOnScreen")) runtimeLayout.keepOnScreen = deepClone(layout.keepOnScreen);
      if (hasOwn(main, "mode")) runtimeLayout.useAutoMainLayout = main.mode !== "manual";
      if (hasOwn(main, "startAngle") || hasOwn(main, "legacyStartAngle")) {
        runtimeLayout.mainStartAngle = deepClone(firstDefined(main.startAngle, main.legacyStartAngle));
      }
      if (hasOwn(main, "slotCount")) runtimeLayout.mainSlotCount = deepClone(main.slotCount);
      else if (hasOwn(layout, "mainSlotCount")) runtimeLayout.mainSlotCount = deepClone(layout.mainSlotCount);
      if (hasOwn(main, "maxItems")) runtimeLayout.mainMaxItems = deepClone(main.maxItems);
      else if (hasOwn(layout, "mainMaxItems")) runtimeLayout.mainMaxItems = deepClone(layout.mainMaxItems);

      if (hasOwn(submenu, "mode")) runtimeLayout.useAutoSubmenuLayout = submenu.mode !== "manual";
      if (hasOwn(submenu, "fullCircleSlots")) runtimeLayout.submenuFullCircleSlots = deepClone(submenu.fullCircleSlots);
      if (hasOwn(submenu, "legacySlots")) runtimeLayout.submenuSlots = deepClone(submenu.legacySlots);
      if (hasOwn(submenu, "legacyStartAngle")) runtimeLayout.submenuStartAngle = deepClone(submenu.legacyStartAngle);
      if (hasOwn(submenu, "maxItems")) runtimeLayout.submenuMaxItems = deepClone(submenu.maxItems);
      else if (hasOwn(layout, "submenuMaxItems")) runtimeLayout.submenuMaxItems = deepClone(layout.submenuMaxItems);
      if (hasOwn(layout, "minItemGap")) runtimeLayout.minItemGap = deepClone(layout.minItemGap);
    }

    if (settingsPublic.animation && typeof settingsPublic.animation === "object") {
      runtimeSettings.animation = merge(runtimeSettings.animation || {}, settingsPublic.animation);
    }

    applyFeatureOverride(runtime, "submenuIndicator", settingsPublic.submenuIndicator);
    applyFeatureOverride(runtime, "hotkeyBadge", settingsPublic.hotkeyBadge);
    applyFeatureOverride(runtime, "nameTooltip", settingsPublic.nameTooltip);
  }

  function normalizePublicStyle(style) {
    if (!style || typeof style !== "object") return null;
    const normalized = {};
    const has = function (key) { return Object.prototype.hasOwnProperty.call(style, key); };
    const put = function (key, value) {
      if (value !== undefined) normalized[key] = value;
    };

    if (has("backgroundColor")) {
      put("fill", style.backgroundColor);
      put("backgroundColor", style.backgroundColor);
    }
    if (has("hoverBackgroundColor")) {
      put("hoverFill", style.hoverBackgroundColor);
      put("hoverBackgroundColor", style.hoverBackgroundColor);
    }
    if (has("borderColor")) {
      put("stroke", style.borderColor);
      put("borderColor", style.borderColor);
    }
    if (has("hoverBorderColor")) {
      put("hoverStroke", style.hoverBorderColor);
      put("hoverBorderColor", style.hoverBorderColor);
    }
    if (has("textColor")) put("textColor", style.textColor);
    if (has("iconColor")) {
      put("iconTint", style.iconColor);
      put("iconColor", style.iconColor);
    }
    if (has("hoverIconColor")) {
      put("hoverIconTint", style.hoverIconColor);
      put("hoverIconColor", style.hoverIconColor);
    }
    if (has("fontName")) put("fontName", style.fontName);
    if (has("fontSize")) {
      put("fontSize", style.fontSize);
      put("_explicitFontSize", true);
    }
    if (has("iconScale")) {
      put("imageScale", style.iconScale);
      put("iconScale", style.iconScale);
      put("_explicitImageScale", true);
    }
    if (has("borderWidth")) put("borderWidth", style.borderWidth);
    if (has("hoverBorderWidth")) put("hoverBorderWidth", style.hoverBorderWidth);
    if (has("showLabelWithIcon")) {
      put("showLabelWithImage", !!style.showLabelWithIcon);
      put("showLabelWithIcon", !!style.showLabelWithIcon);
    }

    return normalized;
  }

  function normalizePublicItemForRuntime(item, parentSlotID) {
    item = deepClone(item || {});
    item.parentSlotID = item.parentSlotID || parentSlotID || undefined;
    item.label = item.shortLabel;
    item.key = item.hotkey;
    item.image = item.icon;
    if (item.style) item.style = normalizePublicStyle(item.style);
    if (Array.isArray(item.submenu)) {
      item.submenu = item.submenu.map(function (child) {
        return normalizePublicItemForRuntime(child, item.slotID || parentSlotID || "");
      });
    }
    return item;
  }

  function orderedItemsBySlotID(list, order) {
    if (!Array.isArray(list) || !Array.isArray(order) || order.length === 0) return list;
    const bySlot = {};
    const used = {};
    const result = [];

    list.forEach(function (item) {
      if (item && item.slotID) bySlot[item.slotID] = item;
    });

    order.forEach(function (slotID) {
      if (bySlot[slotID] && !used[slotID]) {
        result.push(bySlot[slotID]);
        used[slotID] = true;
      }
    });

    list.forEach(function (item) {
      const slotID = item && item.slotID;
      if (!slotID || !used[slotID]) {
        result.push(item);
        if (slotID) used[slotID] = true;
      }
    });

    return result;
  }

  function applyOrderToRuntimeItems(list, order) {
    list = Array.isArray(list) ? list : [];
    order = order || {};
    const submenus = order.submenus || {};
    list = orderedItemsBySlotID(list, order.main || []);
    list.forEach(function (item) {
      if (item && Array.isArray(item.submenu)) {
        item.submenu = orderedItemsBySlotID(item.submenu, submenus[item.slotID] || []);
        item.submenu = applyOrderToRuntimeItems(item.submenu, order);
      }
    });
    return list;
  }

  function findRuntimeItem(list, slotID, parentSlotID) {
    for (let index = 0; index < (Array.isArray(list) ? list.length : 0); index += 1) {
      const item = list[index];
      if (!item) continue;
      if (item.slotID === slotID) {
        return { item: item, list: list, index: index, parentSlotID: parentSlotID || "" };
      }
      const child = findRuntimeItem(item.submenu, slotID, item.slotID || parentSlotID || "");
      if (child) return child;
    }
    return null;
  }

  function applyAssignmentsToItems(list, slotToMacro) {
    (Array.isArray(list) ? list : []).forEach(function (item) {
      if (!item) return;
      if (item.slotID && slotToMacro && slotToMacro[item.slotID]) item.actionID = slotToMacro[item.slotID];
      else if (item.slotID && item.slotID !== "system.close") item.actionID = "";
      applyAssignmentsToItems(item.submenu, slotToMacro);
    });
  }

  function collectIconPaths(config, result) {
    result = result || [];
    function visit(list) {
      (Array.isArray(list) ? list : []).forEach(function (item) {
        const path = item && (item.previewImage || item.image || item.icon);
        if (path && String(path).indexOf("data:") !== 0) result.push(path);
        visit(item && item.submenu);
      });
    }
    visit(config && config.items);
    const closePath = config && config.closeItem && (config.closeItem.previewImage || config.closeItem.image || config.closeItem.icon);
    if (closePath && String(closePath).indexOf("data:") !== 0) result.push(closePath);
    return result;
  }

  function syncPreviewImages(config) {
    function visit(list) {
      (Array.isArray(list) ? list : []).forEach(function (item) {
        if (!item) return;
        const path = item.icon || item.image || "";
        const url = path ? OA.iconURL(path) : null;
        if (url) item.previewImage = url;
        if (item.icon && !item.image) item.image = item.icon;
        if (item.shortLabel && !item.label) item.label = item.shortLabel;
        if (item.hotkey && !item.key) item.key = item.hotkey;
        visit(item.submenu);
      });
    }
    visit(config && config.items);
  }

  api.buildConfig = function (options) {
    options = options || {};
    const userConfig = defaultUserConfig(options.userConfig);
    const runtime = deepClone(options.factoryRuntime || {});
    runtime.settings = runtime.settings || {};
    runtime.theme = runtime.theme || {};

    applyPublicSettings(runtime, userConfig.settings);

    if (userConfig.theme && typeof userConfig.theme === "object") {
      runtime.theme.item = merge(runtime.theme.item || {}, normalizePublicStyle(userConfig.theme));
      runtime.theme.submenu = merge(runtime.theme.submenu || {}, normalizePublicStyle(userConfig.theme));
    }

    Object.keys(userConfig.slotOverrides || {}).forEach(function (slotID) {
      const found = findRuntimeItem(runtime.items, slotID);
      const override = userConfig.slotOverrides[slotID];
      if (!found || !override) return;
      Object.keys(override).forEach(function (key) {
        if (key === "style") {
          found.item.style = merge(found.item.style || {}, normalizePublicStyle(override.style) || {});
        }
        else {
          found.item[key] = override[key];
          if (key === "shortLabel") found.item.label = override[key];
          if (key === "hotkey") found.item.key = override[key];
          if (key === "icon") found.item.image = override[key];
        }
      });
    });

    Object.keys(userConfig.hiddenSlots || {}).forEach(function (slotID) {
      const found = findRuntimeItem(runtime.items, slotID);
      if (found) found.list.splice(found.index, 1);
    });

    (Array.isArray(userConfig.items) ? userConfig.items : []).forEach(function (item) {
      const runtimeItem = normalizePublicItemForRuntime(item, item.parentSlotID || "");
      if (runtimeItem.parentSlotID) {
        const parent = findRuntimeItem(runtime.items, runtimeItem.parentSlotID);
        if (parent) {
          parent.item.submenu = Array.isArray(parent.item.submenu) ? parent.item.submenu : [];
          parent.item.submenu.push(runtimeItem);
        }
      } else {
        runtime.items = Array.isArray(runtime.items) ? runtime.items : [];
        runtime.items.push(runtimeItem);
      }
    });

    runtime.items = applyOrderToRuntimeItems(runtime.items, userConfig.order || {});
    applyAssignmentsToItems(runtime.items, options.slotToMacro || {});
    syncPreviewImages(runtime);
    OA.requestIcons(collectIconPaths(runtime));
    return runtime;
  };

  api.slotSnapshot = function (config, slotID, hoverProgress) {
    const found = findRuntimeItem(config && config.items, slotID);
    if (!found) return null;
    const kind = found.parentSlotID ? "submenu" : "main";
    return {
      item: found.item,
      kind: kind,
      parentSlotID: found.parentSlotID || "",
      style: styleForConfig(config || {}, kind, found.item, hoverProgress || 0),
    };
  };

  function settingsOf(config) { return config.settings || {}; }
  function layoutOf(config) { return settingsOf(config).layout || {}; }
  function animationOf(config) { return settingsOf(config).animation || {}; }
  function itemsOf(config) { return Array.isArray(config.items) ? config.items : []; }
  function positiveDuration(value, fallback) { return Math.max(Number(value == null ? fallback : value) || fallback || 0.001, 0.001); }

  function minimumRadiusForCount(config, count, itemSize) {
    if (count <= 1) return 0;
    const angle = Math.PI / count;
    if (angle <= 0) return 0;
    const adaptiveGap = clamp(Math.floor(((itemSize || 45) * 0.18) + 0.5), 8, 18);
    const gap = Number(layoutOf(config).minItemGap) || adaptiveGap;
    return (itemSize + gap) / (2 * Math.sin(angle));
  }

  function closeSizeForConfig(config) {
    return clamp(Math.floor(((settingsOf(config).mainSize || 45) * 0.67) + 0.5), 26, 36);
  }

  function maxSubmenuCount(config) {
    let max = 0;
    itemsOf(config).forEach(function (item) {
      if (Array.isArray(item.submenu)) max = Math.max(max, item.submenu.length);
    });
    return max;
  }

  function mainRadiusForConfig(config) {
    let designCount = Math.max(itemsOf(config).length, layoutOf(config).mainSlotCount || 8);
    designCount = Math.min(designCount, layoutOf(config).mainMaxItems || 16);
    return Math.max(settingsOf(config).mainRadius || 80, minimumRadiusForCount(config, Math.max(designCount, 1), settingsOf(config).mainSize || 45));
  }

  function submenuRadiusForConfig(config, count) {
    count = Math.min(count || 1, layoutOf(config).submenuMaxItems || 38);
    return Math.max(settingsOf(config).submenuRadius || 177, minimumRadiusForCount(config, count, settingsOf(config).submenuSize || 45));
  }

  function canvasPaddingForConfig(config) {
    if (settingsOf(config).canvasPadding != null) return Number(settingsOf(config).canvasPadding);
    const badge = config.hotkeyBadge || {};
    const badgeExtra = badge.enabled === false ? 0 : ((Number(badge.size) || 7) + (Number(badge.offsetGap) || 2));
    const maxSize = Math.max(settingsOf(config).mainSize || 45, settingsOf(config).submenuSize || 45, closeSizeForConfig(config));
    return clamp(Math.floor((maxSize * 0.42) + badgeExtra + 0.5), 20, 56);
  }

  function stageSizeForConfig(config) {
    const tooltip = config.nameTooltip || {};
    const tooltipPad = tooltip.enabled === false ? 0 : ((Number(tooltip.maxWidth) || 180) / 2 + (Number(tooltip.gap) || 8) + 8);
    const radius = Math.max(
      mainRadiusForConfig(config) + ((settingsOf(config).mainSize || 45) / 2),
      submenuRadiusForConfig(config, maxSubmenuCount(config)) + ((settingsOf(config).submenuSize || 45) / 2),
      closeSizeForConfig(config) / 2
    ) + canvasPaddingForConfig(config) + tooltipPad;
    return Math.max(560, Math.ceil(radius * 2));
  }

  api.stageSize = stageSizeForConfig;

  function createRuntimePreview(stage, payload, callbacks) {
    payload = payload || {};
    callbacks = callbacks || {};

    let config = payload.config || api.buildConfig(payload);
    syncPreviewImages(config);

    const gridLayer = document.createElement("div");
    gridLayer.className = "radial-preview-grid";
    const mainRadiusGuide = document.createElement("span");
    mainRadiusGuide.className = "radial-preview-radius-guide main";
    const submenuRadiusGuide = document.createElement("span");
    submenuRadiusGuide.className = "radial-preview-radius-guide submenu";
    gridLayer.appendChild(mainRadiusGuide);
    gridLayer.appendChild(submenuRadiusGuide);
    const layer = document.createElement("div");
    layer.className = "radial-preview-dynamic";
    const plusLayer = document.createElement("div");
    plusLayer.className = "radial-preview-plus-layer";
    const trashDropzone = document.createElement("div");
    trashDropzone.className = "radial-preview-trash-dropzone";
    if (OA.svg) trashDropzone.appendChild(OA.svg("trash"));

    stage.classList.add("radial-preview-stage");
    stage.classList.toggle("is-assigning", Boolean(payload.assignment && payload.assignment.active));
    stage.dataset.radialPreviewStage = "1";
    stage.dataset.previewClosed = "0";
    stage.innerHTML = "";
    stage.appendChild(gridLayer);
    stage.appendChild(layer);
    stage.appendChild(plusLayer);
    stage.appendChild(trashDropzone);

    const state = {
      isOpen: true,
      menuState: payload.animateOpen ? "OPENING" : "STABLE",
      menuProgress: payload.animateOpen ? 0 : 1,
      submenuState: "NONE",
      submenuProgress: 0,
      activeSubmenuParent: null,
      hoverMain: null,
      hoverSub: null,
      hoverClose: false,
      hoverVisuals: {},
      positions: { main: [], submenu: [], close: null },
      tooltip: {
        hoverKey: null,
        hoverTime: 0,
        unlocked: false,
        display: null,
        pendingDisplay: null,
        progress: 0,
        start: 0,
        target: 0,
        time: 0,
        duration: 0.16,
        lastFrame: null,
      },
      selectedSlotID: payload.selectedSlotID || "",
      editParentSlotID: payload.activeParentSlotID || "",
      hoverInsert: null,
      plusSuspended: false,
      radiusGuideUntil: Number(payload.radiusGuideUntil) || 0,
      suppressPlusUntil: Number(payload.suppressPlusUntil) || 0,
      lastClientX: null,
      lastClientY: null,
      pointerAction: null,
      dragGhost: null,
      dragSourceSlotID: "",
      dragOverSlotID: "",
      dragOverTrash: false,
      suppressNextClickUntil: 0,
      lastTime: null,
      frameID: null,
      disposed: false,
      cooldownTimer: null,
      resizeObserver: null,
      resizeFrameID: null,
      lastStageWidth: 0,
      lastStageHeight: 0,
    };

    const listeners = [];

    function addListener(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      listeners.push({ target: target, type: type, handler: handler, options: options });
    }

    function settings() { return settingsOf(config); }
    function layout() { return layoutOf(config); }
    function animation() { return animationOf(config); }
    function items() { return itemsOf(config); }
    function mainRadius() { return mainRadiusForConfig(config); }
    function submenuRadius(count) { return submenuRadiusForConfig(config, count); }
    function closeSize() { return closeSizeForConfig(config); }
    function canvasPadding() { return canvasPaddingForConfig(config); }
    function stageScale() { return 1; }

    const measureCanvas = document.createElement("canvas");
    const measureContext = measureCanvas.getContext ? measureCanvas.getContext("2d") : null;
    const fontSizeCache = {};

    function measureText(label, fontName, fontSize) {
      if (measureContext) {
        measureContext.font = fontSize + "px " + cssFontFamily(fontName);
        const metrics = measureContext.measureText(String(label || ""));
        return { w: metrics.width || Math.max(textLength(label), 1) * fontSize * 0.58, h: fontSize * 1.2 };
      }
      return { w: Math.max(textLength(label), 1) * fontSize * 0.58, h: fontSize * 1.2 };
    }

    function fontSizeFor(label, buttonSize, style) {
      style = style || {};
      const key = [label || "", Math.round(buttonSize || 0), style.fontName || "", style.fontSize || "", style.minFontSize || "", style.autoFitText, style.textMaxHeightRatio || "", style.textMaxWidthRatio || ""].join("\u001f");
      if (fontSizeCache[key] != null) return fontSizeCache[key];
      const requested = Number(style.fontSize) || 20;
      const visualCap = Math.max(4, buttonSize * (style.textMaxHeightRatio || 0.70));
      if (style.autoFitText === false) {
        fontSizeCache[key] = Math.min(requested, visualCap);
        return fontSizeCache[key];
      }
      const minFontSize = Number(style.minFontSize) || 9;
      const fontName = style.fontName || ".AppleSystemUIFontBold";
      const maxWidth = buttonSize * (style.textMaxWidthRatio || 0.78);
      const startFontSize = Math.min(requested, visualCap);
      if (startFontSize <= minFontSize) {
        fontSizeCache[key] = startFontSize;
        return startFontSize;
      }
      for (let size = Math.floor(startFontSize); size >= minFontSize; size -= 1) {
        const measured = measureText(label, fontName, size);
        if (measured.w <= maxWidth && measured.h <= visualCap) {
          fontSizeCache[key] = size;
          return size;
        }
      }
      fontSizeCache[key] = minFontSize;
      return minFontSize;
    }

    function easeOutCubic(t) {
      t = clamp(t, 0, 1) - 1;
      return t * t * t + 1;
    }

    function easeOutBack(t, s) {
      t = clamp(t, 0, 1) - 1;
      s = s == null ? 0.5 : Number(s);
      return t * t * ((s + 1) * t + s) + 1;
    }

    function easeOutQuad(t) {
      t = clamp(t, 0, 1);
      return 1 - ((1 - t) * (1 - t));
    }

    function smoothStep(t) {
      t = clamp(t, 0, 1);
      return t * t * (3 - (2 * t));
    }

    function motionFade(progress) {
      const anim = animation();
      const start = anim.mainFadeStart == null ? 0.04 : Number(anim.mainFadeStart);
      const end = anim.mainFadeEnd == null ? 0.42 : Number(anim.mainFadeEnd);
      if (end <= start) return progress > end ? 1 : 0;
      return clamp((progress - start) / (end - start), 0, 1);
    }

    function motionEase(progress, kind) {
      if (kind === "main_open") return easeOutBack(progress, animation().bounceIntensity == null ? 0.5 : Number(animation().bounceIntensity));
      return easeOutCubic(progress);
    }

    function pointFromAngle(cx, cy, angleDeg, radius) {
      const rad = angleDeg * Math.PI / 180;
      return { x: cx + Math.cos(rad) * radius, y: cy + Math.sin(rad) * radius };
    }

    function midpointAngleDeg(a, b) {
      const delta = ((((b - a) % 360) + 540) % 360) - 180;
      return a + (delta / 2);
    }

    function autoMainAngle(index, count) {
      count = Math.max(1, Math.min(count || 1, layout().mainMaxItems || 16));
      return 270 + ((index - 1) * 360 / count);
    }

    function autoSubmenuAngle(parentAngle, index, count) {
      if (count <= 1) return parentAngle;
      const slotCount = layout().submenuFullCircleSlots || 19;
      const maxItems = layout().submenuMaxItems || 38;
      count = Math.max(1, Math.min(count || 1, maxItems));
      const step = count > slotCount ? 360 / count : 360 / slotCount;
      return parentAngle - (index - (count + 1) / 2) * step;
    }

    function hoverPadding(size) {
      if (settings().hoverPadding != null) return Number(settings().hoverPadding);
      return clamp(Math.floor(((size || settings().mainSize || 45) * 0.11) + 0.5), 4, 10);
    }

    function styleFor(kind, item, hoverProgress) {
      return styleForConfig(config, kind, item, hoverProgress);
    }

    function adaptiveIconLabelStyle(style, size, label, hasIcon) {
      style = merge({}, style || {});
      const hasLabel = String(label || "") !== "";
      if (!style.showLabelWithImage || !hasIcon || !hasLabel) {
        style.showLabelWithImage = false;
        return style;
      }
      const safeSize = Math.max(1, Number(size) || 1);
      const baseScale = Number(style.imageScale) || 0.58;
      if (!style._explicitFontSize) {
        const lengthPenalty = Math.max(0, textLength(label) - 3) * 0.012;
        const ratio = clamp(0.31 - lengthPenalty, 0.22, 0.31);
        const minSize = Math.max(8, Math.floor((safeSize * 0.20) + 0.5));
        const maxSize = Math.max(minSize, Math.floor((safeSize * 0.33) + 0.5));
        style.fontSize = clamp(Math.floor((safeSize * ratio) + 0.5), minSize, maxSize);
      }
      const fontSize = Number(style.fontSize) || 13;
      const availableIconRatio = (safeSize - (fontSize * 1.12) - (safeSize * 0.04)) / safeSize;
      const maxScale = clamp(availableIconRatio, 0.18, 0.72);
      if (style._explicitImageScale) {
        style.imageScale = clamp(baseScale, 0.12, maxScale);
      } else {
        style.imageScale = clamp(Math.min(baseScale * 0.52, maxScale), 0.18, maxScale);
      }
      return style;
    }

    function iconLabelOffsets(size, fontSize, style) {
      const safeSize = Math.max(1, Number(size) || 1);
      const iconScale = Number(style.imageScale) || 0.58;
      let imageOffset = style.imageYOffsetRatio;
      let labelOffset = style.labelYOffsetRatio;
      if (imageOffset == null) imageOffset = -clamp(((Number(fontSize) || 20) / safeSize) * 0.55, 0.12, 0.24);
      if (labelOffset == null) labelOffset = clamp(iconScale * 0.4, 0.15, 0.34);
      return { image: imageOffset, label: labelOffset };
    }

    function previewIconLabelTextCorrection(fontSize) {
      return -clamp(Math.round((Number(fontSize) || 12) * 0.20), 1, 3);
    }

    function previewLabelOnlyTextLift(fontSize) {
      return clamp(Math.round((Number(fontSize) || 12) * 0.10), 1, 3);
    }

    function hoverKey(kind, index) {
      return kind === "close" ? "close" : String(kind || "") + ":" + String(index || "");
    }

    function setHoverVisualTargets(mainIndex, submenuIndex, closeActive) {
      const desired = {};
      if (mainIndex) desired[hoverKey("main", mainIndex)] = true;
      if (submenuIndex) desired[hoverKey("submenu", submenuIndex)] = true;
      if (closeActive) desired[hoverKey("close")] = true;
      const duration = positiveDuration(animation().submenuOpenDuration, 0.12);
      Object.keys(state.hoverVisuals).forEach(function (key) {
        const entry = state.hoverVisuals[key];
        if (!desired[key] && entry.target !== 0) {
          state.hoverVisuals[key] = { progress: entry.progress || 0, start: entry.progress || 0, target: 0, time: 0, duration: duration };
        }
      });
      Object.keys(desired).forEach(function (key) {
        const current = state.hoverVisuals[key] ? state.hoverVisuals[key].progress || 0 : 0;
        if (!state.hoverVisuals[key] || state.hoverVisuals[key].target !== 1) {
          state.hoverVisuals[key] = { progress: current, start: current, target: 1, time: 0, duration: duration };
        }
      });
    }

    function updateHoverVisuals(dt) {
      let changed = false;
      Object.keys(state.hoverVisuals).forEach(function (key) {
        const entry = state.hoverVisuals[key];
        entry.time = clamp((entry.time || 0) + dt, 0, entry.duration || 0.12);
        const t = entry.time / (entry.duration || 0.12);
        entry.progress = mixNumber(entry.start || 0, entry.target || 0, easeOutQuad(t));
        changed = true;
        if (t >= 1 && entry.progress <= 0.001) delete state.hoverVisuals[key];
      });
      return changed;
    }

    function submenuAnimationMaxTime(parentIndex) {
      const parent = items()[parentIndex - 1];
      const submenu = parent && Array.isArray(parent.submenu) ? parent.submenu : [];
      return positiveDuration(animation().submenuOpenDuration, 0.12) + Math.max(0, submenu.length - 1) * Math.max(0, Number(animation().staggerDelay) || 0);
    }

    function findMainIndexBySlotID(slotID) {
      const all = items();
      for (let i = 0; i < all.length; i += 1) {
        if (all[i] && all[i].slotID === slotID) return i + 1;
      }
      return null;
    }

    function ensureInitialSubmenu() {
      if (!state.editParentSlotID) return;
      const index = findMainIndexBySlotID(state.editParentSlotID);
      if (!index) return;
      const parent = items()[index - 1];
      if (!parent || !Array.isArray(parent.submenu)) return;
      state.activeSubmenuParent = index;
      state.submenuState = "STABLE";
      state.submenuProgress = 1;
    }

    function currentNameTooltipTarget() {
      if (state.hoverSub && state.hoverMain) {
        const parent = items()[state.hoverMain - 1];
        const subItem = parent && Array.isArray(parent.submenu) ? parent.submenu[state.hoverSub - 1] : null;
        if (subItem && String(subItem.name || subItem.label || "") !== "") {
          return { key: "submenu:" + state.hoverMain + ":" + state.hoverSub, kind: "submenu", index: state.hoverSub, parentIndex: state.hoverMain, item: subItem };
        }
      }
      if (state.hoverMain) {
        const mainItem = items()[state.hoverMain - 1];
        if (mainItem && !(Array.isArray(mainItem.submenu) && mainItem.submenu.length > 0) && String(mainItem.name || mainItem.label || "") !== "") {
          return { key: "main:" + state.hoverMain, kind: "main", index: state.hoverMain, item: mainItem };
        }
      }
      return null;
    }

    function tooltipFadeDuration(target) {
      return target > 0
        ? positiveDuration(animation().submenuOpenDuration, 0.16)
        : positiveDuration(animation().submenuCloseDuration, 0.16);
    }

    function setTooltipTarget(target) {
      if (state.tooltip.target === target) return false;
      state.tooltip.start = state.tooltip.progress || 0;
      state.tooltip.target = target;
      state.tooltip.time = 0;
      state.tooltip.duration = tooltipFadeDuration(target);
      return true;
    }

    function tooltipLabelData(display) {
      if (!display || !display.item) return null;
      if (display.tooltipData) return display.tooltipData;
      const tooltipConfig = config.nameTooltip || {};
      const label = String(display.item.name || display.item.label || "");
      if (!label) return null;
      const fontName = tooltipConfig.fontName || ".AppleSystemUIFont";
      const fontSize = Number(tooltipConfig.fontSize) || 12;
      const paddingX = Number(tooltipConfig.paddingX) || 10;
      const paddingY = Number(tooltipConfig.paddingY) || 5;
      const maxWidth = Number(tooltipConfig.maxWidth) || 180;
      const textMaxWidth = Math.max(24, maxWidth - paddingX * 2);
      let fitted = label;
      if (measureText(fitted, fontName, fontSize).w > textMaxWidth) {
        for (let len = label.length; len > 0; len -= 1) {
          const candidate = label.slice(0, len) + "...";
          if (measureText(candidate, fontName, fontSize).w <= textMaxWidth) {
            fitted = candidate;
            break;
          }
        }
      }
      const measured = measureText(fitted, fontName, fontSize);
      display.tooltipData = {
        label: fitted,
        w: Math.min(maxWidth, Math.max(34, measured.w + paddingX * 2)),
        h: Math.max(22, measured.h + paddingY * 2),
      };
      return display.tooltipData;
    }

    function showTooltipTarget(target) {
      const data = tooltipLabelData(target);
      if (!data) {
        state.tooltip.pendingDisplay = null;
        if ((state.tooltip.progress || 0) <= 0.01) state.tooltip.display = null;
        return setTooltipTarget(0);
      }
      if (state.tooltip.display && state.tooltip.display.key === target.key) {
        state.tooltip.display = target;
        state.tooltip.pendingDisplay = null;
        return state.tooltip.target !== 1 ? setTooltipTarget(1) : false;
      }
      if (state.tooltip.display && (state.tooltip.progress || 0) > 0.01) {
        state.tooltip.pendingDisplay = target;
        return setTooltipTarget(0);
      }
      state.tooltip.display = target;
      state.tooltip.pendingDisplay = null;
      state.tooltip.lastFrame = null;
      return setTooltipTarget(1);
    }

    function updateNameTooltip(dt) {
      const tooltipConfig = config.nameTooltip || {};
      let changed = false;
      if (state.menuState === "CLOSING" || tooltipConfig.enabled === false) {
        state.tooltip.hoverKey = null;
        state.tooltip.hoverTime = 0;
        state.tooltip.unlocked = false;
        state.tooltip.pendingDisplay = null;
        if (state.tooltip.target !== 0) changed = setTooltipTarget(0) || changed;
      } else {
        const target = currentNameTooltipTarget();
        if (target) {
          if (state.tooltip.hoverKey !== target.key) {
            state.tooltip.hoverKey = target.key;
            state.tooltip.hoverTime = dt;
            if (state.tooltip.unlocked) changed = showTooltipTarget(target) || changed;
            else changed = setTooltipTarget(0) || changed;
          } else {
            state.tooltip.hoverTime = (state.tooltip.hoverTime || 0) + dt;
          }
          if (!state.tooltip.unlocked && (state.tooltip.hoverTime || 0) >= (tooltipConfig.delay || 1)) {
            state.tooltip.unlocked = true;
            changed = showTooltipTarget(target) || changed;
          } else if (state.tooltip.unlocked && (!state.tooltip.display || state.tooltip.display.key !== target.key)) {
            changed = showTooltipTarget(target) || changed;
          }
        } else {
          state.tooltip.hoverKey = null;
          state.tooltip.hoverTime = 0;
          state.tooltip.pendingDisplay = null;
          if (state.tooltip.target !== 0) changed = setTooltipTarget(0) || changed;
        }
      }

      if (Math.abs((state.tooltip.progress || 0) - (state.tooltip.target || 0)) > 0.001) {
        state.tooltip.time = clamp((state.tooltip.time || 0) + dt, 0, state.tooltip.duration || 0.16);
        const t = (state.tooltip.duration || 0.16) > 0 ? state.tooltip.time / (state.tooltip.duration || 0.16) : 1;
        state.tooltip.progress = mixNumber(state.tooltip.start || 0, state.tooltip.target || 0, smoothStep(t));
        changed = true;
        if (t >= 1 && state.tooltip.target === 0) {
          if (state.tooltip.pendingDisplay) {
            state.tooltip.display = state.tooltip.pendingDisplay;
            state.tooltip.pendingDisplay = null;
            state.tooltip.lastFrame = null;
            state.tooltip.progress = 0;
            state.tooltip.start = 0;
            state.tooltip.target = 1;
            state.tooltip.time = 0;
            state.tooltip.duration = tooltipFadeDuration(1);
          } else {
            state.tooltip.display = null;
            state.tooltip.lastFrame = null;
          }
        }
      }
      return changed;
    }

    function tooltipPosition(pos, w, h) {
      const tooltipConfig = config.nameTooltip || {};
      const angle = (pos.angle || 270) * Math.PI / 180;
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);
      const gap = Number(tooltipConfig.gap) || 8;
      const margin = Number(tooltipConfig.collisionPadding) || 3;
      const pad = Math.max(12, Number(tooltipConfig.canvasPadding) || 48);
      const stageWidth = stage.clientWidth || 560;
      const stageHeight = stage.clientHeight || 560;
      const wideTooltip = w > h * 2.8;
      const center = { x: stageWidth / 2, y: stageHeight / 2 };

      function distanceSquared(x1, y1, x2, y2) {
        const dx = x1 - x2;
        const dy = y1 - y2;
        return dx * dx + dy * dy;
      }

      function rectIntersectsCircle(rect, circle, extraMargin) {
        const radius = (circle.radius || 0) + (extraMargin || 0);
        const closestX = clamp(circle.x, rect.x, rect.x + rect.w);
        const closestY = clamp(circle.y, rect.y, rect.y + rect.h);
        return distanceSquared(circle.x, circle.y, closestX, closestY) <= radius * radius;
      }

      function clampedCenter(x, y) {
        const rawX = x;
        const rawY = y;
        x = clamp(x, pad + w / 2, stageWidth - pad - w / 2);
        y = clamp(y, pad + h / 2, stageHeight - pad - h / 2);
        return { x: x, y: y, clampPenalty: Math.sqrt(distanceSquared(rawX, rawY, x, y)) };
      }

      function addDirection(list, seen, dirX, dirY, kind) {
        const length = Math.sqrt(dirX * dirX + dirY * dirY);
        if (length <= 0.001) return;
        dirX = dirX / length;
        dirY = dirY / length;
        const key = dirX.toFixed(2) + ":" + dirY.toFixed(2);
        if (seen[key]) return;
        seen[key] = true;
        list.push({ x: dirX, y: dirY, kind: kind || "candidate" });
      }

      function tooltipObstacles(excludePosition) {
        const result = [];
        function add(candidate) {
          if (candidate && candidate !== excludePosition && candidate.x != null && candidate.y != null) result.push(candidate);
        }
        state.positions.main.forEach(add);
        if (state.submenuState !== "FADING_OUT") state.positions.submenu.forEach(add);
        add(state.positions.close);
        return result;
      }

      const horizontalSign = Math.abs(ux) > 0.08 ? (ux >= 0 ? 1 : -1) : (pos.x >= center.x ? 1 : -1);
      const verticalSign = Math.abs(uy) > 0.08 ? (uy >= 0 ? 1 : -1) : (pos.y >= center.y ? 1 : -1);
      const directions = [];
      const seen = {};
      addDirection(directions, seen, ux, uy, "radial");
      addDirection(directions, seen, horizontalSign, 0, "horizontal");
      addDirection(directions, seen, 0, verticalSign, "vertical");
      addDirection(directions, seen, horizontalSign, verticalSign, "diagonal");
      addDirection(directions, seen, -horizontalSign, 0, "fallback");
      addDirection(directions, seen, 0, -verticalSign, "fallback");

      const obstacles = tooltipObstacles(pos);
      let best = null;
      directions.forEach(function (direction) {
        const dot = clamp(direction.x * ux + direction.y * uy, -1, 1);
        const halfProjection = Math.abs(direction.x) * (w / 2) + Math.abs(direction.y) * (h / 2);
        const baseDistance = (pos.radius || 24) + gap + halfProjection;
        const perpX = -direction.y;
        const perpY = direction.x;
        [0, h * 0.8, -h * 0.8, h * 1.6, -h * 1.6].forEach(function (nudge) {
          const rawX = pos.x + baseDistance * direction.x + nudge * perpX;
          const rawY = pos.y + baseDistance * direction.y + nudge * perpY;
          const clamped = clampedCenter(rawX, rawY);
          const rect = { x: clamped.x - w / 2, y: clamped.y - h / 2, w: w, h: h };
          let collisions = 0;
          obstacles.forEach(function (obstacle) {
            if (rectIntersectsCircle(rect, obstacle, margin)) collisions += 1;
          });

          const centerDistance = Math.sqrt(distanceSquared(pos.x, pos.y, clamped.x, clamped.y));
          const directionPenalty = (1 - Math.max(0, dot)) * 90;
          let kindPenalty = 0;
          if (direction.kind === "fallback") kindPenalty += 180;
          if (wideTooltip && direction.kind === "horizontal" && Math.abs(ux) > 0.25) kindPenalty -= 72;
          if (wideTooltip && direction.kind === "vertical" && Math.abs(uy) < 0.65) kindPenalty += 38;
          if (wideTooltip && direction.kind === "diagonal") kindPenalty += 52;
          if (!wideTooltip && direction.kind === "radial") kindPenalty -= 18;

          const score = centerDistance + directionPenalty + kindPenalty + (Math.abs(nudge) * 4) + (clamped.clampPenalty * 18) + (collisions * 10000);
          if (!best || score < best.score) best = { x: clamped.x, y: clamped.y, score: score };
        });
      });

      if (best) return { x: best.x, y: best.y };
      return { x: pos.x + ((pos.radius || 24) + gap + w / 2) * ux, y: pos.y + ((pos.radius || 24) + gap + h / 2) * uy };
    }

    function closeIconHtml(size, textColor) {
      const arm = size * 0.145;
      const stroke = Math.max(1.25, size * 0.06);
      const colorCss = cssColor(textColor);
      const base = size / 2;
      const bar = "position:absolute;left:" + (base - arm) + "px;top:" + (base - stroke / 2) + "px;width:" + (arm * 2) + "px;height:" + stroke + "px;border-radius:999px;background:" + colorCss + ";transform-origin:center;";
      return '<i style="' + bar + 'transform:rotate(45deg);"></i><i style="' + bar + 'transform:rotate(-45deg);"></i>';
    }

    function plusIconHtml(size) {
      const length = Math.max(8, Math.round(size * 0.294));
      const stroke = Math.max(1, Math.round(size * 0.043));
      const wrapper = "position:absolute;left:50%;top:50%;width:" + length + "px;height:" + length + "px;transform:translate(-50%,-50%);pointer-events:none;";
      const horizontal = "position:absolute;left:0;top:50%;width:100%;height:" + stroke + "px;border-radius:999px;background:currentColor;transform:translateY(-50%);";
      const vertical = "position:absolute;left:50%;top:0;width:" + stroke + "px;height:100%;border-radius:999px;background:currentColor;transform:translateX(-50%);";
      return '<span style="' + wrapper + '"><i style="' + horizontal + '"></i><i style="' + vertical + '"></i></span>';
    }

    function cooldownActive(key) {
      return Date.now() < (Number(state[key]) || 0);
    }

    function updateRadiusGuideEl(el, cx, cy, radius, className, visible) {
      if (!el) return;
      const canShow = !!(radius && radius > 1 && payload.showGuides !== false);
      const size = radius * 2;
      el.className = ["radial-preview-radius-guide", className || "", canShow && visible ? "is-visible" : ""].filter(Boolean).join(" ");
      el.style.left = cx + "px";
      el.style.top = cy + "px";
      el.style.width = (canShow ? size : 0) + "px";
      el.style.height = (canShow ? size : 0) + "px";
    }

    function updatePreviewGrid(cx, cy, scale) {
      const visible = cooldownActive("radiusGuideUntil");
      updateRadiusGuideEl(mainRadiusGuide, cx, cy, mainRadius() * scale, "main", visible);
      updateRadiusGuideEl(submenuRadiusGuide, cx, cy, submenuRadius(maxSubmenuCount(config)) * scale, "submenu", visible);
    }

    function renderIcon(item, style, size, opacity, hoverProgress, yOffset) {
      const imageURL = item.previewImage || item.image || item.icon || "";
      if (!imageURL) return "";
      const imageBox = Math.max(8, size * (Number(style.imageScale) || 0.58));
      const top = "calc(50% - " + (imageBox / 2 - (size * (yOffset || 0))) + "px)";
      const left = "calc(50% - " + (imageBox / 2) + "px)";
      const baseTint = style.iconTint || style.textColor || { red: 0, green: 0, blue: 0, alpha: 1 };
      const hoverTint = style.hoverIconTint || baseTint;
      const baseAlpha = opacity * (1 - hoverProgress) * (baseTint.alpha == null ? 1 : baseTint.alpha);
      const hoverAlpha = opacity * hoverProgress * (hoverTint.alpha == null ? 1 : hoverTint.alpha);
      const safeURL = String(imageURL).replace(/'/g, "%27");
      const mask = "left:" + left + ";top:" + top + ";right:auto;bottom:auto;width:" + imageBox + "px;height:" + imageBox + "px;-webkit-mask-image:url('" + safeURL + "');mask-image:url('" + safeURL + "');";
      return '<span class="radial-preview-icon-stack" style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;">' +
        '<span class="radial-preview-icon-layer" style="' + mask + 'background:' + cssColor(baseTint) + ';opacity:' + clamp(baseAlpha, 0, 1) + ';"></span>' +
        '<span class="radial-preview-icon-layer" style="' + mask + 'background:' + cssColor(hoverTint) + ';opacity:' + clamp(hoverAlpha, 0, 1) + ';"></span>' +
      '</span>';
    }

    function hasCustomVisualStyle(item) {
      const style = item && item.style;
      if (!style || typeof style !== "object") return false;
      return [
        "fill", "hoverFill",
        "stroke", "hoverStroke",
        "borderColor", "hoverBorderColor",
        "borderWidth", "hoverBorderWidth",
        "textColor",
        "iconTint", "hoverIconTint",
        "fontSize", "imageScale",
        "showLabelWithImage",
      ].some(function (key) {
        return Object.prototype.hasOwnProperty.call(style, key);
      });
    }

    function buttonHtml(item, kind, x, y, size, angle, opacity, hoverProgress, extra) {
      item = item || {};
      extra = extra || {};
      if (size <= 1 || opacity <= 0.01) return "";
      let label = kind === "close" ? "" : String(item.label || item.shortLabel || "");
      const style = adaptiveIconLabelStyle(styleFor(kind, item, hoverProgress), size, label, !!(item.previewImage || item.image || item.icon));
      const fill = colorWithOpacity(style.fill, opacity);
      const stroke = colorWithOpacity(style.stroke || style.fill, opacity);
      const textColor = colorWithOpacity(style.textColor, opacity);
      const classes = ["radial-preview-slot", kind || "main"];
      const hasSubmenu = Array.isArray(item.submenu) && item.submenu.length > 0;
      const isSelected = Boolean(state.selectedSlotID && item.slotID === state.selectedSlotID);
      if (!item.userCreated && (!item.actionID || item.actionID === "") && !hasSubmenu && kind !== "close" && !isSelected && !hasCustomVisualStyle(item)) classes.push("unassigned");
      if (item.userCreated) classes.push("user");
      if (isSelected) classes.push("selected");
      if (payload.assignment && payload.assignment.active && item.slotID) {
        const assignSelectedSlotID = state.selectedSlotID || payload.assignment.selectedSlotID || "";
        if (item.slotID === assignSelectedSlotID) classes.push("assign-selected");
        else if (payload.assignment.slotToMacro && payload.assignment.slotToMacro[item.slotID]) classes.push("assign-occupied");
        else classes.push("assign-eligible");
      }
      const slotID = item.slotID || "";
      if (slotID && state.dragOverSlotID === slotID) classes.push("drag-over");
      if (slotID && state.dragSourceSlotID === slotID) classes.push("drag-source");
      let body = "";
      const imageURL = item.previewImage || item.image || item.icon || "";
      let fontSize = null;
      if (kind === "close") {
        body = closeIconHtml(size, textColor);
      } else if (imageURL) {
        let imageOffset = 0;
        if (style.showLabelWithImage) {
          fontSize = fontSizeFor(label, size, style);
          imageOffset = iconLabelOffsets(size, fontSize, style).image;
        }
        body += renderIcon(item, style, size, opacity, hoverProgress, imageOffset);
        if (!style.showLabelWithImage) label = "";
      }
      if (label) {
        fontSize = fontSize || fontSizeFor(label, size, style);
        let labelColor = textColor;
        let labelOffset = 0;
        if (imageURL && style.showLabelWithImage) {
          const normalTint = style.iconTint || textColor;
          const hoverTint = style.hoverIconTint || normalTint;
          labelColor = colorWithOpacity(mixColor(normalTint, hoverTint, hoverProgress), opacity * (style.opacity == null ? 1 : style.opacity));
          labelOffset = iconLabelOffsets(size, fontSize, style).label;
        }
        const iconLabel = imageURL && style.showLabelWithImage;
        const previewTextCorrection = iconLabel ? previewIconLabelTextCorrection(fontSize) : 0;
        const labelTop = iconLabel
          ? 'calc(50% + ' + (size * labelOffset - fontSize / 2 - 4 + previewTextCorrection) + 'px)'
          : 'calc(50% - ' + (fontSize / 2 + previewLabelOnlyTextLift(fontSize)) + 'px)';
        const labelHeight = iconLabel ? (fontSize + 12) : fontSize;
        const labelLineHeight = iconLabel ? (fontSize + 12) : fontSize;
        body += '<span style="position:absolute;display:block;left:0;top:' + labelTop + ';width:100%;height:' + labelHeight + 'px;max-width:100%;font-size:' + fontSize + 'px;font-family:' + cssFontFamily(style.fontName) + ';font-weight:700;color:' + cssColor(labelColor) + ';line-height:' + labelLineHeight + 'px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;user-select:none;-webkit-user-select:none;pointer-events:none;">' + escapeHtml(label) + '</span>';
      }

      const dataAction = kind === "close" ? "" : ' data-action="radialSelectSlot"';
      const parentData = extra.parentSlotID ? ' data-parent-slot-id="' + escapeHtml(extra.parentSlotID) + '"' : "";
      const assignableData = kind === "close" || !slotID ? "" : ' data-assignable="1"';
      return '<div class="' + classes.join(" ") + '"' + dataAction + ' draggable="false" data-slot-id="' + escapeHtml(slotID) + '"' + assignableData + parentData + ' data-kind="' + kind + '" style="' +
        'left:' + x + 'px;top:' + y + 'px;width:' + size + 'px;height:' + size + 'px;' +
        'background:' + cssColor(fill) + ';border-style:solid;border-color:' + cssColor(stroke) + ';border-width:' + (Number(style.borderWidth) || 0) + 'px;color:' + cssColor(textColor) + ';font-size:' + (fontSize || 12) + 'px;font-family:' + cssFontFamily(style.fontName) + ';opacity:1;"' +
        (kind === "close" ? ' data-preview-close="1"' : '') + '>' + body + '</div>';
    }

    function hotkeyBadgeHtml(item, kind, x, y, size, angleDeg, opacity) {
      const key = item && (item.key || item.hotkey);
      const badge = config.hotkeyBadge || {};
      if (!key || badge.enabled === false || opacity <= 0.01) return "";
      const referenceSize = kind === "submenu" ? (settings().submenuSize || 45) : (settings().mainSize || 45);
      const parentScale = clamp(size / Math.max(referenceSize, 1), 0.2, 1.08);
      const finalRadius = Math.max(2, Number(badge.size) || 7);
      const radius = Math.max(2, finalRadius * parentScale);
      const distance = size / 2 + radius + Math.max(0, Number(badge.offsetGap) || 2) * parentScale;
      const angle = angleDeg * Math.PI / 180;
      const bx = x - distance * Math.cos(angle);
      const by = y - distance * Math.sin(angle);
      const textReveal = clamp((parentScale - 0.58) / 0.34, 0, 1);
      const badgeOpacity = opacity * textReveal;
      if (badgeOpacity <= 0.01) return "";
      const label = String(key).toUpperCase();
      const labelLength = Math.max(textLength(label), 1);
      const fontSize = Math.max(4, Math.min((Number(badge.fontSize) || Math.max(6, finalRadius * 1.1)) * (labelLength > 1 ? Math.max(0.62, 1 - ((labelLength - 1) * 0.18)) : 1), finalRadius * 1.14));
      return '<div class="radial-preview-hotkey" style="position:absolute;z-index:5;left:' + bx + 'px;top:' + by + 'px;width:' + (radius * 2) + 'px;height:' + (radius * 2) + 'px;border-radius:999px;transform:translate(-50%,-50%);background:' + cssColor(badge.fillColor || { red: 0.102, green: 0.102, blue: 0.102, alpha: 1 }, badgeOpacity) + ';border:' + (Number(badge.strokeWidth) || 0.8) + 'px solid ' + cssColor(badge.strokeColor || { red: 1, green: 1, blue: 1, alpha: 0.22 }, badgeOpacity) + ';color:' + cssColor(badge.textColor || { red: 0.957, green: 0.957, blue: 0.961, alpha: 1 }, badgeOpacity) + ';font:' + fontSize + 'px/1 ' + cssFontFamily(badge.fontName || ".AppleSystemUIFontBold") + ';display:flex;align-items:center;justify-content:center;pointer-events:none;">' + escapeHtml(label) + '</div>';
    }

    function submenuIndicatorHtml(item, x, y, size, angleDeg, opacity, submenuVisibleProgress) {
      if (!item || !Array.isArray(item.submenu) || item.submenu.length === 0) return "";
      const indicator = config.submenuIndicator || {};
      if (indicator.enabled === false) return "";
      const indicatorOpacity = opacity * (1 - submenuVisibleProgress);
      if (indicatorOpacity <= 0.01) return "";
      const parentScale = clamp(size / (settings().mainSize || 45), 0.05, 1.08);
      const radius = Math.max(0.5, (Number(indicator.size) || 3) * parentScale);
      const distance = size / 2 + radius + Math.max(0, Number(indicator.offsetGap) || 2) * parentScale;
      const angle = angleDeg * Math.PI / 180;
      const themeStyle = config.theme && config.theme.item ? config.theme.item : {};
      const itemStyle = item.style || {};
      const fill = itemStyle.hoverFill || themeStyle.hoverFill || itemStyle.fill || themeStyle.fill || { red: 1, green: 0.639, blue: 0, alpha: 1 };
      return '<span class="radial-preview-indicator" style="position:absolute;z-index:4;left:' + (x + distance * Math.cos(angle)) + 'px;top:' + (y + distance * Math.sin(angle)) + 'px;width:' + (radius * 2) + 'px;height:' + (radius * 2) + 'px;border-radius:999px;background:' + cssColor(fill, indicatorOpacity) + ';transform:translate(-50%,-50%);pointer-events:none;"></span>';
    }

    function addButtonHtml(parentSlotID, x, y, size, position, insertIndex, kind, plusKey) {
      const isMainInsert = kind === "main-insert";
      const title = isMainInsert ? "Insert main item" : "Add submenu item";
      const insertData = insertIndex != null ? ' data-insert-index="' + escapeHtml(String(insertIndex)) + '"' : "";
      const keyData = plusKey ? ' data-plus-key="' + escapeHtml(plusKey) + '"' : "";
      return '<button class="radial-preview-slot add ' + (isMainInsert ? "main-insert hover-active" : "submenu") + '" data-action="radialSelectAddSlot" data-parent-slot-id="' + escapeHtml(parentSlotID || "") + '" data-add-position="' + escapeHtml(position || "end") + '"' + insertData + keyData + ' title="' + title + '" aria-label="' + title + '" style="left:' + x + 'px;top:' + y + 'px;width:' + size + 'px;height:' + size + 'px;">' + plusIconHtml(size) + '</button>';
    }

    function desiredSelectionPlusSpecs() {
      if (payload.hasEmptyTempSlot || state.plusSuspended || !state.editParentSlotID || state.menuState === "CLOSING") return [];
      const editIndex = findMainIndexBySlotID(state.editParentSlotID);
      const editParent = editIndex ? items()[editIndex - 1] : null;
      const editPos = editIndex ? state.positions.main[editIndex - 1] : null;
      if (!editParent || !editPos) return [];
      if (state.activeSubmenuParent && state.activeSubmenuParent !== editIndex && (state.submenuState !== "NONE" || state.submenuProgress > 0.01)) return [];

      const scale = stageScale();
      const subSize = (settings().submenuSize || 45) * scale;
      const addSize = Math.max(24, subSize);
      const submenu = Array.isArray(editParent.submenu) ? editParent.submenu : [];
      const subR = submenuRadius(Math.max(submenu.length, 1)) * scale;
      const cx = stage.clientWidth / 2;
      const cy = stage.clientHeight / 2;
      const parentSlotID = editParent.slotID || "";

      function spec(position, point) {
        return { key: "submenu:" + parentSlotID + ":" + position, kind: "submenu", parentSlotID: parentSlotID, position: position, x: point.x, y: point.y, size: addSize };
      }

      if (submenu.length === 0) return [spec("single", pointFromAngle(cx, cy, editPos.angle || 270, subR))];
      if (state.activeSubmenuParent !== editIndex || state.submenuProgress < 0.98) return [];
      const displayCount = submenu.length + 2;
      return [
        spec("before", pointFromAngle(cx, cy, autoSubmenuAngle(editPos.angle, 1, displayCount), subR)),
        spec("after", pointFromAngle(cx, cy, autoSubmenuAngle(editPos.angle, displayCount, displayCount), subR)),
      ];
    }

    function insertCandidateForPoint(clientX, clientY) {
      const list = items();
      if (payload.hasEmptyTempSlot) return null;
      if (!state.isOpen || state.menuState !== "STABLE" || list.length >= (layout().mainMaxItems || 16)) return null;
      if (!Array.isArray(state.positions.main) || state.positions.main.length === 0) return null;
      const rect = stage.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const mainSize = (settings().mainSize || 45) * stageScale();
      const mainR = mainRadius() * stageScale();
      const insertRadius = mainR + (mainSize * 0.75);
      const hitRadius = Math.max(14, mainSize * 0.45);
      let best = null;
      for (let idx = 0; idx < list.length; idx += 1) {
        const current = state.positions.main[idx];
        const next = state.positions.main[(idx + 1) % list.length];
        if (!current || !next) continue;
        let nextAngle = next.angle;
        if (idx === list.length - 1 && nextAngle <= current.angle) nextAngle += 360;
        const angle = midpointAngleDeg(current.angle, nextAngle);
        const point = pointFromAngle(stage.clientWidth / 2, stage.clientHeight / 2, angle, insertRadius);
        const dx = x - point.x;
        const dy = y - point.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= hitRadius && (!best || distance < best.distance)) {
          best = { insertIndex: idx + 1, angle: angle, distance: distance };
        }
      }
      return best;
    }

    function updateInsertHover(clientX, clientY) {
      const next = insertCandidateForPoint(clientX, clientY);
      const old = state.hoverInsert;
      const changed = (!old && !!next) || (!!old && !next) || (!!old && !!next && old.insertIndex !== next.insertIndex);
      state.hoverInsert = next;
      return changed;
    }

    function desiredMainInsertPlusSpecs(cx, cy, mainR, mainSize, scaleProgress) {
      const list = items();
      const maxItems = layout().mainMaxItems || 16;
      if (payload.hasEmptyTempSlot || state.plusSuspended || state.menuState !== "STABLE" || !state.isOpen || list.length >= maxItems || !state.hoverInsert) return [];
      const addSize = Math.max(18, mainSize * 0.7);
      const addRadius = mainR + (mainSize * 0.75);
      if (list.length === 0) {
        const single = pointFromAngle(cx, cy, 270, addRadius * scaleProgress);
        return [{ key: "main-insert:0", kind: "main-insert", parentSlotID: "", position: "insert", insertIndex: 0, x: single.x, y: single.y, size: addSize }];
      }
      const point = pointFromAngle(cx, cy, state.hoverInsert.angle, addRadius * scaleProgress);
      return [{ key: "main-insert:" + String(state.hoverInsert.insertIndex), kind: "main-insert", parentSlotID: "", position: "insert", insertIndex: state.hoverInsert.insertIndex, x: point.x, y: point.y, size: addSize }];
    }

    function desiredPlusSpecs(cx, cy, mainR, mainSize, scaleProgress) {
      if (cooldownActive("suppressPlusUntil")) return [];
      const resolvedCx = cx != null ? cx : (stage.clientWidth || 560) / 2;
      const resolvedCy = cy != null ? cy : (stage.clientHeight || 560) / 2;
      const scale = stageScale();
      const resolvedMainSize = mainSize != null ? mainSize : (settings().mainSize || 45) * scale;
      const resolvedMainR = mainR != null ? mainR : mainRadius() * scale;
      const resolvedProgress = scaleProgress != null ? scaleProgress : clamp(state.menuProgress, 0, 1.08);
      return desiredMainInsertPlusSpecs(resolvedCx, resolvedCy, resolvedMainR, resolvedMainSize, resolvedProgress).concat(desiredSelectionPlusSpecs());
    }

    function scheduleCooldownRender() {
      if (state.cooldownTimer) {
        window.clearTimeout(state.cooldownTimer);
        state.cooldownTimer = null;
      }
      const remaining = Math.max(
        (Number(state.radiusGuideUntil) || 0) - Date.now(),
        (Number(state.suppressPlusUntil) || 0) - Date.now(),
        0
      );
      if (remaining > 0) {
        state.cooldownTimer = window.setTimeout(function () {
          state.cooldownTimer = null;
          render();
        }, remaining + 24);
      }
    }

    function closePlusButton(button) {
      if (!button || button.classList.contains("closing")) return;
      button.classList.remove("hover-active");
      button.classList.add("closing");
      button.removeAttribute("data-action");
      button.style.pointerEvents = "none";
      window.setTimeout(function () {
        if (button.parentNode) button.parentNode.removeChild(button);
      }, 140);
    }

    function syncPlusButtons(specs) {
      const desired = {};
      (Array.isArray(specs) ? specs : []).forEach(function (spec) {
        if (spec && spec.key) desired[spec.key] = spec;
      });

      plusLayer.querySelectorAll(".radial-preview-slot.add:not(.closing)").forEach(function (button) {
        const key = button.dataset.plusKey || "";
        if (!desired[key]) closePlusButton(button);
      });

      Object.keys(desired).forEach(function (key) {
        const spec = desired[key];
        let existing = null;
        plusLayer.querySelectorAll(".radial-preview-slot.add:not(.closing)").forEach(function (button) {
          if (!existing && button.dataset.plusKey === key) existing = button;
        });
        if (!existing) {
          const wrapper = document.createElement("div");
          wrapper.innerHTML = addButtonHtml(spec.parentSlotID || "", spec.x, spec.y, spec.size, spec.position || "end", spec.insertIndex, spec.kind || "submenu", spec.key);
          existing = wrapper.firstElementChild;
          if (existing) plusLayer.appendChild(existing);
        }
        if (!existing) return;
        existing.className = "radial-preview-slot add " + (spec.kind === "main-insert" ? "main-insert hover-active" : "submenu selection-plus");
        existing.dataset.plusKey = spec.key || "";
        existing.dataset.action = "radialSelectAddSlot";
        existing.dataset.parentSlotId = spec.parentSlotID || "";
        existing.dataset.addPosition = spec.position || "end";
        if (spec.insertIndex != null) existing.dataset.insertIndex = String(spec.insertIndex);
        else delete existing.dataset.insertIndex;
        existing.style.left = spec.x + "px";
        existing.style.top = spec.y + "px";
        existing.style.width = spec.size + "px";
        existing.style.height = spec.size + "px";
        const sizeKey = String(Math.round(spec.size * 100) / 100);
        if (existing.dataset.plusSize !== sizeKey) {
          existing.dataset.plusSize = sizeKey;
          existing.innerHTML = plusIconHtml(spec.size);
        }
      });
    }

    function drawTooltip(html) {
      const tooltip = state.tooltip;
      if (!tooltip.display || tooltip.progress <= 0.01 || (config.nameTooltip && config.nameTooltip.enabled === false)) return html;
      const display = tooltip.display;
      const pos = display.kind === "submenu" ? state.positions.submenu[display.index - 1] : state.positions.main[display.index - 1];
      if (!pos) return html;
      const data = tooltipLabelData(display);
      if (!data) return html;
      let frame = tooltip.lastFrame && tooltip.lastFrame.key === display.key ? tooltip.lastFrame : null;
      if (!frame) {
        const p = tooltipPosition(pos, data.w, data.h);
        frame = { key: display.key, x: p.x, y: p.y, w: data.w, h: data.h };
        tooltip.lastFrame = frame;
      }
      const menuOpacity = state.menuState === "CLOSING" ? motionFade(state.menuProgress || 0) : 1;
      const opacity = clamp((tooltip.progress || 0) * menuOpacity, 0, 1);
      const tooltipConfig = config.nameTooltip || {};
      html.push('<div class="radial-preview-tooltip" style="left:' + frame.x + 'px;top:' + frame.y + 'px;width:' + frame.w + 'px;height:' + frame.h + 'px;max-width:none;padding:0;opacity:' + opacity + ';background:' + cssColor(tooltipConfig.fillColor || { red: 0.102, green: 0.102, blue: 0.102, alpha: 0.92 }) + ';border-color:' + cssColor(tooltipConfig.strokeColor || { red: 1, green: 1, blue: 1, alpha: 0.18 }) + ';color:' + cssColor(tooltipConfig.textColor || { red: 0.957, green: 0.957, blue: 0.961, alpha: 1 }) + ';font-size:' + (tooltipConfig.fontSize || 12) + 'px;font-family:' + cssFontFamily(tooltipConfig.fontName || ".AppleSystemUIFont") + ';font-weight:400;line-height:1.25;text-align:center;">' + escapeHtml(data.label) + '</div>');
      return html;
    }

    function render() {
      const width = stage.clientWidth || 560;
      const height = stage.clientHeight || 560;
      const cx = width / 2;
      const cy = height / 2;
      const scale = stageScale();
      const scaleProgress = clamp(state.menuProgress, 0, 1.08);
      const menuOpacity = motionFade(state.menuProgress);
      const mainSize = (settings().mainSize || 45) * scale;
      const subSize = (settings().submenuSize || 45) * scale;
      const mainR = mainRadius() * scale;
      const html = [];
      const baseCloseSize = closeSize() * scale;
      state.positions = {
        main: [],
        submenu: [],
        close: { x: cx, y: cy, radius: baseCloseSize / 2, hitRadius: (baseCloseSize / 2) + hoverPadding(baseCloseSize) },
      };

      updatePreviewGrid(cx, cy, scale);

      items().forEach(function (item, idx) {
        const index = idx + 1;
        const angle = layout().useAutoMainLayout !== false ? autoMainAngle(index, items().length) : (Number(item.angle) || autoMainAngle(index, items().length));
        const target = pointFromAngle(cx, cy, angle, mainR);
        const x = cx + (target.x - cx) * scaleProgress;
        const y = cy + (target.y - cy) * scaleProgress;
        const visibleSize = mainSize * clamp(scaleProgress, 0.05, 1);
        state.positions.main[idx] = { x: x, y: y, angle: angle, radius: visibleSize / 2 + hoverPadding(visibleSize), hitRadius: visibleSize / 2 + hoverPadding(visibleSize) };
        const hoverProgress = state.hoverVisuals[hoverKey("main", index)] ? state.hoverVisuals[hoverKey("main", index)].progress || 0 : 0;
        html.push(buttonHtml(item, "main", x, y, visibleSize, angle, menuOpacity, hoverProgress));
        const subProgress = state.activeSubmenuParent === index ? state.submenuProgress : 0;
        html.push(submenuIndicatorHtml(item, x, y, visibleSize, angle, menuOpacity, subProgress));
        html.push(hotkeyBadgeHtml(item, "main", x, y, visibleSize, angle, menuOpacity));
      });

      const activeParent = state.activeSubmenuParent ? items()[state.activeSubmenuParent - 1] : null;
      const submenu = activeParent && Array.isArray(activeParent.submenu) ? activeParent.submenu : null;
      if (activeParent && submenu) {
        const base = state.positions.main[state.activeSubmenuParent - 1] || { angle: 0 };
        const maxTime = submenuAnimationMaxTime(state.activeSubmenuParent);
        const subDuration = positiveDuration(animation().submenuOpenDuration, 0.12);
        const stagger = Math.max(0, Number(animation().staggerDelay) || 0);
        const subR = submenuRadius(submenu.length) * scale;
        submenu.forEach(function (item, idx) {
          const index = idx + 1;
          const angle = layout().useAutoSubmenuLayout !== false ? autoSubmenuAngle(base.angle, index, submenu.length) : (Number(item.slot) || 0);
          const delay = idx * stagger;
          const itemProgress = clamp((state.submenuProgress * maxTime - delay) / subDuration, 0, 1);
          const itemEase = motionEase(itemProgress, "submenu");
          const target = pointFromAngle(cx, cy, angle, subR * scaleProgress);
          const start = { x: cx + (target.x - cx) * 0.70, y: cy + (target.y - cy) * 0.70 };
          const x = start.x + (target.x - start.x) * itemEase;
          const y = start.y + (target.y - start.y) * itemEase;
          const subScale = clamp(itemEase * scaleProgress, 0.05, 1.08);
          const subOpacity = menuOpacity * motionFade(itemProgress);
          const visibleSize = subSize * subScale;
          if (itemProgress > 0.01 && subOpacity > 0.01) {
            state.positions.submenu[idx] = { x: x, y: y, angle: angle, radius: visibleSize / 2 + hoverPadding(visibleSize), hitRadius: visibleSize / 2 + hoverPadding(visibleSize) };
            const hoverProgress = state.hoverVisuals[hoverKey("submenu", index)] ? state.hoverVisuals[hoverKey("submenu", index)].progress || 0 : 0;
            html.push(buttonHtml(item, "submenu", x, y, visibleSize, angle, subOpacity, hoverProgress, { parentSlotID: activeParent.slotID || "" }));
            html.push(hotkeyBadgeHtml(item, "submenu", x, y, visibleSize, angle, subOpacity));
          }
        });
      }

      const closeVisibleSize = closeSize() * scale * clamp(scaleProgress, 0.2, 1);
      state.positions.close = { x: cx, y: cy, radius: closeVisibleSize / 2, hitRadius: (closeVisibleSize / 2) + hoverPadding(closeVisibleSize) };
      html.push(buttonHtml(config.closeItem || {}, "close", cx, cy, closeVisibleSize, 0, menuOpacity, state.hoverVisuals[hoverKey("close")] ? state.hoverVisuals[hoverKey("close")].progress || 0 : 0));
      drawTooltip(html);
      layer.innerHTML = html.join("");
      syncPlusButtons(desiredPlusSpecs(cx, cy, mainR, mainSize, scaleProgress));
      stage.dataset.previewClosed = state.isOpen ? "0" : "1";
      scheduleCooldownRender();
    }

    function tick(timestamp) {
      if (state.disposed) return;
      if (state.lastTime == null) state.lastTime = timestamp;
      const dt = Math.min(0.05, (timestamp - state.lastTime) / 1000);
      state.lastTime = timestamp;
      let changed = false;
      if (state.menuState === "OPENING") {
        state.menuProgress = clamp(state.menuProgress + dt / positiveDuration(animation().openDuration, 0.12), 0, 1);
        changed = true;
        if (state.menuProgress >= 1) state.menuState = "STABLE";
      } else if (state.menuState === "CLOSING") {
        state.menuProgress = clamp(state.menuProgress - dt / positiveDuration(animation().closeDuration, 0.08), 0, 1);
        changed = true;
        if (state.menuProgress <= 0) {
          state.isOpen = false;
          state.menuState = "CLOSED";
          state.submenuState = "NONE";
          state.activeSubmenuParent = null;
          state.hoverMain = null;
          state.hoverSub = null;
          state.hoverClose = false;
          state.hoverVisuals = {};
          state.tooltip.display = null;
          state.tooltip.pendingDisplay = null;
          stage.classList.add("closed");
          layer.innerHTML = "";
          stage.dataset.previewClosed = "1";
          state.frameID = null;
          return;
        }
      }
      if (state.submenuState === "FADING_IN") {
        state.submenuProgress = clamp(state.submenuProgress + dt / submenuAnimationMaxTime(state.activeSubmenuParent), 0, 1);
        changed = true;
        if (state.submenuProgress >= 1) state.submenuState = "STABLE";
      } else if (state.submenuState === "FADING_OUT") {
        state.submenuProgress = clamp(state.submenuProgress - dt / positiveDuration(animation().submenuCloseDuration, 0.08), 0, 1);
        changed = true;
        if (state.submenuProgress <= 0) {
          state.submenuState = "NONE";
          state.activeSubmenuParent = null;
        }
      }
      if (updateHoverVisuals(dt)) changed = true;
      if (updateNameTooltip(dt)) changed = true;

      if (changed || state.menuState === "OPENING") {
        const original = state.menuProgress;
        if (state.menuState === "OPENING") state.menuProgress = motionEase(original, "main_open");
        render();
        state.menuProgress = original;
      }
      const submenuAnimating = state.submenuState === "FADING_IN" || state.submenuState === "FADING_OUT";
      const tooltipActive = !!state.tooltip.hoverKey || !!state.tooltip.display || !!state.tooltip.pendingDisplay || Math.abs((state.tooltip.target || 0) - (state.tooltip.progress || 0)) > 0.001;
      if (state.isOpen && (state.menuState !== "STABLE" || submenuAnimating || Object.keys(state.hoverVisuals).length > 0 || tooltipActive)) {
        state.frameID = window.requestAnimationFrame(tick);
      } else {
        state.frameID = null;
      }
    }

    function requestTick() {
      if (!state.frameID) {
        state.lastTime = null;
        state.frameID = window.requestAnimationFrame(tick);
      }
    }

    function openPreview() {
      stage.classList.remove("closed");
      state.isOpen = true;
      state.menuState = "OPENING";
      state.menuProgress = 0;
      state.submenuState = "NONE";
      state.submenuProgress = 0;
      state.activeSubmenuParent = null;
      state.hoverMain = null;
      state.hoverSub = null;
      state.hoverClose = false;
      state.hoverInsert = null;
      state.hoverVisuals = {};
      state.tooltip.hoverKey = null;
      state.tooltip.hoverTime = 0;
      state.tooltip.unlocked = false;
      state.tooltip.display = null;
      state.tooltip.pendingDisplay = null;
      state.tooltip.progress = 0;
      stage.dataset.previewClosed = "0";
      render();
      requestTick();
    }

    function closePreview() {
      if (!state.isOpen || state.menuState === "CLOSING") return;
      if (state.menuState === "OPENING") state.menuProgress = motionEase(state.menuProgress, "main_open");
      state.menuState = "CLOSING";
      state.selectedSlotID = "";
      state.editParentSlotID = "";
      state.hoverInsert = null;
      state.tooltip.hoverKey = null;
      state.tooltip.hoverTime = 0;
      state.tooltip.unlocked = false;
      state.tooltip.pendingDisplay = null;
      setTooltipTarget(0);
      requestTick();
      if (callbacks.onClose) callbacks.onClose();
    }

    function hitTest(clientX, clientY) {
      if (!state.isOpen || state.menuState === "CLOSING") return null;
      const rect = stage.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      function near(pos) {
        if (!pos) return false;
        const dx = x - pos.x;
        const dy = y - pos.y;
        const radius = pos.hitRadius || pos.radius || 0;
        return dx * dx + dy * dy <= radius * radius;
      }
      if (near(state.positions.close)) return { kind: "close" };
      for (let s = 0; s < state.positions.submenu.length; s += 1) {
        if (near(state.positions.submenu[s])) return { kind: "submenu", index: s + 1 };
      }
      for (let m = 0; m < state.positions.main.length; m += 1) {
        if (near(state.positions.main[m])) return { kind: "main", index: m + 1 };
      }
      return null;
    }

    function handleHover(hit) {
      if (hit && hit.kind === "close") setHoverVisualTargets(null, null, true);
      else if (hit && hit.kind === "main") setHoverVisualTargets(hit.index, null, false);
      else if (hit && hit.kind === "submenu") setHoverVisualTargets(state.hoverMain, hit.index, false);
      else setHoverVisualTargets(state.hoverMain, null, false);

      const oldMain = state.hoverMain;
      state.hoverClose = hit && hit.kind === "close";
      if (hit && hit.kind === "close") {
        state.hoverMain = null;
        state.hoverSub = null;
        if (oldMain && items()[oldMain - 1] && Array.isArray(items()[oldMain - 1].submenu) && items()[oldMain - 1].submenu.length > 0) {
          state.activeSubmenuParent = oldMain;
          state.submenuState = "FADING_OUT";
        }
      } else if (hit && hit.kind === "main") {
        const newMain = hit.index;
        state.hoverMain = newMain;
        state.hoverSub = null;
        if (oldMain !== newMain) {
          const item = items()[newMain - 1];
          if (item && Array.isArray(item.submenu) && item.submenu.length > 0) {
            state.activeSubmenuParent = newMain;
            state.submenuState = "FADING_IN";
            state.submenuProgress = 0;
          } else if (oldMain && items()[oldMain - 1] && Array.isArray(items()[oldMain - 1].submenu) && items()[oldMain - 1].submenu.length > 0) {
            state.activeSubmenuParent = oldMain;
            state.submenuState = "FADING_OUT";
          } else {
            state.submenuState = "NONE";
            state.activeSubmenuParent = null;
          }
        }
      } else if (hit && hit.kind === "submenu") {
        state.hoverSub = hit.index;
      } else {
        state.hoverSub = null;
      }
      requestTick();
    }

    function slotActionFromHit(hit) {
      if (!hit) return null;
      if (hit.kind === "main") {
        const mainItem = items()[hit.index - 1];
        if (!mainItem || !mainItem.slotID) return null;
        return { type: "slot", slotID: mainItem.slotID, kind: "main", parentSlotID: "" };
      }
      if (hit.kind === "submenu") {
        const parent = state.activeSubmenuParent ? items()[state.activeSubmenuParent - 1] : null;
        const submenu = parent && Array.isArray(parent.submenu) ? parent.submenu : [];
        const child = submenu[hit.index - 1];
        if (!child || !child.slotID) return null;
        return { type: "slot", slotID: child.slotID, kind: "submenu", parentSlotID: parent.slotID || "" };
      }
      return null;
    }

    function previewActionFromEvent(event) {
      if (stage.dataset.previewClosed === "1" || !state.isOpen) return { type: "open" };
      const hit = hitTest(event.clientX, event.clientY);
      if (event.target.closest("[data-preview-close]") || (hit && hit.kind === "close")) return { type: "close" };
      const addButton = event.target.closest('.radial-preview-slot.add[data-action="radialSelectAddSlot"]');
      if (addButton) {
        return { type: "add", parentSlotID: addButton.dataset.parentSlotId || "", addPosition: addButton.dataset.addPosition || "", insertIndex: addButton.dataset.insertIndex || "" };
      }
      const slotButton = event.target.closest('.radial-preview-slot[data-action="radialSelectSlot"]');
      if (slotButton && !slotButton.classList.contains("add")) {
        return { type: "slot", slotID: slotButton.dataset.slotId || "", kind: slotButton.dataset.kind || "", parentSlotID: slotButton.dataset.parentSlotId || "" };
      }
      const hitAction = slotActionFromHit(hit);
      if (hitAction) return hitAction;
      if (!event.target.closest(".radial-preview-slot")) return { type: "blank" };
      return null;
    }

    function applyPreviewSelectionState(payloadSelection) {
      payloadSelection = payloadSelection || {};
      state.selectedSlotID = payloadSelection.selectedSlotID || "";
      state.editParentSlotID = payloadSelection.activeParentSlotID || "";
      state.hoverSub = null;
      if (state.editParentSlotID) {
        const index = findMainIndexBySlotID(state.editParentSlotID);
        if (index && state.activeSubmenuParent !== index) {
          state.activeSubmenuParent = index;
          state.submenuState = "STABLE";
          state.submenuProgress = 1;
        }
      } else {
        state.activeSubmenuParent = null;
        state.submenuState = "NONE";
        state.submenuProgress = 0;
      }
      render();
    }

    function executePreviewAction(action) {
      if (!action) return false;
      if (action.type === "open") {
        openPreview();
        return true;
      }
      if (action.type === "close") {
        closePreview();
        return true;
      }
      if (action.type === "add") {
        if (callbacks.onAdd) callbacks.onAdd({
          parentSlotID: action.parentSlotID || "",
          position: action.addPosition || "",
          insertIndex: action.insertIndex === "" ? null : Number(action.insertIndex),
        });
        return true;
      }
      if (action.type === "slot") {
        if (!action.slotID) return false;
        applyPreviewSelectionState({
          selectedSlotID: action.slotID || "",
          activeParentSlotID: action.parentSlotID || action.slotID || "",
        });
        if (callbacks.onSlot) callbacks.onSlot(action);
        return true;
      }
      if (action.type === "blank") {
        applyPreviewSelectionState({ selectedSlotID: "", activeParentSlotID: "" });
        if (callbacks.onBlank) callbacks.onBlank();
        return true;
      }
      return false;
    }

    function previewSlotElements(slotID) {
      const matches = [];
      if (!slotID) return matches;
      stage.querySelectorAll(".radial-preview-slot[data-slot-id]").forEach(function (slot) {
        if (slot.dataset.slotId === slotID) matches.push(slot);
      });
      return matches;
    }

    function clearPreviewDragGhost() {
      if (state.dragGhost && state.dragGhost.parentNode) state.dragGhost.parentNode.removeChild(state.dragGhost);
      state.dragGhost = null;
      document.body.classList.remove("radial-preview-drag-active");
    }

    function clearPreviewDragFeedback() {
      stage.querySelectorAll(".radial-preview-slot.drag-source, .radial-preview-slot.drag-over").forEach(function (slot) {
        slot.classList.remove("drag-source", "drag-over");
      });
      state.dragOverSlotID = "";
      state.dragOverTrash = false;
      trashDropzone.classList.remove("active");
      state.dragSourceSlotID = "";
      state.plusSuspended = false;
      document.body.classList.remove("radial-preview-drag-active");
      clearPreviewDragGhost();
    }

    function setPreviewDragging(slotID, isDragging) {
      previewSlotElements(slotID).forEach(function (slot) {
        if (isDragging) slot.classList.add("drag-source");
        else slot.classList.remove("drag-source");
      });
    }

    function startPreviewDragGhost(slotID, event) {
      clearPreviewDragGhost();
      const source = previewSlotElements(slotID)[0];
      if (!source) return;
      const rect = source.getBoundingClientRect();
      const ghost = source.cloneNode(true);
      ghost.classList.add("radial-preview-drag-ghost");
      ghost.classList.remove("drag-source", "drag-over", "selected");
      ghost.removeAttribute("data-action");
      ghost.removeAttribute("data-slot-id");
      ghost.removeAttribute("data-parent-slot-id");
      ghost.style.left = (event.clientX || rect.left + rect.width / 2) + "px";
      ghost.style.top = (event.clientY || rect.top + rect.height / 2) + "px";
      ghost.style.width = rect.width + "px";
      ghost.style.height = rect.height + "px";
      // Keep the clone inside the preview island so it retains the exact
      // structural styles of a runtime slot while positioning against the
      // viewport. The stage itself uses containment, so mount beside it.
      const previewRoot = stage.parentElement;
      (previewRoot || document.body).appendChild(ghost);
      state.dragGhost = ghost;
      state.dragSourceSlotID = slotID || "";
      document.body.classList.add("radial-preview-drag-active");
    }

    function updatePreviewDragGhost(event) {
      if (!state.dragGhost) return;
      state.dragGhost.style.left = event.clientX + "px";
      state.dragGhost.style.top = event.clientY + "px";
    }

    function trashDropTargetFromEvent(event) {
      if (!trashDropzone || !state.dragSourceSlotID) return null;
      const rect = trashDropzone.getBoundingClientRect();
      const padding = 14;
      if (
        event.clientX >= rect.left - padding &&
        event.clientX <= rect.right + padding &&
        event.clientY >= rect.top - padding &&
        event.clientY <= rect.bottom + padding
      ) {
        return { trash: true };
      }
      return null;
    }

    function nearestPreviewDropTargetFromPoint(x, y, sourceSlotID) {
      let best = null;
      let bestDistance = Infinity;
      stage.querySelectorAll('.radial-preview-slot[data-slot-id]').forEach(function (slot) {
        if (slot.classList.contains("add") || slot.classList.contains("close")) return;
        const slotID = slot.dataset.slotId || "";
        if (slotID === "system.close" || !slotID || slotID === sourceSlotID) return;
        const rect = slot.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = cx - x;
        const dy = cy - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { targetSlotID: slotID, parentSlotID: slot.dataset.parentSlotId || "" };
        }
      });
      return bestDistance <= 64 ? best : null;
    }

    function previewDropTargetFromEvent(event, sourceSlotID) {
      const eventTarget = event.target && event.target.closest ? event.target : null;
      const sourceEl = previewSlotElements(sourceSlotID)[0] || null;
      if (sourceEl) {
        const sourceRect = sourceEl.getBoundingClientRect();
        const sourcePadding = 12;
        if (
          event.clientX >= sourceRect.left - sourcePadding &&
          event.clientX <= sourceRect.right + sourcePadding &&
          event.clientY >= sourceRect.top - sourcePadding &&
          event.clientY <= sourceRect.bottom + sourcePadding
        ) {
          return null;
        }
      }
      const slotButton = eventTarget ? eventTarget.closest('.radial-preview-slot[data-slot-id]') : null;
      if (slotButton && !slotButton.classList.contains("add") && !slotButton.classList.contains("close") && slotButton.dataset.slotId !== "system.close" && slotButton.dataset.slotId !== sourceSlotID) {
        return { targetSlotID: slotButton.dataset.slotId || "", parentSlotID: slotButton.dataset.parentSlotId || "" };
      }
      const hitAction = slotActionFromHit(hitTest(event.clientX, event.clientY));
      if (hitAction && hitAction.slotID && hitAction.slotID !== "system.close" && hitAction.slotID !== sourceSlotID) {
        return { targetSlotID: hitAction.slotID || "", parentSlotID: hitAction.parentSlotID || "" };
      }
      return nearestPreviewDropTargetFromPoint(event.clientX, event.clientY, sourceSlotID);
    }

    function setPreviewDragOver(target) {
      state.dragOverSlotID = target && target.targetSlotID ? target.targetSlotID : "";
      stage.querySelectorAll(".radial-preview-slot.drag-over").forEach(function (slot) {
        slot.classList.remove("drag-over");
      });
      if (!target) return;
      previewSlotElements(target.targetSlotID).forEach(function (slot) {
        slot.classList.add("drag-over");
      });
    }

    function setPreviewTrashOver(target) {
      state.dragOverTrash = !!target;
      if (state.dragOverTrash) trashDropzone.classList.add("active");
      else trashDropzone.classList.remove("active");
    }

    addListener(stage, "mousemove", function (event) {
      if (state.pointerAction && state.pointerAction.dragging) return;
      state.lastClientX = event.clientX;
      state.lastClientY = event.clientY;
      const hit = hitTest(event.clientX, event.clientY);
      let insertChanged = false;
      if (hit) {
        insertChanged = !!state.hoverInsert;
        state.hoverInsert = null;
      } else {
        insertChanged = updateInsertHover(event.clientX, event.clientY);
      }
      handleHover(hit);
      if (insertChanged) render();
    });

    addListener(stage, "pointerdown", function (event) {
      if (event.button != null && event.button !== 0) return;
      const action = previewActionFromEvent(event);
      if (!action) return;

      if (action.type === "open" || action.type === "close" || action.type === "blank" || action.type === "add") {
        event.preventDefault();
        event.stopPropagation();
        executePreviewAction(action);
        state.suppressNextClickUntil = Date.now() + 500;
        return;
      }

      state.pointerAction = { action: action, x: event.clientX, y: event.clientY, pointerId: event.pointerId, time: Date.now(), dragging: false };
      if (action.type === "slot") {
        applyPreviewSelectionState({
          selectedSlotID: action.slotID || "",
          activeParentSlotID: action.parentSlotID || action.slotID || "",
        });
      }
    }, true);

    addListener(document, "pointermove", function (event) {
      const pending = state.pointerAction;
      if (!pending || pending.action.type !== "slot") return;
      if (pending.pointerId != null && event.pointerId != null && pending.pointerId !== event.pointerId) return;
      const dx = event.clientX - pending.x;
      const dy = event.clientY - pending.y;
      if (!pending.dragging && (dx * dx + dy * dy) > 36) {
        pending.dragging = true;
        state.plusSuspended = true;
        state.hoverInsert = null;
        render();
        setPreviewDragging(pending.action.slotID, true);
        startPreviewDragGhost(pending.action.slotID, event);
        state.tooltip.hoverKey = null;
        state.tooltip.pendingDisplay = null;
        setTooltipTarget(0);
        event.preventDefault();
        event.stopPropagation();
      }
      if (pending.dragging) {
        const trashTarget = trashDropTargetFromEvent(event);
        const target = trashTarget ? null : previewDropTargetFromEvent(event, pending.action.slotID);
        updatePreviewDragGhost(event);
        setPreviewTrashOver(trashTarget);
        setPreviewDragOver(target);
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);

    addListener(document, "pointerup", function (event) {
      const pending = state.pointerAction;
      if (!pending) return;
      if (pending.pointerId != null && event.pointerId != null && pending.pointerId !== event.pointerId) return;
      state.pointerAction = null;
      const dx = event.clientX - pending.x;
      const dy = event.clientY - pending.y;
      if (pending.dragging || (dx * dx + dy * dy) > 36) {
        const trashTarget = trashDropTargetFromEvent(event);
        const target = trashTarget ? null : previewDropTargetFromEvent(event, pending.action.slotID);
        clearPreviewDragFeedback();
        if (trashTarget) {
          if (callbacks.onRemove) callbacks.onRemove(pending.action.slotID);
          event.preventDefault();
          event.stopPropagation();
          state.suppressNextClickUntil = Date.now() + 500;
          return;
        }
        if (target && target.targetSlotID && target.targetSlotID !== pending.action.slotID) {
          if (callbacks.onDrop) callbacks.onDrop({
            slotID: pending.action.slotID,
            targetSlotID: target.targetSlotID || "",
            targetParentSlotID: target.parentSlotID || "",
          });
          event.preventDefault();
          event.stopPropagation();
          state.suppressNextClickUntil = Date.now() + 500;
          return;
        }
        render();
        return;
      }
      if (executePreviewAction(pending.action)) {
        event.preventDefault();
        event.stopPropagation();
        state.suppressNextClickUntil = Date.now() + 500;
      }
    }, true);

    addListener(document, "pointercancel", function (event) {
      if (!state.pointerAction) return;
      if (state.pointerAction.pointerId == null || event.pointerId == null || state.pointerAction.pointerId === event.pointerId) {
        state.pointerAction = null;
        clearPreviewDragFeedback();
        render();
      }
    }, true);

    addListener(stage, "mouseleave", function () {
      setHoverVisualTargets(null, null, false);
      state.hoverMain = null;
      state.hoverSub = null;
      state.hoverClose = false;
      if (state.activeSubmenuParent) {
        const selectedParentIndex = state.editParentSlotID ? findMainIndexBySlotID(state.editParentSlotID) : null;
        if (!selectedParentIndex || selectedParentIndex !== state.activeSubmenuParent) state.submenuState = "FADING_OUT";
      }
      requestTick();
    });

    addListener(stage, "click", function (event) {
      if (Date.now() < (state.suppressNextClickUntil || 0)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const action = previewActionFromEvent(event);
      if (executePreviewAction(action)) {
        event.preventDefault();
        event.stopPropagation();
      }
    });

    ensureInitialSubmenu();
    render();
    if (state.menuState === "OPENING") requestTick();

    state.lastStageWidth = stage.clientWidth;
    state.lastStageHeight = stage.clientHeight;
    if (typeof window.ResizeObserver === "function") {
      state.resizeObserver = new window.ResizeObserver(function () {
        const width = stage.clientWidth;
        const height = stage.clientHeight;
        if (width === state.lastStageWidth && height === state.lastStageHeight) return;
        state.lastStageWidth = width;
        state.lastStageHeight = height;
        if (state.resizeFrameID) window.cancelAnimationFrame(state.resizeFrameID);
        state.resizeFrameID = window.requestAnimationFrame(function () {
          state.resizeFrameID = null;
          if (!state.disposed) render();
        });
      });
      state.resizeObserver.observe(stage);
    } else {
      addListener(window, "resize", function () {
        if (!state.disposed) render();
      });
    }

    return {
      replay() {
        openPreview();
      },
      update(nextPayload) {
        nextPayload = nextPayload || {};
        if (nextPayload.config) {
          config = nextPayload.config;
          syncPreviewImages(config);
        }
        if (nextPayload.selectedSlotID !== undefined) state.selectedSlotID = nextPayload.selectedSlotID || "";
        if (nextPayload.activeParentSlotID !== undefined) state.editParentSlotID = nextPayload.activeParentSlotID || "";
        if (nextPayload.radiusGuideUntil !== undefined) state.radiusGuideUntil = Number(nextPayload.radiusGuideUntil) || 0;
        if (nextPayload.suppressPlusUntil !== undefined) state.suppressPlusUntil = Number(nextPayload.suppressPlusUntil) || 0;
        render();
      },
      updateSelection(selection) {
        applyPreviewSelectionState(selection || {});
      },
      dispose() {
        state.disposed = true;
        if (state.frameID) window.cancelAnimationFrame(state.frameID);
        if (state.resizeFrameID) window.cancelAnimationFrame(state.resizeFrameID);
        if (state.cooldownTimer) window.clearTimeout(state.cooldownTimer);
        if (state.resizeObserver) state.resizeObserver.disconnect();
        listeners.forEach(function (entry) {
          entry.target.removeEventListener(entry.type, entry.handler, entry.options);
        });
        clearPreviewDragFeedback();
      },
    };
  }

  api.mount = function (stage, payload, callbacks) {
    return createRuntimePreview(stage, payload, callbacks);
  };
})();
