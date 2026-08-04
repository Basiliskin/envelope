import { describe, expect, it } from "vitest";
import {
  DICEWARE_LIST,
  dicewareListLength,
  generateDiceware,
} from "./diceware.js";

describe("diceware", () => {
  it("embeds a non-empty word list", () => {
    expect(DICEWARE_LIST.length).toBeGreaterThan(0);
    expect(dicewareListLength()).toBe(DICEWARE_LIST.length);
  });

  it("every entry is a non-empty lowercase word", () => {
    for (const word of DICEWARE_LIST) {
      expect(word.length).toBeGreaterThan(0);
      expect(word).toMatch(/^[a-z]+$/);
    }
  });

  it("generates the requested number of words joined by the chosen separator", () => {
    const deterministicRng = (): number => 0.5;
    const passphrase = generateDiceware(deterministicRng, 5, "-");
    const parts = passphrase.split("-");
    expect(parts.length).toBe(5);
  });

  it("rejects non-positive word counts", () => {
    expect(() => generateDiceware(Math.random, 0)).toThrow(
      /positive integer/,
    );
  });

  it("the chosen words are pulled from the embedded list", () => {
    const list = new Set(DICEWARE_LIST);
    const passphrase = generateDiceware(Math.random, 7);
    for (const word of passphrase.split(" ")) {
      expect(list.has(word)).toBe(true);
    }
  });
});
