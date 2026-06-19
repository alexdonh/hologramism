# hologramism (Flutter / iOS + Android)

Flutter binding for the [Hologramism](https://github.com/alexdonh/hologramism)
animated security-hologram renderer. Renders a native GPU surface — a
`CAMetalLayer` on iOS (the `HologramismKit` Swift package) and an
`ANativeWindow` / `TextureView` on Android (the `io.github.alexdonh:hologramism`
AAR). Rust + wgpu under both.

## Install

```sh
flutter pub add hologramism
```

### iOS

The native GPU engine ships separately as the prebuilt `HologramismKit` pod,
hosted on GitHub Releases (not on CocoaPods trunk). Add one line to your app's
`ios/Podfile` pointing at the matching release, then `pod install`:

```ruby
pod 'HologramismKit', :podspec =>
  'https://github.com/alexdonh/hologramism/releases/download/v0.1.0/HologramismKit.podspec'
```

### Android

The native engine ships as the `io.github.alexdonh:hologramism` AAR on **Maven
Central** (the plugin pins the matching version). Just ensure `mavenCentral()` is
in your app's repositories — no credentials needed.

`minSdk 24`. No other setup — the platform view is registered by the plugin.

## Usage

```dart
import 'package:hologramism/hologramism.dart';

// Gold guilloché, transparent so it overlays anything.
SizedBox(
  width: 300, height: 190,
  child: HologramView(preset: Preset.guilloche(), color: HologramColor.gold),
);

// Tile a circle into a grid; the rainbow sweeps the whole grid as one surface.
HologramView(
  shape: HologramShape.circle(),
  preset: Preset.rainbow(),
  layout: Layout.tile(size: 0.22, gap: 0.03),
);

// Kinegram: cross-fades gold ↔ sapphire on tilt.
HologramView(
  layers: [
    HologramLayer(preset: Preset.linear(angle: 0), color: HologramColor.gold, azimuth: 0),
    HologramLayer(preset: Preset.rosette(), color: HologramColor.sapphire, azimuth: 90),
  ],
  tilt: const Tilt(motion: true, gesture: true, autoOrbit: true),
);
```

Angles and azimuths are in **degrees**. The widget props mirror the same
canonical scene schema used by every Hologramism binding — see the
[top-level README](../../README.md) for the full feature list.
