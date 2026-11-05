import { useColorScheme } from "react-native";

/**
 * The web app's design tokens (apps/web/src/app/globals.css), converted from
 * oklch to hex for React Native. Keep the two in step when the palette changes.
 */
export const palette = {
  light: {
    background: "#fbfcff",
    foreground: "#131726",
    card: "#ffffff",
    cardForeground: "#131726",
    primary: "#524ce3",
    primaryForeground: "#f7faff",
    secondary: "#eff1fa",
    secondaryForeground: "#222741",
    muted: "#f1f3fa",
    mutedForeground: "#5d6375",
    accent: "#eaecff",
    accentForeground: "#2a266d",
    destructive: "#e62b34",
    border: "#dfe3ed",
    input: "#dadee9",
    ring: "#686fe9",
    success: "#00a25f",
    warning: "#ec940d",
    danger: "#ea3b48",
    info: "#0092da",
    highlight: "#eab532",
    chart1: "#5957ed",
    chart2: "#00ad9d",
    chart3: "#f09c17",
    chart4: "#ec4764",
    chart5: "#009de2",
  },
  dark: {
    background: "#0a0b15",
    foreground: "#eff2f9",
    card: "#121420",
    cardForeground: "#eff2f9",
    primary: "#9296ff",
    primaryForeground: "#0c0e1c",
    secondary: "#1e2030",
    secondaryForeground: "#e9ebf2",
    muted: "#1c1e2b",
    mutedForeground: "#989eb2",
    accent: "#232546",
    accentForeground: "#dfe2ff",
    destructive: "#f75c61",
    border: "#ffffff17",
    input: "#ffffff24",
    ring: "#9296ff",
    success: "#37c080",
    warning: "#f5ae4b",
    danger: "#fa686a",
    info: "#4baeed",
    highlight: "#f4c352",
    chart1: "#9296ff",
    chart2: "#04c5b5",
    chart3: "#f5ae4b",
    chart4: "#f9667a",
    chart5: "#46afec",
  },
} as const;

export type Colors = { [K in keyof (typeof palette)["light"]]: string };
export type Tone = "primary" | "success" | "warning" | "danger" | "info" | "muted" | "chart2" | "chart3" | "chart4";

/** Font families embedded by the expo-font config plugin (PostScript names). */
export const fonts = {
  regular: "Geist-Regular",
  medium: "Geist-Medium",
  semibold: "Geist-SemiBold",
  bold: "Geist-Bold",
  display: "InstrumentSerif-Regular",
  displayItalic: "InstrumentSerif-Italic",
} as const;

/** The web's --radius is 0.75rem; its rounded-xl / 2xl / 3xl scale from it. */
export const radius = { sm: 7, md: 10, lg: 12, xl: 17, "2xl": 22, "3xl": 26 } as const;

export const useTheme = () => {
  const scheme: "light" | "dark" = useColorScheme() === "dark" ? "dark" : "light";
  return { scheme, c: palette[scheme] as Colors };
};

/** A colour at some opacity, like Tailwind's `bg-primary/10`. */
export const alpha = (hex: string, a: number) => `${hex.slice(0, 7)}${Math.round(a * 255).toString(16).padStart(2, "0")}`;

export const toneColor = (c: Colors, t: Tone) => (t === "muted" ? c.mutedForeground : c[t]);
