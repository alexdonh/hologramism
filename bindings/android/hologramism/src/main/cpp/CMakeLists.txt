cmake_minimum_required(VERSION 3.22.1)
project(hologramism C)

# Prebuilt Rust engine (built by scripts/build_android.sh via cargo-ndk into
# ../jniLibs/<abi>/). Imported per-ABI so the shim can link its C symbols; the
# .so itself is packaged into the AAR by AGP's jniLibs.srcDirs.
add_library(hlg_ffi SHARED IMPORTED)
set_target_properties(hlg_ffi PROPERTIES
    IMPORTED_LOCATION "${CMAKE_CURRENT_SOURCE_DIR}/../jniLibs/${ANDROID_ABI}/libhlg_ffi.so"
    # Rust cdylibs ship without a SONAME; without this CMake embeds the absolute
    # build-machine path as the DT_NEEDED entry, so dlopen fails on-device. This
    # makes the linker record just the basename (libhlg_ffi.so), resolved at
    # runtime from the APK's lib/<abi>/.
    IMPORTED_NO_SONAME TRUE)

# Thin JNI shim: Kotlin <-> the cbindgen C ABI (include/hlg.h, staged by the
# build script), plus Surface -> ANativeWindow conversion.
add_library(hologramism SHARED hlg_jni.c)

target_include_directories(hologramism PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}/include")

find_library(log-lib log)

target_link_libraries(hologramism
    hlg_ffi
    android      # ANativeWindow_fromSurface
    ${log-lib})
