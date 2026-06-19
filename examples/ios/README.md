# Hologramism — native iOS (SwiftUI) demo

A SwiftUI app mirroring the React Native demo ([examples/react-native](../react-native)):
the same mode / shape / layout / color / pattern / kinegram / glare / auto-orbit
controls, driving the shared `HologramismKit` Swift package.

The project references the package **locally** (root `Package.swift`) via a
`XCLocalSwiftPackageReference` (`relativePath = ../..`), and that package's
`.binaryTarget` points at `dist/ios/HologramismFFI.xcframework`.

## Run

```sh
# 1. Build the engine xcframework once (and after any Rust change):
scripts/build_ios_xcframework.sh

# 2. Open and run on a simulator (Xcode 16+):
open examples/ios/HologramismDemo.xcodeproj
#   select the HologramismDemo scheme + an iOS Simulator, then Run.
```

Or from the CLI:

```sh
xcodebuild -project examples/ios/HologramismDemo.xcodeproj \
  -scheme HologramismDemo \
  -destination 'platform=iOS Simulator,name=iPhone 15' build
```

The simulator has no motion sensors, so the card tilts via pan + idle auto-orbit
(toggle **Auto-orbit**); on a device it follows CoreMotion.
