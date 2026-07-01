"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const modes = ["TECHNICAL", "HR", "MIXED"] as const;
const difficulties = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
const personas = [
  "Senior Software Engineer",
  "Engineering Manager",
  "Tech Lead",
  "HR Recruiter",
  "Hiring Manager",
];

export default function InterviewSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    companyName: "",
    roleName: "",
    jobDescription: "",
    techRequirements: "",
    experienceReq: "",
    mode: "TECHNICAL" as (typeof modes)[number],
    difficulty: "INTERMEDIATE" as (typeof difficulties)[number],
    interviewerPersona: personas[0],
    codingEnabled: false,
  });

  return (
    <main className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-3xl font-bold text-white">New mock interview</h1>
        <p className="mt-2 text-zinc-400">
          Configure company details and interview mode. AI generates questions dynamically from your resume and job context.
        </p>
      </div>

      <form
        className="grid max-w-3xl gap-4 rounded-2xl border border-white/10 bg-white/5 p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          setLoading(true);
          setError("");

          try {
            const generateRes = await fetch("/api/interviews/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form),
            });
            const generateData = await generateRes.json();
            if (!generateRes.ok) {
              setError(generateData.error ?? "Failed to prepare interview");
              return;
            }

            const startRes = await fetch("/api/interviews/start", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jobContextId: generateData.jobContextId,
                mode: form.mode,
                difficulty: form.difficulty,
                interviewerPersona: form.interviewerPersona,
                codingEnabled: form.codingEnabled,
              }),
            });
            const startData = await startRes.json();
            if (!startRes.ok) {
              setError(startData.error ?? "Failed to start interview");
              return;
            }

            router.push(`/interview?id=${startData.interviewId ?? startData.interview?.id}`);
          } catch {
            setError("Something went wrong. Please try again.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="rounded-xl border border-white/10 bg-zinc-900 p-3"
            placeholder="Company name"
            value={form.companyName}
            onChange={(e) => setForm((s) => ({ ...s, companyName: e.target.value }))}
            required
          />
          <input
            className="rounded-xl border border-white/10 bg-zinc-900 p-3"
            placeholder="Role (e.g. React Developer)"
            value={form.roleName}
            onChange={(e) => setForm((s) => ({ ...s, roleName: e.target.value }))}
            required
          />
        </div>

        <textarea
          className="min-h-28 w-full rounded-xl border border-white/10 bg-zinc-900 p-3"
          placeholder="Job description"
          value={form.jobDescription}
          onChange={(e) => setForm((s) => ({ ...s, jobDescription: e.target.value }))}
          required
        />
        <textarea
          className="min-h-20 w-full rounded-xl border border-white/10 bg-zinc-900 p-3"
          placeholder="Tech requirements (React, Node, MongoDB...)"
          value={form.techRequirements}
          onChange={(e) => setForm((s) => ({ ...s, techRequirements: e.target.value }))}
          required
        />
        <input
          className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3"
          placeholder="Experience required (e.g. 2+ years)"
          value={form.experienceReq}
          onChange={(e) => setForm((s) => ({ ...s, experienceReq: e.target.value }))}
          required
        />

        <div className="grid gap-4 md:grid-cols-3">
          <select
            className="rounded-xl border border-white/10 bg-zinc-900 p-3"
            value={form.mode}
            onChange={(e) => setForm((s) => ({ ...s, mode: e.target.value as (typeof modes)[number] }))}
          >
            {modes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-white/10 bg-zinc-900 p-3"
            value={form.difficulty}
            onChange={(e) => setForm((s) => ({ ...s, difficulty: e.target.value as (typeof difficulties)[number] }))}
          >
            {difficulties.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-white/10 bg-zinc-900 p-3"
            value={form.interviewerPersona}
            onChange={(e) => setForm((s) => ({ ...s, interviewerPersona: e.target.value }))}
          >
            {personas.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={form.codingEnabled}
            onChange={(e) => setForm((s) => ({ ...s, codingEnabled: e.target.checked }))}
            className="rounded"
          />
          Enable coding interview mode (includes live coding questions)
        </label>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <button type="submit" disabled={loading} className="rounded-xl bg-blue-600 py-3 font-medium disabled:opacity-50">
          {loading ? "Preparing interview..." : "Start voice interview"}
        </button>
      </form>
    </main>
  );
}
