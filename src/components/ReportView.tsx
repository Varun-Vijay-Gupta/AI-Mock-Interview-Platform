"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPercent } from "@/lib/utils";

type ConversationTurn = {
  role: string;
  content: string;
  timestamp?: string;
  topic?: string;
};

type AnswerAnalysisItem = {
  question?: string;
  yourAnswer?: string;
  grammarCorrections?: string;
  betterWayToSay?: string;
  idealAnswer?: string;
  score?: number;
  feedback?: string;
};

type ReportProps = {
  interview: {
    id: string;
    mode: string;
    difficulty: string;
    interviewerPersona: string;
    recordingUrl: string | null;
    createdAt: Date;
    conversationHistory: unknown;
    jobContext: { companyName: string; roleName: string } | null;
  };
  report: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    grammarFeedback: string[];
    conversationSummary: string | null;
    resumeJobFitScore: number | null;
    resumeJobFitNotes: string | null;
    shareToken: string | null;
    technicalScore: number;
    communicationScore: number;
    confidenceScore: number;
    hrScore: number;
    behavioralScore: number;
    overallScore: number;
    answerAnalysis: unknown;
    idealAnswers: unknown;
  };
};

export function ReportView({ interview, report }: ReportProps) {
  const [copied, setCopied] = useState(false);
  const analysis = Array.isArray(report.answerAnalysis) ? (report.answerAnalysis as AnswerAnalysisItem[]) : [];
  const history = Array.isArray(interview.conversationHistory)
    ? (interview.conversationHistory as ConversationTurn[])
    : [];
  const shareUrl =
    typeof window !== "undefined" && report.shareToken
      ? `${window.location.origin}/reports/share/${report.shareToken}`
      : "";

  function downloadPdf() {
    window.print();
  }

  return (
    <main className="space-y-8 p-6 md:p-8 print:bg-white print:text-black">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-400 print:text-gray-600">Interview report</p>
          <h1 className="text-3xl font-bold text-white print:text-black">
            {interview.jobContext?.companyName ?? "Practice"} · {interview.jobContext?.roleName ?? interview.mode}
          </h1>
          <p className="mt-1 text-zinc-400 print:text-gray-600">
            {interview.mode} · {interview.difficulty} · {interview.interviewerPersona} ·{" "}
            {new Date(interview.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          {shareUrl ? (
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-2 text-sm"
            >
              {copied ? "Copied!" : "Copy share link"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={downloadPdf}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium"
          >
            Export PDF
          </button>
        </div>
      </header>

      {report.conversationSummary ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 print:border-gray-200">
          <h2 className="text-lg font-semibold">Summary</h2>
          <p className="mt-2 text-sm text-zinc-300 print:text-gray-700">{report.conversationSummary}</p>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Overall", value: report.overallScore },
          { label: "Technical", value: report.technicalScore },
          { label: "Communication", value: report.communicationScore },
          { label: "Confidence", value: report.confidenceScore },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 print:border-gray-200">
            <p className="text-sm text-zinc-400">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold">{formatPercent(item.value)}</p>
          </div>
        ))}
      </div>

      {report.resumeJobFitScore != null ? (
        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <h2 className="text-lg font-semibold text-emerald-200">Resume–job fit</h2>
          <p className="mt-1 text-2xl font-semibold">{Math.round(report.resumeJobFitScore)}%</p>
          {report.resumeJobFitNotes ? (
            <p className="mt-2 text-sm text-zinc-300">{report.resumeJobFitNotes}</p>
          ) : null}
        </section>
      ) : null}

      {history.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 print:border-gray-200">
          <h2 className="text-lg font-semibold">Conversation timeline</h2>
          <div className="mt-4 space-y-3">
            {history.map((turn, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="w-24 shrink-0 text-xs uppercase text-zinc-500">{turn.role}</span>
                <p className="text-zinc-300 print:text-gray-700">{turn.content}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {interview.recordingUrl ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 print:hidden">
          <h2 className="text-lg font-semibold">Interview recording</h2>
          <video controls className="mt-4 w-full max-w-3xl rounded-xl bg-black" src={interview.recordingUrl} />
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Strengths</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-300">
            {report.strengths.map((item) => (
              <li key={item} className="rounded-lg bg-zinc-900/60 px-3 py-2 print:bg-gray-100">
                {item}
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Areas to improve</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-300">
            {report.weaknesses.map((item) => (
              <li key={item} className="rounded-lg bg-zinc-900/60 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {report.suggestions.length > 0 ? (
        <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
          <h2 className="text-lg font-semibold">Actionable suggestions</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-300">
            {report.suggestions.map((item) => (
              <li key={item} className="rounded-lg bg-zinc-900/60 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.grammarFeedback.length > 0 ? (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h2 className="text-lg font-semibold text-amber-200">Grammar & clarity</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-300">
            {report.grammarFeedback.map((item) => (
              <li key={item} className="rounded-lg bg-zinc-900/60 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Answer analysis</h2>
        {analysis.length === 0 ? (
          <p className="text-zinc-400">No per-question analysis available.</p>
        ) : (
          analysis.map((item, index) => (
            <article key={`${item.question}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-start justify-between gap-4">
                <p className="font-medium text-white print:text-black">
                  Q{index + 1}. {item.question}
                </p>
                {item.score != null ? (
                  <span className="rounded-full bg-blue-600/20 px-3 py-1 text-sm text-blue-300">
                    {Math.round(item.score)}%
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 text-sm">
                {item.yourAnswer ? (
                  <div className="rounded-lg bg-zinc-900/60 p-3">
                    <p className="text-xs uppercase text-zinc-500">Your answer</p>
                    <p className="mt-1">{item.yourAnswer}</p>
                  </div>
                ) : null}
                {item.idealAnswer ? (
                  <div className="rounded-lg bg-green-500/10 p-3">
                    <p className="text-xs uppercase text-green-300">Ideal answer</p>
                    <p className="mt-1">{item.idealAnswer}</p>
                  </div>
                ) : null}
              </div>
            </article>
          ))
        )}
      </section>

      <Link href="/dashboard" className="inline-block rounded-xl bg-blue-600 px-5 py-3 font-medium print:hidden">
        Back to dashboard
      </Link>
    </main>
  );
}
