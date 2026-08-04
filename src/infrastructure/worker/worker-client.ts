import type {
  CryptoWorkerPort,
  SealWorkerInput,
  UnsealWorkerInput,
  WorkerSealEvent,
  WorkerUnsealEvent,
} from "../../application/ports/worker-ports.js";
import type { MessageBus } from "./message-bus.js";
import type {
  WorkerEvent,
  WorkerRequest,
} from "./worker-protocol.js";

interface LiveRequest {
  readonly signal: AbortSignal;
  push(event: WorkerEvent): void;
  done(error?: unknown): void;
  cancel(): void;
}

export class WorkerClient implements CryptoWorkerPort {
  private nextId = 1;
  private started = false;
  private readonly live = new Map<number, LiveRequest>();

  constructor(private readonly bus: MessageBus) {}

  seal(
    input: SealWorkerInput,
    options: { readonly signal: AbortSignal },
  ): AsyncIterable<WorkerSealEvent> {
    return this.run(
      options,
      (id, signal) => {
        if (signal.aborted) return null;
        const request: Extract<WorkerRequest, { kind: "seal" }> = {
          kind: "seal",
          id,
          argon2: input.argon2,
          salt: input.salt,
          noncePrefix: input.noncePrefix,
          chunkSize: input.chunkSize,
          canonicalSecret: input.canonicalSecret,
          entries: input.entries.map((entry) => ({
            path: entry.path,
            bytes: entry.bytes,
            mode: entry.mode,
          })),
        };
        return {
          request,
          transfer: [
            request.canonicalSecret.buffer,
            request.salt.buffer,
            request.noncePrefix.buffer,
            ...request.entries.map((entry) => entry.bytes.buffer),
          ],
        };
      },
      (event) => mapSealEvent(event),
    );
  }

  unseal(
    input: UnsealWorkerInput,
    options: { readonly signal: AbortSignal },
  ): AsyncIterable<WorkerUnsealEvent> {
    return this.run(
      options,
      (id, signal) => {
        if (signal.aborted) return null;
        const request: Extract<WorkerRequest, { kind: "unseal" }> = {
          kind: "unseal",
          id,
          canonicalSecret: input.canonicalSecret,
          header: input.header,
          sealedChunks: input.sealedChunks.map((chunk) => ({
            index: chunk.index,
            ciphertext: chunk.ciphertext,
          })),
        };
        return {
          request,
          transfer: [
            request.canonicalSecret.buffer,
            request.header.buffer,
            ...request.sealedChunks.map((chunk) => chunk.ciphertext.buffer),
          ],
        };
      },
      (event) => mapUnsealEvent(event),
    );
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.bus.setHandler((message) => {
      if (!isWorkerEvent(message)) return;
      const live = this.live.get(message.id);
      if (live === undefined) return;
      live.push(message);
    });
    this.bus.start();
  }

  stop(): void {
    for (const entry of this.live.values()) entry.cancel();
    this.live.clear();
    this.bus.close();
  }

  private run<TEvent>(
    options: { readonly signal: AbortSignal },
    build: (
      id: number,
      signal: AbortSignal,
    ) => { readonly request: WorkerRequest; readonly transfer: readonly Transferable[] } | null,
    map: (event: WorkerEvent) => TEvent | null,
  ): AsyncIterable<TEvent> {
    return (async function* (this: WorkerClient): AsyncIterable<TEvent> {
      const id = this.nextId;
      this.nextId += 1;
      const queue: TEvent[] = [];
      const failures: unknown[] = [];
      let resolveNext: (() => void) | null = null;
      let closed = false;

      const signal = options.signal;
      const controller = new AbortController();
      const live: LiveRequest = {
        signal: controller.signal,
        push: (event: WorkerEvent) => {
          if (closed) return;
          let mapped: TEvent | null;
          try {
            mapped = map(event);
          } catch (error) {
            closed = true;
            controller.abort();
            failures.push(error);
            const next = resolveNext;
            resolveNext = null;
            if (next !== null) next();
            return;
          }
          if (mapped === null) {
            closed = true;
            controller.abort();
            const next = resolveNext;
            resolveNext = null;
            if (next !== null) next();
            return;
          }
          queue.push(mapped);
          if ((mapped as { kind?: string }).kind === "done") {
            closed = true;
            controller.abort();
          }
          const next = resolveNext;
          resolveNext = null;
          if (next !== null) next();
        },
        done: (error?: unknown) => {
          closed = true;
          if (error !== undefined) failures.push(error);
          const next = resolveNext;
          resolveNext = null;
          if (next !== null) next();
        },
        cancel: () => {
          controller.abort();
        },
      };
      this.live.set(id, live);

      const onAbort = (): void => {
        if (closed) return;
        this.bus.postMessage({ kind: "cancel", id });
      };
      signal.addEventListener("abort", onAbort, { once: true });

      const built = build(id, controller.signal);
      if (built === null) {
        controller.abort();
        signal.removeEventListener("abort", onAbort);
        this.live.delete(id);
        return;
      }
      this.bus.postMessage(built.request, built.transfer);

      try {
        while (true) {
          if (signal.aborted) {
            throw new Error("Operation cancelled.");
          }
          const failure = failures.shift();
          if (failure !== undefined && failure !== null) {
            const message =
              failure instanceof Error
                ? failure.message
                : typeof failure === "string"
                  ? failure
                  : "unknown failure";
            throw failure instanceof Error ? failure : new Error(message);
          }
          const event = queue.shift();
          if (event !== undefined) {
            yield event;
            continue;
          }
          if (closed) return;
          await new Promise<void>((resolve) => {
            resolveNext = resolve;
          });
        }
      } finally {
        closed = true;
        controller.abort();
        signal.removeEventListener("abort", onAbort);
        this.live.delete(id);
      }
    }).call(this);
  }
}

function mapSealEvent(event: WorkerEvent): WorkerSealEvent | null {
  switch (event.kind) {
    case "progress":
      return { kind: "progress", progress: { phase: event.phase, current: event.current, total: event.total } };
    case "sealed":
      return {
        kind: "done",
        result: {
          header: event.header,
          chunks: event.chunks.map((chunk) => ({
            index: chunk.index,
            ciphertext: chunk.ciphertext,
          })),
        },
      };
    case "unsealed":
    case "cancelled":
      return null;
    case "error":
      throw new WorkerClientError(event.errorKind, event.message);
  }
}

function mapUnsealEvent(event: WorkerEvent): WorkerUnsealEvent | null {
  switch (event.kind) {
    case "progress":
      return { kind: "progress", progress: { phase: event.phase, current: event.current, total: event.total } };
    case "unsealed":
      return { kind: "done", result: { bytes: event.bytes } };
    case "sealed":
    case "cancelled":
      return null;
    case "error":
      throw new WorkerClientError(event.errorKind, event.message);
  }
}

export class WorkerClientError extends Error {
  constructor(
    readonly errorKind: "argument" | "authentication" | "memory" | "internal",
    message: string,
  ) {
    super(message);
    this.name = "WorkerClientError";
  }
}

function isWorkerEvent(value: unknown): value is WorkerEvent {
  if (typeof value !== "object" || value === null) return false;
  const kind = (value as { kind?: unknown }).kind;
  return (
    kind === "progress" ||
    kind === "sealed" ||
    kind === "unsealed" ||
    kind === "cancelled" ||
    kind === "error"
  );
}