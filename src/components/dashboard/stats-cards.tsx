"use client";

import { motion } from "framer-motion";
import { Brain, MessageCircle, Target, TrendingUp, Users } from "lucide-react";

type Stat = {
  label: string;
  value: string;
  hint?: string;
};

const icons = [Users, TrendingUp, MessageCircle, Brain, Target];

export function StatsCards({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {stats.map((item, idx) => {
        const Icon = icons[idx] ?? Target;
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] p-4 backdrop-blur"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-zinc-400">{item.label}</p>
              <Icon className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-2xl font-semibold text-white">{item.value}</p>
            {item.hint ? <p className="mt-1 text-xs text-zinc-500">{item.hint}</p> : null}
          </motion.div>
        );
      })}
    </div>
  );
}
