// Main-thread entry for the Argon2id worker probe.
//
// The worker source is generated as a separate Rollup chunk by the standard
// `new Worker(new URL(...))` pattern. The Vite worker plugin emits that
// chunk as an asset in the bundle. Our custom build plugin (`m0-inline-worker`)
// hoists the chunk source into a `window.__ARGON2_WORKER_SRC__` global
// injected before this script, and we spawn the worker via
// `URL.createObjectURL(blob)` — the only reliable way to get a module worker
// running under `file://` from a single-file build.
//
// The `new Worker(new URL(...))` reference below is required: it is how
// Vite discovers the worker module. We never actually invoke that
// constructor — the `window.__ARGON2_WORKER_SRC__` blob-spawn path replaces it.

type WorkerOk = { readonly kind: 'ok'; readonly hashHex: string; readonly durationMs: number };
type WorkerErr = { readonly kind: 'err'; readonly message: string };
type WorkerResponse = WorkerOk | WorkerErr;

const protoEl = document.getElementById('proto');
const sabEl = document.getElementById('sab');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const runButton = document.getElementById('run') as HTMLButtonElement | null;

if (protoEl !== null) protoEl.textContent = location.protocol;
if (sabEl !== null) {
  sabEl.textContent = String(typeof SharedArrayBuffer !== 'undefined');
}

function setStatus(text: string, isOk: boolean): void {
  if (statusEl === null) return;
  statusEl.textContent = text;
  statusEl.classList.toggle('ok', isOk);
  statusEl.classList.toggle('err', !isOk);
}

function setResult(text: string): void {
  if (resultEl === null) return;
  resultEl.textContent = text;
}

function makeRandomSalt(byteLength: number): Uint8Array {
  const buf = new Uint8Array(byteLength);
  crypto.getRandomValues(buf);
  return buf;
}

// Reference kept to satisfy Vite's worker discovery. Never invoked.
const _vitesWorkerDiscoveryHook = new Worker(
  new URL('./argon2.worker.ts', import.meta.url),
  { type: 'module' },
);
void _vitesWorkerDiscoveryHook;

function runOnce(): void {
  if (runButton === null) return;
  runButton.disabled = true;
  setStatus('spawning worker…', false);

  const workerSource = window.__ARGON2_WORKER_SRC__;
  if (workerSource === undefined || workerSource.length === 0) {
    setStatus('worker source not inlined — check vite config', false);
    setResult('window.__ARGON2_WORKER_SRC__ was empty');
    runButton.disabled = false;
    return;
  }
  const blob = new Blob([workerSource], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url, { type: 'module' });
  URL.revokeObjectURL(url);
  const salt = makeRandomSalt(16);
  const startedAt = performance.now();

  worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
    const wallMs = performance.now() - startedAt;
    const data = event.data;
    if (data.kind === 'ok') {
      setStatus(`ok — hash produced in ${data.durationMs.toFixed(1)} ms`, true);
      setResult(
        [
          `hash (hex): ${data.hashHex}`,
          `length:      ${data.hashHex.length / 2} bytes`,
          `worker ms:   ${data.durationMs.toFixed(1)}`,
          `wall ms:     ${wallMs.toFixed(1)}`,
          `protocol:    ${location.protocol}`,
          `SAB:         ${typeof SharedArrayBuffer !== 'undefined'}`,
        ].join('\n'),
      );
    } else {
      setStatus(`worker error: ${data.message}`, false);
      setResult(data.message);
    }
    worker.terminate();
    runButton.disabled = false;
  });

  worker.addEventListener('error', (event: ErrorEvent) => {
    setStatus(`worker uncaught error: ${event.message}`, false);
    setResult(`${event.message}\n${event.filename ?? ''}:${event.lineno ?? ''}:${event.colno ?? ''}`);
    worker.terminate();
    runButton.disabled = false;
  });

  setStatus('hashing (this should take ~700 ms at 256 MiB / t=3)…', false);
  worker.postMessage({
    kind: 'hash',
    password: 'correct horse battery staple',
    salt,
    memoryKiB: 256 * 1024,
    iterations: 3,
  });
}

if (runButton !== null) {
  runButton.addEventListener('click', () => {
    runOnce();
  });
}