// Flutter twin of examples/react-native/App.tsx; the same control set (mode,
// shape, layout, color/pattern or kinegram layers, glare, overlay, auto-orbit)
// driving the shared Hologramism engine through the `hologramism` plugin.

import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:hologramism/hologramism.dart';

void main() => runApp(const DemoApp());

class DemoApp extends StatelessWidget {
  const DemoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Hologramism',
      theme: ThemeData.dark(useMaterial3: true),
      home: const HomePage(),
    );
  }
}

const _colors = <(String, HologramColor)>[
  ('spectrum', HologramColor.spectrum),
  ('gold', HologramColor.gold),
  ('silver', HologramColor.silver),
  ('rainbowFoil', HologramColor.rainbowFoil),
  ('emerald', HologramColor.emerald),
  ('sapphire', HologramColor.sapphire),
  ('copper', HologramColor.copper),
];
// Custom palette (bare RGBA list); appended at runtime since it isn't const.
final _customColor = HologramColor.palette([
  [255, 0, 128, 255],
  [0, 220, 255, 255],
]);

const _glares = <(String, double)>[
  ('off', 0), ('soft', 0.6), ('normal', 1.0), ('strong', 1.6),
];

final _presets = <(String, HologramPreset)>[
  ('guilloche', Preset.guilloche()),
  ('concentric', Preset.concentric()),
  ('radial', Preset.radial()),
  ('linear', Preset.linear()),
  ('dotMatrix', Preset.dotMatrix()),
  ('rosette', Preset.rosette()),
  ('lattice', Preset.lattice()),
  ('rainbow', Preset.rainbow()),
];

final _layouts = <(String, HologramLayout?)>[
  ('single', null),
  ('tile 4×4', Layout.tile(size: 0.22, gap: 0.03)),
  ('tile 7×7', Layout.tile(size: 0.13, gap: 0.02)),
  ('tile + gap', Layout.tile(size: 0.16, gap: 0.12)),
  ('tile fill', Layout.tile(size: 0.2, gap: 0.06, fit: 'fill')),
  ('corner', Layout.single(size: 0.4, position: [0.22, 0.78])),
];

enum ShapeName { rect, circle, ellipse, star, image, masked }

extension on ShapeName {
  String get label => switch (this) {
        ShapeName.image => 'bird',
        ShapeName.masked => 'bird·masked',
        _ => name,
      };
}

// 5-point star polygon, points normalized 0..1.
final List<List<double>> _star = () {
  final pts = <List<double>>[];
  for (var i = 0; i < 10; i++) {
    final r = i % 2 == 0 ? 0.5 : 0.21;
    final a = math.pi / 5 * i - math.pi / 2;
    pts.add([0.5 + r * math.cos(a), 0.5 + r * math.sin(a)]);
  }
  return pts;
}();

class _Layer {
  int presetIdx;
  int colorIdx;
  _Layer(this.presetIdx, this.colorIdx);
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  bool multiplex = false;
  ShapeName shapeName = ShapeName.rect;
  int layoutIdx = 0;
  int colorIdx = 0;
  int presetIdx = 0;
  final layers = <_Layer>[_Layer(3, 1), _Layer(5, 5), _Layer(1, 4)];
  static const maxLayers = 4;
  bool overlay = false;
  bool autoOrbit = true;
  double glare = 1.0;
  String? birdBase64;

  List<(String, HologramColor)> get colors => [..._colors, ('custom', _customColor)];

  @override
  void initState() {
    super.initState();
    rootBundle.load('assets/bird.png').then((d) {
      setState(() => birdBase64 = base64Encode(d.buffer.asUint8List()));
    });
  }

  HologramShape get _shape {
    switch (shapeName) {
      case ShapeName.rect:
        return HologramShape.rect(cornerRadius: 0.18);
      case ShapeName.circle:
        return HologramShape.circle();
      case ShapeName.ellipse:
        return HologramShape.ellipse();
      case ShapeName.star:
        return HologramShape.polygon(_star);
      case ShapeName.image:
        return HologramShape.png(base64: birdBase64, mode: ImageMode.image);
      case ShapeName.masked:
        return HologramShape.png(base64: birdBase64, mode: ImageMode.mask);
    }
  }

  HologramView _buildHologram() {
    final layout = _layouts[layoutIdx].$2;
    if (multiplex) {
      final n = layers.length;
      return HologramView(
        layers: [
          for (var i = 0; i < n; i++)
            HologramLayer(
              shape: _shape,
              preset: _presets[layers[i].presetIdx].$2,
              color: colors[layers[i].colorIdx].$2,
              layout: layout,
              azimuth: (360 / n) * i,
            ),
        ],
        intensity: 0.95,
        grating: 6.0,
        iridescence: 0.65,
        sparkle: const Sparkle(density: 0.35, intensity: 0.5),
        glare: glare,
        tilt: Tilt(autoOrbit: autoOrbit),
      );
    }
    return HologramView(
      shape: _shape,
      preset: _presets[presetIdx].$2,
      color: colors[colorIdx].$2,
      layout: layout,
      intensity: 0.95,
      grating: 6.0,
      iridescence: 0.65,
      sparkle: const Sparkle(density: 0.35, intensity: 0.5),
      glare: glare,
      tilt: Tilt(autoOrbit: autoOrbit),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Text('Hologramism',
                  style: TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800)),
              const Padding(
                padding: EdgeInsets.only(top: 4, bottom: 16),
                child: Text('Drag the card to tilt it, or watch it auto-orbit.',
                    style: TextStyle(color: Color(0xFF8A8A9A), fontSize: 13)),
              ),
              _card(),
              _section('Mode', [
                _chip('single', !multiplex, () => setState(() => multiplex = false)),
                _chip('multiplex (kinegram)', multiplex, () => setState(() => multiplex = true)),
              ]),
              _section('Shape', [
                for (final s in ShapeName.values)
                  _chip(s.label, shapeName == s, () => setState(() => shapeName = s)),
              ]),
              _section('Layout (placement / repeat)', [
                for (var i = 0; i < _layouts.length; i++)
                  _chip(_layouts[i].$1, layoutIdx == i, () => setState(() => layoutIdx = i)),
              ]),
              if (multiplex) ..._layerCards() else ..._singleControls(),
              _section('Glare (light sweep)', [
                for (final g in _glares)
                  _chip(g.$1, glare == g.$2, () => setState(() => glare = g.$2)),
              ]),
              _section('Overlay on photo (picsum)', [
                _chip('off', !overlay, () => setState(() => overlay = false)),
                _chip('on', overlay, () => setState(() => overlay = true)),
              ]),
              _section('Auto-orbit', [
                _chip('off', !autoOrbit, () => setState(() => autoOrbit = false)),
                _chip('on', autoOrbit, () => setState(() => autoOrbit = true)),
              ]),
            ],
          ),
        ),
      ),
    );
  }

  Widget _card() {
    return Container(
      width: 300,
      height: 190,
      margin: const EdgeInsets.only(bottom: 22),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: const Color(0xFF0A0A0F),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (overlay)
            Image.network('https://picsum.photos/seed/holo/600/380', fit: BoxFit.cover),
          _buildHologram(),
        ],
      ),
    );
  }

  List<Widget> _singleControls() => [
        _section('Color', [
          for (var i = 0; i < colors.length; i++)
            _chip(colors[i].$1, colorIdx == i, () => setState(() => colorIdx = i)),
        ]),
        _section('Pattern', [
          for (var i = 0; i < _presets.length; i++)
            _chip(_presets[i].$1, presetIdx == i, () => setState(() => presetIdx = i)),
        ]),
      ];

  List<Widget> _layerCards() {
    final cards = <Widget>[];
    for (var i = 0; i < layers.length; i++) {
      cards.add(Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF13131C),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFF23232F)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Layer ${i + 1}',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                if (layers.length > 1)
                  GestureDetector(
                    onTap: () => setState(() => layers.removeAt(i)),
                    child: const Text('✕', style: TextStyle(color: Color(0xFF7A7A8A))),
                  ),
              ],
            ),
            const Padding(
              padding: EdgeInsets.only(top: 6, bottom: 6),
              child: Text('PATTERN', style: TextStyle(color: Color(0xFF6A6A7A), fontSize: 11)),
            ),
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (var p = 0; p < _presets.length; p++)
                _chip(_presets[p].$1, layers[i].presetIdx == p,
                    () => setState(() => layers[i].presetIdx = p)),
            ]),
            const Padding(
              padding: EdgeInsets.only(top: 6, bottom: 6),
              child: Text('COLOR', style: TextStyle(color: Color(0xFF6A6A7A), fontSize: 11)),
            ),
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (var c = 0; c < colors.length; c++)
                _chip(colors[c].$1, layers[i].colorIdx == c,
                    () => setState(() => layers[i].colorIdx = c)),
            ]),
          ],
        ),
      ));
    }
    if (layers.length < maxLayers) {
      cards.add(GestureDetector(
        onTap: () => setState(() => layers.add(_Layer(3, 0))),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 12),
          margin: const EdgeInsets.only(bottom: 14),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF3A3A6A)),
          ),
          child: const Text('+ Add layer', style: TextStyle(color: Color(0xFF8A8AFF))),
        ),
      ));
    }
    return cards;
  }

  Widget _section(String title, List<Widget> chips) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(title.toUpperCase(),
                style: const TextStyle(color: Color(0xFFB8B8C8), fontSize: 12, letterSpacing: 1)),
          ),
          Wrap(spacing: 8, runSpacing: 8, children: chips),
        ],
      ),
    );
  }

  Widget _chip(String label, bool active, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: active ? const Color(0xFF4A4AFF) : const Color(0xFF1C1C26),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(label,
            style: TextStyle(
                color: active ? Colors.white : const Color(0xFF9A9AAA),
                fontWeight: active ? FontWeight.w700 : FontWeight.normal,
                fontSize: 13)),
      ),
    );
  }
}
