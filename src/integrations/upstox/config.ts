export interface UpstoxConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiBaseUrl: string;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getUpstoxConfig(): UpstoxConfig {
  return {
    clientId: required("UPSTOX_CLIENT_ID"),
    clientSecret: required("UPSTOX_CLIENT_SECRET"),
    redirectUri: required("UPSTOX_REDIRECT_URI"),
    apiBaseUrl: process.env.UPSTOX_API_BASE_URL?.trim() || "https://api.upstox.com/v2",
  };
}
