// Main-thread entry for the combined single-file-build probe.

type WorkerStep = {
  readonly name: string;
  readonly ok: boolean;
  readonly durationMs: number;
  readonly detail: string;
};
type WorkerOk = { readonly kind: 'ok'; readonly steps: readonly WorkerStep[] };
type WorkerErr = { readonly kind: 'err'; readonly message: string };
type WorkerResponse = WorkerOk | WorkerErr;

const protoEl = document.getElementById('proto');
const locEl = document.getElementById('loc');
const sizeEl = document.getElementById('size');
const statusEl = document.getElementById('status');
const stepsEl = document.getElementById('steps');
const resultEl = document.getElementById('result');
const runButton = document.getElementById('run') as HTMLButtonElement | null;

if (protoEl !== null) protoEl.textContent = location.protocol;
if (locEl !== null) locEl.textContent = location.href;
if (sizeEl !== null) {
  // Approximate the byte length of the entire document — for a self-
  // contained HTML, this is the payload size.
  const html = document.documentElement.outerHTML;
  sizeEl.textContent = `${(html.length / 1024).toFixed(1)} KiB (${html.length} B)`;
}

function setStatus(text: string, isOk: boolean): void {
  if (statusEl === null) return;
  statusEl.textContent = text;
  statusEl.classList.toggle('ok', isOk);
  statusEl.classList.toggle('err', !isOk);
}

function renderSteps(steps: readonly WorkerStep[]): void {
  if (stepsEl === null) return;
  stepsEl.innerHTML = '';
  for (const s of steps) {
    const div = document.createElement('div');
    div.className = `step ${s.ok ? 'step-ok' : 'step-err'}`;
    div.textContent = `${s.ok ? '✓' : '✗'} ${s.name} — ${s.durationMs.toFixed(1)} ms — ${s.detail}`;
    stepsEl.appendChild(div);
  }
}

function setResult(text: string): void {
  if (resultEl === null) return;
  resultEl.textContent = text;
}

function runOnce(): void {
  if (runButton === null) return;
  runButton.disabled = true;
  setStatus('spawning worker…', false);

  const workerSource = window.__SINGLEFILE_WORKER_SRC__;
  if (workerSource === undefined || workerSource.length === 0) {
    setStatus('worker source not inlined — check vite config', false);
    setResult('window.__SINGLEFILE_WORKER_SRC__ was empty');
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
      const allOk = data.steps.every((s) => s.ok);
      setStatus(
        allOk
          ? `ok — all 3 steps succeeded in ${wallMs.toFixed(1)} ms wall`
          : `partial — ${data.steps.filter((s) => s.ok).length}/${data.steps.length} steps ok`,
        allOk,
      );
      renderSteps(data.steps);
      if (resultEl !== null) {
        resultEl.textContent = `wall ms: ${wallMs.toFixed(1)}\nprotocol: ${location.protocol}`;
      }
    } else {
      setStatus(`worker error: ${data.message}`, false);
      if (resultEl !== null) resultEl.textContent = data.message;
    }
    worker.terminate();
    runButton.disabled = false;
  });

  worker.addEventListener('error', (event: ErrorEvent) => {
    setStatus(`worker uncaught error: ${event.message}`, false);
    if (resultEl !== null) {
      resultEl.textContent = `${event.message}\n${event.filename ?? ''}:${event.lineno ?? ''}:${event.colno ?? ''}`;
    }
    worker.terminate();
    runButton.disabled = false;
  });

  setStatus('running all three probes (this takes several seconds)…', false);
  worker.postMessage({ kind: 'run' });
}

// Vite worker-discovery hook: keep this so the worker chunk is emitted.
const _vitesWorkerDiscoveryHook = new Worker(
  new URL('./combined.worker.ts', import.meta.url),
  { type: 'module' },
);
void _vitesWorkerDiscoveryHook;

if (runButton !== null) {
  runButton.addEventListener('click', () => {
    runOnce();
  });
}