const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Branded, table-based HTML (works across email clients) plus a plain-text part. */
export const verificationEmail = ({ name, link }: { name: string; link: string }) => {
  const safeName = escape(name);
  const safeLink = escape(link);
  return {
    subject: "Confirm your email for FreeMathCamp",
    text: `Hi ${name},\n\nConfirm your email to start practising and save your progress:\n${link}\n\nThe link works once and expires in 24 hours. If you didn't sign up for FreeMathCamp, you can ignore this email.\n\n— FreeMathCamp`,
    html: `<!doctype html>
<html><body style="margin:0;background:#f4f4fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f1d33">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6e5f2">
<tr><td style="background:linear-gradient(135deg,#5b4be0,#d9547a);padding:28px 32px;color:#ffffff;font-size:20px;font-weight:700">FreeMath<span style="opacity:.85">Camp</span></td></tr>
<tr><td style="padding:32px">
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.3">Confirm your email</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#4a4865">Hi ${safeName}, you're one click away from adaptive practice, spaced reviews and progress tracking across all of Foundations.</p>
<a href="${safeLink}" style="display:inline-block;background:#5b4be0;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 24px;border-radius:10px">Confirm email</a>
<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#7a7894">The link works once and expires in 24 hours. If the button doesn't work, paste this into your browser:<br><a href="${safeLink}" style="color:#5b4be0;word-break:break-all">${safeLink}</a></p>
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #eeedf6;font-size:12px;color:#9a98b0">You received this because someone signed up for FreeMathCamp with this address. If that wasn't you, ignore this email.</td></tr>
</table></td></tr></table></body></html>`,
  };
};
