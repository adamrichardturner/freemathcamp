import type { Request } from "express";
import { describe, expect, it } from "vitest";
import { clientIp } from "../src/http/middleware/client-ip";

const resolve = (secret: string | undefined, headers: Record<string, string>) => {
  const req = { ip: "10.0.0.1", get: (name: string) => headers[name.toLowerCase()] } as unknown as Request;
  clientIp(secret)(req, {} as never, () => {});
  return req.clientIp;
};

describe("client IP resolution", () => {
  const signed = { "x-fmc-client-ip": "203.0.113.7", "x-fmc-proxy-secret": "s3cret-value" };

  it("trusts the forwarded IP when the proxy secret matches", () => {
    expect(resolve("s3cret-value", signed)).toBe("203.0.113.7");
  });

  it("ignores spoofed or malformed headers", () => {
    expect(resolve("s3cret-value", { ...signed, "x-fmc-proxy-secret": "wrong" })).toBe("10.0.0.1");
    expect(resolve("s3cret-value", { ...signed, "x-fmc-client-ip": "not-an-ip" })).toBe("10.0.0.1");
    expect(resolve(undefined, signed)).toBe("10.0.0.1");
  });
});
