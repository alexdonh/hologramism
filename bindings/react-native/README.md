# @hologramism/react-native

A motion-reactive **security-hologram** (DOVID / Kinegram) view for React Native:
color-shifting foil that tilts with the device, GPU-rendered with Rust + wgpu.
Supports shapes, PNG/SVG sources, multi-layer kinegram flip, and transparent
overlay, on both iOS and Android.

Same scene schema as [`@hologramism/browser`](https://www.npmjs.com/package/@hologramism/browser):
`HologramView` props match `HologramCanvas` props one-for-one.

**▶ [Live web demo](https://alexdonh.github.io/hologramism/):** the same engine and
scene schema, running in the browser. Tilt or drag to see the foil shift.

## Install

```sh
npm install @hologramism/react-native
```

This package (autolinked) is the thin native bridge; the GPU engine ships
separately per platform.

### iOS

The engine ships as the prebuilt `HologramismKit` pod, hosted on GitHub Releases.
Add one line to your `ios/Podfile` pointing at the matching release, so CocoaPods
resolves the bridge's `HologramismKit` dependency:

```ruby
pod 'HologramismKit', :podspec =>
  'https://github.com/alexdonh/hologramism/releases/download/v1.0.0/HologramismKit.podspec'
```

```sh
cd ios && pod install
```

Use the release tag that matches your installed package version.

### Android

The engine ships as the `io.github.alexdonh:hologramism` AAR on **Maven Central**.
Make sure `mavenCentral()` is in your app's repositories; no credentials needed.

`minSdk 24`. The bridge autolinks, so there's no other setup.

## Usage

```tsx
import { HologramView, Preset, Layout } from '@hologramism/react-native';

// Simple: a gold guilloché card, transparent so it overlays anything.
<HologramView style={{ width: 300, height: 190 }} preset="guilloche" color="gold" />

// Image as artwork, or as a preset-filled silhouette (the mask gets a beveled rim).
<HologramView shape={{ type: 'png', uri, mode: 'image' }} />
<HologramView shape={{ type: 'png', uri, mode: 'mask' }} preset="dotMatrix" />

// Benton "3D rainbow": a spectral gradient that slides across any shape on tilt.
<HologramView shape="circle" preset="rainbow" />

// Layout: tile the shape into a grid (one rainbow sweeps the whole grid), or
// place a single shape off-center. `size`/`gap` are fractions of the view.
<HologramView shape="circle" preset="rainbow" layout={Layout.tile({ size: 0.22, gap: 0.03 })} />
<HologramView shape="star" layout={Layout.single({ size: 0.4, position: [0.2, 0.8] })} />

// Kinegram: cross-fades gold to sapphire as you tilt.
<HologramView
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
| `shape` | `'rect' \| 'circle' \| 'ellipse'` or `{ type, ... }` | `polygon` (normalized points), `png`/`svg` (`uri` \| `base64` \| `svg`, `mode: 'image' \| 'mask'`) |
| `preset` | `'linear' \| ...` or `{ type, angle?, freq? }` | `Preset.*(...)` helpers return the config object |
| `color` | `'spectrum' \| 'gold' \| ...` or `RGBA[]` | a bare `[r,g,b,a]` list is a custom palette |
| `layout` | `'single' \| 'tile'` or `{ type, ... }` | `Layout.single({ size?, position? })` places one shape; `Layout.tile({ size?, gap?, fit? })` repeats it as a grid. `size`/`gap` are fractions of the view; `fit: 'cover' \| 'fill'`. Pattern + color stay global |
| `layers` | `Layer \| Layer[]` | each layer takes `shape`/`preset`/`color`/`azimuth` (deg)/`layout`; array = multiplex |
| `background` | `string` (hex) or `RGBA` | transparent by default; set a hex string or `[r,g,b,a]` to make it opaque |
| `tilt` | `{ motion?, gesture?, autoOrbit? }` | orientation sources (all default true) |
| `glare` | `number` | strength of the motion-driven light reflection; `0` disables |
| `sparkle` | `true \| false \| { density?, intensity? }` | glint control, global; `true`/`false` enable/disable with defaults, an object overrides `density` (count) / `intensity` (brightness) |
| `intensity` | `number` | blend between flat artwork and full holographic shimmer (`0` to `1`) |
| `grating` | `number` | diffraction line density; higher = finer color bands |
| `iridescence` | `number` | thin-film color-shift strength |
| `sharpness` | `number` | specular / glare hotspot tightness (higher = tighter) |

Angles and azimuths are in **degrees**. Presets: `linear`, `radial`,
`concentric`, `guilloche`, `dotMatrix`, `rosette`, `lattice`, `rainbow`. Foils:
`gold`, `silver`, `rainbowFoil`, `emerald`, `sapphire`, `copper`.

## License

MIT. See the [repository](https://github.com/alexdonh/hologramism).
