import type { SafeCombinationValue } from "../credential/safe-combination.js";

export type CredentialIssueCode =
  | "password-empty"
  | "dial-position-not-integer"
  | "dial-position-out-of-range"
  | "dial-position-zero"
  | "dial-all-equal"
  | "dial-arithmetic-run"
  | "dial-all-round-multiples"
  | "dial-date-shaped";

export interface CredentialIssue {
  readonly code: CredentialIssueCode;
  readonly message: string;
}

export function validateComposerCredential(input: {
  readonly password: string;
  readonly positions: readonly [unknown, unknown, unknown];
}): readonly CredentialIssue[] {
  const issues: CredentialIssue[] = [];
  if (input.password.length === 0) {
    issues.push({
      code: "password-empty",
      message: "Enter a password.",
    });
  }
  for (const issue of validateSafeCombination(input.positions)) {
    issues.push(issue);
  }
  return issues;
}

function validateSafeCombination(
  raw: readonly [unknown, unknown, unknown],
): readonly CredentialIssue[] {
  const parsed: SafeCombinationValue | null = parsePositions(raw);
  if (parsed === null) {
    return [
      {
        code: "dial-position-not-integer",
        message: "Each dial position must be an integer from 0 to 99.",
      },
    ];
  }
  if (parsed.some((position) => position < 0 || position > 99)) {
    return [
      {
        code: "dial-position-out-of-range",
        message: "Each dial position must be an integer from 0 to 99.",
      },
    ];
  }
  if (parsed.includes(0)) {
    return [
      {
        code: "dial-position-zero",
        message: "No safe position may be zero.",
      },
    ];
  }
  if (parsed.every((position) => position === parsed[0])) {
    return [
      {
        code: "dial-all-equal",
        message: "All three safe positions cannot be equal.",
      },
    ];
  }
  const [first, second, third] = parsed;
  if (first !== undefined && second !== undefined && third !== undefined) {
    if (second - first === third - second) {
      return [
        {
          code: "dial-arithmetic-run",
          message: "Arithmetic safe combinations are not allowed.",
        },
      ];
    }
  }
  if (parsed.every((position) => position % 10 === 0 || position % 25 === 0)) {
    return [
      {
        code: "dial-all-round-multiples",
        message: "Safe positions cannot all be multiples of 10 or 25.",
      },
    ];
  }
  const [month, day, year] = parsed;
  if (
    month !== undefined &&
    day !== undefined &&
    year !== undefined &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31 &&
    year >= 1 &&
    year <= 99
  ) {
    return [
      {
        code: "dial-date-shaped",
        message: "Date-shaped safe combinations are not allowed.",
      },
    ];
  }
  return [];
}

function parsePositions(
  raw: readonly [unknown, unknown, unknown],
): SafeCombinationValue | null {
  const numbers: number[] = [];
  for (const value of raw) {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      return null;
    }
    numbers.push(value);
  }
  const [a, b, c] = numbers;
  if (a === undefined || b === undefined || c === undefined) {
    return null;
  }
  return [a, b, c];
}
