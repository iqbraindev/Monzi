import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function deriveKey(): Buffer {
  const raw = process.env.PLATFORM_SECRETS_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error(
      "PLATFORM_SECRETS_ENCRYPTION_KEY is not configured (required to store integration secrets)"
    );
  }

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  try {
    const decoded = Buffer.from(raw, "base64");
    if (decoded.length === KEY_LENGTH) return decoded;
  } catch {
    // fall through to scrypt
  }

  return scryptSync(raw, "monzi-platform-secrets", KEY_LENGTH);
}

export function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid encrypted secret format");
  }

  const key = deriveKey();
  const iv = Buffer.from(parts[1]!, "base64");
  const authTag = Buffer.from(parts[2]!, "base64");
  const encrypted = Buffer.from(parts[3]!, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
