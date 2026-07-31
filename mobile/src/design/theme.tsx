import { createContext, use, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { palettes, type ColorScheme, type Palette } from "./tokens";

type Theme = {
  scheme: ColorScheme;
  colors: Palette;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme: ColorScheme = useColorScheme() === "dark" ? "dark" : "light";
  return (
    <ThemeContext value={{ scheme, colors: palettes[scheme] }}>
      {children}
    </ThemeContext>
  );
}

export function useTheme(): Theme {
  const theme = use(ThemeContext);
  if (!theme) throw new Error("useTheme must be used inside <ThemeProvider>");
  return theme;
}
