# Hologramism

Cross-platform animated **security-hologram** renderer — the shiny, color-shifting
"3D laser" foil look (DOVIDs / Kinegrams) that reacts live to device motion, as if
you were tilting a physical holographic card.

One GPU engine (Rust + [wgpu](https://wgpu.rs)), one WGSL shader set, thin
per-platform bindings. **React Native (iOS) and Web (WebGPU/wasm) ship today**;
Android and Flutter bindings are planned from the same core.

**▶ [Live demo](https://alexdonh.github.io/hologramism/)** — tilt your device (or
drag) to see the foil shift. Best in a WebGPU browser (see [Web](#web-webgpu)).

| Package | Platform | Registry |
| --- | --- | --- |
| [`@hologramism/browser`](https://www.npmjs.com/package/@hologramism/browser) | Web (WebGPU/wasm) | npm |
| [`@hologramism/react-native`](https://www.npmjs.com/package/@hologramism/react-native) | React Native (iOS) | npm |

## How it works

The hologram is a single fragment-shader effect driven by device orientation:

- **diffraction-grating color** — rainbow sweep as you tilt
- **thin-film iridescence** — oily color-shift
- **emboss relief + sparkle** — metallic 3D-laser pop

Every content source (basic shape, polygon, PNG, SVG, built-in DOVID preset) is
reduced to the same four GPU inputs — `mask`, `normal`, `grating`, `albedo` — so
there is one shader path. Orientation (a device-motion quaternion, or drag / idle
auto-orbit on a simulator) becomes the per-frame view + light vectors.

A scene is described once as a small, serializable JSON document (the same schema
on every platform) and handed to the engine; bindings do no per-field marshaling.
`HologramCanvas` props (web) are identical to `HologramView` props (React Native).

The engine presents **directly to a GPU surface** — a WebGPU `<canvas>` on the
web, a `CAMetalLayer` on iOS — so frames never round-trip through the CPU.

## Features

- **Shapes** — `rect` (rounded), `circle`, `ellipse`, arbitrary **polygons**, or a
  **PNG/SVG** used either as artwork (`image`) or as a silhouette mask filled by a
  preset (`mask`). Every silhouette gets an embossed **edge bevel**, so the rim
  catches light like real foil even on thin features.
- **Presets** — `linear`, `radial`, `concentric`, `guilloche`, `dotMatrix`,
  `rosette`, `lattice`, and `rainbow`, each with tunable frequency/angle.
- **Color** — physical `spectrum`, six built-in foils (gold, silver, rainbowFoil,
  emerald, sapphire, copper), or a custom palette.
- **Layout** — place the shape as a single sized/positioned copy
  (`Layout.single`), or **repeat** it across the view as a grid (`Layout.tile`).
  The pattern and color stay **global** — they sweep the whole layout as one
  surface, not per tile.
- **Motion glare** — a diffraction-grating light reflection that sweeps across the
  surface as the device tilts; strength is tunable (`glare`; `0` disables).
- **Kinegram multiplex** — stack multiple layers, each its own shape/preset/color,
  and the view **temporally cross-fades** between them by tilt direction.
- **Transparent by default** — overlay the hologram on any content.
- **Motion** — real device sensors, or pan-gesture + idle auto-orbit; each toggle
  is configurable.

## Web (WebGPU)

Requires Chrome ≥ 113, Edge ≥ 113, or Safari 18+. Firefox needs
`dom.webgpu.enabled` in `about:config`. iOS Safari 18+ works with
motion-permission UI handled automatically.

```sh
npm install @hologramism/browser
```

```tsx
import { HologramCanvas, Preset, Layout } from '@hologramism/browser';

// Gold guilloché on a transparent background.
<HologramCanvas style={{ width: 300, height: 190 }} preset="guilloche" color="gold" />

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

See [`@hologramism/browser`](bindings/browser) for the full API.

## React Native

```sh
npm install @hologramism/react-native
```

The React Native package (autolinked) is the thin Swift/ObjC bridge. The GPU
engine ships separately as a prebuilt `Hologramism.xcframework`, hosted on GitHub
Releases. Add one line to your `ios/Podfile` pointing at the matching release, so
CocoaPods resolves the bridge's `Hologramism` dependency:

```ruby
pod 'Hologramism', :podspec =>
  'https://github.com/alexdonh/hologramism/releases/download/v0.1.0/Hologramism.podspec'
```

```sh
cd ios && pod install
```

```tsx
import { HologramView, Preset, Layout } from '@hologramism/react-native';

// Simple: a gold guilloché card, transparent so it overlays anything.
<HologramView style={{ width: 300, height: 190 }} preset="guilloche" color="gold" />

// Image as artwork, or as a preset-filled silhouette (the mask gets a beveled rim):
<HologramView shape={{ type: 'png', uri, mode: 'image' }} />
<HologramView shape={{ type: 'png', uri, mode: 'mask' }} preset="dotMatrix" />

// Kinegram: cross-fades gold↔sapphire as you tilt.
<HologramView
  layers={[
    { preset: Preset.linear({ angle: 0 }), color: 'gold', azimuth: 0 },
    { preset: 'rosette', color: 'sapphire', azimuth: 90 },
  ]}
  tilt={{ motion: true, gesture: true, autoOrbit: true }}
/>
```

See [`@hologramism/react-native`](bindings/react-native) for the full API.

## Props

Identical for `HologramCanvas` (web) and `HologramView` (React Native).

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

Angles and azimuths are in **degrees**.

## Examples

Runnable demos live in [`examples/`](examples):

- [`examples/browser`](examples/browser) — React + Vite WebGPU demo
- [`examples/react-native`](examples/react-native) — React Native iOS demo

```sh
cd examples/browser && npm install && npm run dev
```

The browser demo is published live at
**[alexdonh.github.io/hologramism](https://alexdonh.github.io/hologramism/)**.

## Status

- ✅ Web (WebGPU) — `@hologramism/browser` + React + Vite demo
- ✅ React Native iOS — `@hologramism/react-native` (verified on device, incl. motion sensors)
- ✅ Direct GPU presentation — WebGPU `<canvas>` (web) and `CAMetalLayer` (iOS),
  with CPU read-back as an automatic fallback
- ⏳ Planned: Android, Flutter

## License

MIT — see [LICENSE](LICENSE).
