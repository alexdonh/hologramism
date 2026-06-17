# Hologramism

Cross-platform animated **security-hologram** renderer — the shiny, color-shifting
"3D laser" foil look (DOVIDs / Kinegrams) that reacts live to device motion, as if
you were tilting a physical holographic card.

One GPU engine (Rust + [wgpu](https://wgpu.rs)), one WGSL shader set, thin
per-platform bindings. **React Native (iOS) and Web (WebGPU/wasm) ship today**;
iOS/Android native and Flutter bindings are planned from the same core.

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

The engine presents **directly to a GPU surface** — a WebGPU `<canvas>` on the
web, a `CAMetalLayer` on iOS — so frames never round-trip through the CPU. A CPU
read-back path remains for headless/golden-image use and as an automatic fallback
when surface attach is unavailable.

## Features

- **Shapes** — `rect` (rounded), `circle`, `ellipse`, arbitrary **polygons**, or a
  **PNG/SVG** used either as artwork (`image`) or as a silhouette mask filled by a
  preset (`mask`). Every silhouette — analytic or PNG/SVG alpha — gets an embossed
  **edge bevel** (a chamfer distance transform recovers it for raster masks), so
  the rim catches light like real foil even on thin features.
- **Presets** — `linear`, `radial`, `concentric`, `guilloche`, `dotMatrix`,
  `rosette`, `lattice`, and `rainbow`, each with tunable frequency/angle.
- **Color** — physical `spectrum`, six built-in foils (gold, silver, rainbowFoil,
  emerald, sapphire, copper), or a custom palette.
- **Layout** — place the shape as a single sized/positioned copy
  (`Layout.single`), or **repeat** it across the view as a grid (`Layout.tile`,
  with `size`/`gap`/`fit`). The pattern and color stay **global** — they sweep the
  whole layout as one surface, not per tile. Works for shapes, image masks, and
  artwork.
- **Motion glare** — a diffraction-grating light reflection that sweeps across the
  surface as the device tilts; strength is tunable (`glare`; `0` disables).
- **Kinegram multiplex** — stack multiple layers, each its own shape/preset/color,
  and the view **temporally cross-fades** between them by tilt direction (smooth,
  grain-free flip).
- **Transparent by default** — overlay the hologram on any content; an alpha mask
  shows what's behind it.
- **Motion** — real device sensors, or pan-gesture + idle auto-orbit; each toggle
  is configurable.

## Web (WebGPU)

Requires Chrome ≥ 113, Edge ≥ 113, or Safari 18+ (Technology Preview). Firefox
needs `dom.webgpu.enabled` in `about:config`. iOS Safari 18+ works with
motion-permission UI handled automatically.

```sh
# Build the wasm module once (or after any Rust change):
./scripts/build_wasm.sh

# Start the demo:
cd examples/browser && npm install && npm run dev
# → http://localhost:5173
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

The same scene JSON schema is used by all bindings — `HologramCanvas` props
are identical to `HologramView` props in React Native.


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

// Benton "3D rainbow" — a spectral gradient that slides across any shape on tilt.
<HologramView shape="circle" preset="rainbow" />

// Layout: tile the shape into a grid (one rainbow sweeps the whole grid), or
// place a single shape off-center. `size`/`gap` are fractions of the view.
<HologramView shape="circle" preset="rainbow" layout={Layout.tile({ size: 0.22, gap: 0.03 })} />
<HologramView shape="star" layout={Layout.single({ size: 0.4, position: [0.2, 0.8] })} />

// Kinegram: cross-fades gold↔sapphire as you tilt.
<HologramView
  layers={[
    { preset: Preset.linear({ angle: 0 }), color: 'gold', azimuth: 0 },
    { preset: 'rosette', color: 'sapphire', azimuth: 90 },
  ]}
  tilt={{ motion: true, gesture: true, autoOrbit: true }}
/>
```

### Props

| Prop | Type | Notes |
| --- | --- | --- |
| `shape` | `'rect' \| 'circle' \| 'ellipse'` or `{ type, … }` | `polygon` (normalized points), `png`/`svg` (`uri` \| `base64` \| `svg`, `mode: 'image' \| 'mask'`) |
| `preset` | `'linear' \| …` or `{ type, angle?, freq? }` | `Preset.*(…)` helpers return the config object |
| `color` | `'spectrum' \| 'gold' \| …` or `RGBA[]` | a bare `[r,g,b,a]` list is a custom palette |
| `layout` | `'single' \| 'tile'` or `{ type, … }` | `Layout.single({ size?, position? })` places one shape; `Layout.tile({ size?, gap?, fit? })` repeats it as a grid. `size`/`gap` are fractions of the view; `fit: 'cover' \| 'fill'`. Pattern + color stay global |
| `layers` | `Layer \| Layer[]` | each layer takes `shape`/`preset`/`color`/`azimuth` (deg)/`layout`; array = multiplex |
| `background` | `string` (hex) or `RGBA` | transparent by default; set a hex string or `[r,g,b,a]` to make it opaque |
| `tilt` | `{ motion?, gesture?, autoOrbit? }` | orientation sources (all default true) |
| `glare` | `number` | strength of the motion-driven light reflection that sweeps as the device tilts; `0` disables |
| look | `intensity`, `gratingFrequency`, `iridescence`, `sparkleDensity`, `sparkleIntensity`, `highlightSharpness` | flat, global (applies to the whole scene) |

Angles and azimuths are in **degrees**.

## Layout

```
crates/
  core/      hlg-core     render engine: wgpu device, frame loop, channels, uniforms
  shaders/   hlg-shaders  WGSL shader (grating + iridescence + sparkle + blend)
  assets/    hlg-assets   shape/polygon/preset/PNG/SVG -> the four GPU maps
  ffi/       hlg-ffi      C ABI (cbindgen) + JSON scene schema + shared EngineHost
  wasm/      hlg-wasm     WebGPU/wasm binding (wasm-bindgen)
bindings/
  react-native/            @hologramism/react-native npm package (iOS)
  browser/                 @hologramism/browser npm package (WebGPU)
scripts/
  build_ios_xcframework.sh
  build_wasm.sh            wasm-pack → bindings/browser/pkg/
examples/
  react-native/            React Native demo app
  browser/                 React + Vite demo (mirrors RN demo)
```

## Build

```sh
cargo build            # whole workspace (native)
cargo test             # asset, golden-image, and C-ABI tests
cargo run -p hlg-core --example preview   # desktop preview (writes PNGs)

# iOS: rebuild the vendored XCFramework after any Rust change
scripts/build_ios_xcframework.sh

# Web: build wasm module then run the demo
scripts/build_wasm.sh
cd examples/browser && npm install && npm run dev
```

## Status

- ✅ Rust core + WGSL shader, headless render, golden tests
- ✅ C ABI (`hlg-ffi`) with a single JSON scene API + image-asset upload
- ✅ React Native iOS binding + demo (verified on device, incl. motion sensors)
- ✅ Web (WebGPU) binding — `hlg-wasm` + `@hologramism/browser` + React + Vite demo
- ✅ Direct GPU presentation — WebGPU `<canvas>` surface (web) and `CAMetalLayer`
  surface (iOS), with CPU read-back as an automatic fallback
- ⏳ Planned: Android, Flutter

## License

MIT — see [LICENSE](LICENSE).
