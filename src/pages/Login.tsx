import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

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

function isTokenValid(token?: string): boolean {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  if (payload.exp && typeof payload.exp === "number") {
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  }
  // If no exp claim, consider it valid (or switch to false if you prefer)
  return true;
}

function getNextFromLocation(search: string): string {
  try {
    const params = new URLSearchParams(search);
    const next = params.get("next");
    return next ? decodeURIComponent(next) : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

const Login: React.FC = () => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [remember, setRemember] = useState<boolean>(true);

  const navigate = useNavigate();
  const location = useLocation();
  const nextPath = getNextFromLocation(location.search);

  useEffect(() => {
    // If already logged in with a valid token, redirect to next
    try {
      const token = localStorage.getItem("access");
      if (isTokenValid(token ?? undefined)) {
        navigate(nextPath, { replace: true });
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Please enter username and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/token/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await response.json().catch(() => ({} as any));

      if (response.ok) {
        // Accept common response shapes: { access, refresh } or { token }
        const access = data.access ?? data.token ?? null;
        const refresh = data.refresh ?? data.refresh_token ?? null;

        if (!access) {
          setError("Login succeeded but no access token received from server.");
          setLoading(false);
          return;
        }

        localStorage.setItem("access", access);
        if (refresh) localStorage.setItem("refresh", refresh);

        // Optionally handle "remember" to store in cookies or similar. For now we keep localStorage.
        navigate(nextPath, { replace: true });
      } else {
        // Try to surface any useful server message
        const detail = data.detail || data.error || data.message;
        setError(typeof detail === "string" && detail ? detail : "Invalid credentials. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-6 text-center">Login</h2>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="mb-4">
          <label className="block mb-1 font-medium">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full border px-3 py-2 rounded"
            autoComplete="username"
            autoFocus
          />
        </div>

        <div className="mb-6">
          <label className="block mb-1 font-medium">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border px-3 py-2 rounded"
            autoComplete="current-password"
          />
        </div>

        <div className="flex items-center justify-between mb-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={remember}
              onChange={() => setRemember((r) => !r)}
              className="mr-2"
            />
            <span className="text-sm">Remember</span>
          </label>
          <a className="text-sm text-blue-600 hover:underline" href="/forgot-password">
            Forgot?
          </a>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
};

export default Login;

