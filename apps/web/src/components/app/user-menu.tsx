"use client";

import { BadgeCheck, ChartLine, Compass, Flame, GraduationCap, LayoutDashboard, Loader2, LogOut, Settings, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { openOnboarding } from "./onboarding";
import { useDashboard, useLogout, useSession } from "@/hooks/queries";
import type { User } from "@/lib/api";
import { cn } from "@/lib/utils";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "?";

export function UserAvatar({ user, className }: { user: User; className?: string }) {
  return (
    <Avatar className={className}>
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />}
      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-chart-4/20 font-semibold text-primary">{initials(user.displayName)}</AvatarFallback>
    </Avatar>
  );
}

/** Avatar button with a profile card: who you are, how you're doing, and account actions. */
export function UserMenu({ user }: { user: User }) {
  const router = useRouter();
  const logout = useLogout();
  const { verified } = useSession();
  const { data } = useDashboard(verified);
  const stats = data?.stats;
  const memberSince = new Date(user.createdAt).toLocaleDateString("en", { month: "short", year: "numeric" });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu" />}>
        <UserAvatar user={user} className="size-8" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-72 p-0">
        <div className="flex items-center gap-3 border-b bg-gradient-to-br from-primary/[0.07] to-transparent p-4">
          <UserAvatar user={user} className="size-11" />
          <div className="min-w-0">
            <div className="flex items-center gap-1 font-semibold">
              <span className="truncate">{user.displayName}</span>
              {user.emailVerified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified email" />}
            </div>
            <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">Student since {memberSince}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 border-b p-2 text-center">
          {verified && !stats ? (
            Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)
          ) : (
            <>
              <Stat icon={Flame} value={stats?.streak.current ?? 0} label="day streak" tone={stats?.streak.current ? "text-chart-4" : undefined} />
              <Stat icon={GraduationCap} value={stats ? `${stats.exercisesMastered}/${stats.exercisesTotal}` : "0"} label="mastered" tone="text-success" />
              <Stat icon={Target} value={stats?.problemsSolved ?? 0} label="problems" tone="text-primary" />
            </>
          )}
        </div>

        <DropdownMenuGroup className="p-1">
          <DropdownMenuItem onClick={() => router.push("/learn")}>
            <LayoutDashboard /> Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/progress")}>
            <ChartLine /> Progress
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <Settings /> Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openOnboarding}>
            <Compass /> Take the tour
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuGroup className="p-1">
          {/* Stays open while signing out so the progress is visible until the page reloads. */}
          <DropdownMenuItem variant="destructive" closeOnClick={false} onClick={() => logout.mutate()} disabled={logout.busy}>
            {logout.busy ? <Loader2 className="animate-spin" /> : <LogOut />} {logout.busy ? "Signing out…" : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Stat({ icon: Icon, value, label, tone }: { icon: typeof Flame; value: number | string; label: string; tone?: string }) {
  return (
    <div className="rounded-lg px-1 py-2">
      <div className="flex items-center justify-center gap-1 text-sm font-semibold tabular-nums">
        <Icon className={cn("size-3.5 text-muted-foreground", tone)} /> {value}
      </div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
