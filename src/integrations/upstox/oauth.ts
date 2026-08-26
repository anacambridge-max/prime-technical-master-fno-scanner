import { getUpstoxConfig } from "./config";

const AUTHORIZE_PATH = "/login/authorization/dialog";
const TOKEN_PATH = "/login/authorization/token";

export interface UpstoxTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  expires_at?: number;
  refresh_token?: string;
  extended_token?: string;
  [key: string]: unknown;
}

export function buildUpstoxAuthorizationUrl(state: string): string {
  const config = getUpstoxConfig();
  const url = new URL(`${config.apiBaseUrl}${AUTHORIZE_PATH}`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeAuthorizationCode(code: string): Promise<UpstoxTokenResponse> {
  const config = getUpstoxConfig();
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(`${config.apiBaseUrl}${TOKEN_PATH}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const payload = (await response.json()) as UpstoxTokenResponse | { error?: string; message?: string };

  if (!response.ok) {
    const message = "message" in payload ? payload.message : undefined;
    throw new Error(`Upstox token exchange failed (${response.status})${message ? `: ${message}` : ""}`);
  }

  return payload as UpstoxTokenResponse;
}
