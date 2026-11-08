import { Effect } from "effect";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PasswordResetTokenRepository } from "../src/application/ports";
import { RESET_TOKEN_TTL_MS } from "../src/application/password-reset";
import { createApp } from "../src/http/app";
import { makeRuntime, type AppRuntime } from "../src/http/runtime";
import { Database } from "../src/infrastructure/db/database";
import { outbox } from "../src/infrastructure/email/senders";
import { hashToken, newSessionToken } from "../src/infrastructure/security/tokens";
import { handle } from "./helpers";

/** Forgotten passwords end to end. Needs DATABASE_URL (skipped otherwise). */
const ORIGIN = "http://localhost:3000";
const enabled = !!process.env.DATABASE_URL;
const PASSWORD = "correct-horse-42";
const NEW_PASSWORD = "battery-staple-77";

const resetMails = (to: string) => outbox.filter((m) => m.to === to && /reset-password\?token=/.test(m.text));
/** Token from the newest reset email sent to an address. */
const latestResetToken = (to: string) => {
  const mail = resetMails(to).at(-1);
  return mail && new URL(/https?:\/\/\S+reset-password\?token=\S+/.exec(mail.text)![0]).searchParams.get("token")!;
};
const uniqueEmail = (tag: string) => `reset-${tag}+${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

describe.skipIf(!enabled)("password reset", () => {
  let runtime: AppRuntime;
  let app: ReturnType<typeof createApp>;
  beforeAll(() => {
    runtime = makeRuntime();
    app = createApp(runtime, { webOrigin: ORIGIN, secureCookies: false });
  });
  afterAll(() => runtime.dispose());

  const post = (path: string, body: object, agent: ReturnType<typeof request.agent> | ReturnType<typeof request> = request(app)) => agent.post(path).set("Origin", ORIGIN).send(body);
  // A fresh app per sign-up keeps clear of the per-network sign-up limit; sessions live in the database, so they work across apps.
  const signUp = async (email = uniqueEmail("user")) => {
    const agent = request.agent(createApp(runtime, { webOrigin: ORIGIN, secureCookies: false }));
    const res = await post("/api/auth/register", { email, password: PASSWORD, displayName: "Ada Lovelace", username: handle("r") }, agent);
    expect(res.status).toBe(201);
    return { agent, email, userId: res.body.user.id as string };
  };
  /** Requests a reset and waits for the email, which is sent after the response. */
  const requestReset = async (email: string) => {
    const before = resetMails(email).length;
    const res = await post("/api/auth/forgot-password", { email });
    expect(res.status).toBe(200);
    await vi.waitFor(() => expect(resetMails(email).length).toBe(before + 1));
    return latestResetToken(email)!;
  };

  it("answers the same way whether or not an account exists, and only emails real accounts", async () => {
    const { email } = await signUp();
    const missing = uniqueEmail("nobody");
    const known = await post("/api/auth/forgot-password", { email });
    const unknown = await post("/api/auth/forgot-password", { email: missing });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(known.status);
    expect(unknown.body).toEqual(known.body);
    expect(Object.keys(unknown.headers).filter((h) => !/date|etag|ratelimit|content-length/i.test(h)).sort()).toEqual(
      Object.keys(known.headers).filter((h) => !/date|etag|ratelimit|content-length/i.test(h)).sort(),
    );
    await vi.waitFor(() => expect(resetMails(email)).toHaveLength(1));
    // Give the background job for the missing address time to (not) send.
    await new Promise((r) => setTimeout(r, 200));
    expect(outbox.some((m) => m.to === missing)).toBe(false);
  });

  it("matches addresses regardless of case and spacing", async () => {
    const { email } = await signUp();
    const res = await post("/api/auth/forgot-password", { email: `  ${email.toUpperCase()} ` });
    expect(res.status).toBe(200);
    await vi.waitFor(() => expect(resetMails(email)).toHaveLength(1));
  });

  it("validates the email address", async () => {
    const res = await post("/api/auth/forgot-password", { email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("emails a branded link with a plain-text part", async () => {
    const { email } = await signUp();
    await requestReset(email);
    const mail = resetMails(email).at(-1)!;
    expect(mail.subject).toBe("Reset your FreeMathCamp password");
    expect(mail.text).toMatch(/^Hi Ada Lovelace,/);
    expect(mail.text).toContain(`${ORIGIN}/reset-password?token=`);
    expect(mail.text).toMatch(/expires in 1 hour/);
    expect(mail.html).toContain("Choose a new password");
    expect(mail.html).toContain(`${ORIGIN}/email-logo.png`);
  });

  it("stores only a hash of the token, expiring in an hour", async () => {
    const { email, userId } = await signUp();
    const token = await requestReset(email);
    const rows = await runtime.runPromise(
      Effect.flatMap(Database, (db) => Effect.promise(() => db.selectFrom("password_reset_tokens").selectAll().where("user_id", "=", userId).execute())),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(hashToken(token));
    expect(rows[0]!.id).not.toContain(token);
    const ttl = new Date(rows[0]!.expires_at).getTime() - new Date(rows[0]!.created_at).getTime();
    expect(Math.abs(ttl - RESET_TOKEN_TTL_MS)).toBeLessThan(60_000);
  });

  it("sets a new password once, ends every session, and signs in the browser that used the link", async () => {
    const { agent: firstDevice, email } = await signUp();
    const secondDevice = request.agent(app);
    expect((await post("/api/auth/login", { email, password: PASSWORD }, secondDevice)).status).toBe(200);
    const token = await requestReset(email);

    expect((await post("/api/auth/reset-password/check", { token })).body).toEqual({ valid: true });

    const resetter = request.agent(app);
    const res = await post("/api/auth/reset-password", { token, password: NEW_PASSWORD }, resetter);
    expect(res.status).toBe(200);
    expect(res.body.signedOutSessions).toBe(2);
    expect(res.body.user).toMatchObject({ email, hasPassword: true, emailVerified: true });
    expect(res.headers["set-cookie"]?.[0]).toMatch(/fmc_session=.*HttpOnly/i);
    expect((await resetter.get("/api/auth/me")).body.user.email).toBe(email);

    // Every other device is signed out.
    expect((await firstDevice.get("/api/auth/me")).body.user).toBeNull();
    expect((await secondDevice.get("/api/auth/me")).body.user).toBeNull();

    // Only the new password works.
    expect((await post("/api/auth/login", { email, password: PASSWORD })).status).toBe(401);
    expect((await post("/api/auth/login", { email, password: NEW_PASSWORD })).status).toBe(200);

    // The link is single use.
    const again = await post("/api/auth/reset-password", { token, password: "another-pass-99" });
    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe("LinkInvalid");
    expect((await post("/api/auth/reset-password/check", { token })).body.error.code).toBe("LinkInvalid");
    expect((await post("/api/auth/login", { email, password: "another-pass-99" })).status).toBe(401);
  });

  it("invalidates the user's other outstanding links once one is used", async () => {
    const { email } = await signUp();
    const first = await requestReset(email);
    const second = await requestReset(email);
    expect(first).not.toBe(second);
    expect((await post("/api/auth/reset-password", { token: second, password: NEW_PASSWORD })).status).toBe(200);
    const stale = await post("/api/auth/reset-password", { token: first, password: "another-pass-99" });
    expect(stale.body.error.code).toBe("LinkInvalid");
  });

  it("applies the sign-up password rules without using up the link", async () => {
    const { email } = await signUp();
    const token = await requestReset(email);
    const weak = await post("/api/auth/reset-password", { token, password: "short" });
    expect(weak.status).toBe(400);
    expect(weak.body.error.code).toBe("ValidationError");
    expect((await post("/api/auth/reset-password", { token, password: "onlyletterslong" })).status).toBe(400);
    expect((await post("/api/auth/reset-password", { token, password: NEW_PASSWORD })).status).toBe(200);
  });

  it("refuses expired links, telling them apart from invalid ones", async () => {
    const { userId, email } = await signUp();
    const token = newSessionToken();
    await runtime.runPromise(
      Effect.flatMap(PasswordResetTokenRepository, (t) => t.create({ id: hashToken(token), userId, expiresAt: new Date(Date.now() - 1000) })),
    );
    const check = await post("/api/auth/reset-password/check", { token });
    expect(check.status).toBe(410);
    expect(check.body.error.code).toBe("LinkExpired");
    const res = await post("/api/auth/reset-password", { token, password: NEW_PASSWORD });
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe("LinkExpired");
    // The password is unchanged.
    expect((await post("/api/auth/login", { email, password: PASSWORD })).status).toBe(200);

    const bogus = await post("/api/auth/reset-password", { token: newSessionToken(), password: NEW_PASSWORD });
    expect(bogus.status).toBe(400);
    expect(bogus.body.error.code).toBe("LinkInvalid");
  });

  it("confirms the email of an unverified account, since the link proves the inbox", async () => {
    const { email } = await signUp();
    const token = await requestReset(email);
    const res = await post("/api/auth/reset-password", { token, password: NEW_PASSWORD });
    expect(res.body.user.emailVerified).toBe(true);
  });

  it("returns a bearer session to the iOS app instead of a cookie", async () => {
    const { email } = await signUp();
    const token = await requestReset(email);
    const res = await request(app).post("/api/auth/reset-password").set("Origin", ORIGIN).set("X-FMC-Client", "ios").send({ token, password: NEW_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.session.token).toEqual(expect.any(String));
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("quietly stops emailing an address after three links in an hour", async () => {
    const { email } = await signUp();
    for (let i = 0; i < 3; i++) await requestReset(email);
    const res = await post("/api/auth/forgot-password", { email });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    await new Promise((r) => setTimeout(r, 200));
    expect(resetMails(email)).toHaveLength(3);
  });

  it("rate limits requests per address and network", async () => {
    const limited = createApp(runtime, { webOrigin: ORIGIN, secureCookies: false });
    const email = uniqueEmail("limit");
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await request(limited).post("/api/auth/forgot-password").set("Origin", ORIGIN).send({ email })).status);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    // Let the background lookups finish before the runtime shuts down.
    await new Promise((r) => setTimeout(r, 200));
  });
});
