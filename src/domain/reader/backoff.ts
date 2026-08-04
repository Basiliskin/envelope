const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

/**
 * Delay before the reader lets the user try another password/dial guess,
 * in milliseconds. Doubles per consecutive failure, capped at 30s.
 *
 * This is UX pacing only, not a security control — see the roadmap threat
 * model ("Reader-side backoff is UX, not security"). The generated HTML
 * file is the attacker's copy; a local guessing script does not go through
 * this UI and is not slowed by it at all. It exists to stop a human from
 * rapid-fire retyping, nothing more.
 */
export function exponentialBackoffMs(failedAttempts: number): number {
  if (!Number.isInteger(failedAttempts) || failedAttempts <= 0) return 0;
  const delay = BASE_DELAY_MS * 2 ** (failedAttempts - 1);
  return Math.min(delay, MAX_DELAY_MS);
}
