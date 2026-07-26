# Product demo source map

The homepage uses two bounded interactive demo islands derived from production
Builder sources. This file keeps the visual contract explicit so future app
changes do not turn the website into a second, drifting design system.

## Step Timeline

- Canonical geometry and states:
  `src/OmniAction.spoon/tools/builder/assets/css/05_macro_builder.css`
- Canonical icons:
  `src/OmniAction.spoon/tools/builder/assets/js/00_core.js`
- Homepage adapter:
  `assets/product-demo/product-demo.js`
- Homepage styling:
  `assets/product-demo/product-demo.css`

The website keeps only local sample state, expand/collapse, duplicate/remove,
test feedback, and repeat-pill editing. Its autonomous choreography pauses while
the visitor is interacting. It does not persist, execute, or reorder steps.

## Radial Preview

- Canonical renderer:
  `src/OmniAction.spoon/tools/builder/assets/js/05_radial_preview_runtime.js`
- Canonical structural CSS:
  `src/OmniAction.spoon/tools/builder/assets/css/06_radial_preview_runtime.css`
- Vendored copies:
  `assets/product-demo/radial-preview-runtime.js`
  `assets/product-demo/radial-preview-runtime.css`
- Narrow website bridge:
  `assets/product-demo/product-demo-bridge.js`
- Demo payload and mount adapter:
  `assets/product-demo/product-demo.js`

The vendored renderer and CSS should be refreshed together. The browser bridge
must remain limited to local asset resolution; do not expose Builder persistence
or Hammerspoon messaging to the public website demo. Website choreography drives
the renderer through ordinary pointer events and pauses whenever the visitor
takes control.
