// Worker source: tries to allocate a 1 GiB WebAssembly.Memory and reports
// whether the allocation succeeded. This is the highest-risk item in M0:
// under file:// the SPA has no cross-origin isolation, but most desktop
// browsers can still hand out a 1 GiB WASM memory page. If any of the four
// targets (Chrome / Firefox / Safari / Edge) refuses, the spec changes now.

declare const self: DedicatedWorkerGlobalScope;

type WorkerRequest = {
  readonly kind: 'probe';
  readonly sizeGiB: number;
};

type WorkerOk = {
  readonly kind: 'ok';
  readonly memoryBytes: number;
  readonly growable: boolean;
  readonly durationMs: number;
};

type WorkerErr = {
  readonly kind: 'err';
  readonly message: string;
};

type WorkerResponse = WorkerOk | WorkerErr;
void (null as unknown as WorkerResponse);

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  void (async () => {
    const start = performance.now();
    try {
      const pages = event.data.sizeGiB * 64; // 64 KiB per WASM page
      const memory = new WebAssembly.Memory({
        initial: pages,
        maximum: pages,
        shared: false,
      });
      const buffer = memory.buffer;
      // `growable` is an instance flag on some engines but not standard;
      // report `false` for an explicit `initial === maximum` allocation.
      const response: WorkerOk = {
        kind: 'ok',
        memoryBytes: buffer.byteLength,
        growable: false,
        durationMs: performance.now() - start,
      };
      self.postMessage(response);
    } catch (e) {
      const response: WorkerErr = {
        kind: 'err',
        message: e instanceof Error ? e.message : String(e),
      };
      self.postMessage(response);
    }
  })();
});

export {};