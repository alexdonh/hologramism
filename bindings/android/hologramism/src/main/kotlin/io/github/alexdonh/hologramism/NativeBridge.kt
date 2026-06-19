package io.github.alexdonh.hologramism

import android.view.Surface

/**
 * JNI surface over the Rust C ABI (`hlg-ffi`). One-to-one with the `extern "C"`
 * functions in `crates/ffi/src/lib.rs`; the native methods live in
 * `src/main/cpp/hlg_jni.c`. Engine handles are opaque `long` pointers.
 *
 * Internal — app code uses [HologramView]. Lifecycle:
 * `create -> setAsset* -> setScene -> per-frame setOrientation/setTime +
 * renderSurface|renderRgba -> destroy`.
 */
internal object NativeBridge {
    init {
        // The shim (libhologramism.so) links the engine (libhlg_ffi.so); load the
        // engine first so its symbols are resolved on every device/loader.
        System.loadLibrary("hlg_ffi")
        System.loadLibrary("hologramism")
    }

    external fun nativeCreate(width: Int, height: Int): Long
    external fun nativeDestroy(engine: Long)

    external fun nativeSetScene(engine: Long, json: ByteArray): Boolean
    external fun nativeSetAsset(engine: Long, id: Int, kind: Int, data: ByteArray): Boolean

    external fun nativeSetOrientation(engine: Long, x: Float, y: Float, z: Float, w: Float)
    external fun nativeSetTime(engine: Long, t: Float)

    /** Returns the retained `ANativeWindow*` (pass to [nativeDetachSurface]), or 0 on failure. */
    external fun nativeAttachSurface(engine: Long, surface: Surface): Long
    external fun nativeDetachSurface(engine: Long, window: Long)

    external fun nativeRenderSurface(engine: Long): Boolean
    external fun nativeRenderRgba(engine: Long, out: ByteArray): Int

    /** Reconfigure the GPU surface to a full-resolution pixel size (engine buffer stays capped). */
    external fun nativeResizeSurface(engine: Long, width: Int, height: Int): Boolean
}
