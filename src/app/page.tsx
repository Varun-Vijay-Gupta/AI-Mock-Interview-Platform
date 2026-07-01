import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-20">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-400">AI Mock Interview Platform</p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
          Practice realistic technical and HR interviews with real-time AI voice, webcam insights, and personalized reports.
        </h1>
        <p className="max-w-3xl text-zinc-300">
          Built for developers targeting top companies. Generate role-specific questions from your resume and job description, run live interviews, and get actionable feedback.
        </p>
        <div className="flex gap-3">
          <Link href="/signup" className="rounded-xl bg-blue-600 px-5 py-3 font-medium hover:bg-blue-500">Start for free</Link>
          <Link href="/dashboard" className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 font-medium">Open dashboard</Link>
        </div>
      </div>
    </main>
  );
}
