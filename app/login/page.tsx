"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : "");
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (accessToken && refreshToken) {
      setBusy(true);
      setError(null);
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);

      fetch("/api/admin/session", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accessToken, refreshToken }),
      })
        .then(async (response) => {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          if (!response.ok) {
            throw new Error(payload.error ?? "Google login failed.");
          }
          router.push("/");
          router.refresh();
        })
        .catch((oauthError) => {
          setError(oauthError instanceof Error ? oauthError.message : "Google login failed.");
        })
        .finally(() => setBusy(false));
      return;
    }

    const queryError = url.searchParams.get("error");
    if (queryError) {
      setError(queryError);
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Login failed.");
      }
      router.push("/");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-card border border-border rounded-[var(--radius)] overflow-hidden"
      >
        <h1 className="bg-primary text-primary-foreground text-[14px] uppercase tracking-wide font-semibold px-4 py-2">
          Admin login
        </h1>
        <div className="p-4 space-y-4">
          <button
            type="button"
            onClick={() => (window.location.href = "/api/admin/session/google")}
            disabled={busy}
            className="w-full text-xs font-semibold px-3 py-2 rounded-[var(--radius)] border border-border bg-card hover:bg-secondary disabled:opacity-50"
          >
            Continue with Google
          </button>
          <div className="text-[11px] text-muted-foreground text-center">or use email/password</div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="admin@yourdomain.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {error ? <p className="text-xs text-danger">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full text-xs font-semibold px-3 py-2 rounded-[var(--radius)] bg-primary text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}
