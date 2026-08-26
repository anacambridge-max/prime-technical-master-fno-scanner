import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_SALT = "prime-technical-master-upstox-token-v1";

function getKey(): Buffer {
  const secret = process.env.UPSTOX_CLIENT_SECRET?.trim();
  if (!secret) {
    throw new Error("Missing UPSTOX_CLIENT_SECRET environment variable.");
  }
  return scryptSync(secret, KEY_SALT, 32);
}

export interface EncryptedSecret {
  ciphertext: string;
  iv: string;
  tag: string;
}

export function encryptToken(token: string): EncryptedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64url"),
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url"),
  };
}

export function decryptToken(input: EncryptedSecret): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(input.iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(input.tag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(input.ciphertext, "base64url")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
