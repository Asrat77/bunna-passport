import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/api/client";
import { ApiRequestError } from "@/api/errors";
import type { Shop } from "@/api/types";
import { Button } from "@/design/components/Button";
import { Chip } from "@/design/components/Chip";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { radius, space } from "@/design/tokens";
import { listNeighborhoods, type CachedNeighborhood } from "@/db/shops";
import { useI18n } from "@/i18n/context";
import { readFix, type Fix } from "@/location/useLocation";

const PRICE_BANDS = ["budget", "standard", "premium", "splurge"] as const;

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: space.xs }}>
      <Text role="label" color="inkMuted">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={{
          padding: space.md,
          borderRadius: radius.lg,
          borderCurve: "continuous",
          backgroundColor: colors.surfaceRaised,
          borderWidth: 1,
          borderColor: colors.border,
          color: colors.ink,
        }}
      />
      {hint ? (
        <Text role="caption" color="inkFaint">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Submitting a shop is the only way the catalogue grows, so the form asks for
 * what a moderator cannot reconstruct: both names, and the landmark that makes
 * the place findable without a street address. The coordinates come from
 * standing there, not from typing.
 */
export default function NewShopScreen() {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();

  const [fix, setFix] = useState<Fix | null>(null);
  const [locating, setLocating] = useState(true);
  const [neighborhoods, setNeighborhoods] = useState<CachedNeighborhood[]>([]);

  const [name, setName] = useState("");
  const [nameAm, setNameAm] = useState("");
  const [landmark, setLandmark] = useState("");
  const [neighborhoodId, setNeighborhoodId] = useState<number | null>(null);
  const [priceBand, setPriceBand] = useState<string | null>(null);

  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Shop[] | null>(null);

  useEffect(() => {
    let active = true;
    void listNeighborhoods().then((rows) => active && setNeighborhoods(rows));
    void readFix()
      .then((value) => active && setFix(value))
      .catch(() => {})
      .finally(() => active && setLocating(false));
    return () => {
      active = false;
    };
  }, []);

  const complete =
    name.trim().length > 0 &&
    nameAm.trim().length > 0 &&
    landmark.trim().length > 0 &&
    neighborhoodId !== null &&
    fix !== null;

  const send = async (overrideDuplicates: boolean) => {
    if (!complete || !fix || sending) return;
    setSending(true);
    setFailed(null);
    try {
      await api.submitShop({
        name: name.trim(),
        name_am: nameAm.trim(),
        landmark: landmark.trim(),
        neighborhood_id: neighborhoodId,
        latitude: fix.latitude,
        longitude: fix.longitude,
        price_band: priceBand,
        duplicate_override: overrideDuplicates,
      });
      router.back();
    } catch (error) {
      // The server answers 409 with the shops it thinks this duplicates. That
      // is a question for the person standing there, not an error.
      if (error instanceof ApiRequestError && error.code === "duplicate_candidates") {
        setDuplicates((error.details as Shop[] | undefined) ?? []);
      } else {
        setFailed(t("newShop.failed"));
      }
      setSending(false);
    }
  };

  if (duplicates) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
          <View>
            <Text role="display">{t("newShop.duplicateTitle")}</Text>
            <Text role="caption" color="inkMuted">
              {t("newShop.duplicateBody")}
            </Text>
          </View>
          <View style={{ gap: space.sm }}>
            {duplicates.map((shop) => (
              <View
                key={shop.id}
                style={{
                  padding: space.md,
                  borderRadius: radius.lg,
                  backgroundColor: colors.surfaceRaised,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text role="label" weight="medium">
                  {language === "am" ? shop.name_am : shop.name}
                </Text>
                <Text role="caption" color="inkMuted">
                  {shop.landmark}
                </Text>
              </View>
            ))}
          </View>
          <Button label={t("newShop.addAnyway")} onPress={() => void send(true)} busy={sending} fullWidth />
          <Button label={t("common.cancel")} variant="quiet" onPress={() => router.back()} fullWidth />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
        <View>
          <Text role="display">{t("newShop.title")}</Text>
          <Text role="caption" color="inkMuted">
            {t("newShop.subtitle")}
          </Text>
        </View>

        <View
          style={{
            padding: space.md,
            borderRadius: radius.md,
            backgroundColor: fix ? colors.surfaceRaised : colors.primarySoft,
            borderWidth: 1,
            borderColor: fix ? colors.border : colors.caution,
          }}
        >
          <Text role="caption" color={fix ? "inkMuted" : "caution"}>
            {locating
              ? t("checkin.locating")
              : fix
                ? t("newShop.usingLocation", { meters: fix.accuracyMeters })
                : t("newShop.noLocation")}
          </Text>
        </View>

        <Field label={t("edit.name")} value={name} onChange={setName} />
        <Field label={t("edit.nameAm")} value={nameAm} onChange={setNameAm} />
        <Field
          label={t("edit.landmark")}
          hint={t("newShop.landmarkHint")}
          value={landmark}
          onChange={setLandmark}
        />

        <View style={{ gap: space.xs }}>
          <Text role="label" color="inkMuted">
            {t("newShop.neighborhood")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {neighborhoods.map((area) => (
              <Chip
                key={area.id}
                label={language === "am" ? area.name_am : area.name}
                selected={neighborhoodId === area.id}
                onPress={() => setNeighborhoodId(area.id)}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: space.xs }}>
          <Text role="label" color="inkMuted">
            {t("edit.price")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {PRICE_BANDS.map((band, index) => (
              <Chip
                key={band}
                label={"ብር".repeat(index + 1)}
                selected={priceBand === band}
                onPress={() => setPriceBand(priceBand === band ? null : band)}
              />
            ))}
          </View>
        </View>

        {failed ? (
          <Text role="caption" color="primary">
            {failed}
          </Text>
        ) : null}

        <View style={{ gap: space.sm }}>
          <Button
            label={complete ? t("newShop.submit") : t("newShop.incomplete")}
            onPress={() => void send(false)}
            disabled={!complete}
            busy={sending}
            fullWidth
          />
          <Button label={t("common.cancel")} variant="quiet" onPress={() => router.back()} fullWidth />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
