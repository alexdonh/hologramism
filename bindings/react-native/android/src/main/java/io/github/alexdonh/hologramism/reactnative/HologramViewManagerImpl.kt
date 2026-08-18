package io.github.alexdonh.hologramism.reactnative

import com.facebook.react.uimanager.ThemedReactContext
import io.github.alexdonh.hologramism.HologramView
import org.json.JSONArray
import org.json.JSONObject

/**
 * Everything the view manager actually does. The two architecture shells
 * (src/newarch and src/oldarch) are thin wrappers over this, so the props they
 * expose cannot drift.
 *
 * Both props arrive as JSON strings rather than `ReadableMap`s: the scene schema
 * is a recursive union that the new architecture's codegen cannot type, and the
 * engine parses JSON anyway. See src/HologramViewNativeComponent.ts.
 */
object HologramViewManagerImpl {

    const val NAME = "HologramView"

    fun createViewInstance(context: ThemedReactContext): HologramView = HologramView(context)

    fun setScene(view: HologramView, json: String?) {
        parse(json)?.let { view.setScene(it) }
    }

    fun setTilt(view: HologramView, json: String?) {
        parse(json)?.let { view.setTilt(it) }
    }

    private fun parse(json: String?): Map<String, Any?>? {
        if (json.isNullOrEmpty()) return null
        return try {
            toMap(JSONObject(json))
        } catch (t: Throwable) {
            android.util.Log.e(NAME, "bad scene JSON: ${t.message}")
            null
        }
    }

    // org.json -> plain collections, which is what HologramView.setScene takes.
    private fun toMap(o: JSONObject): Map<String, Any?> =
        o.keys().asSequence().associateWith { unwrap(o.get(it)) }

    private fun toList(a: JSONArray): List<Any?> =
        (0 until a.length()).map { unwrap(a.get(it)) }

    private fun unwrap(v: Any?): Any? = when (v) {
        JSONObject.NULL -> null
        is JSONObject -> toMap(v)
        is JSONArray -> toList(v)
        else -> v
    }
}
