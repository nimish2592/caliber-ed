"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Beaker, FileSearch, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const LOGIN_ERRORS: Record<string, string> = {
  not_provisioned:
    "This Google account is not provisioned. Ask a platform admin to add your name and email.",
  deactivated:
    "This account or organization is deactivated. Contact your Caliber admin.",
  google_not_configured:
    "Google sign-in is not configured yet. Use email and password, or add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
  oauth_denied: "Google sign-in was cancelled.",
  oauth_failed: "Could not complete Google sign-in. Try email and password, or try again.",
  demo_unavailable: "The demo workspace is not available yet. Try again in a moment.",
};

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A753"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"campus" | "demo">("campus");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "demo") setMode("demo");
    const code = params.get("error");
    if (code && LOGIN_ERRORS[code]) setError(LOGIN_ERRORS[code]);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not sign in.");
      setBusy(false);
      return;
    }
    router.push(data.platform && data.role === "admin" ? "/admin" : "/");
    router.refresh();
  }

  async function onDemo() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/demo", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || LOGIN_ERRORS.demo_unavailable);
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30 mb-4">
            <FileSearch className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Caliber</h1>
          <p className="text-slate-400 text-sm mt-1">
            {mode === "demo" ? "Explore Demo University" : "Sign in to your campus workspace"}
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl space-y-4">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setMode("campus");
                setError("");
              }}
              className={`py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
                mode === "campus" ? "bg-white text-slate-900" : "text-slate-400 hover:text-white"
              }`}
            >
              Campus login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("demo");
                setError("");
              }}
              className={`py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
                mode === "demo" ? "bg-white text-slate-900" : "text-slate-400 hover:text-white"
              }`}
            >
              Demo
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {mode === "demo" ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                <p className="text-sm font-semibold text-white">Demo University</p>
                <p className="text-sm text-slate-400 mt-1">
                  Open the seeded campus workspace — sample goals, QR upload, and candidate rankings — without a provisioned account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void onDemo()}
                disabled={busy}
                className="w-full py-3 px-6 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-900 font-semibold rounded-xl transition-all flex items-center justify-center gap-3"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Opening demo…
                  </>
                ) : (
                  <>
                    <Beaker className="w-5 h-5" />
                    Enter demo workspace
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setGoogleLoading(true);
                  window.location.href = "/api/auth/google";
                }}
                disabled={googleLoading || busy}
                className="w-full py-3 px-6 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-800 font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-3"
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                    Redirecting to Google…
                  </>
                ) : (
                  <>
                    <GoogleIcon />
                    Continue with Google
                  </>
                )}
              </button>

              <p className="text-center text-xs text-slate-500">
                Campus accounts live in the database. Use a Gmail or email your admin has added by name.
              </p>

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[11px] uppercase tracking-wider text-slate-500">or email</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <label className="block text-sm text-slate-300">
                  Email
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="username"
                    placeholder="you@university.edu"
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  Password
                  <input
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="Password"
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <button
                  type="submit"
                  disabled={busy || googleLoading}
                  className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-3"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign in with email"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
