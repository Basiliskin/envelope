import { observer } from "mobx-react-lite";
import { MIN_COMBINED_ENTROPY_BITS } from "../domain/composer/seal-blocker.js";
import type { CredentialStore } from "../infrastructure/composer/credential-store.js";
import type { FileBasketStore } from "../infrastructure/composer/file-basket-store.js";
import type { SealStore } from "../infrastructure/composer/seal-store.js";
import {
  analyzeSealBlockers,
  type SealBlocker,
} from "../domain/composer/seal-blocker.js";
import type { Argon2ParamsValue } from "../domain/credential/argon2-params.js";

export interface CombinedEntropyProps {
  readonly credential: CredentialStore;
  readonly basket: FileBasketStore;
  readonly argon2Preset: "floor" | "default" | "paranoid";
}

export const CombinedEntropy = observer(
  ({ credential, basket, argon2Preset }: CombinedEntropyProps) => {
    const argon2 = resolveArgon2(argon2Preset);
    const blockers = analyzeSealBlockers({
      basket: basket.basket,
      password: credential.password,
      positions: credential.positions,
      dialLocked: credential.dialLocked,
      argon2,
    });
    const ratio = Math.max(
      0,
      Math.min(1, credential.combinedBits / MIN_COMBINED_ENTROPY_BITS),
    );
    const isReady = credential.combinedBits >= MIN_COMBINED_ENTROPY_BITS;
    return (
      <section
        aria-label="Combined entropy"
        data-testid="combined-entropy"
        className="composer-card"
      >
        <h2>Combined entropy</h2>
        <p className="entropy-value" data-testid="combined-entropy-value">
          {credential.combinedBits.toFixed(2)} bits
        </p>
        <div
          className="entropy-bar-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={MIN_COMBINED_ENTROPY_BITS}
          aria-valuenow={Math.round(credential.combinedBits)}
        >
          <div
            className={`entropy-bar-fill${isReady ? " is-ready" : ""}`}
            style={{ width: `${String(ratio * 100)}%` }}
          />
        </div>
        <p className="entropy-threshold" data-testid="combined-entropy-threshold">
          Target: ≥ {String(MIN_COMBINED_ENTROPY_BITS)} bits
        </p>
        {blockers.length > 0 ? (
          <ul className="issue-list" data-testid="blockers">
            {blockers.map((blocker) => (
              <li
                key={blocker.code}
                className="issue-item"
                data-testid={`blocker-${blocker.code}`}
                data-message={blocker.message}
              >
                {blocker.message}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    );
  },
);

export interface SealProgressViewProps {
  readonly store: SealStore;
  readonly onSeal: () => void;
}

export const SealProgressView = observer(
  ({ store, onSeal }: SealProgressViewProps) => {
    return (
      <section
        aria-label="Seal progress"
        data-testid="seal-progress"
        className="composer-card"
      >
        <h2>Seal</h2>
        <p className="seal-phase" data-testid="seal-phase">
          {store.phase}
        </p>
        {store.progress !== null ? (
          <p className="entropy-threshold" data-testid="seal-progress">
            {store.progress.current}/{store.progress.total}
          </p>
        ) : null}
        {store.lastError !== null ? (
          <p role="alert" className="seal-error" data-testid="seal-error">
            {store.lastError}
          </p>
        ) : null}
        {store.resultDownloadUrl !== null ? (
          <a
            className="seal-download"
            data-testid="seal-download"
            href={store.resultDownloadUrl}
            download="envelope.html"
          >
            Download sealed envelope
          </a>
        ) : null}
        <button
          type="button"
          className="btn btn-primary"
          data-testid="seal-button"
          onClick={onSeal}
          disabled={!store.canStartSeal}
        >
          Seal envelope
        </button>
      </section>
    );
  },
);

function resolveArgon2(preset: Argon2ParamsValue | string): Argon2ParamsValue | null {
  if (preset === "floor") return { memoryKiB: 256 * 1024, iterations: 3, parallelism: 1 };
  if (preset === "default")
    return { memoryKiB: 512 * 1024, iterations: 3, parallelism: 1 };
  if (preset === "paranoid")
    return { memoryKiB: 1024 * 1024, iterations: 4, parallelism: 1 };
  if (typeof preset === "string") return null;
  return preset;
}

export function describeBlockers(
  blockers: readonly SealBlocker[],
): readonly string[] {
  return blockers.map((blocker) => blocker.message);
}
