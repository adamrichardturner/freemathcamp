import { Effect } from "effect";
import { Router } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import {
  accountSettings,
  changeDisplayName,
  changePassword,
  deleteAccount,
  exportAccountData,
  resetCourseProgress,
  signOutOtherSessions,
  updatePreferences,
} from "../../application/account";
import { clearSessionCookie, currentUser, requireUser } from "../middleware/auth";
import { handle, type AppRuntime } from "../runtime";
import { ChangePasswordBody, DeleteAccountBody, decode, PreferencesBody, ProfileBody, ResetProgressBody } from "../validation";

/** /api/me — the signed-in learner's own account. Works before email verification so people can fix or delete it. */
export const accountRoutes = (runtime: AppRuntime, opts: { secure: boolean }) => {
  const router = Router();
  const h = handle(runtime);

  // Password checks (change password, delete account) get brute-force protection.
  const sensitiveLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => `${req.user?.id ?? ipKeyGenerator(req.clientIp)}`,
    message: { error: { code: "RateLimited", message: "Too many attempts. Please wait a few minutes." } },
  });

  router.use(requireUser);

  router.get("/settings", h((req) => Effect.flatMap(currentUser(req), (u) => accountSettings(u, req.sessionToken))));

  router.patch(
    "/profile",
    h((req) =>
      Effect.gen(function* () {
        const { displayName } = yield* decode(ProfileBody, req.body);
        return { user: yield* changeDisplayName(yield* currentUser(req), displayName) };
      }),
    ),
  );

  router.patch(
    "/preferences",
    h((req) =>
      Effect.gen(function* () {
        const prefs = yield* decode(PreferencesBody, req.body);
        return { user: yield* updatePreferences(yield* currentUser(req), prefs) };
      }),
    ),
  );

  router.post(
    "/password",
    sensitiveLimiter,
    h((req) =>
      Effect.gen(function* () {
        const body = yield* decode(ChangePasswordBody, req.body);
        return yield* changePassword(yield* currentUser(req), req.sessionToken!, body);
      }),
    ),
  );

  router.post("/sessions/revoke-others", h((req) => Effect.flatMap(currentUser(req), (u) => signOutOtherSessions(u, req.sessionToken!))));

  router.post(
    "/reset-progress",
    h((req) =>
      Effect.gen(function* () {
        const { courseId } = yield* decode(ResetProgressBody, req.body);
        return yield* resetCourseProgress(yield* currentUser(req), courseId);
      }),
    ),
  );

  router.get(
    "/export",
    h((req, res) =>
      Effect.gen(function* () {
        const data = yield* exportAccountData(yield* currentUser(req));
        res.setHeader("Content-Disposition", `attachment; filename="freemathcamp-data-${new Date().toISOString().slice(0, 10)}.json"`);
        return data;
      }),
    ),
  );

  router.delete(
    "/",
    sensitiveLimiter,
    h((req, res) =>
      Effect.gen(function* () {
        const body = yield* decode(DeleteAccountBody, req.body);
        const result = yield* deleteAccount(yield* currentUser(req), body);
        clearSessionCookie(res, opts.secure);
        return result;
      }),
    ),
  );

  return router;
};
