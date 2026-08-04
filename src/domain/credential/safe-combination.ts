export class InvalidSafeCombinationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSafeCombinationError";
  }
}

export type DialDirection = "CW" | "CCW";

export type SafeCombinationValue = readonly [number, number, number];

const DIRECTIONS: readonly [DialDirection, DialDirection, DialDirection] = [
  "CW",
  "CCW",
  "CW",
];

export class SafeCombination {
  private constructor(private readonly positions: SafeCombinationValue) {}

  static create(positions: SafeCombinationValue): SafeCombination {
    validatePositions(positions);
    validateStrength(positions);
    return new SafeCombination([...positions]);
  }

  canonical(): string {
    return this.positions
      .map(
        (position, index) => `R${index + 1}:${DIRECTIONS[index]}:${position}`,
      )
      .join("|");
  }

  toValue(): SafeCombinationValue {
    return [...this.positions];
  }
}

function validatePositions(positions: SafeCombinationValue): void {
  for (const position of positions) {
    if (!Number.isInteger(position) || position < 0 || position > 99) {
      throw new InvalidSafeCombinationError(
        "Safe positions must be integers from 0 to 99.",
      );
    }
  }
}

function validateStrength(positions: SafeCombinationValue): void {
  if (positions.includes(0)) {
    throw new InvalidSafeCombinationError(
      "Safe positions cannot include zero.",
    );
  }
  if (positions.every((position) => position === positions[0])) {
    throw new InvalidSafeCombinationError(
      "All safe positions cannot be equal.",
    );
  }
  if (isArithmeticRun(positions)) {
    throw new InvalidSafeCombinationError(
      "Arithmetic safe combinations are not allowed.",
    );
  }
  if (
    positions.every((position) => position % 10 === 0 || position % 25 === 0)
  ) {
    throw new InvalidSafeCombinationError(
      "Safe positions cannot all be multiples of 10 or 25.",
    );
  }
  if (isDateShaped(positions)) {
    throw new InvalidSafeCombinationError(
      "Date-shaped safe combinations are not allowed.",
    );
  }
}

function isArithmeticRun([
  first,
  second,
  third,
]: SafeCombinationValue): boolean {
  return second - first === third - second;
}

function isDateShaped([month, day, year]: SafeCombinationValue): boolean {
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31 &&
    year >= 1 &&
    year <= 99
  );
}
