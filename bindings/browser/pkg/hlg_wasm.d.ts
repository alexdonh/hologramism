/* tslint:disable */
/* eslint-disable */

/**
 * Hologram engine handle exposed to JavaScript.
 */
export class HologramEngine {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Create a new engine sized to `width × height` pixels.
     * `initGpu()` must have been awaited first.
     * If `canvas` is supplied, the engine renders directly to it via a WebGPU
     * surface instead of reading back to CPU memory.
     */
    static create(width: number, height: number, canvas?: HTMLCanvasElement | null): HologramEngine;
    /**
     * Return `[width, height]`.
     */
    dimensions(): Array<any>;
    /**
     * Render one frame to the attached canvas surface (no readback).
     * Throws if no surface is attached; use `renderRgba` for headless mode.
     */
    render(): void;
    /**
     * Render one frame and return `width*height*4` RGBA8 bytes.
     * Yields to the JS event loop while the GPU readback completes.
     */
    renderRgba(): Promise<Uint8Array>;
    /**
     * Reconfigure the attached surface to a new pixel size.
     */
    resizeSurface(width: number, height: number): void;
    /**
     * Upload a raw image asset referenced by scene shapes.
     * `kind`: 0 = PNG, 1 = SVG. Returns `false` on bad kind.
     */
    setAsset(id: number, kind: number, data: Uint8Array): boolean;
    /**
     * Feed device orientation as a unit quaternion (x, y, z, w).
     */
    setOrientation(x: number, y: number, z: number, w: number): void;
    /**
     * Apply a JSON scene document. Throws on parse/build failure.
     */
    setScene(json: string): void;
    /**
     * Advance the animation clock (seconds since first frame).
     */
    setTime(t: number): void;
}

/**
 * Initialise the shared WebGPU device. Must be awaited once before creating
 * any `HologramEngine`. Subsequent calls are no-ops.
 * Rejects if WebGPU is unavailable (no adapter / device creation failed).
 */
export function initGpu(): Promise<void>;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_hologramengine_free: (a: number, b: number) => void;
    readonly hologramengine_create: (a: number, b: number, c: number) => [number, number, number];
    readonly hologramengine_dimensions: (a: number) => any;
    readonly hologramengine_render: (a: number) => [number, number];
    readonly hologramengine_renderRgba: (a: number) => any;
    readonly hologramengine_resizeSurface: (a: number, b: number, c: number) => [number, number];
    readonly hologramengine_setAsset: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly hologramengine_setOrientation: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly hologramengine_setScene: (a: number, b: number, c: number) => [number, number];
    readonly hologramengine_setTime: (a: number, b: number) => void;
    readonly initGpu: () => any;
    readonly hlg_abi_version: () => number;
    readonly hlg_attach_surface: (a: number, b: number) => number;
    readonly hlg_create: (a: number) => number;
    readonly hlg_destroy: (a: number) => void;
    readonly hlg_dimensions: (a: number, b: number, c: number) => void;
    readonly hlg_last_error: () => number;
    readonly hlg_render: (a: number) => number;
    readonly hlg_render_rgba: (a: number, b: number, c: number) => number;
    readonly hlg_set_asset: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly hlg_set_orientation: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly hlg_set_scene: (a: number, b: number, c: number) => number;
    readonly hlg_set_time: (a: number, b: number) => void;
    readonly wasm_bindgen__convert__closures_____invoke__hda436c504d5cba3e: (a: number, b: number, c: any) => [number, number];
    readonly wasm_bindgen__convert__closures_____invoke__h1cbebd78309b5fcf: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h4828e64c9c4622b2: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h4828e64c9c4622b2_2: (a: number, b: number, c: any) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_destroy_closure: (a: number, b: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
