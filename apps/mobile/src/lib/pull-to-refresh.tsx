import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshControl } from "react-native";

/** Never leave the spinner up longer than this, even if a request hangs. */
const MAX_MS = 15_000;

/**
 * A pull-to-refresh control whose spinner shows only while a refresh the learner
 * pulled for is running.
 *
 * Tying `refreshing` to React Query's `isRefetching` turns the spinner on for
 * every background refetch too (a tab regaining focus, an invalidation after a
 * lesson). On iOS that makes UIRefreshControl begin refreshing while it's out of
 * view, and it can stay stuck at the top until pulled again. Background refetches
 * update the data in place instead; first loads show the screen's skeleton.
 */
export function usePullToRefresh(...refetch: (() => Promise<unknown>)[]) {
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(refetch);
  latest.current = refetch;
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    const timeout = new Promise((resolve) => setTimeout(resolve, MAX_MS));
    void Promise.race([Promise.allSettled(latest.current.map((f) => f())), timeout]).finally(() => {
      if (mounted.current) setRefreshing(false);
    });
  }, []);

  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />;
}
