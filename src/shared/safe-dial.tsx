import { useSyncExternalStore } from "react";

export interface SafeDialStore {
  readonly firstPosition: number | null;
  readonly secondPosition: number | null;
  readonly thirdPosition: number | null;
  readonly hasAllDialPositions: boolean;
  readonly dialLocked: boolean;
  setDialPosition(round: 1 | 2 | 3, value: number): void;
  clearDial(round: 1 | 2 | 3): void;
  lockDial(): void;
  unlockDial(): void;
  subscribe?(notify: () => void): () => void;
}

export interface SafeDialProps {
  readonly store: SafeDialStore;
}

export function SafeDial({ store }: SafeDialProps) {
  useOptionalStore(store);
  return (
    <section
      aria-label="Safe dial"
      data-testid="safe-dial"
      className="composer-card"
    >
      <h2>Safe combination</h2>
      <DialRound round={1} direction="CW" value={store.firstPosition} store={store} />
      <DialRound round={2} direction="CCW" value={store.secondPosition} store={store} />
      <DialRound round={3} direction="CW" value={store.thirdPosition} store={store} />
      <div className="btn-row">
        <button
          type="button"
          className="btn"
          data-testid="dial-lock"
          onClick={() => store.lockDial()}
          disabled={!store.hasAllDialPositions || store.dialLocked}
        >
          Lock dial
        </button>
        <button
          type="button"
          className="btn"
          data-testid="dial-unlock"
          onClick={() => store.unlockDial()}
          disabled={!store.dialLocked}
        >
          Unlock
        </button>
      </div>
      <p
        className={`dial-status${store.dialLocked ? " is-locked" : ""}`}
        data-testid="dial-status"
      >
        {store.dialLocked ? "Dial locked" : "Dial still adjustable"}
      </p>
    </section>
  );
}

function useOptionalStore(store: SafeDialStore): void {
  const subscribe = (notify: () => void): (() => void) =>
    store.subscribe?.(notify) ?? (() => undefined);
  const getSnapshot = (): string =>
    `${String(store.firstPosition)}:${String(store.secondPosition)}:${String(store.thirdPosition)}:${String(store.dialLocked)}`;
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

interface DialRoundProps {
  readonly round: 1 | 2 | 3;
  readonly direction: "CW" | "CCW";
  readonly value: number | null;
  readonly store: SafeDialStore;
}

function DialRound({ round, direction, value, store }: DialRoundProps) {
  const update = (raw: string): void => {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 99) {
      store.setDialPosition(round, parsed);
    }
  };

  return (
    <div
      role="group"
      className="dial-round"
      aria-label={`Round ${String(round)} (${direction})`}
    >
      <label htmlFor={`dial-round-${String(round)}`}>
        Round {String(round)} ({direction})
      </label>
      <input
        id={`dial-round-${String(round)}`}
        type="range"
        min={1}
        max={99}
        step={1}
        value={value ?? 1}
        disabled={store.dialLocked}
        data-testid={`dial-round-${String(round)}-input`}
        onChange={(event) => update(event.currentTarget.value)}
      />
      <input
        type="number"
        className="field-input"
        min={1}
        max={99}
        value={value ?? ""}
        disabled={store.dialLocked}
        aria-label={`Round ${String(round)} numeric entry`}
        data-testid={`dial-round-${String(round)}-number`}
        onChange={(event) => update(event.currentTarget.value)}
      />
      <button
        type="button"
        className="btn btn-sm"
        disabled={store.dialLocked}
        onClick={() => store.clearDial(round)}
        aria-label={`Clear round ${String(round)}`}
        data-testid={`dial-round-${String(round)}-clear`}
      >
        Clear
      </button>
    </div>
  );
}
