import { observer } from "mobx-react-lite";
import { useState } from "react";
import type { CredentialStore } from "../infrastructure/composer/credential-store.js";

export interface PasswordFieldProps {
  readonly store: CredentialStore;
  readonly onGeneratePassphrase?: () => string;
}

export const PasswordField = observer(
  ({ store, onGeneratePassphrase }: PasswordFieldProps) => {
    const [revealed, setRevealed] = useState(false);
    const passwordIssues = store.credentialIssues.filter((issue) =>
      issue.code.startsWith("password"),
    );
    return (
      <section
        aria-label="Password"
        data-testid="password-field"
        className="composer-card"
      >
        <h2>Password</h2>
        <div className="field-row">
          <input
            type={revealed ? "text" : "password"}
            className="field-input"
            value={store.password}
            data-testid="password-input"
            placeholder="Enter a password"
            onChange={(event) => store.setPassword(event.currentTarget.value)}
            aria-invalid={passwordIssues.length > 0}
          />
          <button
            type="button"
            className="btn"
            data-testid="password-reveal"
            aria-pressed={revealed}
            aria-label={revealed ? "Hide password" : "Show password"}
            onClick={() => setRevealed((current) => !current)}
          >
            {revealed ? "Hide" : "Show"}
          </button>
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
        {passwordIssues.length > 0 ? (
          <ul className="issue-list" data-testid="credential-issues">
            {passwordIssues.map((issue) => (
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
