const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable.",
    );
  }

  return { url: url.replace(/\/$/, ""), serviceRoleKey };
}

export async function supabaseRest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const config = getSupabaseConfig();
  const headers = new Headers(DEFAULT_HEADERS);
  headers.set("apikey", config.serviceRoleKey);
  headers.set("Authorization", `Bearer ${config.serviceRoleKey}`);

  for (const [key, value] of new Headers(init.headers).entries()) {
    headers.set(key, value);
  }

  const response = await fetch(`${config.url}/rest/v1${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `Supabase request failed (${response.status})${body ? `: ${body}` : ""}`,
    );
  }

  if (!body.trim()) {
    return undefined as T;
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error("Supabase returned an invalid JSON response.");
  }
}
