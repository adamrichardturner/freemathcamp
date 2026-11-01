"use client";

import { Settings } from "lucide-react";
import { ButtonLink } from "@/components/app/button-link";
import { Card, CardContent } from "@/components/ui/card";
import { NotificationCentre } from "./notification-centre";

export function NotificationsPageView() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl">Notifications</h1>
          <p className="mt-1 text-muted-foreground">Milestones, reminders and account notices. Keep anything you want to hold on to.</p>
        </div>
        <ButtonLink href="/settings#notifications" variant="outline" size="sm" className="shrink-0">
          <Settings /> <span className="hidden sm:inline">Settings</span>
        </ButtonLink>
      </header>
      <Card className="py-3">
        <CardContent className="px-3">
          <NotificationCentre />
        </CardContent>
      </Card>
    </div>
  );
}
