import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/api/client";
import { Button } from "@/design/components/Button";
import { Chip } from "@/design/components/Chip";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { radius, space } from "@/design/tokens";
import { findShop, type CachedShop } from "@/db/shops";
import { useI18n } from "@/i18n/context";

/** Mirrors the shops.price_band check constraint. */
const PRICE_BANDS = ["budget", "standard", "premium", "splurge"] as const;

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
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
    </View>
  );
}

export default function SuggestEditScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();

  const [shop, setShop] = useState<CachedShop | null>(null);
  const [name, setName] = useState("");
  const [nameAm, setNameAm] = useState("");
  const [landmark, setLandmark] = useState("");
  const [priceBand, setPriceBand] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const found = await findShop(Number(shopId));
      if (!active || !found) return;
      setShop(found);
      setName(found.name);
      setNameAm(found.name_am);
      setLandmark(found.landmark);
      setPriceBand(found.price_band);
    })();
    return () => {
      active = false;
    };
  }, [shopId]);

  // Send only what actually differs, so a moderator reviews one field, not five.
  const changes: Record<string, unknown> = {};
  if (shop) {
    if (name.trim() && name.trim() !== shop.name) changes.name = name.trim();
    if (nameAm.trim() && nameAm.trim() !== shop.name_am) changes.name_am = nameAm.trim();
    if (landmark.trim() && landmark.trim() !== shop.landmark) changes.landmark = landmark.trim();
    if (priceBand !== shop.price_band) changes.price_band = priceBand;
  }
  const dirty = Object.keys(changes).length > 0;

  const submit = async () => {
    if (!dirty || sending) return;
    setSending(true);
    setFailed(false);
    try {
      await api.suggestEdit(Number(shopId), changes);
      router.back();
    } catch {
      setFailed(true);
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
        <View>
          <Text role="display">{t("edit.title")}</Text>
          <Text role="caption" color="inkMuted">
            {t("edit.subtitle")}
          </Text>
        </View>

        <Field label={t("edit.name")} value={name} onChange={setName} />
        <Field label={t("edit.nameAm")} value={nameAm} onChange={setNameAm} />
        <Field label={t("edit.landmark")} value={landmark} onChange={setLandmark} />

        <View style={{ gap: space.xs }}>
          <Text role="label" color="inkMuted">
            {t("edit.price")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {PRICE_BANDS.map((band) => (
              <Chip
                key={band}
                label={"ብር".repeat(PRICE_BANDS.indexOf(band) + 1)}
                selected={priceBand === band}
                onPress={() => setPriceBand(priceBand === band ? null : band)}
              />
            ))}
          </View>
        </View>

        {failed ? (
          <Text role="caption" color="primary">
            {t("edit.failed")}
          </Text>
        ) : null}

        <View style={{ gap: space.sm }}>
          <Button
            label={dirty ? t("edit.submit") : t("edit.noChanges")}
            onPress={submit}
            disabled={!dirty}
            busy={sending}
            fullWidth
          />
          <Button label={t("common.cancel")} variant="quiet" onPress={() => router.back()} fullWidth />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
