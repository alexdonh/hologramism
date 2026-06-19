# Hologramism — native Android demo

A small Jetpack Compose app showing several `HologramView` configs (guilloché,
tiled rainbow, kinegram, concentric).

It builds the native binding from source via Gradle composite build
(`includeBuild ../../bindings/android`) — no publish step needed for local dev.

## Run

```sh
# 1. Build the Rust engine .so for both ABIs (and stage the header):
scripts/build_android.sh        # from the repo root

# 2. Open examples/android in Android Studio and Run, or:
cd examples/android && ./gradlew :app:installDebug
```

Use a physical device or an arm64 emulator image for the GPU path. On an
emulator without a working Vulkan/GL surface the view automatically falls back to
CPU read-back, so it still renders. Tilt the device (rotation-vector sensor) or
drag to sweep the hologram; it idle-auto-orbits otherwise.
