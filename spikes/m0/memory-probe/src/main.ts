// Main-thread entry for the WASM memory allocation probe.
//
// Reads `window.__MEMORY_WORKER_SRC__` (injected at build time) and spawns
// the worker via `URL.createObjectURL(blob)`. The worker attempts to
// allocate a WebAssembly.Memory of the requested size and reports whether
// the allocation succeeded.

type WorkerOk = {
  readonly kind: 'ok';
  readonly memoryBytes: number;
  readonly growable: boolean;
  readonly durationMs: number;
};
type WorkerErr = { readonly kind: 'err'; readonly message: string };
type WorkerResponse = WorkerOk | WorkerErr;

const protoEl = document.getElementById('proto');
const sabEl = document.getElementById('sab');
const devMemEl = document.getElementById('devMem');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const runButton = document.getElementById('run') as HTMLButtonElement | null;
const sizeSelect = document.getElementById('size') as HTMLSelectElement | null;

if (protoEl !== null) protoEl.textContent = location.protocol;
if (sabEl !== null) sabEl.textContent = String(typeof SharedArrayBuffer !== 'undefined');
if (devMemEl !== null) {
  const nav = navigator as Navigator & { deviceMemory?: number };
  devMemEl.textContent = nav.deviceMemory === undefined ? 'unknown' : String(nav.deviceMemory);
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

function runOnce(): void {
  if (runButton === null || sizeSelect === null) return;
  const sizeGiB = Number(sizeSelect.value);
  runButton.disabled = true;
  setStatus('spawning worker…', false);

  const workerSource = window.__MEMORY_WORKER_SRC__;
  if (workerSource === undefined || workerSource.length === 0) {
    setStatus('worker source not inlined — check vite config', false);
    setResult('window.__MEMORY_WORKER_SRC__ was empty');
    runButton.disabled = false;
    return;
  }
  const blob = new Blob([workerSource], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url, { type: 'module' });
  URL.revokeObjectURL(url);
  const startedAt = performance.now();

  worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
    const wallMs = performance.now() - startedAt;
    const data = event.data;
    if (data.kind === 'ok') {
      const requested = sizeGiB * 1024 * 1024 * 1024;
      const got = data.memoryBytes;
      setStatus(`ok — ${(got / (1024 * 1024 * 1024)).toFixed(3)} GiB allocated in ${data.durationMs.toFixed(1)} ms`, true);
      setResult(
        [
          `requested:   ${sizeGiB.toFixed(2)} GiB`,
          `allocated:   ${got} bytes`,
          `requested:   ${requested} bytes`,
          `match:       ${got === requested}`,
          `growable:    ${data.growable}`,
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

  setStatus(`allocating ${sizeGiB} GiB…`, false);
  worker.postMessage({ kind: 'probe', sizeGiB });
}

// Vite worker-discovery hook: keep this so the worker chunk is emitted.
const _vitesWorkerDiscoveryHook = new Worker(
  new URL('./memory.worker.ts', import.meta.url),
  { type: 'module' },
);
void _vitesWorkerDiscoveryHook;

if (runButton !== null) {
  runButton.addEventListener('click', () => {
    runOnce();
  });
}