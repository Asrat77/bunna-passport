import Svg, { Ellipse, G, Path } from "react-native-svg";

/** Coffee bean outline from the Mocha mockup. Material Community has none. */
export function BeanIcon({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G
        transform="rotate(35 12 12)"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      >
        <Ellipse cx={12} cy={12} rx={6} ry={8.5} />
        <Path d="M12 3.5c-2.2 2.8-2.2 5.7 0 8.5s2.2 5.7 0 8.5" />
      </G>
    </Svg>
  );
}
