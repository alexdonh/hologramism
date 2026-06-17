/**
 * Thin wrapper over the wasm-pack output (`pkg/hlg_wasm.js`).
 * Handles lazy init, asset upload, and scene application.
 *
 * Import flow:
 *   await initHologramism();          // once per page
 *   const eng = createEngine(w, h, canvas);   // one per canvas
 *   eng.setScene(scene, assets);      // whenever props change
 *   eng.setOrientation(x,y,z,w);      // per frame
 *   eng.setTime(t);
 *   await eng.renderSurface();        // GPU presentation path
 *   eng.destroy();
 */

// Dynamic import so callers that tree-shake this module don't pull in the
// heavy wasm blob unless they actually use it.
let wasmInit: null | Promise<void> = null;
let wasm: typeof import('../pkg/hlg_wasm.js') | null = null;

export async function initHologramism(): Promise<void> {
  if (wasm) return;
  if (!wasmInit) {
    wasmInit = (async () => {
      const mod = await import('../pkg/hlg_wasm.js');
      await mod.default(); // wasm-pack `init` — fetches + compiles the .wasm
      await mod.initGpu(); // async GPU device init (wasm32 path)
      wasm = mod;
    })();
  }
  return wasmInit;
}

// ---------------------------------------------------------------------------
// Asset kind codes — mirror crates/ffi/src/scene.rs `AssetKind`
// ---------------------------------------------------------------------------
const ASSET_PNG = 0;
const ASSET_SVG = 1;

// ---------------------------------------------------------------------------
// Resolved asset for upload
// ---------------------------------------------------------------------------
export interface ResolvedAsset {
  id: number;
  kind: number; // 0 = PNG, 1 = SVG
  bytes: Uint8Array;
}

export class HologramEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HologramEngineError';
  }
}

// ---------------------------------------------------------------------------
// Resolve png/svg shape references in the scene object to asset ids, fetching
// remote URIs as needed. Returns the cleaned scene + asset list.
// ---------------------------------------------------------------------------
export async function resolveAssets(
  scene: Record<string, unknown>,
): Promise<{ scene: Record<string, unknown>; assets: ResolvedAsset[] }> {
  const mutableScene = JSON.parse(JSON.stringify(scene)) as Record<string, unknown>;
  const layers = mutableScene.layers as Record<string, unknown>[] | undefined;
  if (!layers) return { scene: mutableScene, assets: [] };

  const assets: ResolvedAsset[] = [];
  let nextId = 0;

  for (const layer of layers) {
    const shape = layer.shape as Record<string, unknown> | undefined;
    if (!shape) continue;
    const type = shape.type as string | undefined;
    if (type !== 'png' && type !== 'svg') continue;

    const kind = type === 'svg' ? ASSET_SVG : ASSET_PNG;
    const id = nextId++;
    let bytes: Uint8Array | null = null;

    if (typeof shape.svg === 'string') {
      bytes = new TextEncoder().encode(shape.svg as string);
    } else if (typeof shape.base64 === 'string') {
      bytes = base64ToBytes(shape.base64 as string);
    } else if (typeof shape.uri === 'string') {
      const resp = await fetch(shape.uri as string);
      if (!resp.ok) {
        throw new HologramEngineError(
          `failed to fetch asset ${shape.uri}: ${resp.status} ${resp.statusText}`,
        );
      }
      const contentType = resp.headers.get('content-type') ?? '';
      if (
        kind === ASSET_PNG &&
        !contentType.includes('image/png') &&
        !contentType.includes('application/octet-stream')
      ) {
        // Allow unknown content types; warn only.
        console.warn('[@hologramism/browser] unexpected content-type for PNG asset:', contentType);
      }
      bytes = new Uint8Array(await resp.arrayBuffer());
    }

    if (bytes) {
      assets.push({ id, kind, bytes });
      // Rewrite shape to use asset id, remove inline data.
      layer.shape = { type, asset: id, mode: shape.mode ?? 'image' };
    } else {
      delete layer.shape;
    }
  }

  return { scene: mutableScene, assets };
}

function base64ToBytes(b64: string): Uint8Array {
  try {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  } catch (e) {
    throw new HologramEngineError(`invalid base64 asset: ${e}`);
  }
}

// ---------------------------------------------------------------------------
// EngineWrapper — safe JS handle over the wasm HologramEngine
// ---------------------------------------------------------------------------
export class EngineWrapper {
  private eng: import('../pkg/hlg_wasm.js').HologramEngine;
  // Set to true in destroy() so every method silently no-ops after free(),
  // preventing null-pointer errors from in-flight async operations.
  private freed = false;

  constructor(eng: import('../pkg/hlg_wasm.js').HologramEngine) {
    this.eng = eng;
  }

  async setScene(scene: object): Promise<void> {
    if (this.freed) return;
    const { scene: resolved, assets } = await resolveAssets(
      scene as Record<string, unknown>,
    );
    // Check again after the async asset resolution — the engine may have been
    // destroyed while we were fetching.
    if (this.freed) return;
    for (const a of assets) {
      this.eng.setAsset(a.id, a.kind, a.bytes);
    }
    this.eng.setScene(JSON.stringify(resolved));
  }

  setOrientation(x: number, y: number, z: number, w: number): void {
    if (this.freed) return;
    this.eng.setOrientation(x, y, z, w);
  }

  setTime(t: number): void {
    if (this.freed) return;
    this.eng.setTime(t);
  }

  /** GPU-present path. */
  renderSurface(): void {
    if (this.freed) return;
    this.eng.render();
  }

  /** Headless readback path (tests / no canvas). */
  async renderRgba(): Promise<Uint8Array> {
    if (this.freed) return new Uint8Array(0);
    return this.eng.renderRgba();
  }

  resizeSurface(width: number, height: number): void {
    if (this.freed) return;
    this.eng.resizeSurface(width, height);
  }

  dimensions(): [number, number] {
    if (this.freed) return [0, 0];
    const arr = this.eng.dimensions() as [number, number];
    return arr;
  }

  destroy(): void {
    if (this.freed) return;
    this.freed = true;
    this.eng.free();
  }
}

export async function createEngine(
  width: number,
  height: number,
  canvas?: HTMLCanvasElement,
): Promise<EngineWrapper> {
  await initHologramism();
  const eng = wasm!.HologramEngine.create(width, height, canvas);
  return new EngineWrapper(eng);
}
