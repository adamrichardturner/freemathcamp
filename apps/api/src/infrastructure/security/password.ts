import { hash, verify } from "@node-rs/argon2";
import { Context, Effect, Layer } from "effect";

/** Argon2id with OWASP-recommended parameters (19 MiB, 2 iterations). */
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export interface PasswordHasherShape {
  hash(password: string): Effect.Effect<string>;
  verify(hash: string, password: string): Effect.Effect<boolean>;
  /** Burns equivalent time when no user exists, so login timing can't enumerate emails. */
  dummyVerify(password: string): Effect.Effect<void>;
}

export class PasswordHasher extends Context.Tag("PasswordHasher")<PasswordHasher, PasswordHasherShape>() {}

export const PasswordHasherLive = Layer.effect(
  PasswordHasher,
  Effect.gen(function* () {
    const dummy = yield* Effect.promise(() => hash("timing-equaliser-password", OPTIONS));
    return {
      hash: (password) => Effect.promise(() => hash(password, OPTIONS)),
      verify: (h, password) => Effect.promise(() => verify(h, password).catch(() => false)),
      dummyVerify: (password) => Effect.promise(() => verify(dummy, password).catch(() => false)).pipe(Effect.asVoid),
    };
  }),
);
