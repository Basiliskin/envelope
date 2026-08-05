import { createRoot } from "react-dom/client";
import { ComposerApp, buildDefaultComposer } from "./composer/composer-app.js";
import "./shared/app.css";

export function mountComposer(target: HTMLElement = document.body): () => void {
  const { credential, basket, seal } = buildDefaultComposer();
  const root = createRoot(target);
  root.render(<ComposerApp credential={credential} basket={basket} seal={seal} />);
  return () => root.unmount();
}

export { ComposerApp, buildDefaultComposer };

export function autoMount(): void {
  if (typeof document === "undefined") return;
  const start = (): void => {
    const target = document.getElementById("root") ?? document.body;
    mountComposer(target);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}

if (typeof document !== "undefined") {
  autoMount();
}
