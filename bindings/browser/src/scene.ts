/**
 * Scene types and helpers — web port of bindings/react-native/src/index.tsx.
 * Produces the same canonical JSON the Rust scene parser consumes.
 */

export type ShapeKind = 'rect' | 'circle' | 'ellipse';
export type ImageMode = 'mask' | 'image';

export type HologramShape =
  | ShapeKind
  | { type: 'rect'; cornerRadius?: number }
  | { type: 'circle' }
  | { type: 'ellipse' }
  | { type: 'polygon'; points: [number, number][]; closed?: boolean }
  | {
      type: 'png' | 'svg';
      uri?: string;
      base64?: string;
      svg?: string;
      mode?: ImageMode;
    };

export type PresetKind =
  | 'linear'
  | 'radial'
  | 'concentric'
  | 'guilloche'
  | 'dotMatrix'
  | 'rosette'
  | 'lattice'
  | 'rainbow';

export type HologramPreset =
  | PresetKind
  | { type: 'linear'; angle?: number; freq?: number }
  | {
      type: Exclude<PresetKind, 'linear'>;
      freq?: number;
    };

export type Vec2 = [number, number];

export type LayoutKind = 'single' | 'tile';
export type HologramLayout =
  | LayoutKind
  | { type: 'single'; size?: number | Vec2; position?: Vec2 }
  | { type: 'tile'; size?: number | Vec2; gap?: number | Vec2; fit?: 'cover' | 'fill' };

export type RGBA = [number, number, number, number];

export type HologramColorMode =
  | 'spectrum'
  | 'gold'
  | 'silver'
  | 'rainbowFoil'
  | 'emerald'
  | 'sapphire'
  | 'copper'
  | RGBA[];

export interface Look {
  intensity?: number;
  gratingFrequency?: number;
  iridescence?: number;
  sparkleDensity?: number;
  sparkleIntensity?: number;
  highlightSharpness?: number;
  glare?: number;
}

export interface HologramLayer {
  shape?: HologramShape;
  preset?: HologramPreset;
  color?: HologramColorMode;
  /** Tilt direction (degrees) that reveals this layer in a multiplex. */
  azimuth?: number;
  /** Placement of the shape: a single copy or a repeating grid. */
  layout?: HologramLayout;
}

export interface HologramProps extends Look {
  shape?: HologramShape;
  preset?: HologramPreset;
  color?: HologramColorMode;
  layout?: HologramLayout;
  layers?: HologramLayer | HologramLayer[];
  // Transparent by default; set `background` (hex string or RGBA) for opaque.
  background?: string | RGBA;
  tilt?: { motion?: boolean; gesture?: boolean; autoOrbit?: boolean };
}

// ---------------------------------------------------------------------------
// Preset builders
// ---------------------------------------------------------------------------
export const Preset = {
  linear: (o?: { angle?: number; freq?: number }) => ({ type: 'linear' as const, ...o }),
  radial: (o?: { freq?: number }) => ({ type: 'radial' as const, ...o }),
  concentric: (o?: { freq?: number }) => ({ type: 'concentric' as const, ...o }),
  guilloche: (o?: { freq?: number }) => ({ type: 'guilloche' as const, ...o }),
  dotMatrix: (o?: { freq?: number }) => ({ type: 'dotMatrix' as const, ...o }),
  rosette: (o?: { freq?: number }) => ({ type: 'rosette' as const, ...o }),
  lattice: (o?: { freq?: number }) => ({ type: 'lattice' as const, ...o }),
  rainbow: (o?: { freq?: number }) => ({ type: 'rainbow' as const, ...o }),
};

// Layout builders — parallel to `Preset`.
export const Layout = {
  single: (o?: { size?: number | Vec2; position?: Vec2 }) => ({ type: 'single' as const, ...o }),
  tile: (o?: { size?: number | Vec2; gap?: number | Vec2; fit?: 'cover' | 'fill' }) => ({
    type: 'tile' as const,
    ...o,
  }),
};

// ---------------------------------------------------------------------------
// Internal normalizers (props → canonical JSON)
// ---------------------------------------------------------------------------
const PALETTE_IDS = ['gold', 'silver', 'rainbowFoil', 'emerald', 'sapphire', 'copper'];

function normShape(s?: HologramShape): object | undefined {
  if (s == null) return undefined;
  if (typeof s === 'string') return { type: s };
  return { ...s };
}

function normPreset(p?: HologramPreset): object | undefined {
  if (p == null) return undefined;
  if (typeof p === 'string') return { type: p };
  return { ...p };
}

function normLayout(l?: HologramLayout): object | undefined {
  if (l == null) return undefined;
  if (typeof l === 'string') return { type: l };
  return { ...l };
}

function normColor(c?: HologramColorMode): object | undefined {
  if (c == null) return undefined;
  if (Array.isArray(c)) return { type: 'palette', colors: c };
  if (c === 'spectrum') return { type: 'spectrum' };
  if (PALETTE_IDS.includes(c)) return { type: 'preset', id: c };
  return { type: 'spectrum' };
}

function pickLook(o: Look): Partial<Look> {
  const out: Record<string, number> = {};
  (
    [
      'intensity',
      'gratingFrequency',
      'iridescence',
      'sparkleDensity',
      'sparkleIntensity',
      'highlightSharpness',
      'glare',
    ] as const
  ).forEach((k) => {
    if (o[k] != null) out[k] = o[k] as number;
  });
  return out;
}

export function normLayer(l: HologramLayer): object {
  const out: Record<string, unknown> = {};
  const shape = normShape(l.shape);
  const preset = normPreset(l.preset);
  const color = normColor(l.color);
  const layout = normLayout(l.layout);
  if (shape) out.shape = shape;
  if (preset) out.preset = preset;
  if (color) out.color = color;
  if (layout) out.layout = layout;
  if (l.azimuth != null) out.azimuth = l.azimuth;
  return out;
}

function parseHex(hex: string): RGBA {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length === 6) h += 'ff';
  const n = parseInt(h, 16);
  return [
    ((n >>> 24) & 0xff) / 255,
    ((n >>> 16) & 0xff) / 255,
    ((n >>> 8) & 0xff) / 255,
    (n & 0xff) / 255,
  ];
}

export function buildScene(props: HologramProps): object {
  const layersInput = props.layers
    ? Array.isArray(props.layers)
      ? props.layers
      : [props.layers]
    : [{ shape: props.shape, preset: props.preset, color: props.color, layout: props.layout }];

  const scene: Record<string, unknown> = {
    layers: layersInput.map(normLayer),
    ...pickLook(props),
  };

  const topColor = normColor(props.color);
  if (topColor) scene.color = topColor;

  if (props.background != null) {
    scene.background = Array.isArray(props.background)
      ? props.background
      : parseHex(props.background);
  } else {
    scene.background = [0, 0, 0, 0];
  }
  return scene;
}
