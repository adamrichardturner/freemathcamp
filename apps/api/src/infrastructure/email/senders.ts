import { Effect, Layer, Option, Redacted } from "effect";
import { EmailSender, type OutgoingEmail } from "../../application/ports";
import { EmailDeliveryError } from "../../domain/errors";
import { AppConfig } from "../../config/config";

/** Messages "sent" without a provider, newest last. Read by tests; logged in development. */
export const outbox: OutgoingEmail[] = [];

const consoleSender = {
  send: (email: OutgoingEmail) =>
    Effect.sync(() => {
      outbox.push(email);
      console.log(`[email] to=${email.to} subject="${email.subject}"\n${email.text}\n`);
    }),
};

/** Sends through Resend's HTTP API (free tier: 3,000 emails/month). */
const resendSender = (apiKey: Redacted.Redacted<string>, from: string) => ({
  send: (email: OutgoingEmail) =>
    Effect.tryPromise({
      try: async () => {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { authorization: `Bearer ${Redacted.value(apiKey)}`, "content-type": "application/json" },
          body: JSON.stringify({ from, to: [email.to], subject: email.subject, html: email.html, text: email.text, ...(email.headers && { headers: email.headers }) }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
      },
      catch: (cause) => new EmailDeliveryError({ cause }),
    }),
});

export const EmailSenderLive = Layer.effect(
  EmailSender,
  Effect.map(AppConfig, (c) =>
    Option.match(c.resendApiKey, {
      onNone: () => consoleSender,
      onSome: (key) => resendSender(key, c.emailFrom),
    }),
  ),
);
