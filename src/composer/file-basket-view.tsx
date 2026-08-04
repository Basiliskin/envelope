import { observer } from "mobx-react-lite";
import type { FileBasketStore } from "../infrastructure/composer/file-basket-store.js";

export interface FileBasketViewProps {
  readonly store: FileBasketStore;
  readonly onSelectFiles?: (files: readonly File[]) => void;
}

export const FileBasketView = observer(
  ({ store, onSelectFiles }: FileBasketViewProps) => {
    return (
      <section
        aria-label="File basket"
        data-testid="file-basket"
        className="composer-card"
      >
        <h2>Files</h2>
        {store.entries.length > 0 ? (
          <ul className="file-list">
            {store.entries.map((entry) => (
              <li
                key={entry.id}
                data-testid={`basket-entry-${entry.id}`}
                className="file-row"
              >
                <span className="file-row-name">{entry.path}</span>
                <span className="file-row-size">{entry.size} bytes</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => store.remove(entry.id)}
                  aria-label={`Remove ${entry.path}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state" data-testid="basket-empty">
            No files yet.
          </p>
        )}
        {store.error !== null ? (
          <p role="alert" className="issue-item" data-testid="basket-error">
            {store.error}
          </p>
        ) : null}
        <p className="field-totals" data-testid="basket-total">
          Total: {store.totalBytes} bytes
        </p>
        {onSelectFiles !== undefined ? (
          <FilePicker onSelectFiles={onSelectFiles} />
        ) : null}
      </section>
    );
  },
);

interface FilePickerProps {
  readonly onSelectFiles: (files: readonly File[]) => void;
}

function FilePicker({ onSelectFiles }: FilePickerProps) {
  return (
    <label className="file-picker-label">
      Choose files or drop them here
      <input
        type="file"
        multiple
        className="file-picker-input"
        data-testid="file-input"
        onChange={(event) => {
          const files = event.currentTarget.files;
          if (files === null) return;
          onSelectFiles(Array.from(files));
        }}
      />
    </label>
  );
}
