import { createRoot } from "react-dom/client";
import ReaderFactory from "./infrastructure/reader/reader-factory.js";
import type { ReaderStore } from "./infrastructure/reader/reader-store.js";
import { ReaderApp } from "./reader/reader-app.js";
import { SEALED_PAYLOAD_ELEMENT_ID } from "./domain/packaging/package-template.js";

export function readEmbeddedPackage(root: ParentNode = document): Uint8Array {
  const payload = root.querySelector<HTMLScriptElement>(
    `#${SEALED_PAYLOAD_ELEMENT_ID}`,
  );
  if (payload === null) return new Uint8Array();
  const encoded = payload.textContent?.replace(/\s+/g, "") ?? "";
  if (encoded.length === 0) return new Uint8Array();
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function buildReaderStore(packageBytes: Uint8Array): ReaderStore {
  return new ReaderFactory().create(packageBytes);
}

export function mountReader(
  target: HTMLElement = document.body,
  packageBytes: Uint8Array = readEmbeddedPackage(),
): () => void {
  const store = buildReaderStore(packageBytes);
  const root = createRoot(target);
  root.render(<ReaderApp store={store} />);
  void store.preflight();
  return () => root.unmount();
}

export function autoMount(): void {
  if (typeof document === "undefined") return;
  const start = (): void => {
    mountReader(document.getElementById("root") ?? document.body);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}

if (typeof document !== "undefined") autoMount();
