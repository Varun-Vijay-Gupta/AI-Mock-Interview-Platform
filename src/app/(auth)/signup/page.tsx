"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
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

          try {
            const response = await fetch("/api/auth/signup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
              setError(data.error ?? "Signup failed. Please try again.");
              return;
            }

            router.push("/login?registered=1");
          } catch {
            setError("Network error. Check your connection and try again.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <h1 className="mb-6 text-2xl font-semibold">Create account</h1>

        {error ? (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <input
          className="mb-3 w-full rounded-lg border border-white/10 bg-zinc-900 p-3"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm((old) => ({ ...old, name: e.target.value }))}
          required
          minLength={2}
        />
        <input
          className="mb-3 w-full rounded-lg border border-white/10 bg-zinc-900 p-3"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((old) => ({ ...old, email: e.target.value }))}
          required
        />
        <input
          className="mb-3 w-full rounded-lg border border-white/10 bg-zinc-900 p-3"
          placeholder="Password (min 6 characters)"
          type="password"
          value={form.password}
          onChange={(e) => setForm((old) => ({ ...old, password: e.target.value }))}
          required
          minLength={6}
        />
        <button
          className="w-full rounded-lg bg-blue-600 p-3 font-medium disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>
        <p className="mt-4 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-400 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
