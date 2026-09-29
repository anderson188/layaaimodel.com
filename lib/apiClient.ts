import { API_BASE_URL } from "./api";

export async function apiFetch<T>(
  path: string,
  opts: { method?: string; token?: string | null; body?: unknown } = {},
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: { message: text } };
  }
  if (!res.ok) {
    const message =
      (data as { error?: { message?: string } })?.error?.message || `HTTP ${res.status}`;
    return { ok: false, status: res.status, message };
  }
  return { ok: true, data: data as T };
}

export const SESSION_KEY = "laya_session_token";
export const PASTED_KEY = "laya_pasted_api_key";
