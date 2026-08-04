import { makeAutoObservable, runInAction } from "mobx";
import type { ComposerSealDriver } from "./composer-seal-driver.js";
import type { CredentialStore } from "./credential-store.js";
import type { FileBasketStore } from "./file-basket-store.js";
import type { Argon2ParamsValue } from "../../domain/credential/argon2-params.js";
import {
  prepareSeal,
  type PrepareSealInput,
} from "../../application/composer/prepare-seal.js";
import { analyzeSealBlockers } from "../../domain/composer/seal-blocker.js";
import type { PackagingPort } from "../../application/ports/packaging-ports.js";

export type SealPhase =
  | "idle"
  | "calibrating"
  | "hashing"
  | "zipping"
  | "encrypting"
  | "emitting"
  | "done"
  | "error";

export interface SealProgress {
  readonly current: number;
  readonly total: number;
}

const SEALING_PHASES: readonly SealPhase[] = [
  "calibrating",
  "hashing",
  "zipping",
  "encrypting",
  "emitting",
];

export class SealStore {
  phase: SealPhase = "idle";
  progress: SealProgress | null = null;
  lastError: string | null = null;
  resultBytes: Uint8Array | null = null;
  resultDocument: string | null = null;
  resultDownloadUrl: string | null = null;

  constructor(
    private readonly credential: CredentialStore,
    private readonly basket: FileBasketStore,
    private readonly driver: ComposerSealDriver,
    private readonly packaging: PackagingPort,
  ) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get canStartSeal(): boolean {
    return (
      this.phase === "idle" || this.phase === "done" || this.phase === "error"
    );
  }

  get isSealing(): boolean {
    return SEALING_PHASES.includes(this.phase);
  }

  buildInput(): PrepareSealInput {
    return {
      basket: this.basket.basket,
      password: this.credential.password,
      positions: this.credential.positions,
      dialLocked: this.credential.dialLocked,
      argon2: resolveArgon2(this.credential.selectedArgon2Preset),
      salt: randomBytes(16),
      noncePrefix: randomBytes(4),
      chunkSize: 1024 * 1024,
    };
  }

  blockers(): ReturnType<typeof analyzeSealBlockers> {
    return analyzeSealBlockers({
      basket: this.basket.basket,
      password: this.credential.password,
      positions: this.credential.positions,
      dialLocked: this.credential.dialLocked,
      argon2: resolveArgon2(this.credential.selectedArgon2Preset),
    });
  }

  async start(): Promise<void> {
    if (!this.canStartSeal) return;
    this.revokeDownloadUrl();
    runInAction(() => {
      this.phase = "calibrating";
      this.lastError = null;
      this.resultBytes = null;
      this.resultDocument = null;
      this.resultDownloadUrl = null;
      this.progress = { current: 0, total: 4 };
    });
    await yieldToObservers();
    try {
      const input = this.buildInput();
      runInAction(() => {
        this.phase = "hashing";
        this.progress = { current: 1, total: 4 };
      });
      await yieldToObservers();
      runInAction(() => {
        this.phase = "zipping";
        this.progress = { current: 2, total: 4 };
      });
      const sealed = await this.driver.seal(input);
      runInAction(() => {
        this.phase = "encrypting";
        this.progress = { current: 3, total: 4 };
      });
      await yieldToObservers();
      runInAction(() => {
        this.phase = "emitting";
      });
      const document = await this.packaging.emit(sealed);
      const downloadUrl = URL.createObjectURL(
        new Blob([document], { type: "text/html" }),
      );
      runInAction(() => {
        this.phase = "done";
        this.progress = { current: 4, total: 4 };
        this.resultBytes = sealed;
        this.resultDocument = document;
        this.resultDownloadUrl = downloadUrl;
      });
    } catch (caught) {
      runInAction(() => {
        this.phase = "error";
        this.lastError =
          caught instanceof Error ? caught.message : String(caught);
      });
    }
  }

  reset(): void {
    this.revokeDownloadUrl();
    runInAction(() => {
      this.phase = "idle";
      this.progress = null;
      this.lastError = null;
      this.resultBytes = null;
      this.resultDocument = null;
      this.resultDownloadUrl = null;
    });
  }

  private revokeDownloadUrl(): void {
    if (this.resultDownloadUrl !== null) {
      URL.revokeObjectURL(this.resultDownloadUrl);
    }
  }

  ensureSealReady():
    { readonly ok: true } | { readonly ok: false; readonly error: string } {
    const prepared = prepareSeal(this.buildInput());
    if (prepared.kind === "ready") {
      return { ok: true };
    }
    return {
      ok: false,
      error: prepared.blockers.map((b) => b.message).join(" / "),
    };
  }
}

function resolveArgon2(
  preset: "floor" | "default" | "paranoid",
): Argon2ParamsValue | null {
  if (preset === "floor") {
    return { memoryKiB: 256 * 1024, iterations: 3, parallelism: 1 };
  }
  if (preset === "paranoid") {
    return { memoryKiB: 1024 * 1024, iterations: 4, parallelism: 1 };
  }
  return { memoryKiB: 512 * 1024, iterations: 3, parallelism: 1 };
}

function randomBytes(length: number): Uint8Array {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  return buffer;
}

function yieldToObservers(): Promise<void> {
  return new Promise((resolve) => queueMicrotask(() => resolve()));
}
