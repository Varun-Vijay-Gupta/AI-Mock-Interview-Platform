"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type TrendPoint = {
  label: string;
  technical: number;
  communication: number;
  confidence: number;
};

export function PerformanceChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm text-zinc-500">
        Complete interviews to see your performance trend.
      </div>
    );
  }

  return (
    <div className="h-72 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <h3 className="mb-4 text-lg font-semibold text-white">Performance over time</h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <XAxis dataKey="label" stroke="#71717a" fontSize={12} />
          <YAxis stroke="#71717a" fontSize={12} domain={[0, 100]} />
          <Tooltip
            contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 12 }}
            labelStyle={{ color: "#fafafa" }}
          />
          <Line type="monotone" dataKey="technical" name="Technical" stroke="#22c55e" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="communication" name="Communication" stroke="#3b82f6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="confidence" name="Confidence" stroke="#f59e0b" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
