/*
 * Narrow browser bridge for the production radial preview renderer.
 *
 * The Builder normally provides these helpers through window.OA. The landing
 * page supplies only the three services needed to render local demo assets;
 * persistence, Hammerspoon messaging, and Builder state are intentionally not
 * exposed here.
 */
(function () {
  "use strict";

  const OA = (window.OA = window.OA || {});

  OA.iconURL = function (path) {
    return path || "";
  };

  OA.requestIcons = function () {
    return Promise.resolve();
  };

  OA.svg = function () {
    return document.createDocumentFragment();
  };
})();
