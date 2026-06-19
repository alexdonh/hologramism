# Hologramism — React Native (iOS) demo

The reference demo app for `@hologramism/react-native` — the mode / shape /
layout / color / pattern / kinegram / glare / auto-orbit controls that the
[native iOS](../ios), [Flutter](../flutter), and [browser](../browser) examples
all mirror. The screen lives in [App.tsx](App.tsx).

iOS only (the React Native binding is iOS-only for now).

## Run

```sh
# 1. Build the engine xcframework once (and after any Rust change):
scripts/build_ios_xcframework.sh

# 2. Install JS deps (resolves @hologramism/react-native from ../../bindings):
cd examples/react-native
npm install

# 3. Point CocoaPods at the locally built engine pod. In ios/Podfile, uncomment:
#      pod 'HologramismKit', :path => '../../../dist/ios'
#    (Published apps instead use the release podspec — see bindings/react-native/README.md.)
cd ios && bundle install && bundle exec pod install && cd ..

# 4. Run on a simulator (starts Metro automatically):
npm run ios
```

The simulator has no motion sensors, so the card tilts via pan + idle auto-orbit
(toggle **Auto-orbit**); on a device it follows CoreMotion.
