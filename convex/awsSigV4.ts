const encoder = new TextEncoder();

type BinaryInput = string | Uint8Array | ArrayBuffer;

const requireSubtleCrypto = (): SubtleCrypto => {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto API is unavailable in the current runtime');
  }
  return subtle;
};

const toUint8Array = (value: BinaryInput): Uint8Array => {
  if (typeof value === 'string') {
    return encoder.encode(value);
  }
  if (value instanceof Uint8Array) {
    return value;
  }
  return new Uint8Array(value);
};

const toHex = (value: Uint8Array): string =>
  Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('');

const hmacSha256 = async (key: BinaryInput, payload: BinaryInput): Promise<Uint8Array> => {
  const subtle = requireSubtleCrypto();
  const cryptoKey = await subtle.importKey(
    'raw',
    toUint8Array(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await subtle.sign('HMAC', cryptoKey, toUint8Array(payload));
  return new Uint8Array(signature);
};

export const sha256Hex = async (payload: BinaryInput): Promise<string> => {
  const subtle = requireSubtleCrypto();
  const digest = await subtle.digest('SHA-256', toUint8Array(payload));
  return toHex(new Uint8Array(digest));
};

export const hmacSha256Hex = async (key: BinaryInput, payload: BinaryInput): Promise<string> =>
  toHex(await hmacSha256(key, payload));

/**
 * AWS Signature Version 4 key derivation.
 */
export async function getSignatureKey(
  secretAccessKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<Uint8Array> {
  const kDate = await hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}
