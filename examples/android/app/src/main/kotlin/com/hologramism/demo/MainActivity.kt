// Native Android demo for Hologramism; the same control set as the
// React Native and Flutter examples (mode, shape, layout, color/pattern or
// kinegram layers, glare, overlay, auto-orbit) driving the shared engine
// through the `io.github.alexdonh:hologramism` AAR.

package com.hologramism.demo

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Bundle
import android.util.Base64
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import io.github.alexdonh.hologramism.HologramColor
import io.github.alexdonh.hologramism.HologramLayer
import io.github.alexdonh.hologramism.HologramScene
import io.github.alexdonh.hologramism.HologramShape
import io.github.alexdonh.hologramism.HologramView
import io.github.alexdonh.hologramism.ImageMode
import io.github.alexdonh.hologramism.Layout
import io.github.alexdonh.hologramism.LayoutFit
import io.github.alexdonh.hologramism.Preset
import io.github.alexdonh.hologramism.Shape
import io.github.alexdonh.hologramism.Sparkle
import io.github.alexdonh.hologramism.Tilt
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.URL
import kotlin.math.cos
import kotlin.math.sin

private val COLORS: List<Pair<String, HologramColor>> = listOf(
    "spectrum" to HologramColor.spectrum,
    "gold" to HologramColor.gold,
    "silver" to HologramColor.silver,
    "rainbowFoil" to HologramColor.rainbowFoil,
    "emerald" to HologramColor.emerald,
    "sapphire" to HologramColor.sapphire,
    "copper" to HologramColor.copper,
    // Bare RGBA palette = custom.
    "custom" to HologramColor.palette(listOf(listOf(255.0, 0.0, 128.0, 255.0), listOf(0.0, 220.0, 255.0, 255.0))),
)

private val PRESETS: List<Pair<String, () -> io.github.alexdonh.hologramism.HologramPreset>> = listOf(
    "guilloche" to { Preset.guilloche() },
    "concentric" to { Preset.concentric() },
    "radial" to { Preset.radial() },
    "linear" to { Preset.linear() },
    "dotMatrix" to { Preset.dotMatrix() },
    "rosette" to { Preset.rosette() },
    "lattice" to { Preset.lattice() },
    "rainbow" to { Preset.rainbow() },
)

// Strength of the motion-driven light sweep (0 = off).
private val GLARES: List<Pair<String, Double>> = listOf(
    "off" to 0.0, "soft" to 0.6, "normal" to 1.0, "strong" to 1.6,
)

// Placement: one shape, or the shape tiled across the view. Pattern + color
// stay global in every case.
private val LAYOUTS: List<Pair<String, io.github.alexdonh.hologramism.HologramLayout?>> = listOf(
    "single" to null,
    "tile 4×4" to Layout.tile(size = 0.22, gap = 0.03),
    "tile 7×7" to Layout.tile(size = 0.13, gap = 0.02),
    "tile + gap" to Layout.tile(size = 0.16, gap = 0.12),
    "tile fill" to Layout.tile(size = 0.2, gap = 0.06, fit = LayoutFit.FILL),
    "corner" to Layout.single(size = 0.4, position = listOf(0.22, 0.78)),
)

// 5-point star polygon, points normalized 0..1.
private val STAR: List<List<Double>> = (0 until 10).map { i ->
    val r = if (i % 2 == 0) 0.5 else 0.21
    val a = Math.PI / 5 * i - Math.PI / 2
    listOf(0.5 + r * cos(a), 0.5 + r * sin(a))
}

private enum class ShapeName(val label: String) {
    RECT("rect"), CIRCLE("circle"), ELLIPSE("ellipse"), STAR("star"),
    IMAGE("bird"), MASKED("bird·masked"),
}

private class Layer(var presetIdx: Int, var colorIdx: Int)

private const val MAX_LAYERS = 4

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { DemoScreen() }
    }
}

@Composable
private fun DemoScreen() {
    val context = LocalContext.current
    // Bird PNG, as base64, used by the image / masked shapes.
    val birdBase64 = remember {
        runCatching {
            Base64.encodeToString(context.assets.open("bird.png").readBytes(), Base64.NO_WRAP)
        }.getOrNull()
    }

    var multiplex by remember { mutableStateOf(false) }
    var shapeName by remember { mutableStateOf(ShapeName.RECT) }
    var layoutIdx by remember { mutableStateOf(0) }
    var colorIdx by remember { mutableStateOf(0) }
    var presetIdx by remember { mutableStateOf(0) }
    val layers = remember { mutableStateListOf(Layer(3, 1), Layer(5, 5), Layer(1, 4)) }
    var overlay by remember { mutableStateOf(false) }
    var autoOrbit by remember { mutableStateOf(true) }
    var glare by remember { mutableStateOf(1.0) }

    fun shapeValue(): HologramShape = when (shapeName) {
        ShapeName.RECT -> Shape.rect(cornerRadius = 0.18)
        ShapeName.CIRCLE -> Shape.circle()
        ShapeName.ELLIPSE -> Shape.ellipse()
        ShapeName.STAR -> Shape.polygon(STAR)
        ShapeName.IMAGE -> Shape.png(base64 = birdBase64, mode = ImageMode.IMAGE)
        ShapeName.MASKED -> Shape.png(base64 = birdBase64, mode = ImageMode.MASK)
    }

    // Compose the scene from the current mode.
    val scene: HologramScene = run {
        val shape = shapeValue()
        val layout = LAYOUTS[layoutIdx].second
        if (multiplex) {
            val n = layers.size
            HologramScene(
                layers = layers.mapIndexed { i, l ->
                    HologramLayer(
                        shape = shape,
                        preset = PRESETS[l.presetIdx].second(),
                        color = COLORS[l.colorIdx].second,
                        layout = layout,
                        azimuth = (360.0 / n) * i,
                    )
                },
                intensity = 0.95,
                grating = 6.0,
                iridescence = 0.65,
                sparkle = Sparkle.Config(density = 0.35, intensity = 0.5),
                glare = glare,
            )
        } else {
            HologramScene(
                shape = shape,
                preset = PRESETS[presetIdx].second(),
                color = COLORS[colorIdx].second,
                layout = layout,
                intensity = 0.95,
                grating = 6.0,
                iridescence = 0.65,
                sparkle = Sparkle.Config(density = 0.35, intensity = 0.5),
                glare = glare,
            )
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0A0A0F))
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            "Hologramism",
            color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.W800,
            modifier = Modifier.padding(top = 16.dp),
        )
        Text(
            "Drag the card to tilt it, or watch it auto-orbit.",
            color = Color(0xFF8A8A9A), fontSize = 13.sp, textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 4.dp, bottom = 16.dp),
        )
        PreviewCard(scene = scene, autoOrbit = autoOrbit, overlay = overlay)

        Section("Mode") {
            Chip("single", !multiplex) { multiplex = false }
            Chip("multiplex (kinegram)", multiplex) { multiplex = true }
        }
        Section("Shape") {
            ShapeName.values().forEach { s -> Chip(s.label, shapeName == s) { shapeName = s } }
        }
        Section("Layout (placement / repeat)") {
            LAYOUTS.forEachIndexed { i, l -> Chip(l.first, layoutIdx == i) { layoutIdx = i } }
        }

        if (multiplex) {
            layers.forEachIndexed { i, layer ->
                LayerCard(
                    index = i,
                    layer = layer,
                    onChange = { layers[i] = it },
                    onRemove = if (layers.size > 1) ({ layers.removeAt(i) }) else null,
                )
            }
            if (layers.size < MAX_LAYERS) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 14.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color(0xFF13131C))
                        .clickable { layers.add(Layer(3, 0)) }
                        .padding(vertical = 12.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text("+ Add layer", color = Color(0xFF8A8AFF), fontSize = 14.sp)
                }
            }
        } else {
            Section("Color") {
                COLORS.forEachIndexed { i, c -> Chip(c.first, colorIdx == i) { colorIdx = i } }
            }
            Section("Pattern") {
                PRESETS.forEachIndexed { i, p -> Chip(p.first, presetIdx == i) { presetIdx = i } }
            }
        }

        Section("Glare (light sweep)") {
            GLARES.forEach { g -> Chip(g.first, glare == g.second) { glare = g.second } }
        }
        Section("Overlay on photo (picsum)") {
            Chip("off", !overlay) { overlay = false }
            Chip("on", overlay) { overlay = true }
        }
        Section("Auto-orbit") {
            Chip("off", !autoOrbit) { autoOrbit = false }
            Chip("on", autoOrbit) { autoOrbit = true }
        }
        Spacer(Modifier.height(20.dp))
    }
}

@Composable
private fun PreviewCard(scene: HologramScene, autoOrbit: Boolean, overlay: Boolean) {
    Box(
        modifier = Modifier
            .width(300.dp)
            .height(190.dp)
            .padding(bottom = 0.dp)
            .clip(RoundedCornerShape(18.dp))
            .background(Color(0xFF0A0A0F)),
    ) {
        if (overlay) {
            val bitmap by produceState<Bitmap?>(initialValue = null) {
                value = withContext(Dispatchers.IO) {
                    runCatching {
                        URL("https://picsum.photos/seed/holo/600/380").openStream().use {
                            BitmapFactory.decodeStream(it)
                        }
                    }.getOrNull()
                }
            }
            bitmap?.let {
                Image(
                    bitmap = it.asImageBitmap(),
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            }
        }
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx -> HologramView(ctx) },
            update = { view ->
                // Auto-orbit only runs when no live orientation source wins; turning
                // it on disables the motion sensor so the orbit is visible (e.g. on an
                // emulator whose virtual sensor would otherwise pin the view). Drag
                // still works either way.
                view.setTilt(Tilt(motion = !autoOrbit, autoOrbit = autoOrbit))
                view.setScene(scene)
            },
        )
    }
    Spacer(Modifier.height(22.dp))
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Section(title: String, content: @Composable () -> Unit) {
    Column(modifier = Modifier.fillMaxWidth().padding(bottom = 14.dp)) {
        Text(
            title.uppercase(),
            color = Color(0xFFB8B8C8), fontSize = 12.sp, letterSpacing = 1.sp,
            modifier = Modifier.padding(bottom = 8.dp),
        )
        FlowRow { content() }
    }
}

// Compact pattern + color picker for one multiplex layer.
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun LayerCard(index: Int, layer: Layer, onChange: (Layer) -> Unit, onRemove: (() -> Unit)?) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0xFF13131C))
            .padding(12.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text("Layer ${index + 1}", color = Color.White, fontWeight = FontWeight.W700, fontSize = 14.sp)
            if (onRemove != null) {
                Text(
                    "✕", color = Color(0xFF7A7A8A), fontSize = 15.sp, fontWeight = FontWeight.W700,
                    modifier = Modifier.clickable { onRemove() },
                )
            }
        }
        Text(
            "PATTERN", color = Color(0xFF6A6A7A), fontSize = 11.sp, letterSpacing = 1.sp,
            modifier = Modifier.padding(top = 6.dp, bottom = 6.dp),
        )
        FlowRow {
            PRESETS.forEachIndexed { p, pr ->
                Chip(pr.first, layer.presetIdx == p) { onChange(Layer(p, layer.colorIdx)) }
            }
        }
        Text(
            "COLOR", color = Color(0xFF6A6A7A), fontSize = 11.sp, letterSpacing = 1.sp,
            modifier = Modifier.padding(top = 6.dp, bottom = 6.dp),
        )
        FlowRow {
            COLORS.forEachIndexed { c, col ->
                Chip(col.first, layer.colorIdx == c) { onChange(Layer(layer.presetIdx, c)) }
            }
        }
    }
}

@Composable
private fun Chip(label: String, active: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .padding(end = 8.dp, bottom = 8.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(if (active) Color(0xFF4A4AFF) else Color(0xFF1C1C26))
            .clickable { onClick() }
            .padding(horizontal = 14.dp, vertical = 8.dp),
    ) {
        Text(
            label,
            color = if (active) Color.White else Color(0xFF9A9AAA),
            fontSize = 13.sp,
            fontWeight = if (active) FontWeight.W700 else FontWeight.Normal,
        )
    }
}
