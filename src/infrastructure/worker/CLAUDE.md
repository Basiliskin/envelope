# CLAUDE.md — worker

**Last updated:** 2026-08-06
**Mode:** Flat

## Overview

Contains 11 source file(s) in `src/infrastructure/worker`.

## File Map

### in-process-bus.int.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/infrastructure/worker/in-process-bus.js:createInProcessMessageBusPair`. Uses `vitest`

### in-process-bus.ts

- **Purpose:** Defines `InProcessMessageBus` class; provides `createInProcessMessageBusPair` function.
- **Key elements:** `createInProcessMessageBusPair`, `InProcessMessageBus`
- **Relations:** Imports `src/infrastructure/worker/message-bus.js`. Imports `src/infrastructure/worker/worker-protocol.js`

### message-bus.ts

- **Purpose:** declares `MessageBus`, `MessageBusHandler`, `MessagePortLike` types.
- **Key elements:** `MessageBus`, `MessageBusHandler`, `MessagePortLike`
- **Relations:** Imports `src/infrastructure/worker/worker-protocol.js`

### post-message-bus.int.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/infrastructure/worker/post-message-bus.js:PostMessageMessageBus`. Imports `src/infrastructure/worker/message-bus.js`. Uses `vitest`

### post-message-bus.ts

- **Purpose:** Defines `PostMessageMessageBus` class.
- **Key elements:** `PostMessageMessageBus`
- **Relations:** Calls `src/infrastructure/worker/worker-protocol.js:isWorkerEvent,isWorkerRequest`. Imports `src/infrastructure/worker/message-bus.js`

### worker-client.ts

- **Purpose:** Defines `WorkerClient`, `WorkerClientError` classes.
- **Key elements:** `WorkerClient`, `WorkerClientError`
- **Relations:** Imports `src/application/ports/worker-ports.js`. Imports `src/infrastructure/worker/message-bus.js`. Imports `src/infrastructure/worker/worker-protocol.js`

### worker-host.int.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/domain/credential/secret.js:canonicalizeSecret`. Calls `src/infrastructure/archive/fflate-adapter.js:FflateArchiveWriter`. Calls `src/infrastructure/worker/in-process-bus.js:createInProcessMessageBusPair`. Calls `src/infrastructure/worker/worker-client.js:WorkerClient`. Calls `src/infrastructure/worker/worker-host.js:WorkerHost`. Imports `src/application/ports/worker-ports.js`. Imports `src/domain/credential/argon2-params.js`. Imports `src/domain/credential/safe-combination.js`. Uses `vitest`

### worker-host.ts

- **Purpose:** Defines `WorkerHost` class; declares `WorkerHostOptions` type.
- **Key elements:** `WorkerHost`, `WorkerHostOptions`
- **Relations:** Calls `src/domain/archive/manifest.js:createManifest`. Calls `src/infrastructure/crypto/header-codec.js:decodeHeader,encodeHeader`. Calls `src/infrastructure/crypto/kdf.js:deriveContentKey,deriveMasterKey`. Calls `src/infrastructure/crypto/stream-aead.js:sealStream,unsealStream`. Calls `src/infrastructure/worker/worker-protocol.js:isWorkerRequest`. Imports `src/domain/archive/archive.js`. Imports `src/domain/credential/argon2-params.js`. Imports `src/infrastructure/archive/fflate-adapter.js`. Imports `src/infrastructure/worker/message-bus.js`

### worker-protocol.int.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/infrastructure/worker/worker-protocol.js:isWorkerEvent,isWorkerRequest`. Uses `vitest`

### worker-protocol.ts

- **Purpose:** provides `isWorkerEvent`, `isWorkerRequest` functions; declares `WorkerCancelledEvent`, `WorkerCancelRequest`, `WorkerErrorEvent`, `WorkerEvent`, `WorkerProgressEvent`, `WorkerRequest`, `WorkerSealRequest`, `WorkerSealResultEvent`, `WorkerUnsealRequest`, `WorkerUnsealResultEvent` types.
- **Key elements:** `isWorkerEvent`, `isWorkerRequest`, `WORKER_PROTOCOL_VERSION`, `WorkerCancelledEvent`, `WorkerCancelRequest`, `WorkerErrorEvent`, `WorkerEvent`, `WorkerProgressEvent`, `WorkerRequest`, `WorkerSealRequest`, `WorkerSealResultEvent`, `WorkerUnsealRequest`, `WorkerUnsealResultEvent`
- **Relations:** Imports `src/application/ports/worker-ports.js`. Imports `src/domain/credential/argon2-params.js`

### worker-roundtrip.int.test.ts

- **Purpose:** Module with no detected exports.
- **Relations:** Calls `src/domain/credential/secret.js:canonicalizeSecret`. Calls `src/infrastructure/archive/fflate-adapter.js:FflateArchiveWriter`. Calls `src/infrastructure/worker/in-process-bus.js:createInProcessMessageBusPair`. Calls `src/infrastructure/worker/worker-client.js:WorkerClient`. Calls `src/infrastructure/worker/worker-host.js:WorkerHost`. Imports `src/application/ports/worker-ports.js`. Imports `src/domain/credential/argon2-params.js`. Imports `src/domain/credential/safe-combination.js`. Imports `src/infrastructure/crypto/header-codec.js`. Uses `vitest`

## Notes / Patterns

<!-- Add folder-specific conventions, gotchas, and tech details here. -->
