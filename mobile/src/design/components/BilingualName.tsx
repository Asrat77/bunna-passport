import { View, type StyleProp, type ViewStyle } from "react-native";
import { useI18n } from "@/i18n/context";
import { isEthiopic } from "../typography";
import type { TypeRole } from "../typography";
import { Text } from "./Text";

type Props = {
  name: string;
  nameAm: string;
  role?: TypeRole;
  secondaryRole?: TypeRole;
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Bilingual name lockup (docs/DESIGN.md §2.3).
 *
 * Which script leads follows the app language, not the shop record. The
 * secondary line is suppressed when both fields carry the same script, which
 * happens when a shop only ever had one name transcribed.
 */
export function BilingualName({
  name,
  nameAm,
  role = "heading",
  secondaryRole = "label",
  numberOfLines = 1,
  style,
}: Props) {
  const { language } = useI18n();

  const amharicIsDistinct = nameAm.trim().length > 0 && nameAm !== name && isEthiopic(nameAm);
  const preferAmharic = language === "am" && amharicIsDistinct;

  const primary = preferAmharic ? nameAm : name;
  const secondary = preferAmharic ? name : amharicIsDistinct ? nameAm : null;

  return (
    <View style={style}>
      <Text role={role} weight="bold" numberOfLines={numberOfLines}>
        {primary}
      </Text>
      {secondary ? (
        <Text role={secondaryRole} color="inkMuted" numberOfLines={numberOfLines}>
          {secondary}
        </Text>
      ) : null}
    </View>
  );
}
