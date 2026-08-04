import { observer } from "mobx-react-lite";
import type { CredentialStore } from "../infrastructure/composer/credential-store.js";

export interface PasswordFieldProps {
  readonly store: CredentialStore;
  readonly onGeneratePassphrase?: () => string;
}

export const PasswordField = observer(
  ({ store, onGeneratePassphrase }: PasswordFieldProps) => {
    return (
      <section aria-label="Password" data-testid="password-field">
        <h2>Password</h2>
        <input
          type="password"
          value={store.password}
          data-testid="password-input"
          onChange={(event) => store.setPassword(event.currentTarget.value)}
          aria-invalid={store.credentialIssues.length > 0}
        />
        {onGeneratePassphrase !== undefined ? (
          <button
            type="button"
            data-testid="password-generate"
            onClick={() => {
              const generated = onGeneratePassphrase();
              store.setPassword(generated);
            }}
          >
            Generate
          </button>
        ) : null}
        {store.credentialIssues.length > 0 ? (
          <ul data-testid="credential-issues">
            {store.credentialIssues.map((issue) => (
              <li key={issue.code} data-testid={`issue-${issue.code}`}>
                {issue.message}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    );
  },
);
