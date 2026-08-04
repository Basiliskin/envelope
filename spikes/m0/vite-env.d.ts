// Ambient module declarations for Vite-specific import suffixes.
declare module '*?raw' {
  const source: string;
  export default source;
}

declare module '*?worker' {
  const WorkerConstructor: new () => Worker;
  export default WorkerConstructor;
}

interface Window {
  __ARGON2_WORKER_SRC__?: string;
  __MEMORY_WORKER_SRC__?: string;
  __PAYLOAD_WORKER_SRC__?: string;
  __SINGLEFILE_WORKER_SRC__?: string;
}