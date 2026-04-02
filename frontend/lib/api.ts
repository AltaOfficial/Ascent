const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setTokenCookie(token: string): void {
  document.cookie = `access_token=${encodeURIComponent(token)}; path=/; SameSite=Strict`;
}

export function clearTokenCookie(): void {
  document.cookie = "access_token=; path=/; max-age=0; SameSite=Strict";
}

export async function apiFetch<TResponse>(
  path: string,
  options: RequestInit = {},
): Promise<TResponse> {
  const token = getTokenFromCookie();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as unknown as TResponse;
  }

  return response.json() as Promise<TResponse>;
}
