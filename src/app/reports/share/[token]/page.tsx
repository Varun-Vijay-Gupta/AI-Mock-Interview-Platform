"use client";

import { useEffect, useState } from "react";
import { ReportView } from "@/components/ReportView";

export default function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<Parameters<typeof ReportView>[0] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(({ token: t }) => setToken(t));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/reports/share/${token}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else {
          setData({
            interview: {
              id: "",
              mode: json.interview.mode,
              difficulty: json.interview.difficulty,
              interviewerPersona: json.interview.persona,
              recordingUrl: null,
              createdAt: new Date(json.interview.createdAt),
              conversationHistory: json.interview.conversationHistory,
              jobContext: {
                companyName: json.interview.companyName ?? "Company",
                roleName: json.interview.roleName ?? "Role",
              },
            },
            report: {
              ...json.report,
              shareToken: token,
            },
          });
        }
      })
      .catch(() => setError("Failed to load report"));
  }, [token]);

  if (error) return <main className="p-8 text-red-300">{error}</main>;
  if (!data) return <main className="p-8 text-white">Loading report...</main>;
  return <ReportView interview={data.interview} report={data.report} />;
}
