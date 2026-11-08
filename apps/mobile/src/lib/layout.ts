import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  // Side insets: zero on most iPhones held upright, but the open iPhone Duo keeps
  // its status bar and tab rail down one side, over the app.
  const { left, right } = useSafeAreaInsets();
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
    /** Side padding that centres a column at most `max` wide (never less than `min`), clear of the side insets: spread it into a style. */
    sides: (max: number, min = minGutter) => {
      const g = Math.max(min, Math.round((width - left - right - max) / 2));
      return { paddingLeft: g + left, paddingRight: g + right };
    },
    /**
     * A call to action's own width: full width on a phone, but on the open iPhone
     * Duo and iPad a centred button sized to its label (at least `min` wide), so a
     * single button never stretches across a wide card or column. Spread it into a style.
     */
    fit: (min = 300) => (medium ? ({ alignSelf: "center", minWidth: min } as const) : ({ alignSelf: "stretch" } as const)),
    /** Columns for a grid of tiles: `phone` on a phone, `tablet` on an iPad, and `mid` (default `tablet`) in between. */
    columns: (phone: number, tablet: number, mid: number = tablet) => (wide ? tablet : medium ? mid : phone),
  };
}
