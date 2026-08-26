import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const STATE_TTL_SECONDS = 600;

function getStateSecret(): string {
  const secret = process.env.UPSTOX_CLIENT_SECRET?.trim();
  if (!secret) throw new Error("Missing required environment variable: UPSTOX_CLIENT_SECRET");
  return secret;
}

export function createOAuthState(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(24).toString("hex");
  const payload = `${timestamp}.${nonce}`;
  const signature = createHmac("sha256", getStateSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function safeEqualState(state: string | null): boolean {
  if (!state) return false;

  const parts = state.split(".");
  if (parts.length !== 3) return false;

  const [timestampText, nonce, signature] = parts;
  if (!timestampText || !nonce || !signature) return false;

  const timestamp = Number(timestampText);
  if (!Number.isInteger(timestamp)) return false;

  const age = Math.floor(Date.now() / 1000) - timestamp;
  if (age < 0 || age > STATE_TTL_SECONDS) return false;

  const payload = `${timestampText}.${nonce}`;
  const expected = createHmac("sha256", getStateSecret()).update(payload).digest("base64url");

  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}
