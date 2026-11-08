import { Loader2Icon } from "lucide-react"

import { cn } from "cn"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

/** Holds a route's place while it loads, before its own content skeleton takes over. */
function PageSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-h-[50vh] items-center justify-center", className)}>
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  )
}

export { Spinner, PageSpinner }
