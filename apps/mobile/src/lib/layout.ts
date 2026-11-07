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

/** Wide enough for two columns of cards, a centred column and the title in it (iPad, or the open iPhone Duo held sideways). */
export const WIDE_BREAKPOINT = 700;
/**
 * Roomier than a phone but not iPad-wide: the open iPhone Duo (669pt) and narrow
 * iPad split views. Cards go side by side, but the screen keeps the phone's
 * navigation (large titles, full-width content).
 */
export const MEDIUM_BREAKPOINT = 600;

/**
 * The window's size class. Everything follows the window, never the device, so
 * the layout keeps up as an iPhone Duo folds and unfolds or an iPad window is
 * resized: useWindowDimensions re-renders on every change.
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  const medium = width >= MEDIUM_BREAKPOINT;
  /** The width the content may use before it's centred; roomier screens get a little more margin. */
  const minGutter = medium && !wide ? 24 : 16;
  return {
    width,
    height,
    /** iPad-wide: centred columns, titles in the content. */
    wide,
    /** At least the open iPhone Duo's width (includes `wide`). */
    medium,
    /** Wider than tall with little height to spare, as on the open iPhone Duo held sideways. */
    short: width > height && height < 760,
    /** The horizontal padding that centres a column at most `max` wide, never less than `min`. */
    gutter: (max: number, min = minGutter) => Math.max(min, Math.round((width - max) / 2)),
    /** Columns for a grid of tiles: `phone` on a phone, `tablet` on an iPad, and `mid` (default `tablet`) in between. */
    columns: (phone: number, tablet: number, mid: number = tablet) => (wide ? tablet : medium ? mid : phone),
  };
}
