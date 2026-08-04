import { afterAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, renameSync } from "node:fs";

const ARTIFACT = "dist-reader/reader.html";

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function build(): void {
  if (existsSync("dist-reader")) {
    rmSync("dist-reader", { recursive: true, force: true });
  }
  execSync("npm run build:reader --silent", { stdio: "ignore" });
}

describe("reader build reproducibility", () => {
  afterAll(() => {
    if (existsSync("dist-reader")) {
      rmSync("dist-reader", { recursive: true, force: true });
    }
    if (existsSync("dist-reader-first-run.html")) {
      rmSync("dist-reader-first-run.html");
    }
  });

  it(
    // Auditability requires that anyone can rebuild the shipped reader
    // stub from source and get byte-identical output — otherwise "read
    // the source" doesn't actually vouch for the artifact users open.
    "produces byte-identical output across two independent builds",
    () => {
      build();
      const firstHash = sha256(ARTIFACT);
      renameSync(ARTIFACT, "dist-reader-first-run.html");

      build();
      const secondHash = sha256(ARTIFACT);

      expect(secondHash).toBe(firstHash);
      expect(readFileSync("dist-reader-first-run.html", "utf8")).toBe(
        readFileSync(ARTIFACT, "utf8"),
      );
    },
    30_000,
  );
});
