package io.github.alexdonh.hologramism.flutter

import android.content.Context
import android.view.View
import io.github.alexdonh.hologramism.HologramView
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.StandardMessageCodec
import io.flutter.plugin.platform.PlatformView
import io.flutter.plugin.platform.PlatformViewFactory

/**
 * Builds [HologramPlatformView]s for the `hologramism/HologramView` view type,
 * decoding scene/tilt from the StandardMessageCodec creation params.
 */
class HologramViewFactory(
    private val messenger: BinaryMessenger,
) : PlatformViewFactory(StandardMessageCodec.INSTANCE) {

    override fun create(context: Context, viewId: Int, args: Any?): PlatformView =
        HologramPlatformView(context, viewId, args, messenger)
}

/**
 * Wraps the shared [HologramView]. `AndroidView` sets creation params once, so a
 * per-view method channel (`hologramism/HologramView/<id>`) carries later
 * scene/tilt updates when the Dart widget rebuilds.
 */
private class HologramPlatformView(
    context: Context,
    viewId: Int,
    args: Any?,
    messenger: BinaryMessenger,
) : PlatformView {

    private val hologram = HologramView(context)
    private val channel = MethodChannel(messenger, "hologramism/HologramView/$viewId")

    init {
        apply(args)
        channel.setMethodCallHandler { call, result ->
            when (call.method) {
                "setScene" -> {
                    (call.arguments as? Map<String, Any?>)?.let { hologram.setScene(it) }
                    result.success(null)
                }
                "setTilt" -> {
                    (call.arguments as? Map<String, Any?>)?.let { hologram.setTilt(it) }
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun apply(args: Any?) {
        val params = args as? Map<String, Any?> ?: return
        (params["tilt"] as? Map<String, Any?>)?.let { hologram.setTilt(it) }
        (params["scene"] as? Map<String, Any?>)?.let { hologram.setScene(it) }
    }

    override fun getView(): View = hologram

    override fun dispose() {}
}
