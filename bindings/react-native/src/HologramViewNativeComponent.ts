/**
 * The Fabric component spec. React Native's codegen reads this file and
 * generates the C++ props struct, the ObjC protocol and the Android
 * ViewManagerDelegate that the native halves implement.
 *
 * Both props are JSON strings, not objects. The scene schema is a recursive
 * union (layer arrays, shape variants, polygon point lists, palettes); codegen
 * can only express flat named object aliases, so nothing about it survives the
 * translation. Serializing once in JS and parsing once natively keeps a single
 * prop surface that both architectures -- and the other platform bindings --
 * already speak, since the engine itself takes the scene as JSON.
 *
 * `codegenNativeComponent` resolves to the Fabric component on the new
 * architecture and falls back to `requireNativeComponent` on the old one, so
 * this one file drives both.
 */

import type { HostComponent, ViewProps } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export interface NativeProps extends ViewProps {
  /** Canonical scene schema, JSON-encoded. */
  scene: string;
  /** Orientation / interaction toggles, JSON-encoded. */
  tilt: string;
}

export default codegenNativeComponent<NativeProps>(
  'HologramView',
) as HostComponent<NativeProps>;
