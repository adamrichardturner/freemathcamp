/**
 * The admin panel belongs to one account. The check runs on every admin
 * request in the API; the web app only uses it to decide whether to show a link.
 */
export const ADMIN_EMAIL = "hello@adamrichardturner.dev";

/** A confirmed email is required too, so an unverified sign-up with this address gets nothing. */
export const isAdmin = (user: { email: string; email_verified_at: Date | null }) =>
  user.email.trim().toLowerCase() === ADMIN_EMAIL && user.email_verified_at !== null;
