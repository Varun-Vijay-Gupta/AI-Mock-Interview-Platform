"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!token) {
    return <p className="text-red-300">Invalid reset link.</p>;
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (password !== confirm) {
          setError("Passwords do not match");
          return;
        }
        setLoading(true);
        setError("");
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        });
        const data = await res.json();
        if (!res.ok) setError(data.error ?? "Reset failed");
        else setMessage(data.message ?? "Password updated.");
        setLoading(false);
      }}
    >
      <input
        type="password"
        required
        minLength={6}
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3"
      />
      <input
        type="password"
        required
        minLength={6}
        placeholder="Confirm password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3"
      />
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {message ? <p className="text-sm text-green-300">{message}</p> : null}
      <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 py-3 disabled:opacity-50">
        {loading ? "Updating..." : "Reset password"}
      </button>
      {message ? (
        <Link href="/login" className="block text-center text-sm text-blue-400 hover:underline">
          Sign in
        </Link>
      ) : null}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="mb-3 text-2xl font-semibold">Reset password</h1>
        <Suspense fallback={<p>Loading...</p>}>
          <ResetForm />
        </Suspense>
      </div>
    </main>
  );
}
