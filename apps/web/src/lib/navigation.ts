const FLASH_KEY = "fmc:flash";

/**
 * A full page load, used after sign-out and account deletion so no cached
 * account data survives. `flash` is shown as a toast once the new page loads.
 */
export const hardNavigate = (href: string, flash?: string) => {
  if (flash)
    try {
      sessionStorage.setItem(FLASH_KEY, flash);
    } catch {
      // Storage can be unavailable (private mode); the message is optional.
    }
  window.location.assign(href);
};

/** Reads and clears the message left by `hardNavigate`. */
export const takeFlash = () => {
  try {
    const message = sessionStorage.getItem(FLASH_KEY);
    sessionStorage.removeItem(FLASH_KEY);
    return message;
  } catch {
    return null;
  }
};
