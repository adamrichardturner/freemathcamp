import { Effect } from "effect";
import { Router } from "express";
import { adminDeleteUser, adminOverview, adminResetProgress, adminSetPassword, adminUserDetail, adminUsers } from "../../application/admin";
import { requireAdmin } from "../middleware/auth";
import { handle, type AppRuntime } from "../runtime";
import { AdminDeleteBody, AdminPasswordBody, AdminUserCourseParams, AdminUserParams, AdminUsersQuery, CourseParams, decode, ResetProgressBody } from "../validation";

/** /api/admin — analytics and account management. Every route is behind requireAdmin. */
export const adminRoutes = (runtime: AppRuntime) => {
  const router = Router();
  const h = handle(runtime);

  router.use(requireAdmin);

  router.get("/overview/:courseId", h((req) => Effect.flatMap(decode(CourseParams, req.params), (p) => adminOverview(p.courseId))));

  router.get(
    "/users",
    h((req) => Effect.flatMap(decode(AdminUsersQuery, req.query), (q) => adminUsers({ query: q.q, page: q.page, pageSize: q.pageSize }))),
  );

  router.get(
    "/users/:id/:courseId",
    h((req) => Effect.flatMap(decode(AdminUserCourseParams, req.params), (p) => adminUserDetail(p.id, p.courseId))),
  );

  router.post(
    "/users/:id/password",
    h((req) =>
      Effect.gen(function* () {
        const { id } = yield* decode(AdminUserParams, req.params);
        const { password } = yield* decode(AdminPasswordBody, req.body);
        return yield* adminSetPassword(id, password);
      }),
    ),
  );

  router.post(
    "/users/:id/reset-progress",
    h((req) =>
      Effect.gen(function* () {
        const { id } = yield* decode(AdminUserParams, req.params);
        const { courseId } = yield* decode(ResetProgressBody, req.body);
        return yield* adminResetProgress(id, courseId);
      }),
    ),
  );

  router.delete(
    "/users/:id",
    h((req) =>
      Effect.gen(function* () {
        const { id } = yield* decode(AdminUserParams, req.params);
        const { confirmEmail } = yield* decode(AdminDeleteBody, req.body);
        return yield* adminDeleteUser(id, confirmEmail);
      }),
    ),
  );

  return router;
};
