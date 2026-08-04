import { makeAutoObservable } from "mobx";
import { combinedEntropyBits } from "../../domain/composer/entropy.js";
import {
  validateComposerCredential,
  type CredentialIssue,
} from "../../domain/composer/credential-validation.js";

export type DialPosition = number | null;

export class CredentialStore {
  password = "";
  firstPosition: DialPosition = null;
  secondPosition: DialPosition = null;
  thirdPosition: DialPosition = null;
  dialLocked = false;
  selectedArgon2Preset: "floor" | "default" | "paranoid" = "default";

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get positions(): readonly [unknown, unknown, unknown] {
    return [this.firstPosition, this.secondPosition, this.thirdPosition];
  }

  get credentialIssues(): readonly CredentialIssue[] {
    return validateComposerCredential({
      password: this.password,
      positions: this.positions,
    });
  }

  get combinedBits(): number {
    return combinedEntropyBits({
      password: this.password,
      dialLocked: this.dialLocked,
    });
  }

  get hasAllDialPositions(): boolean {
    return (
      this.firstPosition !== null &&
      this.secondPosition !== null &&
      this.thirdPosition !== null
    );
  }

  setPassword(value: string): void {
    this.password = value;
  }

  generatePassword(): string {
    throw new Error(
      "Password generation must be wired through infrastructure/composer/diceware-adapter.ts.",
    );
  }

  setDialPosition(round: 1 | 2 | 3, value: number): void {
    if (round === 1) this.firstPosition = value;
    else if (round === 2) this.secondPosition = value;
    else this.thirdPosition = value;
  }

  clearDial(round: 1 | 2 | 3): void {
    if (round === 1) this.firstPosition = null;
    else if (round === 2) this.secondPosition = null;
    else this.thirdPosition = null;
  }

  lockDial(): void {
    this.dialLocked = true;
  }

  unlockDial(): void {
    this.dialLocked = false;
  }

  selectArgon2Preset(preset: "floor" | "default" | "paranoid"): void {
    this.selectedArgon2Preset = preset;
  }

  reset(): void {
    this.password = "";
    this.firstPosition = null;
    this.secondPosition = null;
    this.thirdPosition = null;
    this.dialLocked = false;
  }
}
