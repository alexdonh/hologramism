package io.github.alexdonh.hologramism.reactnative

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.HologramViewManagerDelegate
import com.facebook.react.viewmanagers.HologramViewManagerInterface
import io.github.alexdonh.hologramism.HologramView

/**
 * The new-architecture (Fabric) shell. `HologramViewManagerInterface` and the
 * delegate are generated from src/HologramViewNativeComponent.ts by React
 * Native's codegen, so these signatures cannot drift from the TypeScript
 * without failing to compile.
 *
 * Its twin in src/oldarch does the same job with `@ReactProp`. All the work is
 * in [HologramViewManagerImpl].
 */
@ReactModule(name = HologramViewManagerImpl.NAME)
class HologramViewManager :
    SimpleViewManager<HologramView>(), HologramViewManagerInterface<HologramView> {

    private val delegate = HologramViewManagerDelegate(this)

    override fun getDelegate(): ViewManagerDelegate<HologramView> = delegate

    override fun getName(): String = HologramViewManagerImpl.NAME

    override fun createViewInstance(context: ThemedReactContext): HologramView =
        HologramViewManagerImpl.createViewInstance(context)

    override fun setScene(view: HologramView?, value: String?) {
        view?.let { HologramViewManagerImpl.setScene(it, value) }
    }

    override fun setTilt(view: HologramView?, value: String?) {
        view?.let { HologramViewManagerImpl.setTilt(it, value) }
    }
}
