package io.github.alexdonh.hologramism.reactnative

import com.facebook.react.bridge.ReadableMap
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import io.github.alexdonh.hologramism.HologramView

/**
 * Paper (classic-architecture) view manager exposing the shared native
 * [HologramView] to React Native. Content is one serializable `scene` map (the
 * canonical scene schema); `tilt` groups the orientation/interaction toggles.
 */
class HologramViewManager : SimpleViewManager<HologramView>() {

    override fun getName(): String = "HologramView"

    override fun createViewInstance(context: ThemedReactContext): HologramView =
        HologramView(context)

    @ReactProp(name = "scene")
    fun setScene(view: HologramView, scene: ReadableMap?) {
        scene?.let { view.setScene(it.toHashMap()) }
    }

    @ReactProp(name = "tilt")
    fun setTilt(view: HologramView, tilt: ReadableMap?) {
        tilt?.let { view.setTilt(it.toHashMap()) }
    }
}
