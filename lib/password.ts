const encoder = new TextEncoder();
const ITERATIONS = 210_000;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await derive(password, salt);
  return `pbkdf2$${toHex(salt)}$${toHex(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "pbkdf2" || !saltHex || !hashHex) return false;
  const salt = fromHex(saltHex);
  const expected = fromHex(hashHex);
  const actual = await derive(password, salt);
  if (actual.length !== expected.length) return false;

  let mismatch = 0;
  for (let index = 0; index < actual.length; index += 1) {
    mismatch |= (actual[index] ?? 0) ^ (expected[index] ?? 0);
  }
  return mismatch === 0;
}

async function derive(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer,
      iterations: ITERATIONS,
    },
    key,
    256,
  );
  return new Uint8Array(bits);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}
