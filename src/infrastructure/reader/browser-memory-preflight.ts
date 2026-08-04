import type { MemoryPreflightPort } from "../../application/reader/reader-ports.js";

export class BrowserMemoryPreflight implements MemoryPreflightPort {
  canAllocate(memoryKiB: number): Promise<boolean> {
    if (!Number.isInteger(memoryKiB) || memoryKiB < 1) {
      return Promise.resolve(false);
    }
    try {
      const pages = Math.ceil((memoryKiB * 1024) / 65536);
      const memory = new WebAssembly.Memory({ initial: pages, maximum: pages });
      return Promise.resolve(memory.buffer.byteLength === memoryKiB * 1024);
    } catch {
      return Promise.resolve(false);
    }
  }
}
