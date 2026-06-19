/**
 * Hologramism demo app.
 * @format
 */

import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  HologramView,
  HologramColorMode,
  HologramLayout,
  HologramPreset,
  HologramShape,
  Layout,
} from '@hologramism/react-native';

const COLORS: { label: string; value: HologramColorMode }[] = [
  { label: 'spectrum', value: 'spectrum' },
  { label: 'gold', value: 'gold' },
  { label: 'silver', value: 'silver' },
  { label: 'rainbowFoil', value: 'rainbowFoil' },
  { label: 'emerald', value: 'emerald' },
  { label: 'sapphire', value: 'sapphire' },
  { label: 'copper', value: 'copper' },
  // Bare RGBA[] = custom palette.
  {
    label: 'custom',
    value: [
      [255, 0, 128, 255],
      [0, 220, 255, 255],
    ],
  },
];

// Strength of the motion-driven light sweep (0 = off).
const GLARES: { label: string; value: number }[] = [
  { label: 'off', value: 0 },
  { label: 'soft', value: 0.6 },
  { label: 'normal', value: 1.0 },
  { label: 'strong', value: 1.6 },
];

const PRESETS: HologramPreset[] = [
  'guilloche',
  'concentric',
  'radial',
  'linear',
  'dotMatrix',
  'rosette',
  'lattice',
  'rainbow',
];

// Placement: one shape, or the shape tiled across the view. Pattern + color
// stay global in every case.
const LAYOUTS: { label: string; value?: HologramLayout }[] = [
  { label: 'single', value: undefined },
  { label: 'tile 4×4', value: Layout.tile({ size: 0.22, gap: 0.03 }) },
  { label: 'tile 7×7', value: Layout.tile({ size: 0.13, gap: 0.02 }) },
  { label: 'tile + gap', value: Layout.tile({ size: 0.16, gap: 0.12 }) },
  { label: 'tile fill', value: Layout.tile({ size: 0.2, gap: 0.06, fit: 'fill' }) },
  { label: 'corner', value: Layout.single({ size: 0.4, position: [0.22, 0.78] }) },
];

// 5-point star polygon, points normalized 0..1.
const STAR: [number, number][] = (() => {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.5 : 0.21;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push([0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a)]);
  }
  return pts;
})();

// Transparent flying-bird PNG (black-headed grosbeak).
const BIRD_URI = Image.resolveAssetSource(require('./assets/bird.png')).uri;

// Shape options. `image` shows the bird's pixels as artwork; `masked` uses only
// the bird's alpha as a silhouette filled by the preset.
type ShapeName = 'rect' | 'circle' | 'ellipse' | 'star' | 'image' | 'masked';
const SHAPES: ShapeName[] = ['rect', 'circle', 'ellipse', 'star', 'image', 'masked'];
function shapeValue(name: ShapeName): HologramShape {
  switch (name) {
    case 'star':
      return { type: 'polygon', points: STAR };
    case 'rect':
      return { type: 'rect', cornerRadius: 0.18 };
    case 'image':
      return { type: 'png', uri: BIRD_URI, mode: 'image' };
    case 'masked':
      return { type: 'png', uri: BIRD_URI, mode: 'mask' };
    default:
      return { type: name };
  }
}

type Layer = { preset: HologramPreset; colorIdx: number };

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.row}>{children}</View>
    </View>
  );
}

// Compact pattern + color picker for one multiplex layer.
function LayerCard({
  index,
  layer,
  onChange,
  onRemove,
}: {
  index: number;
  layer: Layer;
  onChange: (l: Layer) => void;
  onRemove?: () => void;
}) {
  return (
    <View style={styles.layerCard}>
      <View style={styles.layerHead}>
        <Text style={styles.layerTitle}>Layer {index + 1}</Text>
        {onRemove && (
          <TouchableOpacity onPress={onRemove} hitSlop={8}>
            <Text style={styles.layerRemove}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.layerLabel}>pattern</Text>
      <View style={styles.row}>
        {PRESETS.map(p => (
          <Chip
            key={p as string}
            label={p as string}
            active={layer.preset === p}
            onPress={() => onChange({ ...layer, preset: p })}
          />
        ))}
      </View>
      <Text style={styles.layerLabel}>color</Text>
      <View style={styles.row}>
        {COLORS.map((c, i) => (
          <Chip
            key={c.label}
            label={c.label}
            active={layer.colorIdx === i}
            onPress={() => onChange({ ...layer, colorIdx: i })}
          />
        ))}
      </View>
    </View>
  );
}

const DEFAULT_LAYERS: Layer[] = [
  { preset: 'linear', colorIdx: 1 }, // gold
  { preset: 'rosette', colorIdx: 5 }, // sapphire
  { preset: 'concentric', colorIdx: 4 }, // emerald
];
const MAX_LAYERS = 4;

function App() {
  const [multiplex, setMultiplex] = useState(false);
  const [shapeName, setShapeName] = useState<ShapeName>('rect');
  const [layoutIdx, setLayoutIdx] = useState(0);

  // Single-mode look.
  const [colorIdx, setColorIdx] = useState(0);
  const [preset, setPreset] = useState<HologramPreset>('guilloche');

  // Multiplex layers.
  const [layers, setLayers] = useState<Layer[]>(DEFAULT_LAYERS);

  const [overlay, setOverlay] = useState(false);
  const [autoOrbit, setAutoOrbit] = useState(true);
  const [glare, setGlare] = useState(1.0);

  const shape = shapeValue(shapeName);
  const layout = LAYOUTS[layoutIdx].value;

  // Compose the hologram content from the current mode.
  let content: object;
  if (multiplex) {
    const n = layers.length;
    content = {
      layers: layers.map((l, i) => ({
        shape,
        preset: l.preset,
        color: COLORS[l.colorIdx].value,
        azimuth: (360 / n) * i,
        layout,
      })),
    };
  } else {
    content = { shape, preset, color: COLORS[colorIdx].value, layout };
  }

  const setLayer = (i: number, l: Layer) =>
    setLayers(prev => prev.map((p, k) => (k === i ? l : p)));
  const removeLayer = (i: number) =>
    setLayers(prev => prev.filter((_, k) => k !== i));
  const addLayer = () =>
    setLayers(prev =>
      prev.length >= MAX_LAYERS
        ? prev
        : [...prev, { preset: 'linear', colorIdx: 0 }],
    );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Hologramism</Text>
          <Text style={styles.subtitle}>
            Drag the card to tilt it — or watch it auto-orbit.
          </Text>

          <View style={styles.card}>
            {overlay && (
              <Image
                source={{ uri: 'https://picsum.photos/seed/holo/600/380' }}
                style={styles.cardBg}
              />
            )}
            <HologramView
              style={StyleSheet.absoluteFill}
              intensity={0.95}
              grating={6}
              iridescence={0.65}
              sparkle={{ density: 0.35, intensity: 0.5 }}
              glare={glare}
              tilt={{ autoOrbit }}
              {...content}
            />
          </View>

          <Section title="Mode">
            <Chip
              label="single"
              active={!multiplex}
              onPress={() => setMultiplex(false)}
            />
            <Chip
              label="multiplex (kinegram)"
              active={multiplex}
              onPress={() => setMultiplex(true)}
            />
          </Section>

          <Section title="Shape">
            {SHAPES.map(s => (
              <Chip
                key={s}
                label={s === 'image' ? 'bird' : s === 'masked' ? 'bird·masked' : s}
                active={shapeName === s}
                onPress={() => setShapeName(s)}
              />
            ))}
          </Section>

          <Section title="Layout (placement / repeat)">
            {LAYOUTS.map((l, i) => (
              <Chip
                key={l.label}
                label={l.label}
                active={layoutIdx === i}
                onPress={() => setLayoutIdx(i)}
              />
            ))}
          </Section>

          {multiplex ? (
            <>
              {layers.map((l, i) => (
                <LayerCard
                  key={i}
                  index={i}
                  layer={l}
                  onChange={nl => setLayer(i, nl)}
                  onRemove={layers.length > 1 ? () => removeLayer(i) : undefined}
                />
              ))}
              {layers.length < MAX_LAYERS && (
                <TouchableOpacity style={styles.addBtn} onPress={addLayer}>
                  <Text style={styles.addBtnText}>+ Add layer</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <Section title="Color">
                {COLORS.map((c, i) => (
                  <Chip
                    key={c.label}
                    label={c.label}
                    active={colorIdx === i}
                    onPress={() => setColorIdx(i)}
                  />
                ))}
              </Section>
              <Section title="Pattern">
                {PRESETS.map(p => (
                  <Chip
                    key={p as string}
                    label={p as string}
                    active={preset === p}
                    onPress={() => setPreset(p)}
                  />
                ))}
              </Section>
            </>
          )}

          <Section title="Glare (light sweep)">
            {GLARES.map(g => (
              <Chip
                key={g.label}
                label={g.label}
                active={glare === g.value}
                onPress={() => setGlare(g.value)}
              />
            ))}
          </Section>
          <Section title="Overlay on photo (picsum)">
            <Chip label="off" active={!overlay} onPress={() => setOverlay(false)} />
            <Chip label="on" active={overlay} onPress={() => setOverlay(true)} />
          </Section>
          <Section title="Auto-orbit">
            <Chip
              label="off"
              active={!autoOrbit}
              onPress={() => setAutoOrbit(false)}
            />
            <Chip label="on" active={autoOrbit} onPress={() => setAutoOrbit(true)} />
          </Section>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0f' },
  scroll: { padding: 20, alignItems: 'center' },
  title: { color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 8 },
  subtitle: {
    color: '#8a8a9a',
    fontSize: 13,
    marginBottom: 18,
    textAlign: 'center',
  },
  card: {
    width: 300,
    height: 190,
    borderRadius: 18,
    marginBottom: 22,
    overflow: 'hidden',
    backgroundColor: '#0a0a0f',
  },
  cardBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  section: { width: '100%', marginBottom: 14 },
  sectionTitle: {
    color: '#b8b8c8',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1c1c26',
  },
  chipActive: { backgroundColor: '#4a4aff' },
  chipText: { color: '#9a9aaa', fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  // Multiplex layer cards.
  layerCard: {
    width: '100%',
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#13131c',
    borderWidth: 1,
    borderColor: '#23232f',
  },
  layerHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  layerTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  layerRemove: { color: '#7a7a8a', fontSize: 15, fontWeight: '700' },
  layerLabel: {
    color: '#6a6a7a',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 6,
    marginBottom: 6,
  },
  addBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3a3a6a',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 14,
  },
  addBtnText: { color: '#8a8aff', fontSize: 14, fontWeight: '600' },
});

export default App;
