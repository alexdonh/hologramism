# Hologramism

A cross-platform animated **security-hologram** renderer. It gives you the shiny,
color-shifting "3D laser" foil look (DOVIDs / Kinegrams) that reacts live to
device motion, as if you were tilting a physical holographic card.

One GPU engine (Rust + [wgpu](https://wgpu.rs)), one WGSL shader set, and thin
per-platform bindings. **Native iOS, native Android, React Native (iOS + Android),
Flutter (iOS + Android), and Web (WebGPU/wasm) all ship from the same core.**

**▶ [Live demo](https://alexdonh.github.io/hologramism/):** tilt your device (or
drag) to see the foil shift. Works best in a WebGPU browser (see [Web](#web-webgpu)).

| Package | Platform | Registry |
| --- | --- | --- |
| [`@hologramism/browser`](https://www.npmjs.com/package/@hologramism/browser) | Web (WebGPU/wasm) | npm |
| [`@hologramism/react-native`](https://www.npmjs.com/package/@hologramism/react-native) | React Native (iOS + Android) | npm |
| [`hologramism`](https://pub.dev/packages/hologramism) | Flutter (iOS + Android) | pub.dev |
| `HologramismKit` | iOS (Swift / SwiftUI + UIKit) | SPM + CocoaPods |
| `io.github.alexdonh:hologramism` | Android (Kotlin / Compose) | Maven Central |

## How it works

The hologram is a single fragment-shader effect driven by device orientation:

- **diffraction-grating color**, a rainbow sweep as you tilt
- **thin-film iridescence**, an oily color-shift
- **emboss relief + sparkle**, the metallic 3D-laser pop

Every content source (a basic shape, polygon, PNG, SVG, or built-in DOVID preset)
is reduced to the same four GPU inputs (`mask`, `normal`, `grating`, `albedo`), so
there is one shader path. Orientation (a device-motion quaternion, or drag / idle
auto-orbit on a simulator) becomes the per-frame view and light vectors.

A scene is described once as a small, serializable JSON document (the same schema
on every platform) and handed to the engine; bindings do no per-field marshaling.
The same props work across every binding.

The engine presents **directly to a GPU surface**: a WebGPU `<canvas>` on the
web, a `CAMetalLayer` on iOS, and an `ANativeWindow` (from a `TextureView`) on
Android, so frames never round-trip through the CPU.

The GPU surface renders at the view's native resolution (device-pixel scale
capped at 2×). The CPU read-back fallback is capped to roughly 640px on its
longest side, softer but cheap, since it copies every pixel each frame. Both are
automatic; there is nothing to configure.

## Features

- **Shapes.** Use `rect` (rounded), `circle`, `ellipse`, arbitrary **polygons**, or
  a **PNG/SVG** as either artwork (`image`) or a silhouette mask filled by a
  preset (`mask`). Every silhouette gets an embossed **edge bevel**, so the rim
  catches light like real foil even on thin features.
- **Presets.** `linear`, `radial`, `concentric`, `guilloche`, `dotMatrix`,
  `rosette`, `lattice`, and `rainbow`, each with tunable frequency and angle.
- **Color.** Physical `spectrum`, six built-in foils (gold, silver, rainbowFoil,
  emerald, sapphire, copper), or a custom palette.
- **Layout.** Place the shape as a single sized/positioned copy
  (`Layout.single`), or **repeat** it across the view as a grid (`Layout.tile`).
  The pattern and color stay **global**: they sweep the whole layout as one
  surface, not per tile.
- **Motion glare.** A diffraction-grating light reflection that sweeps across the
  surface as the device tilts; strength is tunable (`glare`; `0` disables it).
- **Kinegram multiplex.** Stack multiple layers, each with its own
  shape/preset/color, and the view **temporally cross-fades** between them by tilt
  direction.
- **Transparent by default.** Overlay the hologram on any content.
- **Motion.** Real device sensors, or pan-gesture plus idle auto-orbit; each
  toggle is configurable.

## Web (WebGPU)

Requires Chrome ≥ 113, Edge ≥ 113, or Safari 18+. Firefox needs
`dom.webgpu.enabled` in `about:config`. iOS Safari 18+ works too, and the
motion-permission prompt is handled for you.

```sh
npm install @hologramism/browser
```

```tsx
import { HologramCanvas, Preset, Layout } from '@hologramism/browser';

// Gold guilloché on a transparent background.
<HologramCanvas style={{ width: 300, height: 190 }} preset="guilloche" color="gold" />

// Tile the shape into a grid; the rainbow sweeps the whole grid as one surface.
<HologramCanvas shape="circle" preset="rainbow" layout={Layout.tile({ size: 0.22, gap: 0.03 })} />

// Kinegram: cross-fades gold to sapphire on tilt.
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

The React Native package (autolinked) is the thin native bridge. On **iOS** the
GPU engine ships separately as the prebuilt `HologramismKit` pod, hosted on GitHub
Releases. Add one line to your `ios/Podfile` pointing at the matching release, so
CocoaPods resolves the bridge's `HologramismKit` dependency:

```ruby
pod 'HologramismKit', :podspec =>
  'https://github.com/alexdonh/hologramism/releases/download/v1.0.0/HologramismKit.podspec'
```

```sh
cd ios && pod install
```

On **Android** the package autolinks. The native engine ships as the
`io.github.alexdonh:hologramism` AAR on **Maven Central**, so just keep
`mavenCentral()` in your app's repositories; no credentials or other setup is
needed. The same `HologramView` props work on both platforms.

```tsx
import { HologramView, Preset, Layout } from '@hologramism/react-native';

// Simple: a gold guilloché card, transparent so it overlays anything.
<HologramView style={{ width: 300, height: 190 }} preset="guilloche" color="gold" />

// Image as artwork, or as a preset-filled silhouette (the mask gets a beveled rim):
<HologramView shape={{ type: 'png', uri, mode: 'image' }} />
<HologramView shape={{ type: 'png', uri, mode: 'mask' }} preset="dotMatrix" />

// Kinegram: cross-fades gold to sapphire as you tilt.
<HologramView
  layers={[
    { preset: Preset.linear({ angle: 0 }), color: 'gold', azimuth: 0 },
    { preset: 'rosette', color: 'sapphire', azimuth: 90 },
  ]}
  tilt={{ motion: true, gesture: true, autoOrbit: true }}
/>
```

See [`@hologramism/react-native`](bindings/react-native) for the full API.

## Native iOS, Android, and Flutter

The same scene schema drives the native bindings too:

- **iOS.** `HologramismKit` is a Swift Package *and* a CocoaPod. It bundles the
  engine plus a typed Swift/SwiftUI (`Hologram`) and UIKit (`HologramView`) API.
  Add `https://github.com/alexdonh/hologramism` via SPM and depend on
  `HologramismKit`.
- **Android.** The `io.github.alexdonh:hologramism` AAR on Maven Central bundles
  the engine plus a Kotlin API and a `TextureView`-based `HologramView` (works in
  Views and Compose). `implementation("io.github.alexdonh:hologramism:1.0.0")`.
- **Flutter.** `flutter pub add hologramism`. The `HologramView` widget mirrors
  the same props. iOS pulls the engine via the `HologramismKit` pod, and Android
  via the AAR.

See [`bindings/`](bindings) for each binding and [`examples/`](examples) for demos.

## Props

Identical across every binding.

| Prop | Type | Notes |
| --- | --- | --- |
| `shape` | `'rect' \| 'circle' \| 'ellipse'` or `{ type, ... }` | `polygon` (normalized points), `png`/`svg` (`uri` \| `base64` \| `svg`, `mode: 'image' \| 'mask'`) |
| `preset` | `'linear' \| ...` or `{ type, angle?, freq? }` | `Preset.*(...)` helpers return the config object |
| `color` | `'spectrum' \| 'gold' \| ...` or `RGBA[]` | a bare `[r,g,b,a]` list is a custom palette |
| `layout` | `'single' \| 'tile'` or `{ type, ... }` | `Layout.single({ size?, position? })` places one shape; `Layout.tile({ size?, gap?, fit? })` repeats it as a grid. `size`/`gap` are fractions of the view; `fit: 'cover' \| 'fill'`. Pattern + color stay global |
| `layers` | `Layer \| Layer[]` | each layer takes `shape`/`preset`/`color`/`azimuth` (deg)/`layout`; array = multiplex |
| `background` | `string` (hex) or `RGBA` | transparent by default; set a hex string or `[r,g,b,a]` to make it opaque |
| `tilt` | `{ motion?, gesture?, autoOrbit? }` | orientation sources (all default true) |
| `glare` | `number` | strength of the motion-driven light reflection; `0` disables it |
| `sparkle` | `true \| false \| { density?, intensity? }` | glint control, global; `true`/`false` enable/disable with defaults, an object overrides `density` (count) / `intensity` (brightness) |
| `intensity` | `number` | blend between flat artwork and full holographic shimmer (`0` to `1`) |
| `grating` | `number` | diffraction line density; higher means finer color bands |
| `iridescence` | `number` | thin-film color-shift strength |
| `sharpness` | `number` | specular / glare hotspot tightness (higher is tighter) |

Angles and azimuths are in **degrees**.

## Examples

Runnable demos live in [`examples/`](examples):

- [`examples/browser`](examples/browser): React + Vite WebGPU demo
- [`examples/react-native`](examples/react-native): React Native (iOS + Android) demo
- [`examples/ios`](examples/ios): SwiftUI demo app
- [`examples/android`](examples/android): Jetpack Compose demo app
- [`examples/flutter`](examples/flutter): Flutter demo app

```sh
cd examples/browser && npm install && npm run dev
```

The browser demo is published live at
**[alexdonh.github.io/hologramism](https://alexdonh.github.io/hologramism/)**.

## Status

- ✅ Web (WebGPU): `@hologramism/browser` plus a React + Vite demo
- ✅ React Native (iOS + Android): `@hologramism/react-native` (verified on device, including motion sensors)
- ✅ Native iOS: `HologramismKit` Swift Package + CocoaPod (Swift/SwiftUI + UIKit) plus a demo
- ✅ Native Android: `io.github.alexdonh:hologramism` AAR (Kotlin + TextureView) plus a Compose demo
- ✅ Flutter (iOS + Android): `hologramism` plugin plus a demo
- ✅ Direct GPU presentation: WebGPU `<canvas>` (web), `CAMetalLayer` (iOS), and
  `ANativeWindow` (Android), with CPU read-back as an automatic fallback

## License

MIT. See [LICENSE](LICENSE).
