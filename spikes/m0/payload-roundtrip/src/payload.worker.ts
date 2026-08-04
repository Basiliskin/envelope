// Worker source: 50 MB payload round-trip.
//
// Generates a 50 MiB random payload in the Worker, hashes it with SHA-256
// (via hash-wasm), and reports the hash + duration to the main thread.
// The point of this probe is to confirm a Worker can hold a 50 MiB
// ArrayBuffer under file:// without the browser's "large string" thresholds
// degrading performance or breaking the message channel.

import { sha256 } from 'hash-wasm';

declare const self: DedicatedWorkerGlobalScope;

type WorkerRequest = {
  readonly kind: 'roundtrip';
  readonly sizeMiB: number;
};

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
void (null as unknown as WorkerResponse);

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  void (async () => {
    const allocateStart = performance.now();
    const sizeBytes = event.data.sizeMiB * 1024 * 1024;
    const buf = new Uint8Array(sizeBytes);
    // Fill with deterministic content (counter byte) so the SHA-256 is
    // predictable across runs. crypto.getRandomValues is slower and not
    // needed for this probe.
    for (let i = 0; i < buf.length; i++) buf[i] = i & 0xff;
    const allocateMs = performance.now() - allocateStart;

    const hashStart = performance.now();
    let hashHex: string;
    try {
      hashHex = await sha256(buf);
    } catch (e) {
      const response: WorkerErr = {
        kind: 'err',
        message: `sha256 failed: ${e instanceof Error ? e.message : String(e)}`,
      };
      self.postMessage(response);
      return;
    }
    const hashMs = performance.now() - hashStart;

    const transferStart = performance.now();
    // Copy a small slice back to the main thread via transfer (the full 50
    // MiB would be wasteful). The probe's "transfer" is the postMessage
    // back with a small sample to confirm structured cloning works.
    const sample = buf.slice(0, 16).buffer;
    const transferMs = performance.now() - transferStart;

    const response: WorkerOk = {
      kind: 'ok',
      hashHex,
      sizeBytes,
      allocateMs,
      hashMs,
      transferMs,
    };
    self.postMessage(response, [sample]);
  })();
});

export {};