import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { View } from "react-native";
import { useTheme } from "../theme";
import { space } from "../tokens";
import { Button } from "./Button";
import { Text } from "./Text";

type Props = {
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Empty states are recruitment surfaces, not apologies — a sparse area is an
 * invitation to contribute (docs/DESIGN.md §4.3).
 */
export function EmptyState({ icon = "coffee-outline", title, body, actionLabel, onAction }: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ alignItems: "center", paddingHorizontal: space.xl, paddingVertical: space.xxxl }}>
      <MaterialCommunityIcons name={icon} size={48} color={colors.borderStrong} />
      <Text role="heading" align="center" style={{ marginTop: space.lg }}>
        {title}
      </Text>
      {body ? (
        <Text role="body" color="inkMuted" align="center" style={{ marginTop: space.sm }}>
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          fullWidth={false}
          style={{ marginTop: space.xl }}
        />
      ) : null}
    </View>
  );
}
