import { getUpstoxConfig } from "./config";

export async function upstoxGet<T>(path: string, accessToken: string): Promise<T> {
  const config = getUpstoxConfig();
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as T | { message?: string; errors?: unknown };

  if (!response.ok) {
    const message = "message" in payload && payload.message ? `: ${payload.message}` : "";
    throw new Error(`Upstox API request failed (${response.status})${message}`);
  }

  return payload as T;
}
