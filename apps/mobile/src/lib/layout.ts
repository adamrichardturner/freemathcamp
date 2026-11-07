import { useWindowDimensions } from "react-native";

/**
 * Widths for larger screens. On a phone every screen is full width; on an
 * iPad (or a wide split view) content sits in a centred column, so lines of
 * text and rows of buttons don't stretch across the whole display.
 */
export const widths = {
  /** Forms and the welcome screen. */
  form: 480,
  /** Reading: lessons, practice, settings, lists. */
  readable: 760,
  /** Dashboards with cards side by side. */
  wide: 1040,
} as const;

/** Wide enough for two columns of cards. */
export const WIDE_BREAKPOINT = 700;

export function useLayout() {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  return {
    width,
    wide,
    /** The horizontal padding that centres a column at most `max` wide, never less than `min`. */
    gutter: (max: number, min = 16) => Math.max(min, Math.round((width - max) / 2)),
    /** Columns for a grid of tiles: `phone` on a phone, more as the screen allows. */
    columns: (phone: number, tablet: number) => (wide ? tablet : phone),
  };
}
