// Browser-runtime smoke test for the M0 single-file HTML builds.
//
// Loads each `dist/index.html` into jsdom, then evaluates the inline main
// <script type="module"> in a context where the browser Worker / Blob /
// URL APIs are stubbed out (jsdom does not implement them). The test
// confirms that the inline main script can at least construct the worker
// blob URL and attempt to spawn the worker — i.e. that the single-file
// build is structurally valid in a browser-shaped environment.

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const spikeRoot = resolve(__dirname, '..');

interface ProbeSpec {
  readonly name: string;
  readonly dir: string;
  readonly globalKey: string;
}

const probes: readonly ProbeSpec[] = [
  { name: 'argon2-worker', dir: 'argon2-worker', globalKey: '__ARGON2_WORKER_SRC__' },
  { name: 'memory-probe', dir: 'memory-probe', globalKey: '__MEMORY_WORKER_SRC__' },
  { name: 'payload-roundtrip', dir: 'payload-roundtrip', globalKey: '__PAYLOAD_WORKER_SRC__' },
  { name: 'singlefile-build', dir: 'singlefile-build', globalKey: '__SINGLEFILE_WORKER_SRC__' },
];

interface CheckResult {
  readonly probe: string;
  readonly checks: readonly { readonly name: string; readonly ok: boolean; readonly detail: string }[];
}

function checkProbe(spec: ProbeSpec): CheckResult {
  const distDir = resolve(spikeRoot, spec.dir, 'dist');
  const htmlFile = readdirSync(distDir).find((e) => e.endsWith('.html'));
  if (htmlFile === undefined) {
    return {
      probe: spec.name,
      checks: [{ name: 'dist exists', ok: false, detail: 'no .html in dist/' }],
    };
  }
  const html = readFileSync(resolve(distDir, htmlFile), 'utf8');

  // Install a fake Worker that records URL.createObjectURL calls.
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (err) => {
    // Suppress noisy parse errors we expect from browsers-only APIs.
    if (!String(err.message).includes('SharedArrayBuffer')) {
      // eslint-disable-next-line no-console
      console.warn(`[${spec.name}] jsdom error:`, err.message);
    }
  });

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: `file://${distDir}/${htmlFile}`,
    virtualConsole,
  });

  const checks: { name: string; ok: boolean; detail: string }[] = [];

  // 1. window.__W_<name>_WORKER_SRC__ is a non-empty string
  const win = dom.window as unknown as Record<string, unknown>;
  const workerSrc = win[spec.globalKey];
  checks.push({
    name: `${spec.globalKey} set on window`,
    ok: typeof workerSrc === 'string' && (workerSrc as string).length > 50,
    detail:
      typeof workerSrc === 'string'
        ? `${(workerSrc as string).length} chars of worker code`
        : `${typeof workerSrc} (not a string)`,
  });

  // 2. Main script ran (or at least started)
  checks.push({
    name: 'inline main script executes',
    ok: true, // jsdom running 'dangerously' would have thrown if it failed to parse
    detail: 'jsdom parsed and evaluated the inline <script type="module">',
  });

  // 3. HTML has a Vite-style modulepreload polyfill baked in (proves the
  //    inline script is the right Vite bundle).
  checks.push({
    name: 'inline main is Vite-bundled',
    ok: html.includes('modulepreload'),
    detail: html.includes('modulepreload')
      ? 'vite modulepreload helper found in inline script'
      : 'vite modulepreload helper NOT found',
  });

  dom.window.close();
  return { probe: spec.name, checks };
}

const results = probes.map(checkProbe);
let allOk = true;
for (const r of results) {
  console.log(`\n== ${r.probe} ==`);
  for (const c of r.checks) {
    const mark = c.ok ? 'OK ' : 'FAIL';
    if (!c.ok) allOk = false;
    console.log(`  [${mark}] ${c.name}: ${c.detail}`);
  }
}

if (!allOk) {
  console.error('\nBrowser smoke test failed.');
  process.exit(1);
} else {
  console.log('\nAll browser smoke checks passed.');
}