export class InvalidArgon2ParamsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidArgon2ParamsError";
  }
}

export interface Argon2ParamsValue {
  readonly memoryKiB: number;
  readonly iterations: number;
  readonly parallelism: 1;
}

const MIN_MEMORY_KIB = 256 * 1024;
const DEFAULT_MEMORY_KIB = 512 * 1024;
const MAX_MEMORY_KIB = 1024 * 1024;

export class Argon2Params {
  static readonly MIN = new Argon2Params(MIN_MEMORY_KIB, 3, 1);
  static readonly DEFAULT = new Argon2Params(DEFAULT_MEMORY_KIB, 3, 1);
  static readonly MAX = new Argon2Params(MAX_MEMORY_KIB, 4, 1);

  private constructor(
    readonly memoryKiB: number,
    readonly iterations: number,
    readonly parallelism: 1,
  ) {}

  static create(value: Argon2ParamsValue): Argon2Params {
    if (!Number.isInteger(value.memoryKiB)) {
      throw new InvalidArgon2ParamsError(
        "Argon2 memory must be an integer number of KiB.",
      );
    }
    if (value.memoryKiB < MIN_MEMORY_KIB || value.memoryKiB > MAX_MEMORY_KIB) {
      throw new InvalidArgon2ParamsError(
        "Argon2 memory must be between 256 MiB and 1 GiB.",
      );
    }
    if (
      !Number.isInteger(value.iterations) ||
      value.iterations < 3 ||
      value.iterations > 4
    ) {
      throw new InvalidArgon2ParamsError("Argon2 iterations must be 3 or 4.");
    }
    if (value.parallelism !== 1) {
      throw new InvalidArgon2ParamsError("Argon2 parallelism must be 1.");
    }
    return new Argon2Params(
      value.memoryKiB,
      value.iterations,
      value.parallelism,
    );
  }

  toValue(): Argon2ParamsValue {
    return {
      memoryKiB: this.memoryKiB,
      iterations: this.iterations,
      parallelism: this.parallelism,
    };
  }
}
