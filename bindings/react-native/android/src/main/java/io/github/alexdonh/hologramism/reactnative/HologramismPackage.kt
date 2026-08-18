package io.github.alexdonh.hologramism.reactnative

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * Registers the view manager; discovered by RN autolinking.
 *
 * `HologramViewManager` resolves to whichever shell the active source set
 * provides (src/newarch or src/oldarch), so this file is architecture-agnostic.
 */
class HologramismPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        emptyList()

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        listOf(HologramViewManager())
}
