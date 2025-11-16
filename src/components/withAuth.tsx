import React, { useEffect, useState } from "react";

/**
 * Decode a base64url JWT payload safely in the browser.
 */
function decodeJwtPayload(token?: string): any | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (payload.length % 4) payload += "=";
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Quick client-side token-validity check:
 */
function isTokenValid(token?: string): boolean {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  if (payload.exp && typeof payload.exp === "number") {
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  }
  return true;
}

/**
 * withAuth HOC (framework-agnostic):
 * - Performs client-side check for a JWT stored under localStorage 'access'
 * - Redirects to /login?next=<currentPath> using window.location on client
 * - Safe for SSR because it does not access window during render
 */
export default function withAuth<P>(WrappedComponent: React.ComponentType<P>) {
  const WithAuth = (props: P) => {
    const [checked, setChecked] = useState(false);

    useEffect(() => {
      // only run client-side
      if (typeof window === "undefined") {
        setChecked(true);
        return;
      }

      try {
        const token = localStorage.getItem("access");
        const ok = isTokenValid(token ?? undefined);
        if (!ok) {
          // redirect to login with next param (client-side)
          const next = window.location.pathname + window.location.search;
          window.location.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }
      } catch {
        const next = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
        window.location.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }

      setChecked(true);
    }, []);

    if (!checked) {
      return (
        <div style={{ padding: 20, textAlign: "center" }}>
          <div>Checking authentication...</div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };

  const name = WrappedComponent.displayName || WrappedComponent.name || "Component";
  WithAuth.displayName = `withAuth(${name})`;

  return WithAuth;
}

