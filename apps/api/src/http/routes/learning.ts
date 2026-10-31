import { courses } from "@fmc/curriculum";
import { Effect } from "effect";
import { Router } from "express";
import { analytics, dashboard } from "../../application/analytics";
import { courseProgress, exerciseDetail, markLessonViewed } from "../../application/learning";
import { completePractice, revealAnswer, startPractice, submitAttempt } from "../../application/practice";
import { currentUser, requireUser } from "../middleware/auth";
import { handle, type AppRuntime } from "../runtime";
import { AttemptBody, CourseParams, decode, ExerciseParams, RevealBody, SessionParams, StartPracticeBody } from "../validation";

export const learningRoutes = (runtime: AppRuntime) => {
  const router = Router();
  const h = handle(runtime);

  router.get("/courses", h(() => Effect.succeed({ courses: courses.map((c) => ({ id: c.id, title: c.title, tagline: c.tagline, units: c.units.length, exercises: c.units.reduce((a, u) => a + u.exercises.length, 0) })) })));

  router.use(requireUser);

  const withUser = <A, E, R>(req: Parameters<Parameters<typeof h>[0]>[0], f: (userId: string) => Effect.Effect<A, E, R>) =>
    Effect.flatMap(currentUser(req), (u) => f(u.id));

  router.get(
    "/courses/:courseId/progress",
    h((req) => Effect.flatMap(decode(CourseParams, req.params), (p) => withUser(req, (uid) => courseProgress(uid, p.courseId)))),
  );
  router.get(
    "/courses/:courseId/dashboard",
    h((req) => Effect.flatMap(decode(CourseParams, req.params), (p) => withUser(req, (uid) => dashboard(uid, p.courseId)))),
  );
  router.get(
    "/courses/:courseId/analytics",
    h((req) => Effect.flatMap(decode(CourseParams, req.params), (p) => withUser(req, (uid) => analytics(uid, p.courseId)))),
  );
  router.get(
    "/courses/:courseId/exercises/:exerciseId",
    h((req) => Effect.flatMap(decode(ExerciseParams, req.params), (p) => withUser(req, (uid) => exerciseDetail(uid, p.courseId, p.exerciseId)))),
  );
  router.post(
    "/courses/:courseId/exercises/:exerciseId/lesson-viewed",
    h((req) => Effect.flatMap(decode(ExerciseParams, req.params), (p) => withUser(req, (uid) => markLessonViewed(uid, p.courseId, p.exerciseId)))),
  );

  router.post(
    "/practice",
    h((req, res) =>
      Effect.gen(function* () {
        const body = yield* decode(StartPracticeBody, req.body);
        const result = yield* withUser(req, (uid) => startPractice(uid, body.courseId, body.exerciseId, body.mode));
        res.status(201);
        return result;
      }),
    ),
  );
  router.post(
    "/practice/:sessionId/attempts",
    h((req) =>
      Effect.gen(function* () {
        const { sessionId } = yield* decode(SessionParams, req.params);
        const body = yield* decode(AttemptBody, req.body);
        return yield* withUser(req, (uid) => submitAttempt(uid, sessionId, body));
      }),
    ),
  );
  router.post(
    "/practice/:sessionId/reveal",
    h((req) =>
      Effect.gen(function* () {
        const { sessionId } = yield* decode(SessionParams, req.params);
        const body = yield* decode(RevealBody, req.body);
        return yield* withUser(req, (uid) => revealAnswer(uid, sessionId, body));
      }),
    ),
  );
  router.post(
    "/practice/:sessionId/complete",
    h((req) => Effect.flatMap(decode(SessionParams, req.params), ({ sessionId }) => withUser(req, (uid) => completePractice(uid, sessionId)))),
  );

  return router;
};
