export interface FileBasketEntry {
  readonly id: string;
  readonly path: string;
  readonly size: number;
  readonly content: Uint8Array;
}

const ARCHIVE_MAX_ENTRY_BYTES = 100 * 1024 * 1024;

export class FileBasket {
  private readonly entries: Map<string, FileBasketEntry>;

  private constructor(entries: ReadonlyMap<string, FileBasketEntry>) {
    this.entries = new Map(entries);
  }

  static empty(): FileBasket {
    return new FileBasket(new Map());
  }

  withEntry(entry: FileBasketEntry): FileBasket {
    if (this.entries.has(entry.id)) {
      return this;
    }
    const next = new Map(this.entries);
    next.set(entry.id, entry);
    if (totalSize(next) > ARCHIVE_MAX_ENTRY_BYTES) {
      throw new FileBasketCapExceededError(
        `File basket exceeds ${String(ARCHIVE_MAX_ENTRY_BYTES)} bytes.`,
      );
    }
    return new FileBasket(next);
  }

  withoutEntry(id: string): FileBasket {
    if (!this.entries.has(id)) return this;
    const next = new Map(this.entries);
    next.delete(id);
    return new FileBasket(next);
  }

  snapshot(): readonly FileBasketEntry[] {
    return Array.from(this.entries.values());
  }

  totalBytes(): number {
    return totalSize(this.entries);
  }

  isEmpty(): boolean {
    return this.entries.size === 0;
  }
}

function totalSize(entries: ReadonlyMap<string, FileBasketEntry>): number {
  let total = 0;
  for (const entry of entries.values()) {
    total += entry.size;
  }
  return total;
}

export class FileBasketCapExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileBasketCapExceededError";
  }
}
