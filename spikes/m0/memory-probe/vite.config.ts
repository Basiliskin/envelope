import { createSpikeConfig } from '../build';

export default createSpikeConfig({
  workerGlobalName: '__MEMORY_WORKER_SRC__',
  workerFilenameHint: 'memory.worker',
  rootDir: 'memory-probe',
});