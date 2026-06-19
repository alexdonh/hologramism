import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import 'src/scene.dart';

export 'src/scene.dart';

/// Orientation / interaction sources for a hologram (all default on).
@immutable
class Tilt {
  final bool motion;
  final bool gesture;
  final bool autoOrbit;
  const Tilt({this.motion = true, this.gesture = true, this.autoOrbit = true});

  Map<String, dynamic> toJson() => {
        'motion': motion,
        'gesture': gesture,
        'autoOrbit': autoOrbit,
      };
}

/// Animated security-hologram view. Transparent / overlay-able by default and
/// reacts to device motion (or pan / idle auto-orbit on the simulator).
///
/// iOS only for now (renders a native `CAMetalLayer` surface). On other
/// platforms it renders nothing.
///
/// ```dart
/// HologramView(preset: Preset.guilloche(), color: HologramColor.gold)
/// ```
class HologramView extends StatefulWidget {
  // Single-layer shorthand (the common case).
  final HologramShape? shape;
  final HologramPreset? preset;
  final HologramColor? color;
  final HologramLayout? layout;

  // Multi-layer / kinegram: revealed by per-layer `azimuth`.
  final List<HologramLayer>? layers;

  /// Transparent by default; a `String` hex or `List<num>` `[r,g,b,a]` (0..1)
  /// makes it opaque.
  final Object? background;

  final Tilt tilt;

  // Global look parameters.
  final double? intensity;
  final double? grating;
  final double? iridescence;
  final Sparkle? sparkle;
  final double? sharpness;
  final double? glare;

  const HologramView({
    super.key,
    this.shape,
    this.preset,
    this.color,
    this.layout,
    this.layers,
    this.background,
    this.tilt = const Tilt(),
    this.intensity,
    this.grating,
    this.iridescence,
    this.sparkle,
    this.sharpness,
    this.glare,
  });

  /// Build the canonical scene map (identical to `buildScene` in index.tsx).
  Map<String, dynamic> buildScene() {
    final layersInput = layers ??
        [HologramLayer(shape: shape, preset: preset, color: color, layout: layout)];

    final scene = <String, dynamic>{
      'layers': layersInput.map((l) => l.toJson()).toList(),
    };

    void put(String k, double? v) {
      if (v != null) scene[k] = v;
    }

    put('intensity', intensity);
    put('grating', grating);
    put('iridescence', iridescence);
    put('sharpness', sharpness);
    put('glare', glare);
    if (sparkle != null) scene['sparkle'] = sparkle!.toJson();

    if (color != null) scene['color'] = color!.toJson();

    final bg = background;
    if (bg is String) {
      scene['background'] = parseHex(bg);
    } else if (bg is List) {
      scene['background'] = bg;
    } else {
      scene['background'] = [0, 0, 0, 0];
    }
    return scene;
  }

  @override
  State<HologramView> createState() => _HologramViewState();
}

const String _viewType = 'hologramism/HologramView';

class _HologramViewState extends State<HologramView> {
  MethodChannel? _channel;

  @override
  Widget build(BuildContext context) {
    final creationParams = {
      'scene': widget.buildScene(),
      'tilt': widget.tilt.toJson(),
    };
    switch (defaultTargetPlatform) {
      case TargetPlatform.iOS:
        return UiKitView(
          viewType: _viewType,
          creationParams: creationParams,
          creationParamsCodec: const StandardMessageCodec(),
          onPlatformViewCreated: _onCreated,
        );
      case TargetPlatform.android:
        return AndroidView(
          viewType: _viewType,
          creationParams: creationParams,
          creationParamsCodec: const StandardMessageCodec(),
          onPlatformViewCreated: _onCreated,
        );
      default:
        // Other platforms are not supported yet.
        return const SizedBox.shrink();
    }
  }

  void _onCreated(int id) {
    // Creation params are set once; push later updates over a per-view channel
    // keyed by the platform view id (see HologramViewFactory on each platform).
    _channel = MethodChannel('$_viewType/$id');
  }

  @override
  void didUpdateWidget(covariant HologramView oldWidget) {
    super.didUpdateWidget(oldWidget);
    final ch = _channel;
    if (ch == null) return;
    ch.invokeMethod('setScene', widget.buildScene());
    ch.invokeMethod('setTilt', widget.tilt.toJson());
  }
}
