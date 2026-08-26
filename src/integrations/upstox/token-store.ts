import { supabaseRest } from "../supabase/server";
import { decryptToken, encryptToken } from "./token-crypto";

interface TokenRow {
  provider: "upstox";
  access_token_ciphertext: string;
  access_token_iv: string;
  access_token_tag: string;
  token_type: string;
  expires_at: string | null;
  updated_at: string;
}

export interface StoredUpstoxToken {
  accessToken: string;
  tokenType: string;
  expiresAt: string | null;
  updatedAt: string;
}

export async function saveUpstoxToken(input: {
  accessToken: string;
  tokenType: string;
  expiresAt: string | null;
}): Promise<void> {
  const encrypted = encryptToken(input.accessToken);

  await supabaseRest<TokenRow[]>("/upstox_oauth_tokens?on_conflict=provider", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      provider: "upstox",
      access_token_ciphertext: encrypted.ciphertext,
      access_token_iv: encrypted.iv,
      access_token_tag: encrypted.tag,
      token_type: input.tokenType || "Bearer",
      expires_at: input.expiresAt,
    }),
  });
}

export async function loadUpstoxToken(): Promise<StoredUpstoxToken | null> {
  const rows = await supabaseRest<TokenRow[]>(
    "/upstox_oauth_tokens?provider=eq.upstox&select=*&limit=1",
  );
  const row = rows[0];
  if (!row) return null;

  return {
    accessToken: decryptToken({
      ciphertext: row.access_token_ciphertext,
      iv: row.access_token_iv,
      tag: row.access_token_tag,
    }),
    tokenType: row.token_type,
    expiresAt: row.expires_at,
    updatedAt: row.updated_at,
  };
}

export async function getUpstoxTokenStatus() {
  const rows = await supabaseRest<TokenRow[]>(
    "/upstox_oauth_tokens?provider=eq.upstox&select=token_type,expires_at,updated_at&limit=1",
  );
  const row = rows[0];
  if (!row) {
    return { connected: false, expiresAt: null, updatedAt: null };
  }

  const expiresAtMs = row.expires_at ? Date.parse(row.expires_at) : null;
  const expired = expiresAtMs !== null && expiresAtMs <= Date.now();

  return {
    connected: !expired,
    expiresAt: row.expires_at,
    updatedAt: row.updated_at,
  };
}
