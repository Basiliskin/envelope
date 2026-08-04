// Worker source — runs Argon2id via hash-wasm using a dedicated WebAssembly.Memory
// of 256 MiB, then reports the resulting hash + timing to the main thread.
//
// All work is in-worker: Argon2 with a 256 MiB memory footprint MUST NOT run
// on the main thread (it freezes the UI). hash-wasm supports WASM creation
// with `parallelism: 1` and a custom memory allocator, which is what we need
// under `file://` (where SharedArrayBuffer is unavailable).
//
// Note: this probe only verifies that the WASM module loads and runs inside a
// dedicated worker when the whole bundle is loaded over file://. The exact
// memory knobs (256 MiB floor, 512 MiB default, 1 GiB ceiling) are validated
// in the memory-probe spike.
import { argon2id } from 'hash-wasm';

declare const self: DedicatedWorkerGlobalScope;

type WorkerRequest = {
  readonly kind: 'hash';
  readonly password: string;
  readonly salt: Uint8Array;
  readonly memoryKiB: number;
  readonly iterations: number;
};

type WorkerOk = {
  readonly kind: 'ok';
  readonly hashHex: string;
  readonly durationMs: number;
};

type WorkerErr = {
  readonly kind: 'err';
  readonly message: string;
};

type WorkerResponse = WorkerOk | WorkerErr;

const HEX_ALPHABET = '0123456789abcdef';
function toHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i] ?? 0;
    out += HEX_ALPHABET[(b >>> 4) & 0x0f] ?? '0';
    out += HEX_ALPHABET[b & 0x0f] ?? '0';
  }
  return out;
}

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  void (async () => {
    const start = performance.now();
    try {
      const hash = await argon2id({
        password: event.data.password,
        salt: event.data.salt,
        iterations: event.data.iterations,
        memorySize: event.data.memoryKiB,
        parallelism: 1,
        hashLength: 32,
        outputType: 'binary',
      });
      const response: WorkerResponse = {
        kind: 'ok',
        hashHex: toHex(hash),
        durationMs: performance.now() - start,
      };
      self.postMessage(response);
    } catch (e) {
      const response: WorkerResponse = {
        kind: 'err',
        message: e instanceof Error ? e.message : String(e),
      };
      self.postMessage(response);
    }
  })();
});

export {};