// Combined-entropy estimator.
//
// Reasoning (mirrors the threat model in docs/plans):
//   - 3 rounds × 100 positions, forced alternating direction, is a fixed
//     19.93 bits. This number is public and the attacker knows it.
//   - The password's contribution is what makes the gap between "an afternoon
//     of GPU brute-force" and "never". We estimate it from the alphabet the
//     user actually types, not the alphabet they're typing into.
//
// We intentionally do NOT try to attack the password with a dictionary.
// An estimator that rewards realistic entropy (skipping common patterns) is
// what the UI needs to gate "Proceed" honestly.

export const DIAL_ENTROPY_BITS = 19.93;

export function dialEntropyBits(): number {
  return DIAL_ENTROPY_BITS;
}

export function passwordEntropyBits(password: string): number {
  if (password.length === 0) return 0;
  const pool = characterPoolSize(password);
  if (pool === 0) return 0;
  return password.length * Math.log2(pool);
}

export function combinedEntropyBits(input: {
  readonly password: string;
  readonly dialLocked: boolean;
}): number {
  const passwordBits = passwordEntropyBits(input.password);
  const dialBits = input.dialLocked ? dialEntropyBits() : 0;
  return passwordBits + dialBits;
}

function characterPoolSize(password: string): number {
  let pool = 0;
  let hasLower = false;
  let hasUpper = false;
  let hasDigit = false;
  let hasSymbol = false;
  let hasExtended = false;
  for (const char of password) {
    if (char >= "a" && char <= "z") {
      hasLower = true;
    } else if (char >= "A" && char <= "Z") {
      hasUpper = true;
    } else if (char >= "0" && char <= "9") {
      hasDigit = true;
    } else {
      const code = char.codePointAt(0) ?? 0;
      if (code <= 0x7f) {
        hasSymbol = true;
      } else {
        hasExtended = true;
      }
    }
  }
  if (hasLower) pool += 26;
  if (hasUpper) pool += 26;
  if (hasDigit) pool += 10;
  if (hasSymbol) pool += 33;
  if (hasExtended) pool += 100;
  return pool;
}
