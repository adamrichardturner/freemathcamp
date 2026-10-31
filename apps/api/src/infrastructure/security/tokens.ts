import { createHash, randomBytes, randomInt } from "node:crypto";

/** 256-bit session token for the cookie. */
export const newSessionToken = () => randomBytes(32).toString("base64url");

/** Only the hash is stored, so a database leak can't be replayed as sessions. */
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Seed for a problem generator. */
export const newSeed = () => randomInt(1, 2 ** 31 - 1);
