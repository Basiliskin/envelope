// Worker source: combined probe for the single-file build.
//
// Runs Argon2id with the floor params (256 MiB, t=3) inside a Worker, then
// allocates a 1 GiB WebAssembly.Memory, then runs a 50 MiB SHA-256
// round-trip — all in one Worker. The probe confirms that the
// vite-plugin-singlefile output (used here as the "official" build tool)
// produces a single HTML file that loads all dependencies (Argon2 WASM,
// hash-wasm WASM, the main JS, the worker JS) without any module fetch.

import { argon2id, sha256 } from 'hash-wasm';

declare const self: DedicatedWorkerGlobalScope;

type WorkerRequest = { readonly kind: 'run' };
type WorkerStep = {
  readonly name: string;
  readonly ok: boolean;
  readonly durationMs: number;
  readonly detail: string;
};
type WorkerOk = {
  readonly kind: 'ok';
  readonly steps: readonly WorkerStep[];
};
type WorkerErr = { readonly kind: 'err'; readonly message: string };
type WorkerResponse = WorkerOk | WorkerErr;
void (null as unknown as WorkerRequest);
void (null as unknown as WorkerResponse);

async function timed<T>(name: string, fn: () => Promise<T> | T): Promise<WorkerStep> {
  const start = performance.now();
  try {
    const detail = await fn();
    return { name, ok: true, durationMs: performance.now() - start, detail: String(detail) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { name, ok: false, durationMs: performance.now() - start, detail: message };
  }
}

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

self.addEventListener('message', () => {
  void (async () => {
    const steps: WorkerStep[] = [];

    steps.push(
      await timed('argon2id floor (256 MiB, t=3)', async () => {
        const salt = new Uint8Array(16);
        for (let i = 0; i < 16; i++) salt[i] = i;
        const hash = await argon2id({
          password: 'correct horse battery staple',
          salt,
          iterations: 3,
          memorySize: 256 * 1024,
          parallelism: 1,
          hashLength: 32,
          outputType: 'binary',
        });
        return `0x${toHex(hash).slice(0, 16)}…`;
      }),
    );

    steps.push(
      await timed('wasm memory 1 GiB', () => {
        const pages = 64 * 1024; // 1 GiB
        const memory = new WebAssembly.Memory({
          initial: pages,
          maximum: pages,
          shared: false,
        });
        return `${memory.buffer.byteLength} bytes`;
      }),
    );

    steps.push(
      await timed('sha-256 50 MiB round-trip', async () => {
        const buf = new Uint8Array(50 * 1024 * 1024);
        for (let i = 0; i < buf.length; i++) buf[i] = i & 0xff;
        const hashHex = await sha256(buf);
        return `${hashHex.slice(0, 16)}…`;
      }),
    );

    const allOk = steps.every((s) => s.ok);
    self.postMessage({ kind: 'ok', steps });
    void allOk;
  })();
});

export {};