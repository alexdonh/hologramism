import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Resolve the monorepo root (two levels above examples/browser/).
const repoRoot = new URL('../..', import.meta.url).pathname;

const HEADERS = {
  // WebGPU requires a cross-origin isolated context.
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  // Project GitHub Pages serves under /hologramism/; local dev stays at root.
  base: process.env.GITHUB_PAGES ? '/hologramism/' : '/',
  plugins: [react()],
  server: {
    headers: HEADERS,
    fs: {
      // Allow serving files from the monorepo root so that
      // bindings/browser/pkg/*.wasm (two levels up) is reachable.
      allow: [repoRoot],
    },
  },
  preview: { headers: HEADERS },
  // Required for loading .wasm assets and wasm-pack output.
  optimizeDeps: {
    exclude: ['@hologramism/browser'],
  },
});
