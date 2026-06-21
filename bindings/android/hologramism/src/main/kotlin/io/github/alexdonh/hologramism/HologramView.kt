package io.github.alexdonh.hologramism

import android.content.Context
import android.os.Build
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.PorterDuff
import android.graphics.Rect
import android.graphics.SurfaceTexture
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.AttributeSet
import android.util.Log
import android.view.Choreographer
import android.view.MotionEvent
import android.view.Surface
import android.view.TextureView
import org.json.JSONArray
import org.json.JSONObject
import java.net.URL
import java.nio.ByteBuffer
import java.util.concurrent.Executors

/**
 * Native hologram view. Owns an engine handle, runs a [Choreographer] render
 * loop, and drives orientation from the rotation-vector sensor (device) or a
 * touch-drag + idle auto-orbit. Renders to its [TextureView] surface as a GPU
 * presentation surface, falling back to CPU readback + canvas blit if attach
 * fails.
 *
 * Content comes from the **scene** map (the canonical scene schema); this
 * view resolves image assets, serializes to JSON, and calls the engine. The
 * Flutter plugin, the React Native view manager, and Kotlin app code all build
 * that map (see [Scene]).
 */
class HologramView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : TextureView(context, attrs),
    TextureView.SurfaceTextureListener,
    SensorEventListener {

    private companion object {
        const val TAG = "HologramView"
        const val MAX_DIM = 640 // internal (readback) render resolution cap, for perf.
        const val MAX_SCALE = 2f // GPU surface density cap (matches iOS/browser).
    }

    private var engine: Long = 0
    private var surface: Surface? = null
    private var nativeWindow: Long = 0
    private var surfaceAttached = false

    // Internal render size (capped) and CPU-fallback buffer.
    private var rw = 0
    private var rh = 0
    // Full container pixel size; drives the GPU presentation surface (uncapped).
    private var fullW = 0
    private var fullH = 0
    // Last size the GPU surface was configured to; reconfigure only when it
    // changes (configure rebuilds the swapchain + pipeline, not per-frame work).
    private var surfW = 0
    private var surfH = 0
    private var rgba: ByteArray = ByteArray(0)
    private var bitmap: Bitmap? = null

    // Orientation drivers.
    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val rotationSensor: Sensor? = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
    private val latestQuat = FloatArray(4) // [w, x, y, z] from the sensor.
    private var haveSensor = false
    private var panX = 0f
    private var panY = 0f
    private var lastTouchX = 0f
    private var lastTouchY = 0f
    private var lastPanTime = 0L
    private var idlePhase = 0f
    private var lastFrameNanos = 0L

    // Tilt controls (all default on).
    private var motionEnabled = true
    private var gestureEnabled = true
    private var autoOrbit = true

    // Android emulators run the GLES backend (their gfxstream Vulkan driver
    // crashes under wgpu). wgpu-hal's GLES swapchain is Opaque-only and doesn't
    // resize the EGL window, so the GPU surface path renders an off-center,
    // black-backed frame. The CPU readback + Canvas blit path composites with
    // real transparency and fills the view, so prefer it here. Real devices
    // (Vulkan) keep the direct GPU surface.
    private val isEmulator: Boolean by lazy {
        val fp = Build.FINGERPRINT
        fp.startsWith("generic") || fp.startsWith("unknown") || fp.contains("sdk_gphone") ||
            Build.HARDWARE.contains("ranchu") || Build.HARDWARE.contains("goldfish") ||
            Build.PRODUCT.contains("sdk") || Build.MODEL.contains("Emulator")
    }

    // Pending resolved scene, applied on the next tick once the engine exists.
    private val ioExecutor = Executors.newSingleThreadExecutor()
    @Volatile private var pendingSceneJson: ByteArray? = null
    @Volatile private var pendingAssets: List<Triple<Int, Int, ByteArray>> = emptyList()
    @Volatile private var sceneDirty = false

    private val frameCallback = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            tick(frameTimeNanos)
            if (isAvailable) Choreographer.getInstance().postFrameCallback(this)
        }
    }

    init {
        isOpaque = false // transparent / overlay-able by default.
        surfaceTextureListener = this
    }

    // MARK: - Surface lifecycle

    override fun onSurfaceTextureAvailable(st: SurfaceTexture, width: Int, height: Int) {
        surface = Surface(st)
        ensureEngine(width, height)
        startLoop()
    }

    override fun onSurfaceTextureSizeChanged(st: SurfaceTexture, width: Int, height: Int) {
        ensureEngine(width, height)
    }

    override fun onSurfaceTextureDestroyed(st: SurfaceTexture): Boolean {
        stopLoop()
        detachSurface()
        surface?.release()
        surface = null
        // Engine is cheap to keep, but its surface is gone; drop it so a fresh
        // surface re-creates cleanly.
        destroyEngine()
        return true
    }

    override fun onSurfaceTextureUpdated(st: SurfaceTexture) {}

    // MARK: - Engine

    private fun ensureEngine(viewW: Int, viewH: Int) {
        if (viewW < 1 || viewH < 1) return
        // The engine's internal resolution is capped (bounds the per-frame CPU
        // readback in the fallback path). The GPU presentation surface, which has
        // no readback cost, is configured separately to the full container size
        // below, so direct-GPU devices render crisply at native resolution.
        // Cap the density to 2× to match the iOS/browser views (avoids
        // over-rendering on 3×-density screens).
        val density = resources.displayMetrics.density
        if (density > MAX_SCALE) {
            val k = MAX_SCALE / density
            fullW = (viewW * k).toInt().coerceAtLeast(1)
            fullH = (viewH * k).toInt().coerceAtLeast(1)
        } else {
            fullW = viewW; fullH = viewH
        }
        var w = viewW
        var h = viewH
        val longest = maxOf(w, h)
        if (longest > MAX_DIM) {
            val k = MAX_DIM.toFloat() / longest
            w = (w * k).toInt().coerceAtLeast(1)
            h = (h * k).toInt().coerceAtLeast(1)
        }
        if (w == rw && h == rh && engine != 0L) {
            // Capped size unchanged; track the container size on the GPU surface,
            // but only reconfigure when it actually changed.
            if (surfaceAttached && (fullW != surfW || fullH != surfH)) {
                NativeBridge.nativeResizeSurface(engine, fullW, fullH)
                surfW = fullW; surfH = fullH
            }
            return
        }

        destroyEngine()
        rw = w; rh = h
        rgba = ByteArray(rw * rh * 4)
        bitmap = Bitmap.createBitmap(rw, rh, Bitmap.Config.ARGB_8888).apply { setPremultiplied(true) }

        engine = NativeBridge.nativeCreate(rw, rh)
        if (engine == 0L) {
            Log.e(TAG, "nativeCreate failed")
            return
        }

        // Attach the TextureView surface for direct GPU presentation; fall back
        // to CPU readback if it fails. On emulators the GLES surface path is
        // opaque + off-center, so skip attach and use the CPU path directly.
        val s = surface
        if (s != null && !isEmulator) {
            nativeWindow = NativeBridge.nativeAttachSurface(engine, s)
            surfaceAttached = nativeWindow != 0L
            if (surfaceAttached) {
                // Present at full container resolution (engine buffer stays capped).
                NativeBridge.nativeResizeSurface(engine, fullW, fullH)
                surfW = fullW; surfH = fullH
            } else {
                Log.w(TAG, "surface attach failed; using CPU fallback")
            }
        } else if (isEmulator) {
            Log.i(TAG, "emulator: using CPU readback path (GLES surface is opaque)")
        }

        sceneDirty = true // re-apply the current scene to the new engine.
    }

    private fun detachSurface() {
        if (engine != 0L && (surfaceAttached || nativeWindow != 0L)) {
            NativeBridge.nativeDetachSurface(engine, nativeWindow)
        }
        nativeWindow = 0
        surfaceAttached = false
        surfW = 0; surfH = 0
    }

    private fun destroyEngine() {
        if (engine != 0L) {
            detachSurface()
            NativeBridge.nativeDestroy(engine)
            engine = 0
        }
        rw = 0; rh = 0
    }

    private fun applyScene() {
        val e = engine
        val json = pendingSceneJson
        if (e == 0L || json == null) return
        for ((id, kind, bytes) in pendingAssets) {
            NativeBridge.nativeSetAsset(e, id, kind, bytes)
        }
        if (!NativeBridge.nativeSetScene(e, json)) Log.e(TAG, "nativeSetScene failed")
        sceneDirty = false
    }

    // MARK: - Render loop

    private fun startLoop() {
        attachSensor()
        lastFrameNanos = 0L
        Choreographer.getInstance().postFrameCallback(frameCallback)
    }

    private fun stopLoop() {
        Choreographer.getInstance().removeFrameCallback(frameCallback)
        sensorManager.unregisterListener(this)
    }

    private fun tick(frameTimeNanos: Long) {
        val e = engine
        if (e == 0L) return
        if (sceneDirty) applyScene()

        val dt = if (lastFrameNanos == 0L) 0f else (frameTimeNanos - lastFrameNanos) / 1_000_000_000f
        lastFrameNanos = frameTimeNanos
        idlePhase += dt

        val q = currentOrientation()
        NativeBridge.nativeSetOrientation(e, q[0], q[1], q[2], q[3])
        NativeBridge.nativeSetTime(e, idlePhase)

        if (surfaceAttached) {
            if (!NativeBridge.nativeRenderSurface(e)) Log.e(TAG, "nativeRenderSurface failed")
            return
        }
        renderCpuFallback(e)
    }

    /** CPU readback + canvas blit (surface attach failed or unavailable). */
    private fun renderCpuFallback(e: Long) {
        val written = NativeBridge.nativeRenderRgba(e, rgba)
        if (written == 0) {
            Log.e(TAG, "nativeRenderRgba failed")
            return
        }
        val bmp = bitmap ?: return
        bmp.copyPixelsFromBuffer(ByteBuffer.wrap(rgba))
        val s = surface ?: return
        if (!s.isValid) return
        val canvas: Canvas = try {
            s.lockCanvas(null)
        } catch (t: Throwable) {
            Log.e(TAG, "lockCanvas failed: ${t.message}")
            return
        }
        try {
            canvas.drawColor(Color.TRANSPARENT, PorterDuff.Mode.CLEAR)
            canvas.drawBitmap(bmp, Rect(0, 0, rw, rh), Rect(0, 0, width, height), null)
        } finally {
            s.unlockCanvasAndPost(canvas)
        }
    }

    /** Fuse the available orientation source into a quaternion `[x, y, z, w]`. */
    private fun currentOrientation(): FloatArray {
        if (motionEnabled && haveSensor) {
            // sensor quat is [w, x, y, z]; engine wants (x, y, z, w).
            return floatArrayOf(latestQuat[1], latestQuat[2], latestQuat[3], latestQuat[0])
        }
        val recentPan = System.nanoTime() - lastPanTime < 2_000_000_000L
        val orbit = if (autoOrbit) (if (recentPan) 0.15f else 1.0f) else 0.0f
        val basePanX = if (gestureEnabled) panX else 0f
        val basePanY = if (gestureEnabled) panY else 0f
        val ax = basePanY + Math.sin((idlePhase * 0.6f).toDouble()).toFloat() * 0.25f * orbit
        val ay = basePanX + Math.cos((idlePhase * 0.5f).toDouble()).toFloat() * 0.25f * orbit
        return normalize(quatMul(axisAngle(0f, 1f, 0f, ay), axisAngle(1f, 0f, 0f, ax)))
    }

    // Quaternion helpers, all in (x, y, z, w) order to match hlg_set_orientation.
    private fun axisAngle(x: Float, y: Float, z: Float, angle: Float): FloatArray {
        val half = angle * 0.5f
        val s = Math.sin(half.toDouble()).toFloat()
        return floatArrayOf(x * s, y * s, z * s, Math.cos(half.toDouble()).toFloat())
    }

    private fun quatMul(a: FloatArray, b: FloatArray): FloatArray = floatArrayOf(
        a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
        a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
        a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
        a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
    )

    private fun normalize(q: FloatArray): FloatArray {
        val n = Math.sqrt((q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]).toDouble()).toFloat()
        if (n == 0f) return floatArrayOf(0f, 0f, 0f, 1f)
        return floatArrayOf(q[0] / n, q[1] / n, q[2] / n, q[3] / n)
    }

    // MARK: - Sensor

    private fun attachSensor() {
        if (motionEnabled && rotationSensor != null) {
            sensorManager.registerListener(this, rotationSensor, SensorManager.SENSOR_DELAY_GAME)
        } else {
            sensorManager.unregisterListener(this)
            haveSensor = false
        }
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type != Sensor.TYPE_ROTATION_VECTOR) return
        SensorManager.getQuaternionFromVector(latestQuat, event.values) // -> [w, x, y, z]
        haveSensor = true
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    // MARK: - Gesture

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (!gestureEnabled) return super.onTouchEvent(event)
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                lastTouchX = event.x; lastTouchY = event.y
                return true
            }
            MotionEvent.ACTION_MOVE -> {
                val k = 0.004f
                panX = (event.x - lastTouchX) * k
                panY = (event.y - lastTouchY) * k
                lastPanTime = System.nanoTime()
                return true
            }
        }
        return super.onTouchEvent(event)
    }

    // MARK: - Props (set by the view manager / platform-view factory / app code)

    /** Apply a typed [HologramScene]. */
    fun setScene(scene: HologramScene) = setScene(scene.toMap())

    /** Apply a scene map (the canonical schema). Resolves image assets first. */
    fun setScene(scene: Map<String, Any?>) {
        ioExecutor.execute { resolveScene(scene) }
    }

    fun setTilt(tilt: Tilt) {
        motionEnabled = tilt.motion
        gestureEnabled = tilt.gesture
        autoOrbit = tilt.autoOrbit
        if (isAvailable) attachSensor()
    }

    fun setTilt(map: Map<String, Any?>) {
        setTilt(
            Tilt(
                motion = (map["motion"] as? Boolean) ?: true,
                gesture = (map["gesture"] as? Boolean) ?: true,
                autoOrbit = (map["autoOrbit"] as? Boolean) ?: true,
            )
        )
    }

    // MARK: - Scene resolution (off the main thread; handles image fetches)

    /**
     * Walk the scene, resolve every png/svg shape to uploaded asset bytes, strip
     * the inline source, and stash the cleaned JSON + assets for the next tick.
     */
    private fun resolveScene(scene: Map<String, Any?>) {
        @Suppress("UNCHECKED_CAST")
        val layers = (scene["layers"] as? List<Map<String, Any?>>) ?: emptyList()
        val assets = ArrayList<Triple<Int, Int, ByteArray>>()
        val outLayers = ArrayList<Map<String, Any?>>(layers.size)
        var nextId = 0

        for (layer in layers) {
            val mutableLayer = HashMap(layer)
            @Suppress("UNCHECKED_CAST")
            val shape = (layer["shape"] as? Map<String, Any?>)
            val type = shape?.get("type") as? String
            if (shape != null && (type == "png" || type == "svg")) {
                val kind = if (type == "svg") 1 else 0
                val bytes = resolveImageBytes(shape, kind)
                val newShape = HashMap(shape)
                newShape.remove("uri"); newShape.remove("base64"); newShape.remove("svg")
                if (bytes != null && bytes.isNotEmpty()) {
                    assets.add(Triple(nextId, kind, bytes))
                    newShape["asset"] = nextId
                    nextId++
                }
                mutableLayer["shape"] = newShape
            }
            outLayers.add(mutableLayer)
        }

        val cleaned = HashMap(scene)
        cleaned["layers"] = outLayers
        pendingSceneJson = toJson(cleaned).toString().toByteArray(Charsets.UTF_8)
        pendingAssets = assets
        sceneDirty = true
    }

    private fun resolveImageBytes(shape: Map<String, Any?>, kind: Int): ByteArray? {
        (shape["svg"] as? String)?.let { if (kind == 1) return it.toByteArray(Charsets.UTF_8) }
        (shape["base64"] as? String)?.let {
            return try { android.util.Base64.decode(it, android.util.Base64.DEFAULT) } catch (_: Throwable) { null }
        }
        (shape["uri"] as? String)?.let { uri ->
            return try { URL(uri).openStream().use { it.readBytes() } } catch (t: Throwable) {
                Log.e(TAG, "fetch $uri failed: ${t.message}"); null
            }
        }
        return null
    }

    // MARK: - JSON

    @Suppress("UNCHECKED_CAST")
    private fun toJson(value: Any?): Any = when (value) {
        null -> JSONObject.NULL
        is Map<*, *> -> JSONObject().apply {
            for ((k, v) in value) put(k.toString(), toJson(v))
        }
        is List<*> -> JSONArray().apply { value.forEach { put(toJson(it)) } }
        is Number, is Boolean, is String -> value
        else -> value.toString()
    }
}
