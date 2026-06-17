# @hologramism/browser

Motion-reactive **security-hologram** (DOVID / Kinegram) canvas for the web — the
shiny, color-shifting "3D laser" foil look, GPU-rendered (Rust + wgpu/WebGPU) and
reacting live to device-orientation and pointer tilt.

Same scene schema as [`@hologramism/react-native`](https://www.npmjs.com/package/@hologramism/react-native):
`HologramCanvas` props match `HologramView` props one-for-one.

**▶ [Live demo](https://alexdonh.github.io/hologramism/)** — tilt your device (or
drag) to see the foil shift. Needs a WebGPU browser (see [Requirements](#requirements)).

## Requirements

WebGPU. Chrome ≥ 113, Edge ≥ 113, or Safari 18+. Firefox needs
`dom.webgpu.enabled` in `about:config`. iOS Safari 18+ works — motion-permission
UI is handled automatically.

## Install

```sh
npm install @hologramism/browser
```

`react` and `react-dom` (≥ 18) are peer dependencies.

## Usage

```tsx
import { HologramCanvas, Preset, Layout } from '@hologramism/browser';

// Gold guilloché on a transparent background.
<HologramCanvas style={{ width: 300, height: 190 }} preset="guilloche" color="gold" />

// PNG as artwork, or as a preset-filled silhouette (the mask gets a beveled rim).
<HologramCanvas shape={{ type: 'png', uri: '/bird.png', mode: 'image' }} />
<HologramCanvas shape={{ type: 'png', uri: '/bird.png', mode: 'mask' }} preset="dotMatrix" />

// Tile the shape into a grid; the rainbow sweeps the whole grid as one surface.
<HologramCanvas shape="circle" preset="rainbow" layout={Layout.tile({ size: 0.22, gap: 0.03 })} />

// Kinegram: cross-fades gold↔sapphire on tilt.
<HologramCanvas
  layers={[
    { preset: Preset.linear({ angle: 0 }), color: 'gold', azimuth: 0 },
    { preset: 'rosette', color: 'sapphire', azimuth: 90 },
  ]}
  tilt={{ motion: true, gesture: true, autoOrbit: true }}
/>
```

## Props

| Prop | Type | Notes |
| --- | --- | --- |
| `shape` | `'rect' \| 'circle' \| 'ellipse'` or `{ type, … }` | `polygon` (normalized points), `png`/`svg` (`uri` \| `base64` \| `svg`, `mode: 'image' \| 'mask'`) |
| `preset` | `'linear' \| …` or `{ type, angle?, freq? }` | `Preset.*(…)` helpers return the config object |
| `color` | `'spectrum' \| 'gold' \| …` or `RGBA[]` | a bare `[r,g,b,a]` list is a custom palette |
| `layout` | `'single' \| 'tile'` or `{ type, … }` | `Layout.single({ size?, position? })` places one shape; `Layout.tile({ size?, gap?, fit? })` repeats it as a grid. `size`/`gap` are fractions of the view; `fit: 'cover' \| 'fill'`. Pattern + color stay global |
| `layers` | `Layer \| Layer[]` | each layer takes `shape`/`preset`/`color`/`azimuth` (deg)/`layout`; array = multiplex |
| `background` | `string` (hex) or `RGBA` | transparent by default; set a hex string or `[r,g,b,a]` to make it opaque |
| `tilt` | `{ motion?, gesture?, autoOrbit? }` | orientation sources (all default true) |
| `glare` | `number` | strength of the motion-driven light reflection; `0` disables |
| look | `intensity`, `gratingFrequency`, `iridescence`, `sparkleDensity`, `sparkleIntensity`, `highlightSharpness` | flat, global (applies to the whole scene) |

Angles and azimuths are in **degrees**. Presets: `linear`, `radial`,
`concentric`, `guilloche`, `dotMatrix`, `rosette`, `lattice`, `rainbow`. Foils:
`gold`, `silver`, `rainbowFoil`, `emerald`, `sapphire`, `copper`.

## Notes

The wasm engine presents directly to a WebGPU `<canvas>`; a CPU read-back path is
the automatic fallback when surface attach is unavailable. The cross-origin
isolation headers (`COOP`/`COEP`) are required for the WebGPU context — set them
on the page serving the canvas.

## License

MIT — see [repository](https://github.com/alexdonh/hologramism).
