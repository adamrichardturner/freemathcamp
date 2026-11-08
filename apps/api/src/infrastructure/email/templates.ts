const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** The web app's light-theme tokens, as hex for email clients. */
const C = { primary: "#524ce3", text: "#131726", muted: "#5d6375", faint: "#8a8fa3", border: "#dfe3ed", page: "#f1f3fa", card: "#ffffff" };
const FONT = "'Geist',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const link = (href: string, label: string) => `<a href="${escape(href)}" style="color:${C.muted};text-decoration:underline">${escape(label)}</a>`;

type Layout = {
  /** The web origin; the logo and footer links are served from it. */
  origin: string;
  heading: string;
  /** Plain-text paragraphs. */
  paragraphs: string[];
  cta: { label: string; href: string };
  /** Trusted HTML shown under the button. */
  note?: string;
  /** Plain text: why this email was sent. */
  reason: string;
  /** Extra footer links, before Privacy and Terms. */
  links?: { label: string; href: string }[];
};

/**
 * Branded, table-based HTML shell (works across email clients). The header
 * mirrors the site header: the logo mark beside the "FreeMathCamp" wordmark.
 */
const layout = ({ origin, heading, paragraphs, cta, note, reason, links = [] }: Layout) => {
  const footerLinks = [...links, { label: "Privacy", href: `${origin}/privacy` }, { label: "Terms", href: `${origin}/terms` }];
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${escape(heading)}</title>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:${C.page};font-family:${FONT};color:${C.text};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(paragraphs.join(" "))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.card};border:1px solid ${C.border};border-radius:16px;border-collapse:separate">
<tr><td style="padding:18px 32px;border-bottom:1px solid ${C.border}">
<a href="${escape(origin)}" style="text-decoration:none;color:${C.text}"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle;padding-right:8px"><img src="${escape(origin)}/email-logo.png" width="32" height="32" alt="" style="display:block;border:0;border-radius:8px"></td>
<td style="vertical-align:middle;font-family:${FONT};font-size:17px;font-weight:600;letter-spacing:-0.02em;color:${C.text}">FreeMath<span style="color:${C.primary}">Camp</span></td>
</tr></table></a>
</td></tr>
<tr><td style="padding:32px">
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;font-weight:600;letter-spacing:-0.02em;color:${C.text}">${escape(heading)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${C.muted}">${escape(p)}</p>`).join("\n")}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px"><tr><td style="border-radius:10px;background:${C.primary}">
<a href="${escape(cta.href)}" style="display:inline-block;padding:14px 24px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px">${escape(cta.label)}</a>
</td></tr></table>
${note ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${C.faint}">${note}</p>` : ""}
</td></tr>
<tr><td style="padding:24px 32px;border-top:1px solid ${C.border};font-size:12px;line-height:1.6;color:${C.faint}">
<p style="margin:0 0 12px">${escape(reason)}</p>
<p style="margin:0 0 12px">${footerLinks.map((l) => link(l.href, l.label)).join(" &middot; ")}</p>
<p style="margin:0">FreeMathCamp &middot; ${link(origin, origin.replace(/^https?:\/\//, ""))}<br>A free course in the maths you need before calculus.</p>
</td></tr>
</table></td></tr></table></body></html>`;
};

const signOff = "Best wishes,\nFreeMathCamp";

export const verificationEmail = ({ name, link: href, origin }: { name: string; link: string; origin: string }) => {
  const reason = "You're receiving this because this address was used to sign up for FreeMathCamp. If that wasn't you, you can safely ignore this email.";
  return {
    subject: "Confirm your email address for FreeMathCamp",
    text: `Hi ${name},\n\nPlease confirm your email address to start practising and save your progress:\n${href}\n\nThis link can be used once and expires in 24 hours.\n\n${signOff}\n\n${reason}`,
    html: layout({
      origin,
      heading: "Confirm your email address",
      paragraphs: [
        `Hi ${name},`,
        "You're one click away from adaptive practice, spaced reviews and progress tracking across the whole of Foundations.",
      ],
      cta: { label: "Confirm email address", href },
      note: `This link can be used once and expires in 24 hours. If the button doesn't work, copy this address into your browser:<br><a href="${escape(href)}" style="color:${C.primary};word-break:break-all">${escape(href)}</a>`,
      reason,
    }),
  };
};

export const passwordResetEmail = ({ name, link: href, origin }: { name: string; link: string; origin: string }) => {
  const reason = "You're receiving this because someone asked to reset the password for this address on FreeMathCamp. If that wasn't you, you can safely ignore this email: your password won't change.";
  return {
    subject: "Reset your FreeMathCamp password",
    text: `Hi ${name},\n\nWe got a request to reset your FreeMathCamp password. Choose a new one here:\n${href}\n\nThis link can be used once and expires in 1 hour. Resetting your password signs you out on your other devices.\n\n${signOff}\n\n${reason}`,
    html: layout({
      origin,
      heading: "Reset your password",
      paragraphs: [`Hi ${name},`, "We got a request to reset your FreeMathCamp password. Choose a new one and you'll be straight back to practising."],
      cta: { label: "Choose a new password", href },
      note: `This link can be used once and expires in 1 hour. Resetting your password signs you out on your other devices. If the button doesn't work, copy this address into your browser:<br><a href="${escape(href)}" style="color:${C.primary};word-break:break-all">${escape(href)}</a>`,
      reason,
    }),
  };
};

/**
 * The email copy of a notification. Security notices explain why they can't be
 * switched off; reminders carry an unsubscribe link (and List-Unsubscribe headers).
 */
export const notificationEmail = ({
  name,
  title,
  body,
  link: href,
  kind,
  unsubscribe,
  oneClickUnsubscribe,
  settings,
  origin,
}: {
  name: string;
  title: string;
  body: string;
  link: string;
  kind: "security" | "reminder";
  /** A page asking to confirm (safe from link scanners). */
  unsubscribe?: string;
  /** RFC 8058 one-click endpoint that mail apps POST to. */
  oneClickUnsubscribe?: string;
  settings: string;
  origin: string;
}) => {
  const greeting = `Hi ${name.split(/\s+/)[0] || name},`;
  const reason =
    kind === "security"
      ? "This is a security notice about your FreeMathCamp account, so we always send it."
      : "You're receiving this because reminder emails are switched on for your account.";
  const links = [...(unsubscribe ? [{ label: "Unsubscribe from reminders", href: unsubscribe }] : []), { label: "Notification settings", href: settings }];
  return {
    subject: title,
    text: `${greeting}\n\n${body}\n\n${href}\n\n${signOff}\n\n${reason}\n${links.map((l) => `${l.label}: ${l.href}`).join("\n")}`,
    html: layout({
      origin,
      heading: title,
      paragraphs: [greeting, body],
      cta: { label: kind === "security" ? "Review your account" : "Continue learning", href },
      reason,
      links,
    }),
    ...(oneClickUnsubscribe && { headers: { "List-Unsubscribe": `<${oneClickUnsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }),
  };
};
