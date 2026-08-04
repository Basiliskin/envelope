import { createSpikeConfig } from '../build';

export default createSpikeConfig({
  workerGlobalName: '__PAYLOAD_WORKER_SRC__',
  workerFilenameHint: 'payload.worker',
  rootDir: 'payload-roundtrip',
});