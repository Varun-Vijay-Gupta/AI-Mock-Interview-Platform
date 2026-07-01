"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [devResetUrl, setDevResetUrl] = useState("");

  return (
    <main className="grid min-h-screen place-items-center p-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="mb-3 text-2xl font-semibold">Forgot password</h1>
        <p className="mb-4 text-sm text-zinc-400">Enter your email and we will send a reset link.</p>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            setMessage("");
            setDevResetUrl("");

            const res = await fetch("/api/auth/forgot-password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            });
            const data = await res.json();
            setMessage(data.message ?? data.error ?? "Request sent.");
            if (data.devResetUrl) setDevResetUrl(data.devResetUrl);
            setLoading(false);
          }}
        >
          <input
            type="email"
            required
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3"
          />
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 py-3 disabled:opacity-50">
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        {message ? <p className="mt-4 text-sm text-green-300">{message}</p> : null}
        {devResetUrl ? (
          <p className="mt-2 break-all text-xs text-amber-300">
            Dev reset link:{" "}
            <Link href={devResetUrl.replace(/^https?:\/\/[^/]+/, "")} className="underline">
              {devResetUrl}
            </Link>
          </p>
        ) : null}

        <Link href="/login" className="mt-4 inline-block text-sm text-blue-400 hover:underline">
          Back to login
        </Link>
      </div>
    </main>
  );
}
