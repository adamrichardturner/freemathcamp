"use client";

import { useMutation, type DefaultError, type UseMutationOptions } from "@tanstack/react-query";

/** How long a button that saves something shows its loading state, at the least. */
export const MIN_PENDING_MS = 1500;

/**
 * Settles with `work`, but never sooner than `ms`. A save that returns in 80ms
 * otherwise flashes its spinner too briefly to read; holding it reads as the
 * change being processed. Failures wait too, so an error never flashes past.
 */
export const atLeast = <T>(work: Promise<T>, ms = MIN_PENDING_MS): Promise<T> =>
  Promise.allSettled([work, new Promise((r) => setTimeout(r, ms))]).then(([result]) =>
    result.status === "fulfilled" ? result.value : Promise.reject(result.reason as Error),
  );

/**
 * useMutation for actions behind a button (anything that POSTs, PATCHes, PUTs
 * or DELETEs on a click). `isPending` stays true for at least MIN_PENDING_MS,
 * and, because TanStack Query awaits a promise returned from onSuccess or
 * onSettled, through whatever refetch those return. So a button goes disabled
 * once and comes back once, with nothing flickering in between.
 */
export const useAction = <TData = unknown, TVariables = void, TContext = unknown>(
  options: UseMutationOptions<TData, DefaultError, TVariables, TContext> & { mutationFn: (variables: TVariables) => Promise<TData> },
) => {
  const { mutationFn } = options;
  return useMutation({ ...options, mutationFn: (variables: TVariables) => atLeast(mutationFn(variables)) });
};
