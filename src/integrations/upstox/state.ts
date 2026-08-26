import { randomBytes } from "node:crypto";

export function createOAuthState(): string {
  return randomBytes(32).toString("hex");
}

export function safeEqualState(expected: string, received: string | null): boolean {
  if (!received || expected.length !== received.length) return false;

  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ received.charCodeAt(index);
  }
  return mismatch === 0;
}
