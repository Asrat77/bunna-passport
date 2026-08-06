import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/api/client";
import { Button } from "@/design/components/Button";
import { Chip } from "@/design/components/Chip";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { radius, space, touchTarget } from "@/design/tokens";
import { useI18n } from "@/i18n/context";

/** Mirrors Report::reason on the server. */
const REASONS = [
  "closed",
  "wrong_location",
  "inaccurate_details",
  "duplicate",
  "inappropriate",
  "spam",
  "other",
] as const;

type Reason = (typeof REASONS)[number];

export default function ReportScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();

  const [reason, setReason] = useState<Reason | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  const submit = async () => {
    if (!reason || sending) return;
    setSending(true);
    setFailed(false);
    try {
      await api.report({
        reportable_type: "shop",
        reportable_id: Number(shopId),
        reason,
        note: note.trim() || undefined,
      });
      router.back();
    } catch {
      // Staying on the screen keeps the typed note recoverable.
      setFailed(true);
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
        <View>
          <Text role="display">{t("report.title")}</Text>
          <Text role="caption" color="inkMuted">
            {t("report.subtitle")}
          </Text>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {REASONS.map((option) => (
            <Chip
              key={option}
              label={t(`report.reason.${option}`)}
              selected={reason === option}
              onPress={() => setReason(option)}
            />
          ))}
        </View>

        <View style={{ gap: space.sm }}>
          <Text role="label" color="inkMuted">
            {t("report.note")}
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={500}
            style={{
              minHeight: touchTarget * 2,
              padding: space.md,
              borderRadius: radius.lg,
              borderCurve: "continuous",
              backgroundColor: colors.surfaceRaised,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.ink,
              textAlignVertical: "top",
            }}
          />
        </View>

        {failed ? (
          <Text role="caption" color="primary">
            {t("edit.failed")}
          </Text>
        ) : null}

        <View style={{ gap: space.sm }}>
          <Button
            label={t("report.submit")}
            onPress={submit}
            disabled={!reason}
            busy={sending}
            fullWidth
          />
          <Button label={t("common.cancel")} variant="quiet" onPress={() => router.back()} fullWidth />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
