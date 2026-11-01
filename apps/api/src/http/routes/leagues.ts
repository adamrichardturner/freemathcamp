import { Effect } from "effect";
import { Router } from "express";
import { leagueOverview } from "../../application/leagues";
import { currentUser, requireUser, requireVerified } from "../middleware/auth";
import { handle, type AppRuntime } from "../runtime";

/** /api/leagues — the signed-in learner's league. Other learners appear by username only. */
export const leagueRoutes = (runtime: AppRuntime) => {
  const router = Router();
  const h = handle(runtime);
  router.use(requireUser, requireVerified);
  router.get("/me", h((req) => Effect.flatMap(currentUser(req), leagueOverview)));
  return router;
};
