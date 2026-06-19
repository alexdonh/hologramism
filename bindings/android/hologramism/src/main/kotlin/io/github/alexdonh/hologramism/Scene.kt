package io.github.alexdonh.hologramism

// The ergonomic, typed face of the canonical scene schema. Everything resolves
// to the same JSON document the engine parses on every platform, expressed here
// as the nested `Map<String, Any?>` that [HologramView.setScene] consumes.

enum class ImageMode(val raw: String) { MASK("mask"), IMAGE("image") }

enum class LayoutFit(val raw: String) { COVER("cover"), FILL("fill") }

/** A content source. Use the [Shape] factories. */
class HologramShape internal constructor(internal val json: Map<String, Any?>)

object Shape {
    fun rect(cornerRadius: Double? = null) =
        HologramShape(buildMap {
            put("type", "rect"); cornerRadius?.let { put("cornerRadius", it) }
        })

    fun circle() = HologramShape(mapOf("type" to "circle"))
    fun ellipse() = HologramShape(mapOf("type" to "ellipse"))

    /** Closed polygon; points normalized 0..1 of the view box. */
    fun polygon(points: List<List<Double>>, closed: Boolean? = null) =
        HologramShape(buildMap {
            put("type", "polygon"); put("points", points); closed?.let { put("closed", it) }
        })

    fun png(uri: String? = null, base64: String? = null, mode: ImageMode = ImageMode.IMAGE) =
        HologramShape(buildMap {
            put("type", "png"); put("mode", mode.raw)
            uri?.let { put("uri", it) }; base64?.let { put("base64", it) }
        })

    fun svg(uri: String? = null, base64: String? = null, svg: String? = null, mode: ImageMode = ImageMode.IMAGE) =
        HologramShape(buildMap {
            put("type", "svg"); put("mode", mode.raw)
            uri?.let { put("uri", it) }; base64?.let { put("base64", it) }; svg?.let { put("svg", it) }
        })
}

/** A diffraction pattern. Use the [Preset] factories. */
class HologramPreset internal constructor(internal val json: Map<String, Any?>)

object Preset {
    private fun p(type: String, angle: Double?, freq: Double?) =
        HologramPreset(buildMap {
            put("type", type); angle?.let { put("angle", it) }; freq?.let { put("freq", it) }
        })

    fun linear(angle: Double? = null, freq: Double? = null) = p("linear", angle, freq)
    fun radial(freq: Double? = null) = p("radial", null, freq)
    fun concentric(freq: Double? = null) = p("concentric", null, freq)
    fun guilloche(freq: Double? = null) = p("guilloche", null, freq)
    fun dotMatrix(freq: Double? = null) = p("dotMatrix", null, freq)
    fun rosette(freq: Double? = null) = p("rosette", null, freq)
    fun lattice(freq: Double? = null) = p("lattice", null, freq)
    fun rainbow(freq: Double? = null) = p("rainbow", null, freq)
}

class HologramLayout internal constructor(internal val json: Map<String, Any?>)

object Layout {
    fun single(size: List<Double>? = null, position: List<Double>? = null) =
        HologramLayout(buildMap {
            put("type", "single"); size?.let { put("size", it) }; position?.let { put("position", it) }
        })

    /** Convenience: a uniform `size` fraction applied to both axes. */
    fun single(size: Double, position: List<Double>? = null) =
        single(listOf(size, size), position)

    fun tile(size: List<Double>? = null, gap: List<Double>? = null, fit: LayoutFit? = null) =
        HologramLayout(buildMap {
            put("type", "tile")
            size?.let { put("size", it) }; gap?.let { put("gap", it) }; fit?.let { put("fit", it.raw) }
        })

    /** Convenience: uniform `size`/`gap` fractions applied to both axes. */
    fun tile(size: Double, gap: Double, fit: LayoutFit? = null) =
        tile(listOf(size, size), listOf(gap, gap), fit)
}

class HologramColor internal constructor(internal val json: Map<String, Any?>) {
    companion object {
        val spectrum = HologramColor(mapOf("type" to "spectrum"))
        val gold = preset("gold")
        val silver = preset("silver")
        val rainbowFoil = preset("rainbowFoil")
        val emerald = preset("emerald")
        val sapphire = preset("sapphire")
        val copper = preset("copper")

        private fun preset(id: String) = HologramColor(mapOf("type" to "preset", "id" to id))

        /** Custom palette; each entry is `[r, g, b, a]` in 0..255. */
        fun palette(colors: List<List<Double>>) =
            HologramColor(mapOf("type" to "palette", "colors" to colors))
    }
}

/**
 * Glint controls. [On] / [Off] toggle with engine defaults; [Config] overrides
 * `density` (how many glints) and/or `intensity` (how bright), each falling back
 * to its default when null.
 */
sealed class Sparkle {
    object On : Sparkle()
    object Off : Sparkle()
    data class Config(val density: Double? = null, val intensity: Double? = null) : Sparkle()

    /** `true` / `false` toggle, or a `{density, intensity}` map. */
    internal fun toJson(): Any = when (this) {
        On -> true
        Off -> false
        is Config -> buildMap {
            density?.let { put("density", it) }
            intensity?.let { put("intensity", it) }
        }
    }
}

class HologramLayer(
    val shape: HologramShape? = null,
    val preset: HologramPreset? = null,
    val color: HologramColor? = null,
    val layout: HologramLayout? = null,
    /** Tilt direction (degrees) that reveals this layer in a multiplex. */
    val azimuth: Double? = null,
) {
    internal val json: Map<String, Any?>
        get() = buildMap {
            shape?.let { put("shape", it.json) }
            preset?.let { put("preset", it.json) }
            color?.let { put("color", it.json) }
            layout?.let { put("layout", it.json) }
            azimuth?.let { put("azimuth", it) }
        }
}

/**
 * A full hologram scene. Build it and hand it to [HologramView.setScene].
 * Transparent by default; set [background] to make it opaque.
 */
class HologramScene(
    private val layers: List<HologramLayer>,
    private val color: HologramColor? = null,
    private val background: List<Double>? = null,
    // Look parameters, applied globally to the scene.
    private val intensity: Double? = null,
    private val grating: Double? = null,
    private val iridescence: Double? = null,
    private val sparkle: Sparkle? = null,
    private val sharpness: Double? = null,
    private val glare: Double? = null,
) {
    /** Single-layer convenience (the common case). */
    constructor(
        shape: HologramShape? = null,
        preset: HologramPreset? = null,
        color: HologramColor? = null,
        layout: HologramLayout? = null,
        background: List<Double>? = null,
        intensity: Double? = null,
        grating: Double? = null,
        iridescence: Double? = null,
        sparkle: Sparkle? = null,
        sharpness: Double? = null,
        glare: Double? = null,
    ) : this(
        listOf(HologramLayer(shape, preset, color, layout)),
        color, background, intensity, grating, iridescence, sparkle, sharpness, glare,
    )

    /** The canonical scene map, identical to `buildScene` on every platform. */
    fun toMap(): Map<String, Any?> = buildMap {
        put("layers", layers.map { it.json })
        intensity?.let { put("intensity", it) }
        grating?.let { put("grating", it) }
        iridescence?.let { put("iridescence", it) }
        sparkle?.let { put("sparkle", it.toJson()) }
        sharpness?.let { put("sharpness", it) }
        glare?.let { put("glare", it) }
        color?.let { put("color", it.json) }
        put("background", background ?: listOf(0.0, 0.0, 0.0, 0.0))
    }

    companion object {
        /** Parse "#rgb" | "#rrggbb" | "#rrggbbaa" into `[r, g, b, a]` in 0..1. */
        fun parseHex(hex: String): List<Double> {
            var h = hex.removePrefix("#").trim()
            if (h.length == 3) h = h.map { "$it$it" }.joinToString("")
            if (h.length == 6) h += "ff"
            val n = h.toLongOrNull(16) ?: 0L
            return listOf(
                ((n shr 24) and 0xff) / 255.0,
                ((n shr 16) and 0xff) / 255.0,
                ((n shr 8) and 0xff) / 255.0,
                (n and 0xff) / 255.0,
            )
        }
    }
}

/** Orientation / interaction sources (all default on). */
data class Tilt(
    val motion: Boolean = true,
    val gesture: Boolean = true,
    val autoOrbit: Boolean = true,
) {
    internal fun toMap(): Map<String, Any?> =
        mapOf("motion" to motion, "gesture" to gesture, "autoOrbit" to autoOrbit)
}
