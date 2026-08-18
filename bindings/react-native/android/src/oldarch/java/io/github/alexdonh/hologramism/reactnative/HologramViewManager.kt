package io.github.alexdonh.hologramism.reactnative

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import io.github.alexdonh.hologramism.HologramView

/**
 * The old-architecture (Paper) shell. Its twin in src/newarch implements the
 * codegen-generated interface instead; all the work is in
 * [HologramViewManagerImpl], so the two cannot drift.
 *
 * The prop names must match src/HologramViewNativeComponent.ts by hand here --
 * there is no codegen on this path to check them.
 */
@ReactModule(name = HologramViewManagerImpl.NAME)
class HologramViewManager : SimpleViewManager<HologramView>() {

    override fun getName(): String = HologramViewManagerImpl.NAME

    override fun createViewInstance(context: ThemedReactContext): HologramView =
        HologramViewManagerImpl.createViewInstance(context)

    @ReactProp(name = "scene")
    fun setScene(view: HologramView, value: String?) =
        HologramViewManagerImpl.setScene(view, value)

    @ReactProp(name = "tilt")
    fun setTilt(view: HologramView, value: String?) =
        HologramViewManagerImpl.setTilt(view, value)
}
