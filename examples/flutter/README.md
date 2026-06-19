# Hologramism — Flutter (iOS) demo

A Flutter app with mode / shape / layout / color / pattern / kinegram / glare /
auto-orbit controls, driving the shared engine through the `hologramism` plugin.

The app sources (`lib/main.dart`, `pubspec.yaml`, `assets/`) are committed; the
generated iOS runner is not (it's regenerable, like the RN example's `Pods/`).

## Run

```sh
# 1. Build the engine xcframework once (and after any Rust change):
scripts/build_ios_xcframework.sh

# 2. Generate the iOS runner for this app (first time only):
cd examples/flutter
flutter create --platforms=ios --project-name hologramism_example .

# 3. Point the runner's Podfile at the locally built engine pod, then run.
#    Add this inside `target 'Runner' do` in examples/flutter/ios/Podfile:
#
#      pod 'HologramismKit', :path => '../../../dist/ios'
#
#    (Published apps instead use the release podspec — see bindings/flutter/README.md.)
flutter pub get
flutter run            # select an iOS simulator
```

The simulator has no motion sensors, so the card tilts via pan + idle auto-orbit
(toggle **Auto-orbit**); on a device it follows CoreMotion. Hot-reload a different
preset/color to see the per-view method channel push the update.
