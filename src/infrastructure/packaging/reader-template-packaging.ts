import type { PackagingPort } from "../../application/ports/packaging-ports.js";
import { injectPackagePayload } from "../../domain/packaging/package-template.js";

export class ReaderTemplatePackaging implements PackagingPort {
  async emit(payloadBytes: Uint8Array): Promise<string> {
    // Dynamic, not static: the `?raw` import inside reader-template.ts
    // requires dist-reader/reader.html to exist on disk. Deferring the
    // import to call time keeps every module that merely *constructs* a
    // ReaderTemplatePackaging (e.g. the composer shell in tests that never
    // complete a real seal) independent of that build artifact.
    const { readerTemplate } = await import("./reader-template.js");
    return injectPackagePayload(readerTemplate, payloadBytes);
  }
}
