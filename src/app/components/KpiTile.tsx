import React from "react";
import GlassCard from "./GlassCard";

export default function KpiTile({ label, value }: { label: string; value: number | string }) {
  return (
    <GlassCard className="p-5 sheen transition-transform duration-300 ease-morph hover:scale-[1.02]">
      <p className="text-[11px] tracking-[0.22em] text-white/55">{label.toUpperCase()}</p>
      <p className="mt-1 text-[32px] font-extrabold leading-none">{value}</p>
    </GlassCard>
  );
}
