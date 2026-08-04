import type { WasmCapabilitiesPort, WasmCapabilitiesResult } from "../../application/composer/composer-ports.js";

const WASM_PAGE_BYTES = 64 * 1024;

export class WebAssemblyMemoryProbe implements WasmCapabilitiesPort {
  probe(maxMemoryKiB: number): Promise<WasmCapabilitiesResult> {
    const requestedBytes = maxMemoryKiB * 1024;
    return Promise.resolve(tryAllocate(requestedBytes));
  }
}

function tryAllocate(bytes: number): WasmCapabilitiesResult {
  if (!Number.isInteger(bytes) || bytes < 0) {
    return {
      canAllocate: false,
      maxMemoryKiB: 0,
      errorMessage: "Allocation size must be a non-negative integer of bytes.",
    };
  }
  const pages = Math.max(1, Math.ceil(bytes / WASM_PAGE_BYTES));
  try {
    const memory = new WebAssembly.Memory({
      initial: pages,
      maximum: pages,
    });
    const success = memory.buffer.byteLength >= bytes;
    return {
      canAllocate: success,
      maxMemoryKiB: success ? Math.floor(memory.buffer.byteLength / 1024) : 0,
    };
  } catch (error) {
    return {
      canAllocate: false,
      maxMemoryKiB: 0,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

export class InMemoryWasmProbe implements WasmCapabilitiesPort {
  constructor(private readonly predicate: (bytes: number) => boolean) {}

  probe(maxMemoryKiB: number): Promise<WasmCapabilitiesResult> {
    const bytes = maxMemoryKiB * 1024;
    if (this.predicate(bytes)) {
      return Promise.resolve({
        canAllocate: true,
        maxMemoryKiB: maxMemoryKiB,
      });
    }
    return Promise.resolve({
      canAllocate: false,
      maxMemoryKiB: 0,
      errorMessage: "Allocation refused by probe predicate.",
    });
  }
}
