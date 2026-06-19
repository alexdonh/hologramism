// JNI shim bridging io.github.alexdonh.hologramism.NativeBridge (Kotlin) to the cbindgen C ABI
// (hlg.h). The only Android-specific work here is turning a java Surface into
// the ANativeWindow* the engine attaches as its GPU presentation surface.

#include <jni.h>
#include <android/native_window.h>
#include <android/native_window_jni.h>
#include <android/log.h>
#include <sys/system_properties.h>
#include <stdlib.h>
#include <string.h>

#include "hlg.h"

#define LOG_TAG "Hologramism"
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)

static inline HlgEngine *as_engine(jlong ptr) { return (HlgEngine *)(intptr_t)ptr; }

static bool prop_truthy(const char *name) {
    char val[PROP_VALUE_MAX] = {0};
    if (__system_property_get(name, val) <= 0) return false;
    return val[0] == '1' || strcmp(val, "ranchu") == 0 || strcmp(val, "goldfish") == 0;
}

// Android emulators ship a gfxstream Vulkan driver (vulkan.ranchu.so) that
// crashes inside vkQueueSubmit under wgpu's workload. The GLES backend goes
// through ANGLE/SwiftShader instead and is stable, so pin WGPU_BACKEND=gl on
// emulators. Read by crates/core's GPU bootstrap. Skipped on real devices
// (Vulkan preferred) and never overrides an explicit env value.
JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *reserved) {
    (void)reserved;
    if (getenv("WGPU_BACKEND") == NULL &&
        (prop_truthy("ro.kernel.qemu") || prop_truthy("ro.boot.qemu") ||
         prop_truthy("ro.hardware.gralloc"))) {
        setenv("WGPU_BACKEND", "gl", 1);
        LOGI("emulator detected; pinning WGPU_BACKEND=gl");
    }
    return JNI_VERSION_1_6;
}

JNIEXPORT jlong JNICALL
Java_io_github_alexdonh_hologramism_NativeBridge_nativeCreate(JNIEnv *env, jobject thiz, jint w, jint h) {
    (void)env; (void)thiz;
    // Seed defaults; real look/content arrives via the scene JSON
    // (hlg_set_scene).
    HlgConfig cfg = {
        .width = (uint32_t)(w > 0 ? w : 1),
        .height = (uint32_t)(h > 0 ? h : 1),
        .intensity = 0.9f,
        .grating_frequency = 8.0f,
        .iridescence_strength = 0.6f,
        .sparkle_density = 0.3f,
        .sparkle_intensity = 0.8f,
        .highlight_sharpness = 32.0f,
        .background = {0.0f, 0.0f, 0.0f, 0.0f},
    };
    HlgEngine *e = hlg_create(&cfg);
    if (e == NULL) {
        const char *err = hlg_last_error();
        LOGE("hlg_create failed: %s", err ? err : "unknown");
    }
    return (jlong)(intptr_t)e;
}

JNIEXPORT void JNICALL
Java_io_github_alexdonh_hologramism_NativeBridge_nativeDestroy(JNIEnv *env, jobject thiz, jlong ptr) {
    (void)env; (void)thiz;
    hlg_destroy(as_engine(ptr));
}

JNIEXPORT jboolean JNICALL
Java_io_github_alexdonh_hologramism_NativeBridge_nativeSetScene(JNIEnv *env, jobject thiz, jlong ptr, jbyteArray json) {
    (void)thiz;
    if (json == NULL) return JNI_FALSE;
    jsize len = (*env)->GetArrayLength(env, json);
    jbyte *bytes = (*env)->GetByteArrayElements(env, json, NULL);
    bool ok = hlg_set_scene(as_engine(ptr), (const uint8_t *)bytes, (size_t)len);
    (*env)->ReleaseByteArrayElements(env, json, bytes, JNI_ABORT);
    if (!ok) {
        const char *err = hlg_last_error();
        LOGE("hlg_set_scene failed: %s", err ? err : "unknown");
    }
    return ok ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT jboolean JNICALL
Java_io_github_alexdonh_hologramism_NativeBridge_nativeSetAsset(JNIEnv *env, jobject thiz, jlong ptr, jint id, jint kind, jbyteArray data) {
    (void)thiz;
    if (data == NULL) return JNI_FALSE;
    jsize len = (*env)->GetArrayLength(env, data);
    jbyte *bytes = (*env)->GetByteArrayElements(env, data, NULL);
    bool ok = hlg_set_asset(as_engine(ptr), (uint32_t)id, (uint32_t)kind, (const uint8_t *)bytes, (size_t)len);
    (*env)->ReleaseByteArrayElements(env, data, bytes, JNI_ABORT);
    return ok ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT void JNICALL
Java_io_github_alexdonh_hologramism_NativeBridge_nativeSetOrientation(JNIEnv *env, jobject thiz, jlong ptr, jfloat x, jfloat y, jfloat z, jfloat w) {
    (void)env; (void)thiz;
    hlg_set_orientation(as_engine(ptr), x, y, z, w);
}

JNIEXPORT void JNICALL
Java_io_github_alexdonh_hologramism_NativeBridge_nativeSetTime(JNIEnv *env, jobject thiz, jlong ptr, jfloat t) {
    (void)env; (void)thiz;
    hlg_set_time(as_engine(ptr), t);
}

// Acquires an ANativeWindow from the Surface (adds a ref kept for the lifetime
// of the attachment), attaches it as the GPU surface, and returns the window
// pointer so Kotlin can hand it back to nativeDetachSurface for release. Returns
// 0 on failure.
JNIEXPORT jlong JNICALL
Java_io_github_alexdonh_hologramism_NativeBridge_nativeAttachSurface(JNIEnv *env, jobject thiz, jlong ptr, jobject surface) {
    (void)thiz;
    if (surface == NULL) return 0;
    ANativeWindow *win = ANativeWindow_fromSurface(env, surface);
    if (win == NULL) {
        LOGE("ANativeWindow_fromSurface returned null");
        return 0;
    }
    bool ok = hlg_attach_surface(as_engine(ptr), (void *)win);
    if (!ok) {
        const char *err = hlg_last_error();
        LOGE("hlg_attach_surface failed: %s", err ? err : "unknown");
        ANativeWindow_release(win);
        return 0;
    }
    return (jlong)(intptr_t)win;
}

JNIEXPORT void JNICALL
Java_io_github_alexdonh_hologramism_NativeBridge_nativeDetachSurface(JNIEnv *env, jobject thiz, jlong ptr, jlong window) {
    (void)env; (void)thiz;
    hlg_detach_surface(as_engine(ptr));
    if (window != 0) {
        ANativeWindow_release((ANativeWindow *)(intptr_t)window);
    }
}

JNIEXPORT jboolean JNICALL
Java_io_github_alexdonh_hologramism_NativeBridge_nativeRenderSurface(JNIEnv *env, jobject thiz, jlong ptr) {
    (void)env; (void)thiz;
    return hlg_render(as_engine(ptr)) ? JNI_TRUE : JNI_FALSE;
}

// Reconfigure the GPU presentation surface to a new pixel size (full container
// resolution), independent of the engine's capped readback buffer.
JNIEXPORT jboolean JNICALL
Java_io_github_alexdonh_hologramism_NativeBridge_nativeResizeSurface(JNIEnv *env, jobject thiz, jlong ptr, jint w, jint h) {
    (void)env; (void)thiz;
    return hlg_resize_surface(as_engine(ptr), (uint32_t)(w > 0 ? w : 1), (uint32_t)(h > 0 ? h : 1)) ? JNI_TRUE : JNI_FALSE;
}

// CPU readback fallback: fills `out` (width*height*4 bytes) and returns the byte
// count written, or 0 on failure.
JNIEXPORT jint JNICALL
Java_io_github_alexdonh_hologramism_NativeBridge_nativeRenderRgba(JNIEnv *env, jobject thiz, jlong ptr, jbyteArray out) {
    (void)thiz;
    if (out == NULL) return 0;
    jsize len = (*env)->GetArrayLength(env, out);
    jbyte *buf = (*env)->GetByteArrayElements(env, out, NULL);
    size_t written = hlg_render_rgba(as_engine(ptr), (uint8_t *)buf, (size_t)len);
    (*env)->ReleaseByteArrayElements(env, out, buf, 0); // commit back to java.
    return (jint)written;
}
