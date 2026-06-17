import UIKit
import CoreMotion
import Metal
import simd
import Hologramism

/// Native hologram view. Owns a `HlgEngine`, runs a CADisplayLink render loop,
/// and drives orientation from CoreMotion (device) or a pan gesture + idle
/// auto-orbit (simulator). Renders via a `CAMetalLayer` GPU surface, falling
/// back to CPU readback + blit if surface attach fails.
///
/// Content comes from the JS-side **scene** prop (mirrors the Rust scene
/// schema); this view resolves image assets, serializes to JSON, and calls
/// `hlg_set_scene`.
@objc(HologramView)
public class HologramView: UIView {

  private var engine: OpaquePointer?
  private var displayLink: CADisplayLink?
  private let motion = CMMotionManager()
  private var pan: UIPanGestureRecognizer?

  // Render buffer + size (internal resolution, capped for perf).
  private var rw: UInt32 = 0
  private var rh: UInt32 = 0
  private var buffer = [UInt8]()
  private let colorSpace = CGColorSpaceCreateDeviceRGB()

  // Orientation drivers.
  private var panTilt = simd_float2(0, 0)
  private var idlePhase: Float = 0
  private var lastPanTime: CFTimeInterval = 0
  private var surfaceAttached = false

  public override class var layerClass: AnyClass {
    CAMetalLayer.self
  }

  private var metalLayer: CAMetalLayer? { layer as? CAMetalLayer }

  // Tilt controls (all default on).
  private var motionEnabled = true
  private var gestureEnabled = true
  private var autoOrbit = true

  // Pending resolved scene: JSON + image assets to upload, applied on the next
  // tick once the engine exists. nil means nothing new to apply.
  private var pendingSceneJSON: Data?
  private var pendingAssets: [(id: UInt32, kind: UInt32, bytes: [UInt8])] = []
  private var sceneDirty = false

  // MARK: - Lifecycle

  public override init(frame: CGRect) {
    super.init(frame: frame)
    commonInit()
  }
  required init?(coder: NSCoder) {
    super.init(coder: coder)
    commonInit()
  }

  private func commonInit() {
    layer.contentsGravity = .resizeAspectFill
    // Transparent / overlay-able by default.
    backgroundColor = .clear
    isOpaque = false
    isUserInteractionEnabled = true
    // Configure the CAMetalLayer for transparent direct presentation. The pixel
    // format is left to wgpu (iOS drawables are Bgra8Unorm, not Rgba8Unorm).
    if let ml = metalLayer {
      ml.isOpaque = false
      ml.contentsScale = UIScreen.main.scale
    }
    configureTilt()
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    if window != nil { startLoop() } else { stopLoop() }
  }

  deinit {
    stopLoop()
    motion.stopDeviceMotionUpdates()
    if let e = engine { hlg_destroy(e) }
  }

  // MARK: - Engine

  private func ensureEngine() {
    let scale = min(window?.screen.scale ?? 2.0, 2.0)
    let maxDim: CGFloat = 640
    var w = bounds.width * scale
    var h = bounds.height * scale
    if w < 1 || h < 1 { return }
    let longest = max(w, h)
    if longest > maxDim {
      let k = maxDim / longest
      w *= k; h *= k
    }
    let nw = UInt32(w), nh = UInt32(h)
    if nw == rw && nh == rh && engine != nil { return }

    if let e = engine { hlg_destroy(e); engine = nil }
    rw = nw; rh = nh
    buffer = [UInt8](repeating: 0, count: Int(rw * rh * 4))

    // Background is part of the scene; seed transparent here.
    var cfg = HlgConfig(
      width: rw, height: rh,
      intensity: 0.9, grating_frequency: 8.0,
      iridescence_strength: 0.6, sparkle_density: 0.3,
      sparkle_intensity: 0.8, highlight_sharpness: 32.0,
      background: (0, 0, 0, 0))
    engine = hlg_create(&cfg)
    if engine == nil {
      if let c = hlg_last_error() {
        NSLog("[HologramView] hlg_create failed: \(String(cString: c))")
      }
      return
    }

    // Attach the CAMetalLayer for direct GPU presentation; fall back to CPU
    // readback if it fails.
    if let e = engine, let ml = metalLayer {
      surfaceAttached = hlg_attach_surface(e, Unmanaged.passUnretained(ml).toOpaque())
      if !surfaceAttached, let c = hlg_last_error() {
        NSLog("[HologramView] hlg_attach_surface failed (using CPU fallback): \(String(cString: c))")
      }
    }

    sceneDirty = true   // re-apply current scene to the new engine
  }

  /// Upload pending assets + the resolved scene JSON to the engine.
  private func applyScene() {
    guard let e = engine, let json = pendingSceneJSON else { return }
    for a in pendingAssets {
      a.bytes.withUnsafeBufferPointer { p in
        _ = hlg_set_asset(e, a.id, a.kind, p.baseAddress, UInt(p.count))
      }
    }
    json.withUnsafeBytes { (raw: UnsafeRawBufferPointer) in
      if let base = raw.bindMemory(to: UInt8.self).baseAddress {
        let ok = hlg_set_scene(e, base, UInt(raw.count))
        if !ok, let c = hlg_last_error() {
          NSLog("[HologramView] hlg_set_scene failed: \(String(cString: c))")
        }
      }
    }
    sceneDirty = false
  }

  // MARK: - Scene resolution (off-engine; handles async image fetches)

  /// Walk the scene, resolve every png/svg shape to an uploaded asset id, strip
  /// the inline bytes, and stash the cleaned JSON + assets for the next tick.
  private func resolveScene(_ scene: NSDictionary) {
    guard let mutable = (scene.mutableDeepCopy() as? NSMutableDictionary) else { return }
    let layers = (mutable["layers"] as? NSMutableArray) ?? NSMutableArray()

    // Collect image shapes that need bytes.
    struct Pending { let shape: NSMutableDictionary; let id: UInt32; let kind: UInt32 }
    var pend: [Pending] = []
    var nextId: UInt32 = 0
    for case let layer as NSMutableDictionary in layers {
      guard let shape = layer["shape"] as? NSMutableDictionary,
            let type = shape["type"] as? String,
            type == "png" || type == "svg" else { continue }
      pend.append(Pending(shape: shape, id: nextId, kind: type == "svg" ? 1 : 0))
      nextId += 1
    }

    var assets: [(id: UInt32, kind: UInt32, bytes: [UInt8])] = []
    let group = DispatchGroup()

    for p in pend {
      let shape = p.shape
      // Rewrite the shape to reference the asset id; drop the inline source.
      let mode = (shape["mode"] as? String) ?? "image"
      func finish(_ bytes: [UInt8]?) {
        if let bytes = bytes, !bytes.isEmpty {
          assets.append((id: p.id, kind: p.kind, bytes: bytes))
          shape["asset"] = NSNumber(value: p.id)
          shape["mode"] = mode
        }
        shape.removeObject(forKey: "uri")
        shape.removeObject(forKey: "base64")
        shape.removeObject(forKey: "svg")
      }

      if let svg = shape["svg"] as? String, p.kind == 1 {
        finish([UInt8](svg.utf8))
      } else if let b64 = shape["base64"] as? String, let data = Data(base64Encoded: b64) {
        finish([UInt8](data))
      } else if let uri = shape["uri"] as? String, let url = URL(string: uri) {
        group.enter()
        DispatchQueue.global().async {
          let data = try? Data(contentsOf: url)
          DispatchQueue.main.async {
            finish(data.map { [UInt8]($0) })
            group.leave()
          }
        }
      } else {
        finish(nil)
      }
    }

    group.notify(queue: .main) { [weak self] in
      guard let self = self else { return }
      mutable["layers"] = layers
      self.pendingSceneJSON = try? JSONSerialization.data(withJSONObject: mutable)
      self.pendingAssets = assets
      self.sceneDirty = true
    }
  }

  // MARK: - Tilt

  private func configureTilt() {
    // Pan gesture.
    if gestureEnabled {
      if pan == nil {
        let g = UIPanGestureRecognizer(target: self, action: #selector(onPan(_:)))
        addGestureRecognizer(g)
        pan = g
      }
    } else if let g = pan {
      removeGestureRecognizer(g)
      pan = nil
    }
    // Device motion.
    if motionEnabled, motion.isDeviceMotionAvailable {
      if !motion.isDeviceMotionActive {
        motion.deviceMotionUpdateInterval = 1.0 / 60.0
        motion.startDeviceMotionUpdates()
      }
    } else {
      motion.stopDeviceMotionUpdates()
    }
  }

  // MARK: - Render loop

  private func startLoop() {
    guard displayLink == nil else { return }
    let link = CADisplayLink(target: self, selector: #selector(tick(_:)))
    link.add(to: .main, forMode: .common)
    displayLink = link
  }
  private func stopLoop() {
    displayLink?.invalidate()
    displayLink = nil
  }

  @objc private func tick(_ link: CADisplayLink) {
    ensureEngine()
    guard let e = engine else { return }
    if sceneDirty { applyScene() }

    idlePhase += Float(link.duration)
    let q = currentOrientation()
    hlg_set_orientation(e, q.imag.x, q.imag.y, q.imag.z, q.real)
    hlg_set_time(e, idlePhase)

    if surfaceAttached {
      let ok = hlg_render(e)
      if !ok, let c = hlg_last_error() {
        NSLog("[HologramView] hlg_render failed: \(String(cString: c))")
      }
      return
    }

    // CPU readback fallback (surface attach failed or unavailable).
    let need = Int(rw * rh * 4)
    if buffer.count < need { buffer = [UInt8](repeating: 0, count: need) }
    let written = buffer.withUnsafeMutableBufferPointer { p in
      hlg_render_rgba(e, p.baseAddress, UInt(p.count))
    }
    if written == 0 {
      if let c = hlg_last_error() {
        NSLog("[HologramView] hlg_render_rgba failed: \(String(cString: c))")
      }
      return
    }
    present()
  }

  /// Fuse the available orientation source into a quaternion, honoring the tilt
  /// controls.
  private func currentOrientation() -> simd_quatf {
    if motionEnabled, let dm = motion.deviceMotion {
      let a = dm.attitude.quaternion
      return simd_quatf(ix: Float(a.x), iy: Float(a.y), iz: Float(a.z), r: Float(a.w))
    }
    let recentPan = CACurrentMediaTime() - lastPanTime < 2.0
    let orbit: Float = autoOrbit ? (recentPan ? 0.15 : 1.0) : 0.0
    let basePan = gestureEnabled ? panTilt : simd_float2(0, 0)
    let ax = basePan.y + sin(idlePhase * 0.6) * 0.25 * orbit
    let ay = basePan.x + cos(idlePhase * 0.5) * 0.25 * orbit
    let qx = simd_quatf(angle: ax, axis: simd_float3(1, 0, 0))
    let qy = simd_quatf(angle: ay, axis: simd_float3(0, 1, 0))
    return simd_normalize(qy * qx)
  }

  private func present() {
    buffer.withUnsafeMutableBytes { raw in
      guard let base = raw.baseAddress else { return }
      // The engine alpha-blends over a transparent clear, so the readback is
      // premultiplied RGBA. (Straight `.last` is also rejected by CGBitmapContext.)
      let info = CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue)
      guard let ctx = CGContext(
        data: base, width: Int(rw), height: Int(rh),
        bitsPerComponent: 8, bytesPerRow: Int(rw) * 4,
        space: colorSpace, bitmapInfo: info.rawValue),
        let img = ctx.makeImage() else { return }
      layer.contents = img
    }
  }

  // MARK: - Gesture

  @objc private func onPan(_ g: UIPanGestureRecognizer) {
    let t = g.translation(in: self)
    let k: Float = 0.004
    panTilt = simd_float2(Float(t.x) * k, Float(t.y) * k)
    lastPanTime = CACurrentMediaTime()
  }

  // MARK: - Props (set by the view manager)

  @objc func setScene(_ v: NSDictionary) {
    resolveScene(v)
  }

  @objc func setTilt(_ v: NSDictionary) {
    motionEnabled = (v["motion"] as? NSNumber)?.boolValue ?? true
    gestureEnabled = (v["gesture"] as? NSNumber)?.boolValue ?? true
    autoOrbit = (v["autoOrbit"] as? NSNumber)?.boolValue ?? true
    configureTilt()
  }
}

private extension NSDictionary {
  /// Deep mutable copy so we can rewrite nested layer/shape dicts in place.
  func mutableDeepCopy() -> Any {
    return Self.deepCopy(self)
  }
  static func deepCopy(_ obj: Any) -> Any {
    if let d = obj as? NSDictionary {
      let out = NSMutableDictionary()
      for (k, v) in d { out[k as! NSCopying] = deepCopy(v) }
      return out
    }
    if let a = obj as? NSArray {
      let out = NSMutableArray()
      for v in a { out.add(deepCopy(v)) }
      return out
    }
    return obj
  }
}
