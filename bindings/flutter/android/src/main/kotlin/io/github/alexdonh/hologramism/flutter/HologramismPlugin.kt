package io.github.alexdonh.hologramism.flutter

import io.flutter.embedding.engine.plugins.FlutterPlugin

/** Registers the native platform view that backs the Dart `HologramView` widget. */
class HologramismPlugin : FlutterPlugin {
    override fun onAttachedToEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        binding.platformViewRegistry.registerViewFactory(
            "hologramism/HologramView",
            HologramViewFactory(binding.binaryMessenger),
        )
    }

    override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {}
}
