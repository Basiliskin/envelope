import { useSyncExternalStore } from "react";
import type { ReaderFile } from "../domain/reader/types.js";
import type { ReaderStore } from "../infrastructure/reader/reader-store.js";
import { SafeDial } from "../shared/safe-dial.js";

export interface ReaderAppProps {
  readonly store: ReaderStore;
}

export function ReaderApp({ store }: ReaderAppProps) {
  useSyncExternalStore(store.subscribe.bind(store), snapshot(store), snapshot(store));
  if (store.state === "preflighting") {
    return (
      <main data-testid="reader-preflight" className="composer-shell">
        <p className="empty-state">Checking package requirements...</p>
      </main>
    );
  }

  return (
    <main data-testid="reader-app" className="composer-shell">
      <h1 className="composer-title">Envelope Reader</h1>
      <ProtectionNote />
      {store.state === "error" ? (
        <p role="alert" className="issue-item" data-testid="reader-error">
          {store.error}
        </p>
      ) : null}
      {store.state === "done" ? (
        <Downloads files={store.files} />
      ) : (
        <Credentials store={store} />
      )}
      {store.progress === null ? null : (
        <progress
          className="reader-progress"
          aria-label={`${store.progress.phase} progress`}
          max={store.progress.total}
          value={store.progress.current}
        />
      )}
    </main>
  );
}

function snapshot(store: ReaderStore): () => string {
  return () =>
    [
      store.state,
      store.password,
      store.firstPosition,
      store.secondPosition,
      store.thirdPosition,
      store.dialLocked,
      store.progress?.phase,
      store.progress?.current,
      store.files.length,
      store.error,
      store.failedAttempts,
      store.canUnseal,
    ].join(":");
}

function ProtectionNote() {
  return (
    <aside
      aria-label="Security notice"
      data-testid="protection-note"
      className="composer-card"
    >
      <p className="composer-hint">
        <strong>What this protects:</strong> attachments, filenames, and sizes
        are encrypted against someone who only has this file. It does not
        protect a compromised device, keylogger, malicious browser, or a weak
        password.
      </p>
    </aside>
  );
}

function Credentials({ store }: ReaderAppProps) {
  return (
    <section data-testid="reader-credentials" className="composer-card">
      <h2>Password</h2>
      <div className="field-row">
        <input
          id="reader-password"
          type="password"
          className="field-input"
          aria-label="Password"
          autoComplete="current-password"
          value={store.password}
          disabled={store.state === "unsealing"}
          onChange={(event) => store.setPassword(event.currentTarget.value)}
        />
      </div>
      <SafeDial store={store} />
      <div className="btn-row">
        <button
          type="button"
          className="btn btn-primary"
          data-testid="reader-unseal"
          disabled={!store.canUnseal}
          onClick={() => void store.unseal()}
        >
          Open attachments
        </button>
        {store.state === "unsealing" ? (
          <button type="button" className="btn" onClick={() => store.cancel()}>
            Cancel
          </button>
        ) : null}
      </div>
      {store.backoffRemainingMs > 0 ? (
        <p className="entropy-threshold" data-testid="reader-backoff">
          Wait {Math.ceil(store.backoffRemainingMs / 1000)}s before trying again.
          This delay is a convenience against fumbled retyping, not a security
          measure — it does nothing against an offline attack on this file.
        </p>
      ) : null}
    </section>
  );
}

function Downloads({ files }: { readonly files: readonly ReaderFile[] }) {
  const download = (file: ReaderFile): void => {
    const url = URL.createObjectURL(new Blob([new Uint8Array(file.bytes)]));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.path;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <section data-testid="reader-downloads" className="composer-card">
      <h2>Attachments</h2>
      <div className="btn-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => files.forEach(download)}
        >
          Download all
        </button>
      </div>
      <ul className="file-list">
        {files.map((file) => (
          <li key={file.path} className="file-row">
            <span className="file-row-name">{file.path}</span>
            <span className="file-row-size">
              {formatSize(file.bytes.byteLength)}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => download(file)}
            >
              Download
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatSize(size: number): string {
  if (size < 1024) return `${String(size)} B`;
  return `${(size / 1024).toFixed(1)} KiB`;
}
