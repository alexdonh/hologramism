/**
 * Hologramism web demo; mirrors examples/react-native/App.tsx.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  HologramCanvas,
  HologramColorMode,
  HologramLayout,
  HologramPreset,
  HologramShape,
  Layout,
} from '@hologramism/browser';
import { ACCEPTED, PickedImage, fileToPicked, firstImage, pickedShape } from './pickImage';

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

// `yours` / `yours·masked` are only offered once the user has supplied an image.
type ShapeName =
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'star'
  | 'bird'
  | 'bird·masked'
  | 'yours'
  | 'yours·masked';
const SHAPES: ShapeName[] = ['rect', 'circle', 'ellipse', 'star', 'bird', 'bird·masked'];
const CUSTOM_SHAPES: ShapeName[] = ['yours', 'yours·masked'];

function shapeValue(name: ShapeName, picked: PickedImage | null): HologramShape {
  switch (name) {
    case 'star':
      return { type: 'polygon', points: STAR };
    case 'rect':
      return { type: 'rect', cornerRadius: 0.18 };
    case 'bird':
      return { type: 'png', uri: `${import.meta.env.BASE_URL}bird.png`, mode: 'image' };
    case 'bird·masked':
      return { type: 'png', uri: `${import.meta.env.BASE_URL}bird.png`, mode: 'mask' };
    case 'yours':
    case 'yours·masked':
      // Falls back to a plain rect if the image was cleared mid-render.
      return picked
        ? pickedShape(picked, name === 'yours' ? 'image' : 'mask')
        : { type: 'rect', cornerRadius: 0.18 };
    default:
      return { type: name };
  }
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------
const chipBase: React.CSSProperties = {
  padding: '7px 14px',
  borderRadius: 20,
  border: '1px solid transparent',
  cursor: 'pointer',
  fontSize: 13,
  lineHeight: '18px',
  fontFamily: 'inherit',
  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
};

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...chipBase,
        background: active ? '#4a4aff' : '#1c1c26',
        color: active ? '#fff' : '#9a9aaa',
        fontWeight: active ? 700 : 400,
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

/**
 * Dashed pill that takes an image by click or by drop. Sits inside the Shape
 * section next to the built-in shape chips.
 */
function PickPill({
  picked,
  dragging,
  onFile,
  onClear,
}: {
  picked: PickedImage | null;
  dragging: boolean;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (picked) {
    return (
      <button
        onClick={onClear}
        title={`Remove ${picked.name}`}
        aria-label={`Remove ${picked.name}`}
        style={{
          ...chipBase,
          borderColor: '#2a2a38',
          background: 'transparent',
          color: '#7a7a8a',
          fontWeight: 400,
        }}
      >
        ✕
      </button>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = firstImage(e.target.files);
          if (f) onFile(f);
          e.target.value = ''; // allow re-picking the same file
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        style={{
          ...chipBase,
          borderColor: dragging ? '#8a8aff' : '#33334d',
          borderStyle: 'dashed',
          background: dragging ? '#1e1e3c' : 'transparent',
          color: dragging ? '#a8a8ff' : '#8a8aff',
          fontWeight: 600,
        }}
      >
        ⬆ drop or pick an image
      </button>
    </>
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
  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  const acceptFile = useCallback(async (file: File) => {
    setPickError(null);
    try {
      setPicked(await fileToPicked(file));
      setShapeName('yours');
    } catch (e) {
      setPickError(`could not read ${file.name}: ${e instanceof Error ? e.message : e}`);
    }
  }, []);

  const clearPicked = useCallback(() => {
    setPicked(null);
    setPickError(null);
    setShapeName((prev) => (CUSTOM_SHAPES.includes(prev) ? 'rect' : prev));
  }, []);

  // Revoke the object URL once it is no longer the current one — this cleanup
  // runs both when `picked` is replaced/cleared and when the page tears down.
  useEffect(() => {
    const url = picked?.objectUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [picked]);

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(true);
    },
    // Ignore leaves that just move onto a child element, which would flicker.
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = firstImage(e.dataTransfer.files);
      if (f) void acceptFile(f);
    },
  };

  const shape = shapeValue(shapeName, picked);
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
        Drag the card to tilt it, or watch it auto-orbit.
      </p>

      {/* Hologram card — also a drop target for bring-your-own-image */}
      <div
        {...dropHandlers}
        style={{
          position: 'relative',
          width: 300,
          height: 190,
          borderRadius: 18,
          marginBottom: 28,
          overflow: 'hidden',
          background: '#0a0a0f',
          flexShrink: 0,
          outline: dragging ? '2px dashed #8a8aff' : 'none',
          outlineOffset: 4,
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
          grating={6}
          iridescence={0.65}
          sparkle={{ density: 0.35, intensity: 0.5 }}
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

        <div {...dropHandlers}>
          <Section title="Shape">
            {SHAPES.map((s) => (
              <Chip key={s} label={s} active={shapeName === s} onClick={() => setShapeName(s)} />
            ))}
            {picked &&
              CUSTOM_SHAPES.map((s) => (
                <Chip key={s} label={s} active={shapeName === s} onClick={() => setShapeName(s)} />
              ))}
            <PickPill
              picked={picked}
              dragging={dragging}
              onFile={(f) => void acceptFile(f)}
              onClear={clearPicked}
            />
          </Section>
          <div
            style={{
              color: pickError ? '#ff6a8a' : '#6a6a7a',
              fontSize: 11,
              marginTop: -8,
              marginBottom: 14,
            }}
          >
            {pickError ?? 'PNG or SVG with transparency works best for ·masked.'}
          </div>
        </div>

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
