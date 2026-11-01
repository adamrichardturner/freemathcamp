"use client";

import { Shield } from "lucide-react";
import { useEffect, useState } from "react";
import type { League } from "@/lib/api";
import { cn } from "@/lib/utils";

/** One colour per tier, readable on light and dark backgrounds. */
export const TIER_COLOURS = ["#b26b34", "#7f8ea3", "#d4a017", "#2fa39a", "#3b82f6", "#7c3aed"] as const;
export const tierColour = (index: number) => TIER_COLOURS[index] ?? TIER_COLOURS[0];

export function TierBadge({ index, name, size = "md", className }: { index: number; name?: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const colour = tierColour(index);
  const box = size === "lg" ? "size-20" : size === "md" ? "size-12" : "size-8";
  const icon = size === "lg" ? "size-11" : size === "md" ? "size-7" : "size-4.5";
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center rounded-2xl", box, className)}
      style={{ background: `linear-gradient(145deg, color-mix(in oklch, ${colour} 30%, transparent), color-mix(in oklch, ${colour} 10%, transparent))` }}
      role={name ? "img" : undefined}
      aria-label={name ? `${name} League` : undefined}
    >
      <Shield className={icon} style={{ color: colour, fill: `color-mix(in oklch, ${colour} 35%, transparent)` }} strokeWidth={2} />
      <span className={cn("absolute font-bold tabular-nums", size === "lg" ? "text-base" : size === "md" ? "text-[11px]" : "text-[8px]")} style={{ color: colour }}>
        {index + 1}
      </span>
    </span>
  );
}

type Cohort = NonNullable<League["cohort"]>;

/** Where the learner stands this week, and what it would take to move up. */
export const standing = (cohort: Cohort, tierIndex: number, tierCount: number) => {
  const { rank, size, promote, demote, xp, promotionMinXp } = cohort;
  const inPromotion = promote > 0 && rank <= promote;
  const inDemotion = demote > 0 && rank > size - demote;
  const lastPromoted = cohort.members[promote - 1];
  let hint: string;
  if (tierIndex >= tierCount - 1) hint = "You're in the top league. Hold your place.";
  else if (inPromotion && promotionMinXp !== null && xp < promotionMinXp) hint = `Reach ${promotionMinXp} XP to lock in promotion: ${promotionMinXp - xp} to go.`;
  else if (inPromotion) hint = "You're on course for promotion. Keep it up.";
  else if (lastPromoted) hint = `${Math.max(1, lastPromoted.xp - xp + 1)} XP more puts you in the promotion zone.`;
  else hint = "Solve problems to climb the table.";
  return { zone: inPromotion ? ("promotion" as const) : inDemotion ? ("demotion" as const) : ("safe" as const), hint };
};

export function ZonePill({ zone }: { zone: "promotion" | "demotion" | "safe" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        zone === "promotion" ? "bg-success/12 text-success" : zone === "demotion" ? "bg-danger/12 text-danger" : "bg-muted text-muted-foreground",
      )}
    >
      {zone === "promotion" ? "Promotion zone" : zone === "demotion" ? "Demotion zone" : "Safe"}
    </span>
  );
}

/** "2d 5h left", refreshed each minute. */
export function useTimeLeft(endsAt: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, Date.parse(endsAt) - now);
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}
