import Foundation

// The ergonomic, typed face of the canonical scene schema — the Swift twin of
// the TypeScript API in bindings/react-native/src/index.tsx. Everything resolves
// to the SAME JSON document the engine parses on every platform, so a scene
// described here is identical to one built from React/JS props.

// MARK: - Shapes

public enum ImageMode: String {
  case mask
  case image
}

public enum HologramShape {
  case rect(cornerRadius: Double? = nil)
  case circle
  case ellipse
  /// Arbitrary closed polygon; points normalized 0..1 of the view box.
  case polygon(points: [[Double]], closed: Bool? = nil)
  /// PNG artwork or silhouette mask.
  case png(uri: String? = nil, base64: String? = nil, mode: ImageMode = .image)
  /// SVG artwork or silhouette mask.
  case svg(uri: String? = nil, base64: String? = nil, svg: String? = nil, mode: ImageMode = .image)

  var json: [String: Any] {
    switch self {
    case .rect(let cornerRadius):
      var o: [String: Any] = ["type": "rect"]
      if let cornerRadius { o["cornerRadius"] = cornerRadius }
      return o
    case .circle:
      return ["type": "circle"]
    case .ellipse:
      return ["type": "ellipse"]
    case .polygon(let points, let closed):
      var o: [String: Any] = ["type": "polygon", "points": points]
      if let closed { o["closed"] = closed }
      return o
    case .png(let uri, let base64, let mode):
      var o: [String: Any] = ["type": "png", "mode": mode.rawValue]
      if let uri { o["uri"] = uri }
      if let base64 { o["base64"] = base64 }
      return o
    case .svg(let uri, let base64, let svg, let mode):
      var o: [String: Any] = ["type": "svg", "mode": mode.rawValue]
      if let uri { o["uri"] = uri }
      if let base64 { o["base64"] = base64 }
      if let svg { o["svg"] = svg }
      return o
    }
  }
}

// MARK: - Presets

/// A diffraction pattern. Use the `Preset` factory for ergonomic, per-variant args.
public struct HologramPreset {
  public let type: String
  public var angle: Double?
  public var freq: Double?

  public init(type: String, angle: Double? = nil, freq: Double? = nil) {
    self.type = type
    self.angle = angle
    self.freq = freq
  }

  var json: [String: Any] {
    var o: [String: Any] = ["type": type]
    if let angle { o["angle"] = angle }
    if let freq { o["freq"] = freq }
    return o
  }
}

public enum Preset {
  public static func linear(angle: Double? = nil, freq: Double? = nil) -> HologramPreset {
    HologramPreset(type: "linear", angle: angle, freq: freq)
  }
  public static func radial(freq: Double? = nil) -> HologramPreset { HologramPreset(type: "radial", freq: freq) }
  public static func concentric(freq: Double? = nil) -> HologramPreset { HologramPreset(type: "concentric", freq: freq) }
  public static func guilloche(freq: Double? = nil) -> HologramPreset { HologramPreset(type: "guilloche", freq: freq) }
  public static func dotMatrix(freq: Double? = nil) -> HologramPreset { HologramPreset(type: "dotMatrix", freq: freq) }
  public static func rosette(freq: Double? = nil) -> HologramPreset { HologramPreset(type: "rosette", freq: freq) }
  public static func lattice(freq: Double? = nil) -> HologramPreset { HologramPreset(type: "lattice", freq: freq) }
  public static func rainbow(freq: Double? = nil) -> HologramPreset { HologramPreset(type: "rainbow", freq: freq) }
}

// MARK: - Layout

public enum LayoutFit: String {
  case cover
  case fill
}

/// Placement of the shape within the view. Use the `Layout` factory.
/// `size`/`gap` are fractions of the view (a scalar applies to both axes).
public struct HologramLayout {
  public let type: String
  public var size: [Double]?
  public var gap: [Double]?
  public var position: [Double]?
  public var fit: LayoutFit?

  public init(type: String, size: [Double]? = nil, gap: [Double]? = nil,
              position: [Double]? = nil, fit: LayoutFit? = nil) {
    self.type = type
    self.size = size
    self.gap = gap
    self.position = position
    self.fit = fit
  }

  var json: [String: Any] {
    var o: [String: Any] = ["type": type]
    if let size { o["size"] = size }
    if let gap { o["gap"] = gap }
    if let position { o["position"] = position }
    if let fit { o["fit"] = fit.rawValue }
    return o
  }
}

public enum Layout {
  public static func single(size: [Double]? = nil, position: [Double]? = nil) -> HologramLayout {
    HologramLayout(type: "single", size: size, position: position)
  }
  /// Convenience: a uniform `size` fraction applied to both axes.
  public static func single(size: Double, position: [Double]? = nil) -> HologramLayout {
    HologramLayout(type: "single", size: [size, size], position: position)
  }
  public static func tile(size: [Double]? = nil, gap: [Double]? = nil, fit: LayoutFit? = nil) -> HologramLayout {
    HologramLayout(type: "tile", size: size, gap: gap, fit: fit)
  }
  /// Convenience: uniform `size`/`gap` fractions applied to both axes.
  public static func tile(size: Double, gap: Double, fit: LayoutFit? = nil) -> HologramLayout {
    HologramLayout(type: "tile", size: [size, size], gap: [gap, gap], fit: fit)
  }
}

// MARK: - Color

public enum HologramColor {
  case spectrum
  case gold, silver, rainbowFoil, emerald, sapphire, copper
  /// Custom palette; each entry is `[r, g, b, a]` in 0..255 (matching the TS API).
  case palette([[Double]])

  private static let presetIds: Set<String> = ["gold", "silver", "rainbowFoil", "emerald", "sapphire", "copper"]

  var json: [String: Any] {
    switch self {
    case .spectrum:
      return ["type": "spectrum"]
    case .gold: return ["type": "preset", "id": "gold"]
    case .silver: return ["type": "preset", "id": "silver"]
    case .rainbowFoil: return ["type": "preset", "id": "rainbowFoil"]
    case .emerald: return ["type": "preset", "id": "emerald"]
    case .sapphire: return ["type": "preset", "id": "sapphire"]
    case .copper: return ["type": "preset", "id": "copper"]
    case .palette(let colors):
      return ["type": "palette", "colors": colors]
    }
  }
}

// MARK: - Sparkle

/// Glint controls: `.on` / `.off` toggle with engine defaults; `.config`
/// overrides `density` (how many glints) and/or `intensity` (how bright), each
/// falling back to its default when `nil`.
public enum Sparkle {
  case on
  case off
  case config(density: Double? = nil, intensity: Double? = nil)

  /// `true` / `false` toggle, or a `[density, intensity]` dictionary.
  var json: Any {
    switch self {
    case .on: return true
    case .off: return false
    case let .config(density, intensity):
      var o: [String: Any] = [:]
      if let density { o["density"] = density }
      if let intensity { o["intensity"] = intensity }
      return o
    }
  }
}


// MARK: - Layer

public struct HologramLayer {
  public var shape: HologramShape?
  public var preset: HologramPreset?
  public var color: HologramColor?
  public var layout: HologramLayout?
  /// Tilt direction (degrees) that reveals this layer in a multiplex.
  public var azimuth: Double?

  public init(shape: HologramShape? = nil, preset: HologramPreset? = nil,
              color: HologramColor? = nil, layout: HologramLayout? = nil, azimuth: Double? = nil) {
    self.shape = shape
    self.preset = preset
    self.color = color
    self.layout = layout
    self.azimuth = azimuth
  }

  var json: [String: Any] {
    var o: [String: Any] = [:]
    if let shape { o["shape"] = shape.json }
    if let preset { o["preset"] = preset.json }
    if let color { o["color"] = color.json }
    if let layout { o["layout"] = layout.json }
    if let azimuth { o["azimuth"] = azimuth }
    return o
  }
}

// MARK: - Scene

/// A full hologram scene. Build it once and hand it to a `HologramView`
/// (UIKit or SwiftUI). Transparent by default; set `background` to make it opaque.
///
/// Named `HologramScene` (not `Scene`) to avoid colliding with SwiftUI's `Scene`.
public struct HologramScene {
  public var layers: [HologramLayer]
  /// Top-level color, drives the global iridescence LUT.
  public var color: HologramColor?
  /// `[r, g, b, a]` in 0..1; defaults to fully transparent.
  public var background: [Double]?
  // Look parameters, applied globally to the scene.
  public var intensity: Double?
  public var grating: Double?
  public var iridescence: Double?
  public var sparkle: Sparkle?
  public var sharpness: Double?
  public var glare: Double?

  public init(layers: [HologramLayer], color: HologramColor? = nil, background: [Double]? = nil,
              intensity: Double? = nil, grating: Double? = nil, iridescence: Double? = nil,
              sparkle: Sparkle? = nil, sharpness: Double? = nil, glare: Double? = nil) {
    self.layers = layers
    self.color = color
    self.background = background
    self.intensity = intensity
    self.grating = grating
    self.iridescence = iridescence
    self.sparkle = sparkle
    self.sharpness = sharpness
    self.glare = glare
  }

  /// Single-layer convenience (the common case).
  public init(shape: HologramShape? = nil, preset: HologramPreset? = nil,
              color: HologramColor? = nil, layout: HologramLayout? = nil,
              background: [Double]? = nil,
              intensity: Double? = nil, grating: Double? = nil, iridescence: Double? = nil,
              sparkle: Sparkle? = nil, sharpness: Double? = nil, glare: Double? = nil) {
    self.layers = [HologramLayer(shape: shape, preset: preset, color: color, layout: layout)]
    self.color = color
    self.background = background
    self.intensity = intensity
    self.grating = grating
    self.iridescence = iridescence
    self.sparkle = sparkle
    self.sharpness = sharpness
    self.glare = glare
  }

  /// The canonical scene dictionary, identical to `buildScene` in index.tsx.
  public var dictionary: [String: Any] {
    var scene: [String: Any] = ["layers": layers.map { $0.json }]
    if let intensity { scene["intensity"] = intensity }
    if let grating { scene["grating"] = grating }
    if let iridescence { scene["iridescence"] = iridescence }
    if let sparkle { scene["sparkle"] = sparkle.json }
    if let sharpness { scene["sharpness"] = sharpness }
    if let glare { scene["glare"] = glare }
    if let color { scene["color"] = color.json }
    scene["background"] = background ?? [0, 0, 0, 0]
    return scene
  }

  /// Parse a "#rgb" | "#rrggbb" | "#rrggbbaa" string into `[r, g, b, a]` in 0..1.
  public static func parseHex(_ hex: String) -> [Double] {
    var h = hex.replacingOccurrences(of: "#", with: "").trimmingCharacters(in: .whitespaces)
    if h.count == 3 { h = h.map { "\($0)\($0)" }.joined() }
    if h.count == 6 { h += "ff" }
    let n = UInt64(h, radix: 16) ?? 0
    return [
      Double((n >> 24) & 0xff) / 255.0,
      Double((n >> 16) & 0xff) / 255.0,
      Double((n >> 8) & 0xff) / 255.0,
      Double(n & 0xff) / 255.0,
    ]
  }
}

// MARK: - Typed convenience on the view

public extension HologramView {
  /// Apply a typed `HologramScene` (serializes to the canonical dictionary and
  /// resolves any image assets through the same path as the dictionary setter).
  func setScene(_ scene: HologramScene) {
    setScene(scene.dictionary as NSDictionary)
  }
}
