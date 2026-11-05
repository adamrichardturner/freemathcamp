import { generateKeyPairSync } from "node:crypto";
import { importSPKI, jwtVerify } from "jose";
import { describe, expect, it } from "vitest";
import { appleClientSecret } from "../src/infrastructure/oauth/apple";

describe("Sign in with Apple client secret", () => {
  it("is an ES256 JWT for Apple, signed with the key, accepting env-style escaped newlines", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const pem = privateKey.export({ format: "pem", type: "pkcs8" }).toString().replace(/\n/g, "\\n");
    const now = Date.UTC(2026, 10, 5);
    const secret = appleClientSecret({ teamId: "TEAM123456", keyId: "KEY1234567", privateKey: pem }, "com.freemathcamp.app", now);

    const key = await importSPKI(publicKey.export({ format: "pem", type: "spki" }).toString(), "ES256");
    const { payload, protectedHeader } = await jwtVerify(secret, key, { audience: "https://appleid.apple.com", issuer: "TEAM123456", currentDate: new Date(now) });
    expect(protectedHeader).toEqual({ alg: "ES256", kid: "KEY1234567" });
    expect(payload.sub).toBe("com.freemathcamp.app");
    expect(payload.exp! - payload.iat!).toBeLessThanOrEqual(15_777_000);
  });
});
