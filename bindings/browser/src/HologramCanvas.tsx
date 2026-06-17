/**
 * HologramCanvas — React component that renders the hologram onto a
 * `<canvas>` element.
 *
 * Mirrors the RN `HologramView.swift` loop:
 *   mount → initGpu → create engine → setScene → rAF loop
 *
 * Tilt sources (same toggles as `tilt` prop in react-native):
 *   motion:    DeviceOrientationEvent → quaternion (requests iOS permission)
 *   gesture:   pointer drag → pan/tilt
 *   autoOrbit: idle sin/cos orbit (default when nothing else active)
 */

import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  useImperativeHandle,
  forwardRef,
  CSSProperties,
} from 'react';
import { buildScene, HologramProps } from './scene.js';
import { createEngine, EngineWrapper } from './engine.js';

export interface HologramCanvasProps extends HologramProps {
  style?: CSSProperties;
  className?: string;
}

export interface HologramCanvasHandle {
  /** Request device-motion permission (no-op on browsers without API). */
  requestMotion: () => Promise<void>;
}

const MAX_SIDE = 640;

function clampSize(cw: number, ch: number): [number, number] {
  const scale = Math.min(1, MAX_SIDE / Math.max(cw, ch, 1));
  return [Math.round(cw * scale) || 1, Math.round(ch * scale) || 1];
}

// Angle-axis → quaternion (degrees, ZY-rotations for device orientation).
function eulerToQuat(alpha: number, beta: number, gamma: number): [number, number, number, number] {
  const a = (alpha * Math.PI) / 360;
  const b = (beta * Math.PI) / 360;
  const g = (gamma * Math.PI) / 360;
  const ca = Math.cos(a), sa = Math.sin(a);
  const cb = Math.cos(b), sb = Math.sin(b);
  const cg = Math.cos(g), sg = Math.sin(g);
  return [
    ca * cb * sg - sa * sb * cg,
    ca * sb * cg + sa * cb * sg,
    sa * cb * cg - ca * sb * sg,
    ca * cb * cg + sa * sb * sg,
  ];
}

// Multiply two quaternions (a * b).
function quatMul(
  a: [number, number, number, number],
  b: [number, number, number, number],
): [number, number, number, number] {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

// Small rotation quaternion from yaw (dy) and pitch (dx) deltas.
function deltaQuat(dx: number, dy: number): [number, number, number, number] {
  const qx = [Math.sin(dy / 2), 0, 0, Math.cos(dy / 2)] as [number, number, number, number];
  const qy = [0, Math.sin(dx / 2), 0, Math.cos(dx / 2)] as [number, number, number, number];
  return quatMul(qy, qx);
}

function HologramCanvasImpl(
  { style, className, tilt, ...props }: HologramCanvasProps,
  ref: React.ForwardedRef<HologramCanvasHandle>,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EngineWrapper | null>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const orientRef = useRef<[number, number, number, number]>([0, 0, 0, 1]);
  // Pending scene to apply at the *start* of the next rAF tick, before any
  // render call.  Setting it here instead of calling setScene directly
  // prevents the wasm-bindgen "recursive use" borrow error that occurs when
  // setScene/setAsset is called while an async render is still in flight.
  const pendingSceneRef = useRef<object | null>(null);
  const [motionDenied, setMotionDenied] = useState(false);
  const [webgpuUnsupported, setWebgpuUnsupported] = useState(false);

  // Stable reference to latest props.
  const propsRef = useRef(props);
  propsRef.current = props;

  const tiltMotion = tilt?.motion ?? false;
  const tiltGesture = tilt?.gesture !== false;
  const autoOrbit = tilt?.autoOrbit !== false;

  // ── Device orientation ────────────────────────────────────────────────────
  const [motionPermission, setMotionPermission] = useState<
    'unknown' | 'granted' | 'denied'
  >(tiltMotion ? 'unknown' : 'denied');

  const requestMotion = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DOE = DeviceOrientationEvent as any;
    if (typeof DOE.requestPermission === 'function') {
      try {
        const result = await DOE.requestPermission();
        setMotionPermission(result === 'granted' ? 'granted' : 'denied');
        if (result !== 'granted') setMotionDenied(true);
      } catch {
        setMotionPermission('denied');
        setMotionDenied(true);
      }
    } else {
      setMotionPermission('granted');
    }
  }, []);

  useImperativeHandle(ref, () => ({ requestMotion }), [requestMotion]);

  useEffect(() => {
    if (!tiltMotion) return;
    if (motionPermission !== 'granted') return;

    const handler = (e: DeviceOrientationEvent) => {
      const q = eulerToQuat(e.alpha ?? 0, e.beta ?? 0, e.gamma ?? 0);
      orientRef.current = q;
    };
    window.addEventListener('deviceorientation', handler, true);
    return () => window.removeEventListener('deviceorientation', handler, true);
  }, [tiltMotion, motionPermission]);

  // ── Pointer drag ──────────────────────────────────────────────────────────
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!tiltGesture) return;
      pointerRef.current = { x: e.clientX, y: e.clientY };
    },
    [tiltGesture],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!tiltGesture || !pointerRef.current) return;
      const last = pointerRef.current;
      const dx = (e.clientX - last.x) / 200;
      const dy = (e.clientY - last.y) / 200;
      pointerRef.current = { x: e.clientX, y: e.clientY };
      // Accumulate small rotation deltas so the tilt persists after release.
      orientRef.current = quatMul(deltaQuat(dx, dy), orientRef.current);
    },
    [tiltGesture],
  );

  const onPointerUp = useCallback(() => {
    pointerRef.current = null;
  }, []);

  // ── Engine lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let alive = true;
    let engine: EngineWrapper | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const setupCanvas = () => {
      const cw = canvas.offsetWidth || 300;
      const ch = canvas.offsetHeight || 300;
      const [rw, rh] = clampSize(cw, ch);
      canvas.width = rw;
      canvas.height = rh;
      return [rw, rh] as [number, number];
    };

    (async () => {
      const [rw, rh] = setupCanvas();

      try {
        engine = await createEngine(rw, rh, canvas);
      } catch (err) {
        console.error('[HologramCanvas] engine init failed:', err);
        if (alive) setWebgpuUnsupported(true);
        return;
      }

      if (!alive) {
        engine.destroy();
        return;
      }
      engineRef.current = engine;

      // Observe CSS-size changes and reconfigure the surface.
      resizeObserver = new ResizeObserver(() => {
        if (!alive || !canvas) return;
        const [cw, ch] = setupCanvas();
        engine?.resizeSurface(cw, ch);
      });
      resizeObserver.observe(canvas);

      // Queue the initial scene; the first rAF tick will apply it.
      pendingSceneRef.current = buildScene(propsRef.current);

      startRef.current = performance.now();

      const tick = async () => {
        if (!alive || !engine) return;
        try {
          // Apply a queued scene update before rendering.  Doing it here — not
          // in a separate effect — prevents the wasm-bindgen "recursive use"
          // borrow error that occurs when setScene/setAsset is called while an
          // async render is still in flight.
          const pending = pendingSceneRef.current;
          if (pending) {
            pendingSceneRef.current = null;
            await engine.setScene(pending);
            if (!alive) return;
          }

          const t = (performance.now() - startRef.current) / 1000;
          let q = orientRef.current;

          if (autoOrbit && !pointerRef.current && motionPermission !== 'granted') {
            const fx = Math.sin(t * 0.4) * 0.2;
            const fy = Math.cos(t * 0.3) * 0.2;
            const fz = 0;
            const fw = Math.sqrt(Math.max(0, 1 - fx * fx - fy * fy - fz * fz));
            const orbit: [number, number, number, number] = [fx, fy, fz, fw];
            q = quatMul(orbit, q);
          }

          engine.setOrientation(q[0], q[1], q[2], q[3]);
          engine.setTime(t);
          engine.renderSurface();
        } catch (err) {
          // If the component unmounted while this tick was in flight, the engine
          // will have been freed and wasm throws null-pointer / recursive-use
          // errors.  Silently drop them — the loop stops because alive is false.
          if (!alive) return;
          console.error('[HologramCanvas] render error:', err);
          return;
        }

        if (alive) rafRef.current = requestAnimationFrame(() => void tick());
      };

      rafRef.current = requestAnimationFrame(() => void tick());
    })();

    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
      resizeObserver?.disconnect();
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Scene update (no re-mount) ────────────────────────────────────────────
  // Write to pendingSceneRef so the rAF tick picks it up between frames,
  // never concurrently with an in-flight renderRgba call.
  useEffect(() => {
    pendingSceneRef.current = buildScene(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.shape,
    props.preset,
    props.color,
    props.layout,
    props.layers,
    props.intensity,
    props.gratingFrequency,
    props.iridescence,
    props.sparkleDensity,
    props.sparkleIntensity,
    props.highlightSharpness,
    props.glare,
    props.background,
  ]);

  // ── Fallbacks ─────────────────────────────────────────────────────────────
  if (webgpuUnsupported) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111',
          color: '#e44',
          fontFamily: 'sans-serif',
          fontSize: 14,
          ...style,
        }}
        className={className}
      >
        WebGPU is not supported in this browser.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', ...style }} className={className}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
      {tiltMotion && motionPermission === 'unknown' && (
        <button
          onClick={() => void requestMotion()}
          style={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '6px 14px',
            background: 'rgba(0,0,0,0.55)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 20,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Enable motion
        </button>
      )}
      {motionDenied && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 11,
            whiteSpace: 'nowrap',
          }}
        >
          Motion denied — using auto-orbit
        </div>
      )}
    </div>
  );
}

export const HologramCanvas = forwardRef(HologramCanvasImpl);
export default HologramCanvas;
