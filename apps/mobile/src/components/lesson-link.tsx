import { router } from "expo-router";
import type { PracticeMode } from "@/lib/api";
import { useLessonAccess } from "@/lib/queries";
import { toast } from "@/lib/toast";

/**
 * Opens a lesson, optionally straight into practice (as the web's ?mode=…).
 * In Path mode a locked lesson says what unlocks it instead.
 */
export const useOpenLesson = () => {
  const access = useLessonAccess();
  return {
    ...access,
    open: (id: string, mode?: PracticeMode) => {
      if (access.isLocked(id)) return toast.info(`Complete ${access.lockedBy(id)?.title ?? "the lesson before"} to unlock this one.`);
      router.push({ pathname: "/lesson/[id]", params: mode ? { id, mode } : { id } });
    },
  };
};
