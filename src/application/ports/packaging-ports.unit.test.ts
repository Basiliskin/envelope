import { describe, expect, it } from "vitest";
import type { PackagingPort } from "./packaging-ports.js";

describe("PackagingPort", () => {
  it("describes an async emit(payloadBytes) -> html contract", async () => {
    const port: PackagingPort = {
      emit: (payloadBytes) =>
        Promise.resolve(`<html>${String(payloadBytes.byteLength)}</html>`),
    };
    await expect(port.emit(new Uint8Array([1, 2, 3]))).resolves.toBe(
      "<html>3</html>",
    );
  });
});
