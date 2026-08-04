import { describe, expect, it } from "vitest";
import { validateComposerCredential } from "./credential-validation.js";

describe("validateComposerCredential", () => {
  it("accepts a strong combination with a non-empty password", () => {
    const issues = validateComposerCredential({
      password: "correct horse battery staple",
      positions: [37, 12, 88],
    });
    expect(issues).toEqual([]);
  });

  it("flags an empty password", () => {
    const issues = validateComposerCredential({
      password: "",
      positions: [37, 12, 88],
    });
    expect(issues.map((issue) => issue.code)).toContain("password-empty");
  });

  it.each([
    [50, 50, 50, "dial-all-equal"],
    [10, 20, 30, "dial-arithmetic-run"],
    [90, 60, 30, "dial-arithmetic-run"],
    [0, 19, 83, "dial-position-zero"],
    [10, 25, 70, "dial-all-round-multiples"],
    [7, 4, 26, "dial-date-shaped"],
  ] as const)(
    "rejects weak combination [%j] with %s",
    (first, second, third, expected) => {
      const issues = validateComposerCredential({
        password: "any password",
        positions: [first, second, third],
      });
      const codes = issues.map((issue) => issue.code);
      expect(codes).toContain(expected);
    },
  );

  it("flags non-integer dial positions", () => {
    const issues = validateComposerCredential({
      password: "any password",
      positions: ["37" as unknown, 12, 88] as unknown as readonly [
        number,
        number,
        number,
      ],
    });
    expect(issues.map((issue) => issue.code)).toContain(
      "dial-position-not-integer",
    );
  });

  it("flags out-of-range dial positions", () => {
    const issues = validateComposerCredential({
      password: "any password",
      positions: [100, 12, 88],
    });
    expect(issues.map((issue) => issue.code)).toContain(
      "dial-position-out-of-range",
    );
  });
});
