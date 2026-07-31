import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState } from "react";
import { Modal, View } from "react-native";
import { Button } from "@/design/components/Button";
import { Chip } from "@/design/components/Chip";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { radius, space } from "@/design/tokens";
import { useI18n } from "@/i18n/context";
import type { Coordinate } from "@/location/distance";
import { readFix, useLocationPermission } from "@/location/useLocation";

type Props = {
  origin: Coordinate | null;
  onOrigin: (origin: Coordinate | null) => void;
};

/**
 * "Near me" as a primed, in-context permission ask — never an OS dialog at
 * launch (docs/DESIGN.md §4.2). Denial is a supported state, not a dead end.
 */
export function LocationPrimer({ origin, onOrigin }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { permission, request } = useLocationPermission();
  const [showPrimer, setShowPrimer] = useState(false);
  const [busy, setBusy] = useState(false);

  const locate = async () => {
    setBusy(true);
    try {
      onOrigin(await readFix());
    } catch {
      onOrigin(null);
    } finally {
      setBusy(false);
    }
  };

  const onPress = async () => {
    if (origin) {
      onOrigin(null);
      return;
    }
    if (permission === "granted") {
      await locate();
      return;
    }
    setShowPrimer(true);
  };

  const accept = async () => {
    setShowPrimer(false);
    if ((await request()) === "granted") await locate();
  };

  return (
    <>
      <Chip
        label={t("explore.nearMe")}
        selected={origin !== null}
        onPress={busy ? undefined : onPress}
        icon={
          <MaterialCommunityIcons
            name={origin ? "crosshairs-gps" : "crosshairs"}
            size={16}
            color={origin ? colors.onPrimary : colors.ink}
          />
        }
      />

      <Modal
        visible={showPrimer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPrimer(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.scrim, justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: colors.surfaceRaised,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              padding: space.xl,
              gap: space.md,
            }}
          >
            <MaterialCommunityIcons name="map-marker-radius" size={32} color={colors.primary} />
            <Text role="title">{t("location.primerTitle")}</Text>
            <Text role="body" color="inkMuted">
              {t("location.primerBody")}
            </Text>
            <View style={{ gap: space.sm, marginTop: space.sm }}>
              <Button label={t("location.primerAllow")} onPress={accept} />
              <Button
                label={t("location.primerDeny")}
                onPress={() => setShowPrimer(false)}
                variant="quiet"
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
