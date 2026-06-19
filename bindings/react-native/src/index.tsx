import React from 'react';
import { requireNativeComponent, ViewProps } from 'react-native';

// ---------------------------------------------------------------------------
// Public types — the ergonomic face of the canonical scene schema. Strings are
// shorthands; objects unlock per-variant fields. Everything resolves to the
// same JSON the native side (and every other platform) parses.
// ---------------------------------------------------------------------------

export type ShapeKind = 'rect' | 'circle' | 'ellipse';
export type ImageMode = 'mask' | 'image';

export type HologramShape =
  | ShapeKind
  | { type: 'rect'; cornerRadius?: number }
  | { type: 'circle' }
  | { type: 'ellipse' }
  /** Arbitrary closed polygon; points normalized 0..1 of the view box. */
  | { type: 'polygon'; points: [number, number][]; closed?: boolean }
  /** Image geometry. `image` (default) keeps pixels as artwork; `mask` uses
   *  only the alpha and fills the silhouette with the layer's preset. */
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

// Generic preset config: the `type` narrows the remaining fields.
export type HologramPreset =
  | PresetKind
  | { type: 'linear'; angle?: number; freq?: number }
  | {
      type:
        | 'radial'
        | 'concentric'
        | 'guilloche'
        | 'dotMatrix'
        | 'rosette'
        | 'lattice'
        | 'rainbow';
      freq?: number;
    };

export type Vec2 = [number, number];

// Placement of the shape within the view: one sized/positioned copy, or a
// repeating grid. `size`/`gap` are fractions of the view (scalar = both axes).
// The pattern + color always span the whole layout, not each tile.
export type LayoutKind = 'single' | 'tile';
export type HologramLayout =
  | LayoutKind
  | { type: 'single'; size?: number | Vec2; position?: Vec2 }
  | { type: 'tile'; size?: number | Vec2; gap?: number | Vec2; fit?: 'cover' | 'fill' };

export type RGBA = [number, number, number, number];
// Enum string = spectrum or one of the 6 built-in palettes; a bare RGBA[] =
// custom palette. That's the full set.
export type HologramColorMode =
  | 'spectrum'
  | 'gold'
  | 'silver'
  | 'rainbowFoil'
  | 'emerald'
  | 'sapphire'
  | 'copper'
  | RGBA[];

/** Glint controls: `true`/`false` to enable/disable with defaults, or per-field overrides. */
export type Sparkle = boolean | { density?: number; intensity?: number };

export interface HologramLayer {
  shape?: HologramShape;
  preset?: HologramPreset;
  color?: HologramColorMode;
  /** Tilt direction (degrees) that reveals this layer in a multiplex. */
  azimuth?: number;
  /** Placement of the shape: a single copy or a repeating grid. */
  layout?: HologramLayout;
}

export interface HologramViewProps extends ViewProps {
  // Single-layer shorthand (the common case).
  shape?: HologramShape;
  preset?: HologramPreset;
  color?: HologramColorMode;
  // Placement of the shape: a single sized/positioned copy, or a repeating grid.
  layout?: HologramLayout;
  // Multi-layer / kinegram: one layer or N (array), revealed by `azimuth`.
  layers?: HologramLayer | HologramLayer[];
  // Overlay. Transparent (overlay-able) by default; set `background` (hex
  // string or RGBA array) to make it opaque.
  background?: string | RGBA;
  // Orientation / interaction (all default true).
  tilt?: { motion?: boolean; gesture?: boolean; autoOrbit?: boolean };
  // Look parameters, applied globally to the scene.
  intensity?: number;
  grating?: number;
  iridescence?: number;
  sparkle?: Sparkle;
  sharpness?: number;
  glare?: number;
}

// ---------------------------------------------------------------------------
// Builders — return plain, serializable config objects (NOT JSX), so they work
// identically across platforms while giving per-preset typed args.
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

// Layout builders — parallel to `Preset`. Return plain serializable objects.
export const Layout = {
  single: (o?: { size?: number | Vec2; position?: Vec2 }) => ({ type: 'single' as const, ...o }),
  tile: (o?: { size?: number | Vec2; gap?: number | Vec2; fit?: 'cover' | 'fill' }) => ({
    type: 'tile' as const,
    ...o,
  }),
};

// ---------------------------------------------------------------------------
// Resolution: props -> canonical scene object passed across the bridge.
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

// Pull only the defined look fields off an object.
function pickLook(o: HologramViewProps): Record<string, unknown> {
  const out: any = {};
  (['intensity', 'grating', 'iridescence', 'sharpness', 'glare'] as const).forEach(k => {
    if (o[k] != null) out[k] = o[k];
  });
  if (o.sparkle != null) out.sparkle = o.sparkle;
  return out;
}

function normLayer(l: HologramLayer): object {
  const out: any = {};
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

// "#rgb" | "#rrggbb" | "#rrggbbaa" -> [r,g,b,a] in 0..1.
function parseHex(hex: string): RGBA {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length === 6) h += 'ff';
  const n = parseInt(h, 16);
  return [
    ((n >>> 24) & 0xff) / 255,
    ((n >>> 16) & 0xff) / 255,
    ((n >>> 8) & 0xff) / 255,
    (n & 0xff) / 255,
  ];
}

function buildScene(props: HologramViewProps): object {
  const layersInput = props.layers
    ? Array.isArray(props.layers)
      ? props.layers
      : [props.layers]
    : [{ shape: props.shape, preset: props.preset, color: props.color, layout: props.layout }];

  const scene: any = { layers: layersInput.map(normLayer), ...pickLook(props) };

  // Top-level color (drives the global iridescence LUT).
  const topColor = normColor(props.color);
  if (topColor) scene.color = topColor;

  // Background: transparent by default; `background` (hex or RGBA) makes it opaque.
  if (props.background != null) {
    scene.background = Array.isArray(props.background)
      ? props.background
      : parseHex(props.background);
  } else {
    scene.background = [0, 0, 0, 0];
  }
  return scene;
}

// ---------------------------------------------------------------------------

interface NativeProps extends ViewProps {
  scene: object;
  tilt?: object;
}

const NativeHologramView = requireNativeComponent<NativeProps>('HologramView');

/**
 * Animated security-hologram view. Transparent / overlay-able by default and
 * reacts to device motion (or pan / idle auto-orbit on the simulator).
 */
export function HologramView(props: HologramViewProps) {
  const {
    shape,
    preset,
    color,
    layout,
    layers,
    background,
    tilt,
    intensity,
    grating,
    iridescence,
    sparkle,
    sharpness,
    glare,
    ...rest
  } = props;
  const scene = buildScene(props);
  return <NativeHologramView {...rest} scene={scene} tilt={tilt} />;
}

export default HologramView;
