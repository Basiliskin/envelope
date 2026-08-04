// Smoke test for the M0 single-file HTML builds.
//
// Loads each probe's `dist/index.html` into jsdom, parses it, and checks:
//   - The HTML has the worker source embedded as a global string.
//   - The HTML has a single inline main <script type="module">.
//   - The HTML references no external assets.
//
// Note: jsdom cannot actually execute WebAssembly, run a Worker, or
// reproduce browser crypto. This smoke test is a structural check — the
// real validation is opening the HTML in Chrome / Firefox / Safari / Edge
// from disk and clicking the button.

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const spikeRoot = resolve(__dirname, '..');

interface ProbeSpec {
  readonly name: string;
  readonly dir: string;
  readonly globalKey: string;
  readonly expectedWorkerSize: { readonly min: number; readonly max: number };
}

const probes: readonly ProbeSpec[] = [
  {
    name: 'argon2-worker',
    dir: 'argon2-worker',
    globalKey: '__ARGON2_WORKER_SRC__',
    expectedWorkerSize: { min: 10_000, max: 200_000 },
  },
  {
    name: 'memory-probe',
    dir: 'memory-probe',
    globalKey: '__MEMORY_WORKER_SRC__',
    expectedWorkerSize: { min: 50, max: 5_000 },
  },
  {
    name: 'payload-roundtrip',
    dir: 'payload-roundtrip',
    globalKey: '__PAYLOAD_WORKER_SRC__',
    expectedWorkerSize: { min: 10_000, max: 200_000 },
  },
  {
    name: 'singlefile-build',
    dir: 'singlefile-build',
    globalKey: '__SINGLEFILE_WORKER_SRC__',
    expectedWorkerSize: { min: 10_000, max: 200_000 },
  },
];

interface CheckResult {
  readonly probe: string;
  readonly checks: readonly { readonly name: string; readonly ok: boolean; readonly detail: string }[];
}

function checkProbe(spec: ProbeSpec): CheckResult {
  const distDir = resolve(spikeRoot, spec.dir, 'dist');
  const entries = readdirSync(distDir);
  const checks: { name: string; ok: boolean; detail: string }[] = [];

  // Single-file check
  const onlyHtml =
    entries.length === 1 &&
    entries[0] !== undefined &&
    entries[0].endsWith('.html');
  checks.push({
    name: 'single file output',
    ok: onlyHtml,
    detail: onlyHtml
      ? `dist/ contains exactly one file: ${entries[0]}`
      : `dist/ contains: ${entries.join(', ')}`,
  });

  const htmlFile = entries.find((e) => e.endsWith('.html'));
  if (htmlFile === undefined) {
    return { probe: spec.name, checks };
  }
  const htmlPath = resolve(distDir, htmlFile);
  const html = readFileSync(htmlPath, 'utf8');

  // No external src/href references
  const externalRef = /(src|href)\s*=\s*["'](https?:|\/\/|\/(?!\/))/i;
  checks.push({
    name: 'no external asset references',
    ok: !externalRef.test(html),
    detail: externalRef.test(html)
      ? 'found src/href pointing at http(s) or absolute path'
      : 'no http(s):// or absolute-path src/href',
  });

  // Worker source embedded
  const workerKeyEscaped = spec.globalKey.replace(/[_-]/g, '\\$&');
  const workerRegex = new RegExp(`window\\.${workerKeyEscaped}=`);
  const hasWorkerSource = workerRegex.test(html);
  let workerSize = 0;
  if (hasWorkerSource) {
    // Extract the JSON string and measure its decoded length
    const match = html.match(
      new RegExp(`window\\.${workerKeyEscaped}=\"([\\s\\S]*?)\";<\\/script>`),
    );
    if (match !== null && match[1] !== undefined) {
      try {
        workerSize = JSON.parse(`"${match[1]}"`).length;
      } catch {
        workerSize = 0;
      }
    }
  }
  checks.push({
    name: 'worker source embedded',
    ok: hasWorkerSource && workerSize > 0,
    detail: hasWorkerSource
      ? `${spec.globalKey} = ${workerSize} bytes of worker code`
      : `${spec.globalKey} not found in HTML`,
  });
  checks.push({
    name: 'worker source size sane',
    ok:
      workerSize >= spec.expectedWorkerSize.min &&
      workerSize <= spec.expectedWorkerSize.max,
    detail: `${workerSize} bytes (expected ${spec.expectedWorkerSize.min}–${spec.expectedWorkerSize.max})`,
  });

  // Inline main script
  const mainScriptRegex = /<script type="module">([\s\S]*?)<\/script>/g;
  let mainScripts = 0;
  let totalMainLen = 0;
  for (const m of html.matchAll(mainScriptRegex)) {
    mainScripts++;
    totalMainLen += m[1]?.length ?? 0;
  }
  checks.push({
    name: 'inline main <script type="module">',
    ok: mainScripts === 1,
    detail: `${mainScripts} module scripts found, total ${totalMainLen} chars`,
  });

  // Document size
  const sizeKiB = html.length / 1024;
  checks.push({
    name: 'document size under 100 KiB (sanity)',
    ok: sizeKiB < 100,
    detail: `${sizeKiB.toFixed(1)} KiB`,
  });

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
  console.error('\nSmoke test failed.');
  process.exit(1);
} else {
  console.log('\nAll smoke checks passed.');
}