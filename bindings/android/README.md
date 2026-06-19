# Hologramism — Android (native)

The shared native Android binding: a `TextureView`-based `HologramView` that owns
the GPU engine, runs a `Choreographer` render loop, drives orientation from the
rotation-vector sensor (or touch-drag + idle auto-orbit), and presents directly
to a GPU surface (CPU read-back fallback). The React Native bridge and the
Flutter plugin both depend on this AAR.

## Architecture

```
bindings/android/
  hologramism/                         the AAR library module (com.hologramism)
    src/main/cpp/                       C JNI shim over the cbindgen C ABI (hlg.h)
      hlg_jni.c, CMakeLists.txt         + Surface -> ANativeWindow conversion
      include/hlg.h                     staged by scripts/build_android.sh
    src/main/jniLibs/<abi>/libhlg_ffi.so  prebuilt Rust engine (cargo-ndk)
    src/main/kotlin/com/hologramism/
      HologramView.kt                   TextureView + render loop + sensors
      Scene.kt                          typed scene schema (Shape/Preset/Layout/…)
      NativeBridge.kt                   JNI declarations
```

The JSON scene schema is identical on every platform.

## Build

```sh
rustup target add aarch64-linux-android armv7-linux-androideabi   # (in rust-toolchain.toml)
cargo install cargo-ndk
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/<version>

scripts/build_android.sh   # builds the .so for both ABIs, stages hlg.h, assembles the AAR
```

ABIs: `arm64-v8a`, `armeabi-v7a`. `minSdk 24` (wgpu Vulkan/GL floor).

## Install (consumers)

Published to **Maven Central** — no repo or credentials needed (just ensure
`mavenCentral()` is in your repositories):

```kotlin
// build.gradle.kts
implementation("io.github.alexdonh:hologramism:<version>")
```

For local development the example app uses `includeBuild` against this module
directly (a Gradle composite build — no publish step needed).

## Usage

```kotlin
import io.github.alexdonh.hologramism.*

val view = HologramView(context)

// Gold guilloché, transparent so it overlays anything.
view.setScene(HologramScene(preset = Preset.guilloche(), color = HologramColor.gold))

// Kinegram: cross-fades gold ↔ sapphire on tilt.
view.setScene(HologramScene(layers = listOf(
    HologramLayer(preset = Preset.linear(angle = 0.0), color = HologramColor.gold, azimuth = 0.0),
    HologramLayer(preset = Preset.rosette(), color = HologramColor.sapphire, azimuth = 90.0),
)))
view.setTilt(Tilt(motion = true, gesture = true, autoOrbit = true))
```

See the demo in [examples/android](../../examples/android).
