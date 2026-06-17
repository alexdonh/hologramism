/**
 * Hologramism web demo — mirrors examples/react-native/App.tsx.
 */

import { useState } from 'react';
import {
  HologramCanvas,
  HologramColorMode,
  HologramLayout,
  HologramPreset,
  HologramShape,
  Layout,
} from '@hologramism/browser';

// ---------------------------------------------------------------------------
// Configuration data
// ---------------------------------------------------------------------------

const COLORS: { label: string; value: HologramColorMode }[] = [
  { label: 'spectrum', value: 'spectrum' },
  { label: 'gold', value: 'gold' },
  { label: 'silver', value: 'silver' },
  { label: 'rainbowFoil', value: 'rainbowFoil' },
  { label: 'emerald', value: 'emerald' },
  { label: 'sapphire', value: 'sapphire' },
  { label: 'copper', value: 'copper' },
  {
    label: 'custom',
    value: [
      [255, 0, 128, 255],
      [0, 220, 255, 255],
    ],
  },
];

const GLARES: { label: string; value: number }[] = [
  { label: 'off', value: 0 },
  { label: 'soft', value: 0.6 },
  { label: 'normal', value: 1.0 },
  { label: 'strong', value: 1.6 },
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

const STAR: [number, number][] = (() => {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.5 : 0.21;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push([0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a)]);
  }
  return pts;
})();

type ShapeName = 'rect' | 'circle' | 'ellipse' | 'star' | 'bird' | 'bird·masked';
const SHAPES: ShapeName[] = ['rect', 'circle', 'ellipse', 'star', 'bird', 'bird·masked'];

function shapeValue(name: ShapeName): HologramShape {
  switch (name) {
    case 'star':
      return { type: 'polygon', points: STAR };
    case 'rect':
      return { type: 'rect', cornerRadius: 0.18 };
    case 'bird':
      return { type: 'png', uri: '/bird.png', mode: 'image' };
    case 'bird·masked':
      return { type: 'png', uri: '/bird.png', mode: 'mask' };
    default:
      return { type: name };
  }
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 14px',
        borderRadius: 20,
        border: 'none',
        cursor: 'pointer',
        fontSize: 13,
        background: active ? '#4a4aff' : '#1c1c26',
        color: active ? '#fff' : '#9a9aaa',
        fontWeight: active ? 700 : 400,
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ width: '100%', marginBottom: 14 }}>
      <div
        style={{
          color: '#b8b8c8',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{children}</div>
    </div>
  );
}

type Layer = { preset: HologramPreset; colorIdx: number };

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
    <div
      style={{
        width: '100%',
        marginBottom: 12,
        padding: 12,
        borderRadius: 14,
        background: '#13131c',
        border: '1px solid #23232f',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Layer {index + 1}</span>
        {onRemove && (
          <button
            onClick={onRemove}
            style={{
              background: 'none',
              border: 'none',
              color: '#7a7a8a',
              fontSize: 15,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ✕
          </button>
        )}
      </div>
      <div style={{ color: '#6a6a7a', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>pattern</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {PRESETS.map((p) => (
          <Chip
            key={p as string}
            label={p as string}
            active={layer.preset === p}
            onClick={() => onChange({ ...layer, preset: p })}
          />
        ))}
      </div>
      <div style={{ color: '#6a6a7a', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>color</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {COLORS.map((c, i) => (
          <Chip
            key={c.label}
            label={c.label}
            active={layer.colorIdx === i}
            onClick={() => onChange({ ...layer, colorIdx: i })}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const DEFAULT_LAYERS: Layer[] = [
  { preset: 'linear', colorIdx: 1 },
  { preset: 'rosette', colorIdx: 5 },
  { preset: 'concentric', colorIdx: 4 },
];
const MAX_LAYERS = 4;

export default function App() {
  const [multiplex, setMultiplex] = useState(false);
  const [shapeName, setShapeName] = useState<ShapeName>('rect');
  const [colorIdx, setColorIdx] = useState(0);
  const [preset, setPreset] = useState<HologramPreset>('guilloche');
  const [layers, setLayers] = useState<Layer[]>(DEFAULT_LAYERS);
  const [overlay, setOverlay] = useState(false);
  const [autoOrbit, setAutoOrbit] = useState(true);
  const [glare, setGlare] = useState(1.0);
  const [layoutIdx, setLayoutIdx] = useState(0);

  const shape = shapeValue(shapeName);
  const layout = LAYOUTS[layoutIdx].value;

  let hologramProps: object;
  if (multiplex) {
    const n = layers.length;
    hologramProps = {
      layers: layers.map((l, i) => ({
        shape,
        preset: l.preset,
        color: COLORS[l.colorIdx].value,
        azimuth: (360 / n) * i,
        layout,
      })),
    };
  } else {
    hologramProps = { shape, preset, color: COLORS[colorIdx].value, layout };
  }

  const setLayer = (i: number, l: Layer) =>
    setLayers((prev) => prev.map((p, k) => (k === i ? l : p)));
  const removeLayer = (i: number) => setLayers((prev) => prev.filter((_, k) => k !== i));
  const addLayer = () =>
    setLayers((prev) =>
      prev.length >= MAX_LAYERS ? prev : [...prev, { preset: 'linear', colorIdx: 0 }],
    );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 20px 40px',
      }}
    >
      <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 800, margin: '8px 0 4px' }}>
        Hologramism
      </h1>
      <p style={{ color: '#8a8a9a', fontSize: 13, marginBottom: 24, textAlign: 'center' }}>
        Drag the card to tilt it — or watch it auto-orbit.
      </p>

      {/* Hologram card */}
      <div
        style={{
          position: 'relative',
          width: 300,
          height: 190,
          borderRadius: 18,
          marginBottom: 28,
          overflow: 'hidden',
          background: '#0a0a0f',
          flexShrink: 0,
        }}
      >
        {overlay && (
          <img
            src="https://picsum.photos/seed/holo/600/380"
            crossOrigin="anonymous"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            alt=""
          />
        )}
        <HologramCanvas
          style={{ position: 'absolute', inset: 0 }}
          intensity={0.95}
          gratingFrequency={6}
          iridescence={0.65}
          sparkleDensity={0.35}
          sparkleIntensity={0.5}
          glare={glare}
          tilt={{ autoOrbit, gesture: true }}
          {...hologramProps}
        />
      </div>

      <div style={{ width: '100%', maxWidth: 560 }}>
        <Section title="Mode">
          <Chip label="single" active={!multiplex} onClick={() => setMultiplex(false)} />
          <Chip label="multiplex (kinegram)" active={multiplex} onClick={() => setMultiplex(true)} />
        </Section>

        <Section title="Shape">
          {SHAPES.map((s) => (
            <Chip key={s} label={s} active={shapeName === s} onClick={() => setShapeName(s)} />
          ))}
        </Section>

        <Section title="Layout (placement / repeat)">
          {LAYOUTS.map((l, i) => (
            <Chip key={l.label} label={l.label} active={layoutIdx === i} onClick={() => setLayoutIdx(i)} />
          ))}
        </Section>

        {multiplex ? (
          <>
            {layers.map((l, i) => (
              <LayerCard
                key={i}
                index={i}
                layer={l}
                onChange={(nl) => setLayer(i, nl)}
                onRemove={layers.length > 1 ? () => removeLayer(i) : undefined}
              />
            ))}
            {layers.length < MAX_LAYERS && (
              <button
                onClick={addLayer}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  borderRadius: 14,
                  border: '1px dashed #3a3a6a',
                  background: 'transparent',
                  color: '#8a8aff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: 14,
                }}
              >
                + Add layer
              </button>
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
                  onClick={() => setColorIdx(i)}
                />
              ))}
            </Section>
            <Section title="Pattern">
              {PRESETS.map((p) => (
                <Chip
                  key={p as string}
                  label={p as string}
                  active={preset === p}
                  onClick={() => setPreset(p)}
                />
              ))}
            </Section>
          </>
        )}

        <Section title="Glare (light sweep)">
          {GLARES.map((g) => (
            <Chip key={g.label} label={g.label} active={glare === g.value} onClick={() => setGlare(g.value)} />
          ))}
        </Section>

        <Section title="Overlay on photo (picsum)">
          <Chip label="off" active={!overlay} onClick={() => setOverlay(false)} />
          <Chip label="on" active={overlay} onClick={() => setOverlay(true)} />
        </Section>

        <Section title="Auto-orbit">
          <Chip label="off" active={!autoOrbit} onClick={() => setAutoOrbit(false)} />
          <Chip label="on" active={autoOrbit} onClick={() => setAutoOrbit(true)} />
        </Section>
      </div>
    </div>
  );
}
