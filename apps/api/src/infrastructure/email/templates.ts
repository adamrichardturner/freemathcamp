const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Branded, table-based HTML shell (works across email clients). Every argument is plain text. */
const layout = ({ heading, intro, cta, note, footer }: { heading: string; intro: string; cta: { label: string; href: string }; note?: string; footer: string }) => {
  const href = escape(cta.href);
  return `<!doctype html>
<html><body style="margin:0;background:#f4f4fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f1d33">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6e5f2">
<tr><td style="background:linear-gradient(135deg,#5b4be0,#d9547a);padding:28px 32px;color:#ffffff;font-size:20px;font-weight:700">FreeMath<span style="opacity:.85">Camp</span></td></tr>
<tr><td style="padding:32px">
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.3">${escape(heading)}</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#4a4865">${escape(intro)}</p>
<a href="${href}" style="display:inline-block;background:#5b4be0;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 24px;border-radius:10px">${escape(cta.label)}</a>
${note ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#7a7894">${note}</p>` : ""}
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #eeedf6;font-size:12px;line-height:1.6;color:#9a98b0">${footer}</td></tr>
</table></td></tr></table></body></html>`;
};

export const verificationEmail = ({ name, link }: { name: string; link: string }) => ({
  subject: "Confirm your email for FreeMathCamp",
  text: `Hi ${name},\n\nConfirm your email to start practising and save your progress:\n${link}\n\nThe link works once and expires in 24 hours. If you didn't sign up for FreeMathCamp, you can ignore this email.\n\n— FreeMathCamp`,
  html: layout({
    heading: "Confirm your email",
    intro: `Hi ${name}, you're one click away from adaptive practice, spaced reviews and progress tracking across all of Foundations.`,
    cta: { label: "Confirm email", href: link },
    note: `The link works once and expires in 24 hours. If the button doesn't work, paste this into your browser:<br><a href="${escape(link)}" style="color:#5b4be0;word-break:break-all">${escape(link)}</a>`,
    footer: "You received this because someone signed up for FreeMathCamp with this address. If that wasn't you, ignore this email.",
  }),
});

/**
 * The email copy of a notification. Security notices explain why they can't be
 * switched off; reminders carry an unsubscribe link (and List-Unsubscribe headers).
 */
export const notificationEmail = ({
  name,
  title,
  body,
  link,
  kind,
  unsubscribe,
  oneClickUnsubscribe,
  settings,
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
}) => {
  const greeting = `Hi ${name.split(/\s+/)[0] || name},`;
  const footerText =
    kind === "security"
      ? "This is a security notice about your FreeMathCamp account, so it's always sent."
      : `You're getting this because reminder emails are on.${unsubscribe ? ` Unsubscribe: ${unsubscribe}` : ""}`;
  return {
    subject: title,
    text: `${greeting}\n\n${body}\n\n${link}\n\n— FreeMathCamp\n\n${footerText}\nManage notifications: ${settings}`,
    html: layout({
      heading: title,
      intro: `${greeting} ${body}`,
      cta: { label: kind === "security" ? "Review account" : "Open FreeMathCamp", href: link },
      footer:
        kind === "security"
          ? `This is a security notice about your FreeMathCamp account, so it's always sent. <a href="${escape(settings)}" style="color:#7a7894">Notification settings</a>`
          : `You're getting this because reminder emails are on. ${unsubscribe ? `<a href="${escape(unsubscribe)}" style="color:#7a7894">Unsubscribe from reminders</a> · ` : ""}<a href="${escape(settings)}" style="color:#7a7894">Notification settings</a>`,
    }),
    ...(oneClickUnsubscribe && { headers: { "List-Unsubscribe": `<${oneClickUnsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }),
  };
};
