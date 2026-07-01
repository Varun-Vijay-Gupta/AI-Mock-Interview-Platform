"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Upload } from "lucide-react";

export default function ResumePage() {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  return (
    <main className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Resume management</h1>
        <p className="mt-2 text-zinc-400">Upload PDF or DOCX. AI extracts skills, experience, and ATS insights.</p>
      </div>

      <form
        className="max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!file || !session?.user) return;

          setLoading(true);
          setError("");
          setMessage("");

          const formData = new FormData();
          formData.append("resume", file);

          try {
            const response = await fetch("/api/resume/upload", {
              method: "POST",
              body: formData,
            });
            const data = await response.json();
            if (!response.ok) {
              setError(data.error ?? "Upload failed");
              return;
            }
            setMessage(
              `Uploaded "${data.resume.filename}" successfully. ATS score: ${Math.round(Number(data.resume.atsScore ?? 0))}%`,
            );
            setFile(null);
            setTimeout(() => {
              window.location.href = "/dashboard";
            }, 1500);
          } catch {
            setError("Network error during upload.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-zinc-900/50 px-6 py-12 text-center transition hover:border-blue-500/50">
          <Upload className="mb-3 h-8 w-8 text-blue-400" />
          <span className="text-sm text-zinc-300">{file ? file.name : "Click to select PDF or DOCX"}</span>
          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
        {message ? <p className="mt-4 text-sm text-green-300">{message}</p> : null}

        <button
          type="submit"
          disabled={!file || loading}
          className="mt-4 w-full rounded-xl bg-blue-600 py-3 font-medium disabled:opacity-50"
        >
          {loading ? "Analyzing resume..." : "Upload & analyze"}
        </button>
      </form>
    </main>
  );
}
