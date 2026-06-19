# Hologramism (Swift / iOS)

Native iOS binding for the [Hologramism](https://github.com/alexdonh/hologramism)
animated security-hologram renderer. One Swift package bundles the prebuilt Rust
engine (`HologramismFFI.xcframework`) and a typed Swift/SwiftUI API.

This package is the shared iOS core: the `@hologramism/react-native` bridge and
the Flutter plugin both depend on it.

## Install

### Swift Package Manager

In Xcode: **File ▸ Add Package Dependencies…** and enter
`https://github.com/alexdonh/hologramism`, or in a `Package.swift`:

```swift
.package(url: "https://github.com/alexdonh/hologramism", from: "0.1.0")
```

Then add `HologramismKit` to your target's dependencies. `import HologramismKit`.

### CocoaPods

```ruby
pod 'HologramismKit', :podspec =>
  'https://github.com/alexdonh/hologramism/releases/download/v0.1.0/HologramismKit.podspec'
```

## Usage (SwiftUI)

```swift
import SwiftUI
import HologramismKit

struct CardView: View {
  var body: some View {
    // Gold guilloché, transparent so it overlays anything.
    Hologram(scene: HologramScene(preset: Preset.guilloche(), color: .gold))
      .frame(width: 300, height: 190)

    // Tile a circle into a grid; the rainbow sweeps the whole grid as one surface.
    Hologram(scene: HologramScene(shape: .circle, preset: Preset.rainbow(),
                          layout: Layout.tile(size: 0.22, gap: 0.03)))

    // Kinegram: cross-fades gold ↔ sapphire on tilt.
    Hologram(scene: HologramScene(layers: [
      HologramLayer(preset: Preset.linear(angle: 0), color: .gold, azimuth: 0),
      HologramLayer(preset: Preset.rosette(), color: .sapphire, azimuth: 90),
    ]), tilt: Tilt(motion: true, gesture: true, autoOrbit: true))
  }
}
```

## Usage (UIKit)

```swift
import HologramismKit

let view = HologramView()
view.setScene(HologramScene(shape: .circle, preset: Preset.rainbow()))
view.setTilt(["motion": true, "gesture": true, "autoOrbit": true])
```

## API

The typed `HologramScene` model mirrors the same canonical schema used by every
Hologramism binding (`Preset.*`, `Layout.*`, `HologramShape`, `HologramColor`,
`Sparkle`, `HologramLayer`). Look parameters (`intensity`, `grating`,
`iridescence`, `sparkle`, `sharpness`, `glare`) are set directly on
`HologramScene`. Angles and azimuths are in **degrees**. See the
[top-level README](../../README.md) for the full feature list.

## Local development

The SPM `.binaryTarget` points at `dist/ios/HologramismFFI.xcframework` by path
for local builds. Produce it once (and after any Rust change):

```sh
scripts/build_ios_xcframework.sh
```
