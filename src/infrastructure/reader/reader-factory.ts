import { UnsealPackage } from "../../application/reader/unseal-package.js";
import { FflateReaderArchive } from "../archive/fflate-adapter.js";
import { BrowserMemoryPreflight } from "./browser-memory-preflight.js";
import { BrowserReaderCrypto } from "./browser-reader-crypto.js";
import { ReaderStore } from "./reader-store.js";

const ReaderFactory = class {
  create(packageBytes: Uint8Array): ReaderStore {
    return new ReaderStore(
      packageBytes,
      new UnsealPackage(
        new BrowserMemoryPreflight(),
        new BrowserReaderCrypto(),
        new FflateReaderArchive(),
      ),
    );
  }
};

export default ReaderFactory;
