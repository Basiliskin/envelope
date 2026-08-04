import type { UnsealPackage } from "../../application/reader/unseal-package.js";
import type { ReaderFile, ReaderProgress } from "../../domain/reader/types.js";

export type ReaderState =
  | "preflighting"
  | "ready"
  | "unsealing"
  | "done"
  | "error";

export class ReaderStore {
  state: ReaderState = "preflighting";
  password = "";
  firstPosition: number | null = null;
  secondPosition: number | null = null;
  thirdPosition: number | null = null;
  dialLocked = false;
  progress: ReaderProgress | null = null;
  files: readonly ReaderFile[] = [];
  error = "";
  private controller: AbortController | null = null;
  private notify = (): void => undefined;

  constructor(
    private readonly packageBytes: Uint8Array,
    private readonly unsealPackage: UnsealPackage,
  ) {}

  subscribe(notify: () => void): () => void {
    this.notify = notify;
    return () => {
      this.notify = (): void => undefined;
    };
  }

  get hasAllDialPositions(): boolean {
    return (
      this.firstPosition !== null &&
      this.secondPosition !== null &&
      this.thirdPosition !== null
    );
  }

  get canUnseal(): boolean {
    return this.state === "ready" && this.password.length > 0 && this.dialLocked;
  }

  async preflight(): Promise<void> {
    try {
      await this.unsealPackage.preflight(this.packageBytes);
      this.state = "ready";
    } catch (error) {
      this.fail(error, true);
    }
    this.notify();
  }

  setPassword(value: string): void {
    this.password = value;
    this.notify();
  }

  setDialPosition(round: 1 | 2 | 3, value: number): void {
    if (round === 1) this.firstPosition = value;
    else if (round === 2) this.secondPosition = value;
    else this.thirdPosition = value;
    this.notify();
  }

  clearDial(round: 1 | 2 | 3): void {
    if (round === 1) this.firstPosition = null;
    else if (round === 2) this.secondPosition = null;
    else this.thirdPosition = null;
    this.notify();
  }

  lockDial(): void {
    this.dialLocked = this.hasAllDialPositions;
    this.notify();
  }

  unlockDial(): void {
    this.dialLocked = false;
    this.notify();
  }

  async unseal(): Promise<void> {
    if (!this.canUnseal) return;
    const { firstPosition, secondPosition, thirdPosition } = this;
    if (
      firstPosition === null ||
      secondPosition === null ||
      thirdPosition === null
    ) {
      return;
    }
    const combination: readonly [number, number, number] = [
      firstPosition,
      secondPosition,
      thirdPosition,
    ];
    this.controller = new AbortController();
    this.state = "unsealing";
    this.error = "";
    this.notify();
    try {
      this.files = await this.unsealPackage.execute({
        packageBytes: this.packageBytes,
        credential: { password: this.password, combination },
        signal: this.controller.signal,
        onProgress: (progress) => {
          this.progress = progress;
          this.notify();
        },
      });
      this.state = "done";
    } catch (error) {
      this.fail(error, false);
    } finally {
      this.controller = null;
      this.notify();
    }
  }

  cancel(): void {
    this.controller?.abort();
  }

  private fail(error: unknown, revealDetails: boolean): void {
    this.state = "error";
    this.error =
      revealDetails && error instanceof Error
        ? error.message
        : "Unable to open package. Check your password and safe combination.";
  }
}
