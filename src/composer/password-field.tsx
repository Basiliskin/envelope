import { observer } from "mobx-react-lite";
import type { CredentialStore } from "../infrastructure/composer/credential-store.js";

export interface PasswordFieldProps {
  readonly store: CredentialStore;
  readonly onGeneratePassphrase?: () => string;
}

export const PasswordField = observer(
  ({ store, onGeneratePassphrase }: PasswordFieldProps) => {
    return (
      <section
        aria-label="Password"
        data-testid="password-field"
        className="composer-card"
      >
        <h2>Password</h2>
        <div className="field-row">
          <input
            type="password"
            className="field-input"
            value={store.password}
            data-testid="password-input"
            placeholder="Enter a password"
            onChange={(event) => store.setPassword(event.currentTarget.value)}
            aria-invalid={store.credentialIssues.length > 0}
          />
          {onGeneratePassphrase !== undefined ? (
            <button
              type="button"
              className="btn"
              data-testid="password-generate"
              onClick={() => {
                const generated = onGeneratePassphrase();
                store.setPassword(generated);
              }}
            >
              Generate
            </button>
          ) : null}
        </div>
        {store.credentialIssues.length > 0 ? (
          <ul className="issue-list" data-testid="credential-issues">
            {store.credentialIssues.map((issue) => (
              <li
                key={issue.code}
                className="issue-item"
                data-testid={`issue-${issue.code}`}
              >
                {issue.message}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    );
  },
);
