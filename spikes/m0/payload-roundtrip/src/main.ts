// Main-thread entry for the 50 MiB payload round-trip probe.

type WorkerOk = {
  readonly kind: 'ok';
  readonly hashHex: string;
  readonly sizeBytes: number;
  readonly allocateMs: number;
  readonly hashMs: number;
  readonly transferMs: number;
};
type WorkerErr = { readonly kind: 'err'; readonly message: string };
type WorkerResponse = WorkerOk | WorkerErr;

const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const runButton = document.getElementById('run') as HTMLButtonElement | null;

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
  if (runButton === null) return;
  runButton.disabled = true;
  setStatus('spawning worker…', false);

  const workerSource = window.__PAYLOAD_WORKER_SRC__;
  if (workerSource === undefined || workerSource.length === 0) {
    setStatus('worker source not inlined — check vite config', false);
    setResult('window.__PAYLOAD_WORKER_SRC__ was empty');
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
      const expected = 50 * 1024 * 1024;
      setStatus(
        `ok — ${data.sizeBytes} bytes round-tripped in ${wallMs.toFixed(1)} ms`,
        data.sizeBytes === expected,
      );
      setResult(
        [
          `hash (hex):     ${data.hashHex}`,
          `size (bytes):   ${data.sizeBytes}`,
          `size (MiB):     ${(data.sizeBytes / (1024 * 1024)).toFixed(2)}`,
          `allocate ms:    ${data.allocateMs.toFixed(1)}`,
          `hash ms:        ${data.hashMs.toFixed(1)}`,
          `transfer ms:    ${data.transferMs.toFixed(1)}`,
          `wall ms:        ${wallMs.toFixed(1)}`,
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

  setStatus('allocating 50 MiB and hashing…', false);
  worker.postMessage({ kind: 'roundtrip', sizeMiB: 50 });
}

// Vite worker-discovery hook: keep this so the worker chunk is emitted.
const _vitesWorkerDiscoveryHook = new Worker(
  new URL('./payload.worker.ts', import.meta.url),
  { type: 'module' },
);
void _vitesWorkerDiscoveryHook;

if (runButton !== null) {
  runButton.addEventListener('click', () => {
    runOnce();
  });
}