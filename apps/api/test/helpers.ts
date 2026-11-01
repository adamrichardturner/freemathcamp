/** A unique, valid username for test sign-ups. */
export const handle = (prefix = "t") => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(0, 20);
