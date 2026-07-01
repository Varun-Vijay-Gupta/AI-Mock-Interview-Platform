"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <form
        className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-white"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          setLoading(true);
          const result = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/dashboard" });
          setLoading(false);
          if (result?.error) {
            setError("Invalid email or password.");
            return;
          }
          window.location.href = "/dashboard";
        }}
      >
        <h1 className="mb-6 text-2xl font-semibold">Login</h1>
        {registered ? (
          <p className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
            Account created successfully. Please sign in.
          </p>
        ) : null}
        {error ? (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}
        <input className="mb-3 w-full rounded-lg border border-white/10 bg-zinc-900 p-3" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="mb-3 w-full rounded-lg border border-white/10 bg-zinc-900 p-3" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full rounded-lg bg-blue-600 p-3 font-medium disabled:opacity-60" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <button className="mt-3 w-full rounded-lg border border-white/20 p-3" type="button" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
          Continue with Google
        </button>
        <p className="mt-4 text-center text-sm text-zinc-400">
          No account?{" "}
          <Link href="/signup" className="text-blue-400 hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </main>
  );
}
