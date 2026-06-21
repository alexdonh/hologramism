# Hologramism React Native demo

The reference demo app for `@hologramism/react-native`. It has the mode / shape /
layout / color / pattern / kinegram / glare / auto-orbit controls that the
[native iOS](../ios), [Flutter](../flutter), and [browser](../browser) examples
all mirror. The screen lives in [App.tsx](App.tsx).

The binding runs on iOS and Android. The steps below cover iOS; for Android, see
[Android](#android) at the end.

## Run (iOS)

```sh
# 1. Build the engine xcframework once (and after any Rust change):
scripts/build_ios_xcframework.sh

# 2. Install JS deps (resolves @hologramism/react-native from ../../bindings):
cd examples/react-native
npm install

# 3. Point CocoaPods at the locally built engine pod. In ios/Podfile, uncomment:
#      pod 'HologramismKit', :path => '../../../dist/ios'
#    (Published apps instead use the release podspec; see bindings/react-native/README.md.)
cd ios && bundle install && bundle exec pod install && cd ..

# 4. Run on a simulator (starts Metro automatically):
npm run ios
```

The simulator has no motion sensors, so the card tilts via pan + idle auto-orbit
(toggle **Auto-orbit**); on a device it follows CoreMotion.

## Android

The native engine resolves from Maven Central and the bridge autolinks, so there
is no pod step. Just install JS deps and run:

```sh
cd examples/react-native
npm install
npm run android   # starts Metro automatically
```

Use a physical device or an arm64 emulator for the GPU path; otherwise the view
falls back to CPU read-back. Tilt (rotation-vector sensor) or drag to sweep the
hologram; it idle-auto-orbits otherwise.
