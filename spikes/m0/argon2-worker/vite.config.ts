import { createSpikeConfig } from '../build';

export default createSpikeConfig({
  workerGlobalName: '__ARGON2_WORKER_SRC__',
  workerFilenameHint: 'argon2.worker',
  rootDir: 'argon2-worker',
});