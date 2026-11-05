import * as Haptics from "expo-haptics";
import { ApiError } from "./api";

/** A tiny toast store, shown by <Toaster /> at the top of the screen (the web uses Sonner). */
export type ToastKind = "success" | "error" | "info";
export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  icon?: "up" | "down";
}

let items: ToastItem[] = [];
let next = 1;
const listeners = new Set<(items: ToastItem[]) => void>();
const emit = () => listeners.forEach((l) => l(items));

const show = (kind: ToastKind, message: string, icon?: ToastItem["icon"]) => {
  const item = { id: next++, kind, message, icon };
  items = [...items.slice(-2), item];
  emit();
  if (kind === "error") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  setTimeout(() => dismiss(item.id), kind === "error" ? 5000 : 3200);
};

export const dismiss = (id: number) => {
  items = items.filter((t) => t.id !== id);
  emit();
};

export const subscribe = (l: (items: ToastItem[]) => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export const toast = {
  success: (message: string, icon?: ToastItem["icon"]) => show("success", message, icon),
  info: (message: string, icon?: ToastItem["icon"]) => show("info", message, icon),
  /** An API error's own message, or the fallback for anything else. */
  error: (e: unknown, fallback: string) => show("error", e instanceof ApiError ? e.message : typeof e === "string" ? e : fallback),
};
