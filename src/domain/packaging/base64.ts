const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function sextet(index: number): string {
  return BASE64_CHARS.charAt(index);
}

function byteAt(bytes: Uint8Array, index: number): number {
  return bytes.at(index) ?? 0;
}

/**
 * Encodes bytes to base64 three bytes at a time. `String.fromCharCode.apply`
 * on a large array blows the call stack (see roadmap "Known constraints"),
 * so this walks the buffer instead of materializing one giant arg list.
 */
export function encodeBase64(bytes: Uint8Array): string {
  let output = "";
  const fullTriplets = Math.floor(bytes.length / 3) * 3;

  for (let offset = 0; offset < fullTriplets; offset += 3) {
    const b0 = byteAt(bytes, offset);
    const b1 = byteAt(bytes, offset + 1);
    const b2 = byteAt(bytes, offset + 2);
    output +=
      sextet(b0 >> 2) +
      sextet(((b0 & 0x03) << 4) | (b1 >> 4)) +
      sextet(((b1 & 0x0f) << 2) | (b2 >> 6)) +
      sextet(b2 & 0x3f);
  }

  const remaining = bytes.length - fullTriplets;
  if (remaining === 1) {
    const b0 = byteAt(bytes, fullTriplets);
    output += sextet(b0 >> 2) + sextet((b0 & 0x03) << 4) + "==";
  } else if (remaining === 2) {
    const b0 = byteAt(bytes, fullTriplets);
    const b1 = byteAt(bytes, fullTriplets + 1);
    output +=
      sextet(b0 >> 2) + sextet(((b0 & 0x03) << 4) | (b1 >> 4)) + sextet((b1 & 0x0f) << 2) + "=";
  }

  return output;
}
