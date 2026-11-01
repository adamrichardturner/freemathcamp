export const pct = (x: number) => `${Math.round(x * 100)}%`;

export const duration = (ms: number) => {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

/** Minutes on the site, e.g. "45 min" or "3h 20m". */
export const minutes = (m: number) => {
  if (m < 1) return m > 0 ? "<1 min" : "0 min";
  if (m < 60) return `${Math.round(m)} min`;
  const h = Math.floor(m / 60);
  const rest = Math.round(m % 60);
  return rest ? `${h}h ${rest}m` : `${h}h`;
};

/** Compact minutes for tight spaces, e.g. "12m" or "1.5h". */
export const shortMinutes = (m: number) => (m < 60 ? `${Math.round(m)}m` : `${Math.round(m / 6) / 10}h`);

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export const relative = (iso: string, now = Date.now()) => {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), "hour");
  return rtf.format(Math.round(diff / 86_400_000), "day");
};

export const greeting = (d = new Date()) => {
  const h = d.getHours();
  return h < 5 ? "Burning the midnight oil" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};
