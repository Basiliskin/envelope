import { observer } from "mobx-react-lite";
import { CredentialStore } from "../infrastructure/composer/credential-store.js";
import { FileBasketStore } from "../infrastructure/composer/file-basket-store.js";
import { SealStore } from "../infrastructure/composer/seal-store.js";
import { ComposerSealDriver } from "../infrastructure/composer/composer-seal-driver.js";
import { ReaderTemplatePackaging } from "../infrastructure/packaging/reader-template-packaging.js";
import { generateDiceware } from "../domain/composer/diceware.js";
import { FileBasketView } from "./file-basket-view.js";
import { PasswordField } from "./password-field.js";
import { SafeDial } from "./safe-dial.js";
import { CombinedEntropy, SealProgressView } from "./combined-entropy.js";

export interface ComposerAppProps {
  readonly credential?: CredentialStore;
  readonly basket?: FileBasketStore;
  readonly seal?: SealStore;
}

export function buildDefaultComposer(): {
  credential: CredentialStore;
  basket: FileBasketStore;
  seal: SealStore;
} {
  const credential = new CredentialStore();
  const basket = new FileBasketStore();
  const driver = new ComposerSealDriver();
  const packaging = new ReaderTemplatePackaging();
  const seal = new SealStore(credential, basket, driver, packaging);
  return { credential, basket, seal };
}

export const ComposerApp = observer(
  ({ credential, basket, seal }: ComposerAppProps) => {
    const state =
      credential !== undefined && basket !== undefined && seal !== undefined
        ? { credential, basket, seal }
        : buildDefaultComposer();
    return <ComposerBody state={state} />;
  },
);

interface ComposerBodyProps {
  readonly state: {
    readonly credential: CredentialStore;
    readonly basket: FileBasketStore;
    readonly seal: SealStore;
  };
}

const ComposerBody = observer(({ state }: ComposerBodyProps) => {
  const { credential, basket, seal } = state;
  return (
    <main data-testid="composer-app" className="composer-shell">
      <h1 className="composer-title">Envelope Composer</h1>
      <FileBasketView
        store={basket}
        onSelectFiles={(files) => {
          void Promise.all(
            files.map(async (file) => {
              const bytes = new Uint8Array(await file.arrayBuffer());
              basket.add({
                id: `${file.name}-${String(crypto.randomUUID())}`,
                path: file.name,
                size: bytes.byteLength,
                content: bytes,
              });
            }),
          );
        }}
      />
      <PasswordField
        store={credential}
        onGeneratePassphrase={() =>
          generateDiceware(Math.random, 5, " ")
        }
      />
      <SafeDial store={credential} />
      <CombinedEntropy
        credential={credential}
        basket={basket}
        argon2Preset={credential.selectedArgon2Preset}
      />
      <SealProgressView
        store={seal}
        onSeal={() => {
          void seal.start();
        }}
      />
    </main>
  );
});
