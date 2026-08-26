import { getUpstoxConfig } from "./config";

function getErrorMessage(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) return "";

  const message = (payload as { message?: unknown }).message;
  return typeof message === "string" && message.trim() ? `: ${message}` : "";
}

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

  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new Error(`Upstox API request failed (${response.status})${getErrorMessage(payload)}`);
  }

  return payload as T;
}
