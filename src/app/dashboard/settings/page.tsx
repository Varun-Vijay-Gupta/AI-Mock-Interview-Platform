"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function SettingsContent() {
  const searchParams = useSearchParams();
  const upgraded = searchParams.get("upgraded");
  const [loading, setLoading] = useState(false);

  return (
    <main className="space-y-6 p-6 md:p-8">
      <h1 className="text-3xl font-bold text-white">Settings</h1>
      {upgraded ? <p className="text-green-300">Thank you! Premium activation may take a moment.</p> : null}
      <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="text-sm text-zinc-300">Current plan</p>
        <p className="mt-1 text-2xl font-semibold text-white">Free</p>
        <p className="mt-2 text-xs text-zinc-500">Premium unlocks unlimited interviews and advanced analytics.</p>
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            const res = await fetch("/api/subscription/checkout", { method: "POST" });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
            else alert(data.error ?? "Checkout unavailable");
            setLoading(false);
          }}
          className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Redirecting..." : "Upgrade to Premium"}
        </button>
      </div>
    </main>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}
