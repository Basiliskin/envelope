// Shared build helper for the M0 probes.
//
// Each probe is a single-file HTML artifact that runs under file:// without
// any module fetches. The build:
//   1. Uses Vite + the standard `new Worker(new URL(...))` pattern so the
//      worker's full dependency graph (including any WASM) is processed by
//      Rollup as a worker chunk.
//   2. Runs `m0-inline-worker` after `vite:worker` to hoist the worker
//      source into a `window.__W_<name>_WORKER_SRC__` global injected before
//      the main script.
//   3. Runs `m0-inline-assets` after Rollup finishes to inline every
//      remaining JS chunk and CSS asset into <head>.
//
// Probes spawn workers via `URL.createObjectURL(blob)` — the only reliable
// way to get a module worker running under file:// from a single-file build.

import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

function inlineWorkerToGlobal(globalName: string): Plugin {
  return {
    name: 'm0-inline-worker',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const workerEntry = Object.keys(bundle).find(
        (k) => k.includes('argon2.worker') || k.includes('worker'),
      );
      if (workerEntry === undefined) return;
      const file = bundle[workerEntry];
      if (file === undefined) return;
      let source: string;
      if (file.type === 'asset') {
        source = typeof file.source === 'string' ? file.source : String(file.source);
      } else if (file.type === 'chunk') {
        source = file.code;
      } else {
        return;
      }
      const escaped = JSON.stringify(source);
      const injectScript = `<script>window.${globalName}=${escaped};</script>`;
      for (const fileName of Object.keys(bundle)) {
        const f = bundle[fileName];
        if (f !== undefined && f.type === 'asset' && f.fileName.endsWith('.html')) {
          const htmlSource = typeof f.source === 'string' ? f.source : String(f.source);
          f.source = htmlSource.replace('</head>', `${injectScript}</head>`);
        }
      }
      delete bundle[workerEntry];
    },
  };
}

function inlineAllJsAndCss(): Plugin {
  return {
    name: 'm0-inline-assets',
    enforce: 'post',
    // `generateBundle` runs BEFORE Rollup writes any files, so mutating
    // `htmlAsset.source` here is reflected on disk.
    generateBundle(_options, bundle) {
      const htmlEntry = Object.keys(bundle).find(
        (k) => bundle[k]?.type === 'asset' && k.endsWith('.html'),
      );
      if (htmlEntry === undefined) return;
      const htmlAsset = bundle[htmlEntry];
      if (htmlAsset === undefined || htmlAsset.type !== 'asset') return;
      let html: string = typeof htmlAsset.source === 'string'
        ? htmlAsset.source
        : String(htmlAsset.source);

      const inlined: string[] = [];
      for (const key of Object.keys(bundle)) {
        const file = bundle[key];
        if (file === undefined || key === htmlEntry) continue;
        if (file.type === 'chunk' && file.isEntry) {
          html = html.replace(
            new RegExp(`<script[^>]*src=["']\\.?\\/?${escapeRegExp(file.fileName)}["'][^>]*>\\s*</script>`),
            `<script type="module">${file.code.replace(/<\/script>/g, '<\\/script>')}</script>`,
          );
          inlined.push(file.fileName);
          delete bundle[key];
        } else if (file.type === 'asset' && file.fileName.endsWith('.css')) {
          const css = typeof file.source === 'string' ? file.source : String(file.source);
          html = html.replace(
            new RegExp(`<link[^>]*href=["']\\.?\\/?${escapeRegExp(file.fileName)}["'][^>]*>`),
            `<style>${css}</style>`,
          );
          inlined.push(file.fileName);
          delete bundle[key];
        }
      }

      htmlAsset.source = html;
      if (inlined.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(`[m0-inline-assets] inlined: ${inlined.join(', ')}`);
      }
    },
    // `writeBundle` is too late to mutate the HTML on disk, but it can clean
    // up any leftover chunks that Vite already wrote.
    async writeBundle(options, _bundle) {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const outDir = path.resolve(options.dir ?? '.');
      try {
        const entries = await fs.readdir(outDir);
        for (const e of entries) {
          if (e.endsWith('.js') || e.endsWith('.css')) {
            await fs.unlink(path.resolve(outDir, e)).catch(() => undefined);
          }
        }
        await fs.rmdir(path.resolve(outDir, 'assets')).catch(() => undefined);
      } catch {
        // ignore
      }
      void _bundle;
    },
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface SpikeBuildOptions {
  readonly workerGlobalName: string;
  readonly workerFilenameHint: string;
  readonly rootDir: string;
}

export function createSpikeConfig(opts: SpikeBuildOptions): ReturnType<typeof defineConfig> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // __dirname is the directory of build.ts, which is spikes/m0/. Each probe
  // is a subdirectory directly under spikes/m0/.
  const rootResolved = resolve(__dirname, opts.rootDir);
  return defineConfig({
    root: rootResolved,
    publicDir: false,
    build: {
      outDir: resolve(rootResolved, 'dist'),
      emptyOutDir: true,
      target: 'es2022',
      minify: 'esbuild',
      cssCodeSplit: false,
      rollupOptions: {
        input: resolve(rootResolved, 'index.html'),
        output: {
          entryFileNames: 'assets/main-[hash].js',
          chunkFileNames: `assets/${opts.workerFilenameHint}-[hash].js`,
          assetFileNames: 'assets/[name]-[hash][extname]',
          manualChunks: undefined,
        },
      },
    },
    worker: {
      format: 'es',
    },
    plugins: [
      inlineWorkerToGlobal(opts.workerGlobalName),
      inlineAllJsAndCss(),
    ],
  });
}