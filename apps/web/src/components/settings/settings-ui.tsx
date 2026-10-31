"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** One settings card. When `onSave` is given, it renders a footer whose buttons only enable once something changed. */
export function SettingsCard({
  id,
  title,
  description,
  children,
  dirty = false,
  valid = true,
  saving = false,
  onSave,
  onDiscard,
  saveLabel = "Save changes",
  footerNote,
  tone = "default",
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  dirty?: boolean;
  valid?: boolean;
  saving?: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
  saveLabel?: string;
  footerNote?: ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <Card id={id} className={cn("scroll-mt-24", tone === "danger" && "border-danger/40")}>
      <CardHeader>
        <CardTitle className={cn(tone === "danger" && "text-danger")}>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
      {onSave && (
        <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 py-3">
          <span className="text-xs text-muted-foreground">{footerNote ?? (dirty ? "You have unsaved changes." : " ")}</span>
          <div className="flex gap-2">
            {onDiscard && (
              <Button type="button" variant="ghost" onClick={onDiscard} disabled={!dirty || saving}>
                Discard
              </Button>
            )}
            <Button type="submit" onClick={onSave} disabled={!dirty || !valid || saving}>
              {saving && <Loader2 className="animate-spin" />} {saveLabel}
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

/** Label + control + help/error text, in a consistent layout. */
export function Field({ id, label, help, error, children }: { id: string; label: string; help?: ReactNode; error?: string | null; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
    </div>
  );
}

/** A row with text on the left and an action on the right (stacks on phones). */
export function SettingRow({ title, description, action }: { title: ReactNode; description?: ReactNode; action: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
