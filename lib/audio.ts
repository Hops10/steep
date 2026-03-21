// Client-side audio utilities — safe to import in client components (no AI SDKs)

/** Convert raw PCM bytes (base64) to a WAV ArrayBuffer. */
export function pcmToWav(
  pcmBase64: string,
  sampleRate = 24000,
  channels = 1
): ArrayBuffer {
  const pcmBytes = Uint8Array.from(atob(pcmBase64), (c) => c.charCodeAt(0));
  const pcmLen = pcmBytes.length;
  const buf = new ArrayBuffer(44 + pcmLen);
  const view = new DataView(buf);
  writeStr(view, 0, "RIFF");
  view.setUint32(4, 36 + pcmLen, true);
  writeStr(view, 8, "WAVE");
  writeStr(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(view, 36, "data");
  view.setUint32(40, pcmLen, true);
  new Uint8Array(buf, 44).set(pcmBytes);
  return buf;
}

/** Decode a base64 string to an ArrayBuffer. */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return bytes.buffer;
}

function writeStr(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
