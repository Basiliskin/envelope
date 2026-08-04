import { createSpikeConfig } from '../build';

export default createSpikeConfig({
  workerGlobalName: '__SINGLEFILE_WORKER_SRC__',
  workerFilenameHint: 'combined.worker',
  rootDir: 'singlefile-build',
});