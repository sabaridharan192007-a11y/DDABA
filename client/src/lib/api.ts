const BASE = "/api";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let csrfToken: string | null = null;

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const res = await fetch(`${BASE}/csrf-token`, { credentials: "include" });
  const body = await res.json();
  csrfToken = body.csrfToken;
  return csrfToken!;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", undefined]);

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (!SAFE_METHODS.has(method)) {
    headers["x-csrf-token"] = await getCsrfToken();
  }

  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers,
    ...options,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : null;

  if (res.status === 403 && body?.message?.includes("security token")) {
    // CSRF token may have rotated (e.g. after session regeneration on login) — refresh once and retry.
    csrfToken = null;
    const retryHeaders = { ...headers, "x-csrf-token": await getCsrfToken() };
    const retryRes = await fetch(`${BASE}${path}`, { credentials: "include", headers: retryHeaders, ...options });
    const retryBody = retryRes.headers.get("content-type")?.includes("application/json")
      ? await retryRes.json()
      : null;
    if (!retryRes.ok) throw new ApiError(retryBody?.message || "Something went wrong.", retryRes.status);
    return retryBody as T;
  }

  if (!res.ok) {
    throw new ApiError(body?.message || "Something went wrong. Please try again.", res.status);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  /** For multipart/form-data uploads (e.g. match registration documents). Never set Content-Type manually — the browser needs to set the multipart boundary itself. */
  async postForm<T>(path: string, formData: FormData): Promise<T> {
    const token = await getCsrfToken();
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "x-csrf-token": token },
      body: formData,
    });
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const body = isJson ? await res.json() : null;
    if (!res.ok) throw new ApiError(body?.message || "Something went wrong. Please try again.", res.status);
    return body as T;
  },
};

export { ApiError };
