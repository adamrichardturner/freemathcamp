import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="relative grid size-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-chart-4 text-primary-foreground shadow-sm shadow-primary/30 transition-transform group-hover:rotate-6">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <path d="M4 18 L10 6 L14 14 L20 4" />
          <circle cx="20" cy="4" r="2.3" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span className="text-[1.05rem]">
        FreeMath<span className="text-primary">Camp</span>
      </span>
    </Link>
  );
}
