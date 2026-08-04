import { observer } from "mobx-react-lite";
import type { CredentialStore } from "../infrastructure/composer/credential-store.js";

export interface SafeDialProps {
  readonly store: CredentialStore;
}

export const SafeDial = observer(({ store }: SafeDialProps) => {
  return (
    <section aria-label="Safe dial" data-testid="safe-dial">
      <h2>Safe combination</h2>
      <DialRound
        round={1}
        direction="CW"
        value={store.firstPosition}
        onChange={(value) => store.setDialPosition(1, value)}
        onClear={() => store.clearDial(1)}
      />
      <DialRound
        round={2}
        direction="CCW"
        value={store.secondPosition}
        onChange={(value) => store.setDialPosition(2, value)}
        onClear={() => store.clearDial(2)}
      />
      <DialRound
        round={3}
        direction="CW"
        value={store.thirdPosition}
        onChange={(value) => store.setDialPosition(3, value)}
        onClear={() => store.clearDial(3)}
      />
      <div>
        <button
          type="button"
          data-testid="dial-lock"
          onClick={() => store.lockDial()}
          disabled={!store.hasAllDialPositions || store.dialLocked}
        >
          Lock dial
        </button>
        <button
          type="button"
          data-testid="dial-unlock"
          onClick={() => store.unlockDial()}
          disabled={!store.dialLocked}
        >
          Unlock
        </button>
      </div>
      <p data-testid="dial-status">
        {store.dialLocked ? "Dial locked" : "Dial still adjustable"}
      </p>
    </section>
  );
});

interface DialRoundProps {
  readonly round: 1 | 2 | 3;
  readonly direction: "CW" | "CCW";
  readonly value: number | null;
  readonly onChange: (value: number) => void;
  readonly onClear: () => void;
}

function DialRound({
  round,
  direction,
  value,
  onChange,
  onClear,
}: DialRoundProps) {
  return (
    <div role="group" aria-label={`Round ${String(round)} (${direction})`}>
      <label htmlFor={`dial-round-${String(round)}`}>
        Round {String(round)} ({direction})
      </label>
      <input
        id={`dial-round-${String(round)}`}
        type="range"
        min={1}
        max={99}
        step={1}
        value={value ?? 0}
        data-testid={`dial-round-${String(round)}-input`}
        onChange={(event) => {
          const parsed = Number.parseInt(event.currentTarget.value, 10);
          if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 99) {
            onChange(parsed);
          }
        }}
      />
      <input
        type="number"
        min={1}
        max={99}
        value={value ?? ""}
        aria-label={`Round ${String(round)} numeric entry`}
        data-testid={`dial-round-${String(round)}-number`}
        onChange={(event) => {
          const parsed = Number.parseInt(event.currentTarget.value, 10);
          if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 99) {
            onChange(parsed);
          }
        }}
      />
      <button
        type="button"
        onClick={onClear}
        aria-label={`Clear round ${String(round)}`}
        data-testid={`dial-round-${String(round)}-clear`}
      >
        Clear
      </button>
    </div>
  );
}
