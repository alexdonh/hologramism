# Hologramism Web (WebGPU) demo

A React + Vite app mirroring the [React Native demo](../react-native): the same
mode / shape / layout / color / pattern / kinegram / glare / auto-orbit controls,
driving `@hologramism/browser` (the Rust engine compiled to wasm + WebGPU). The
screen lives in [src/App.tsx](src/App.tsx).

Requires a WebGPU-capable browser: Chrome ≥ 113, Edge ≥ 113, or Safari 18+.
Firefox needs `dom.webgpu.enabled` in `about:config`.

## Run

```sh
# 1. Build the wasm module once (and after any Rust change):
scripts/build_wasm.sh

# 2. Install deps (resolves @hologramism/browser from ../../bindings) and serve:
cd examples/browser
npm install
npm run dev
# -> http://localhost:5173
```

On desktop the hologram tilts via pointer drag + idle auto-orbit (toggle
**Auto-orbit**); on iOS Safari it follows device motion once you grant the
motion-permission prompt.
