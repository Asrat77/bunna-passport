import {
  Text as RNText,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
} from "react-native";
import { useTheme } from "../theme";
import { fontFor, typeScale, type TypeRole } from "../typography";
import type { Palette } from "../tokens";

// `role` is omitted deliberately: React Native uses it for the ARIA role, and
// here it names a typography role. Use `accessibilityRole` for semantics.
type Props = Omit<RNTextProps, "style" | "role"> & {
  role?: TypeRole;
  color?: keyof Palette;
  weight?: "regular" | "medium" | "bold";
  align?: TextStyle["textAlign"];
  style?: StyleProp<TextStyle>;
  children: string | (string | null | undefined | false)[];
};

function flatten(children: Props["children"]): string {
  return Array.isArray(children) ? children.filter(Boolean).join("") : children;
}

/**
 * Every string in the app goes through here so the right script's font is
 * chosen per-node. Ethiopic in a Latin-only font renders as tofu on many
 * Android builds (docs/DESIGN.md §2.3).
 */
export function Text({
  role = "body",
  color = "ink",
  weight = "regular",
  align,
  style,
  children,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const text = flatten(children);
  const spec = typeScale[role];

  return (
    <RNText
      // Honour the OS font-scale setting, capped so layouts survive (DESIGN.md §9).
      maxFontSizeMultiplier={2}
      style={[
        {
          fontFamily: fontFor(role, text, weight),
          color: colors[color],
          textAlign: align,
          ...spec,
        },
        style,
      ]}
      {...rest}
    >
      {text}
    </RNText>
  );
}
