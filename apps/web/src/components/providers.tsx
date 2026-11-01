"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ActivityTracker } from "@/components/app/activity-tracker";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api";
import { takeFlash } from "@/lib/navigation";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
          },
        },
      }),
  );
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={client}>
        <TooltipProvider>
          {children}
          <Toaster richColors position="top-center" />
          <FlashToast />
          <ActivityTracker />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

/** Shows a message left for this page by a full-page redirect (see `hardNavigate`). */
function FlashToast() {
  useEffect(() => {
    const message = takeFlash();
    if (message) toast.success(message);
  }, []);
  return null;
}
