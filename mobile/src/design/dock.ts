import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Tab dock geometry (docs/DESIGN.md §2.2.1). */
export const dock = {
  padding: 14,
  /** Tallest item in the row: the check-in button. */
  row: 52,
  tab: 50,
  activeTabWidth: 76,
  gap: 10,
} as const;

/** Space under the row, leaving the home indicator clear. */
export function dockBottomPadding(insetBottom: number): number {
  return Math.max(insetBottom + 4, dock.padding);
}

/**
 * The dock floats over the screen so its blur has something to blur, which
 * means scrolling content has to pad itself clear of it.
 */
export function useDockClearance(): number {
  const insets = useSafeAreaInsets();
  // + 1 for the top border.
  return dock.padding + dock.row + dockBottomPadding(insets.bottom) + 1;
}
