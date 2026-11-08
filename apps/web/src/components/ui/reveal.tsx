"use client";

import { cn } from "cn";
import { type ReactNode, type RefObject, useEffect, useRef, useState } from "react";

/** How long the content must hold its size before we call it painted. */
const QUIET_MS = 120;
/** Never hold the skeleton longer than this, whatever is still settling. */
const MAX_MS = 4000;

// Only what's actually laid out counts: inactive tabs and lazy images below the fold
// would otherwise hold the skeleton until the cap.
const shown = (node: Element) => node.getClientRects().length > 0;
const pendingImages = (el: HTMLElement) => Array.from(el.querySelectorAll("img")).some((img) => !img.complete && img.loading !== "lazy" && shown(img));
// A skeleton still inside the content is a lazy piece (a dynamic visual, a card with its
// own query) that hasn't arrived yet; revealing now would let it jump in later. Wrap a
// skeleton that is the settled state (it never resolves) in `data-reveal-ignore`.
const pendingSkeletons = (el: HTMLElement) => Array.from(el.querySelectorAll('[data-slot="skeleton"]:not([data-reveal-ignore] *)')).some(shown);

/**
 * True once `ready` content under `ref` has fully laid out: fonts loaded, images decoded,
 * no lazy skeletons left inside, and its box unchanged for a beat. Sticky — once painted,
 * a background refetch never brings the skeleton back.
 */
export function usePainted(ref: RefObject<HTMLElement | null>, ready: boolean) {
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    if (!ready || painted) return;
    const el = ref.current;
    if (!el) return setPainted(true);

    let finished = false;
    let quiet: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    const finish = () => {
      if (finished) return;
      finished = true;
      // Two frames: the first lets the browser apply the last layout, the second runs after it painted.
      frame = requestAnimationFrame(() => (frame = requestAnimationFrame(() => setPainted(true))));
    };
    const settle = () => {
      clearTimeout(quiet);
      quiet = setTimeout(() => {
        if (!pendingSkeletons(el) && !pendingImages(el)) finish();
      }, QUIET_MS);
    };

    const cap = setTimeout(finish, MAX_MS);
    const resize = new ResizeObserver(settle);
    const mutate = new MutationObserver(settle);
    let observing = false;
    // Measuring before the web fonts land would bless a layout that's about to reflow.
    void document.fonts.ready.then(() => {
      if (finished) return;
      observing = true;
      resize.observe(el);
      mutate.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-slot", "src", "class"] });
      settle();
    });
    el.addEventListener("load", settle, true);
    el.addEventListener("error", settle, true);

    return () => {
      finished = true;
      clearTimeout(cap);
      clearTimeout(quiet);
      cancelAnimationFrame(frame);
      if (observing) {
        resize.disconnect();
        mutate.disconnect();
      }
      el.removeEventListener("load", settle, true);
      el.removeEventListener("error", settle, true);
    };
  }, [ref, ready, painted]);

  return painted;
}

/**
 * Shows `skeleton` until `children` are ready *and* painted, then fades the content in
 * with no movement. Once `ready`, the content mounts invisibly underneath the skeleton so
 * it can lay out (lazy visuals, fonts, nested queries) before anyone sees it.
 *
 * Pass `children` only when its data exists, or always (for server-rendered content that
 * should stay in the page for crawlers) and gate with `ready`.
 */
export function Reveal({ ready, skeleton, children, className }: { ready: boolean; skeleton: ReactNode; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const painted = usePainted(ref, ready);
  // Once there's content to lay out, the skeleton floats over it instead of above it.
  const mounted = children !== null && children !== undefined && children !== false;

  return (
    <div className={cn("relative", className)}>
      {!painted && (
        <div aria-hidden className={cn(mounted && "pointer-events-none absolute inset-x-0 top-0 z-10 bg-background")}>
          {skeleton}
        </div>
      )}
      <div
        ref={ref}
        aria-busy={!painted}
        inert={!painted}
        className={cn("transition-opacity duration-300 ease-out motion-reduce:transition-none", painted ? "opacity-100" : "opacity-0")}
      >
        {children}
      </div>
    </div>
  );
}
