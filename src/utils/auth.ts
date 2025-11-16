type TokenPair = { access: string; refresh?: string | null };

/**
 * Where to persist tokens:
 * - If remember=true => localStorage
 * - If remember=false => sessionStorage (cleared on tab close)
 */
const ACCESS_KEY = "access";
const REFRESH_KEY = "refresh";

/** decode jwt payload (base64url) */
export function decodeJwtPayload(token?: string): any | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (payload.length % 4) payload += "=";
    const json = atob(payload);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** seconds since epoch */
export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

/** get expiry (exp) from token (seconds) or null */
export function getTokenExpiry(token?: string): number | null {
  const p = decodeJwtPayload(token);
  if (!p) return null;
  if (typeof p.exp === "number") return p.exp;
  return null;
}

/** quick validity check */
export function isTokenValid(token?: string): boolean {
  if (!token) return false;
  const exp = getTokenExpiry(token);
  if (!exp) return true; // no exp claim: treat as valid (change if you prefer strict)
  return exp > nowSec();
}

function pickStorage(remember = true): Storage {
  return remember ? window.localStorage : window.sessionStorage;
}

/** set tokens in chosen storage */
export function setTokens(tokens: TokenPair, remember = true) {
  const storage = pickStorage(remember);
  if (tokens.access) storage.setItem(ACCESS_KEY, tokens.access);
  if (tokens.refresh) storage.setItem(REFRESH_KEY, tokens.refresh);
}

/** convenience: set tokens into localStorage explicitly (always persistent) */
export function setTokensPersistent(tokens: TokenPair) {
  localStorage.setItem(ACCESS_KEY, tokens.access);
  if (tokens.refresh) localStorage.setItem(REFRESH_KEY, tokens.refresh);
}

/** get access token (checks localStorage then sessionStorage) */
export function getAccess(): string | null {
  return localStorage.getItem(ACCESS_KEY) ?? sessionStorage.getItem(ACCESS_KEY);
}

/** get refresh token */
export function getRefresh(): string | null {
  return localStorage.getItem(REFRESH_KEY) ?? sessionStorage.getItem(REFRESH_KEY);
}

/** clear tokens everywhere */
export function clearTokens() {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  } catch {
    // ignore
  }
}

/**
 * Refresh access token using refresh endpoint.
 * - POST /api/token/refresh/  { refresh: "<refresh>" }   (Simple JWT default)
 * - On success stores new access (and refresh if returned)
 * - Returns new token pair or throws an Error with message
 */
export async function refreshAccessIfNeeded(verbose = false): Promise<TokenPair> {
  const refresh = getRefresh();
  if (!refresh) throw new Error("No refresh token available");

  // call refresh endpoint
  const res = await fetch("/api/token/refresh/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.detail || body.error || `Refresh failed (status ${res.status})`;
    throw new Error(String(msg));
  }

  const data = await res.json();
  const access = data.access ?? data.token ?? null;
  const newRefresh = data.refresh ?? null;

  if (!access) throw new Error("Refresh endpoint did not return an access token");

  // Persist in the same storage where refresh was found:
  const remember = !!localStorage.getItem(REFRESH_KEY);
  setTokens({ access, refresh: newRefresh ?? refresh }, remember);

  if (verbose) console.debug("[auth] token refreshed");
  return { access, refresh: newRefresh ?? refresh };
}
