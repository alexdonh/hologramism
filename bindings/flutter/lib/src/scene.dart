// The ergonomic, typed face of the canonical scene schema — the Dart twin of the
// TypeScript API in bindings/react-native/src/index.tsx and the Swift API in
// bindings/ios. Everything resolves to the SAME JSON document the engine parses
// on every platform.

/// PNG/SVG usage: `image` keeps pixels as artwork; `mask` fills the silhouette
/// with the layer's preset.
enum ImageMode { mask, image }

extension on ImageMode {
  String get value => this == ImageMode.mask ? 'mask' : 'image';
}

/// Glint controls. [Sparkle.on] / [Sparkle.off] toggle with engine defaults; the
/// default constructor overrides [density] (how many glints) and/or [intensity]
/// (how bright), each falling back to its default when omitted.
class Sparkle {
  final bool? _enabled;
  final double? density;
  final double? intensity;

  const Sparkle({this.density, this.intensity}) : _enabled = null;
  const Sparkle.on()
      : _enabled = true,
        density = null,
        intensity = null;
  const Sparkle.off()
      : _enabled = false,
        density = null,
        intensity = null;

  /// `true` / `false` toggle, or a `{density, intensity}` map for overrides.
  Object toJson() {
    final on = _enabled;
    if (on != null) return on;
    return <String, dynamic>{
      if (density != null) 'density': density,
      if (intensity != null) 'intensity': intensity,
    };
  }
}

/// Shape geometry. Use the factory constructors.
class HologramShape {
  final Map<String, dynamic> _json;
  const HologramShape._(this._json);

  factory HologramShape.rect({double? cornerRadius}) => HologramShape._({
        'type': 'rect',
        if (cornerRadius != null) 'cornerRadius': cornerRadius,
      });

  factory HologramShape.circle() => const HologramShape._({'type': 'circle'});

  factory HologramShape.ellipse() => const HologramShape._({'type': 'ellipse'});

  /// Arbitrary closed polygon; points normalized 0..1 of the view box.
  factory HologramShape.polygon(List<List<double>> points, {bool? closed}) =>
      HologramShape._({
        'type': 'polygon',
        'points': points,
        if (closed != null) 'closed': closed,
      });

  factory HologramShape.png({String? uri, String? base64, ImageMode mode = ImageMode.image}) =>
      HologramShape._({
        'type': 'png',
        'mode': mode.value,
        if (uri != null) 'uri': uri,
        if (base64 != null) 'base64': base64,
      });

  factory HologramShape.svg(
          {String? uri, String? base64, String? svg, ImageMode mode = ImageMode.image}) =>
      HologramShape._({
        'type': 'svg',
        'mode': mode.value,
        if (uri != null) 'uri': uri,
        if (base64 != null) 'base64': base64,
        if (svg != null) 'svg': svg,
      });

  Map<String, dynamic> toJson() => _json;
}

/// A diffraction pattern. Use the [Preset] factory for per-variant args.
class HologramPreset {
  final String type;
  final double? angle;
  final double? freq;
  const HologramPreset(this.type, {this.angle, this.freq});

  Map<String, dynamic> toJson() => {
        'type': type,
        if (angle != null) 'angle': angle,
        if (freq != null) 'freq': freq,
      };
}

class Preset {
  static HologramPreset linear({double? angle, double? freq}) =>
      HologramPreset('linear', angle: angle, freq: freq);
  static HologramPreset radial({double? freq}) => HologramPreset('radial', freq: freq);
  static HologramPreset concentric({double? freq}) => HologramPreset('concentric', freq: freq);
  static HologramPreset guilloche({double? freq}) => HologramPreset('guilloche', freq: freq);
  static HologramPreset dotMatrix({double? freq}) => HologramPreset('dotMatrix', freq: freq);
  static HologramPreset rosette({double? freq}) => HologramPreset('rosette', freq: freq);
  static HologramPreset lattice({double? freq}) => HologramPreset('lattice', freq: freq);
  static HologramPreset rainbow({double? freq}) => HologramPreset('rainbow', freq: freq);
}

/// Placement of the shape within the view. `size`/`gap` are fractions of the
/// view; pass a `double` (both axes) or a `[x, y]` list.
class HologramLayout {
  final Map<String, dynamic> _json;
  const HologramLayout._(this._json);

  Map<String, dynamic> toJson() => _json;
}

class Layout {
  static HologramLayout single({Object? size, List<double>? position}) => HologramLayout._({
        'type': 'single',
        if (size != null) 'size': size,
        if (position != null) 'position': position,
      });

  static HologramLayout tile({Object? size, Object? gap, String? fit}) => HologramLayout._({
        'type': 'tile',
        if (size != null) 'size': size,
        if (gap != null) 'gap': gap,
        if (fit != null) 'fit': fit,
      });
}

/// Spectrum, one of the six built-in foils, or a custom palette.
class HologramColor {
  final Map<String, dynamic> _json;
  const HologramColor._(this._json);

  static const spectrum = HologramColor._({'type': 'spectrum'});
  static const gold = HologramColor._({'type': 'preset', 'id': 'gold'});
  static const silver = HologramColor._({'type': 'preset', 'id': 'silver'});
  static const rainbowFoil = HologramColor._({'type': 'preset', 'id': 'rainbowFoil'});
  static const emerald = HologramColor._({'type': 'preset', 'id': 'emerald'});
  static const sapphire = HologramColor._({'type': 'preset', 'id': 'sapphire'});
  static const copper = HologramColor._({'type': 'preset', 'id': 'copper'});

  /// Custom palette; each entry is `[r, g, b, a]` in 0..255 (matching the TS API).
  factory HologramColor.palette(List<List<int>> colors) =>
      HologramColor._({'type': 'palette', 'colors': colors});

  Map<String, dynamic> toJson() => _json;
}

/// One layer of a (possibly multiplexed) scene.
class HologramLayer {
  final HologramShape? shape;
  final HologramPreset? preset;
  final HologramColor? color;
  final HologramLayout? layout;

  /// Tilt direction (degrees) that reveals this layer in a multiplex.
  final double? azimuth;

  const HologramLayer({this.shape, this.preset, this.color, this.layout, this.azimuth});

  Map<String, dynamic> toJson() => {
        if (shape != null) 'shape': shape!.toJson(),
        if (preset != null) 'preset': preset!.toJson(),
        if (color != null) 'color': color!.toJson(),
        if (layout != null) 'layout': layout!.toJson(),
        if (azimuth != null) 'azimuth': azimuth,
      };
}

/// Parse a "#rgb" | "#rrggbb" | "#rrggbbaa" string into `[r, g, b, a]` in 0..1.
List<double> parseHex(String hex) {
  var h = hex.replaceAll('#', '').trim();
  if (h.length == 3) h = h.split('').map((c) => '$c$c').join();
  if (h.length == 6) h += 'ff';
  final n = int.parse(h, radix: 16);
  return [
    ((n >> 24) & 0xff) / 255.0,
    ((n >> 16) & 0xff) / 255.0,
    ((n >> 8) & 0xff) / 255.0,
    (n & 0xff) / 255.0,
  ];
}
