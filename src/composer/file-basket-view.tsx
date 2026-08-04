import { observer } from "mobx-react-lite";
import type { FileBasketStore } from "../infrastructure/composer/file-basket-store.js";

export interface FileBasketViewProps {
  readonly store: FileBasketStore;
  readonly onSelectFiles?: (files: readonly File[]) => void;
}

export const FileBasketView = observer(
  ({ store, onSelectFiles }: FileBasketViewProps) => {
    return (
      <section aria-label="File basket" data-testid="file-basket">
        <h2>Files</h2>
        <ul>
          {store.entries.map((entry) => (
            <li key={entry.id} data-testid={`basket-entry-${entry.id}`}>
              <span>{entry.path}</span>
              <span>{entry.size} bytes</span>
              <button
                type="button"
                onClick={() => store.remove(entry.id)}
                aria-label={`Remove ${entry.path}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        {store.entries.length === 0 ? (
          <p data-testid="basket-empty">No files yet.</p>
        ) : null}
        {store.error !== null ? (
          <p role="alert" data-testid="basket-error">
            {store.error}
          </p>
        ) : null}
        <p data-testid="basket-total">Total: {store.totalBytes} bytes</p>
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
    <input
      type="file"
      multiple
      data-testid="file-input"
      onChange={(event) => {
        const files = event.currentTarget.files;
        if (files === null) return;
        onSelectFiles(Array.from(files));
      }}
    />
  );
}
