export interface PackagingPort {
  /** Embeds a sealed package into the reader template, returning the final single-file HTML document. */
  emit(payloadBytes: Uint8Array): Promise<string>;
}
