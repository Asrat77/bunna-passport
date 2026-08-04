import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiRequestError } from "@/api/errors";
import { useAuth } from "@/auth/context";
import { Button } from "@/design/components/Button";
import { BunnaMark } from "@/design/components/BunnaMark";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { radius, space, touchTarget } from "@/design/tokens";
import { fontFor } from "@/design/typography";
import { useI18n } from "@/i18n/context";

type Mode = "signIn" | "signUp";

function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  secure?: boolean;
  autoCapitalize?: "none" | "words";
  keyboardType?: "email-address" | "default";
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [reveal, setReveal] = useState(false);
  const [focused, setFocused] = useState(false);
  const { label, value, onChange, hint, secure = false, autoCapitalize = "none", keyboardType = "default" } = props;

  return (
    <View style={{ gap: space.xs }}>
      <Text role="label" color="inkMuted">
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          minHeight: touchTarget,
          paddingHorizontal: space.lg,
          borderRadius: radius.md,
          borderCurve: "continuous",
          backgroundColor: colors.surfaceRaised,
          borderWidth: focused ? 2 : 1,
          borderColor: focused ? colors.primary : colors.border,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChange}
          secureTextEntry={secure && !reveal}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          accessibilityLabel={label}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            color: colors.ink,
            fontFamily: fontFor("body", value),
            fontSize: 16,
            paddingVertical: space.md,
          }}
        />
        {secure ? (
          <Pressable
            onPress={() => setReveal((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={reveal ? t("auth.hidePassword") : t("auth.showPassword")}
            hitSlop={12}
          >
            <MaterialCommunityIcons
              name={reveal ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.inkMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {hint ? (
        <Text role="caption" color="inkFaint">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * The soft gate (docs/DESIGN.md §4.2). Reached only when the user asks for
 * something that needs an identity — never on launch.
 */
export default function SignInScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>("signUp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "signIn") {
        await signIn(email.trim(), password);
      } else {
        await signUp({
          email_address: email.trim(),
          handle: handle.trim(),
          display_name: displayName.trim() || handle.trim(),
          password,
          password_confirmation: password,
        });
      }
      router.back();
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.status === 401
            ? t("auth.invalid")
            : caught.message
          : t("offline.needsConnection"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: space.lg, gap: space.lg }}
        >
          <View style={{ alignItems: "flex-end" }}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
              style={{
                width: touchTarget,
                height: touchTarget,
                borderRadius: radius.full,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.surfaceRaised,
              }}
            >
              <MaterialCommunityIcons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>

          <View
            style={{
              alignItems: "center",
              gap: space.md,
              padding: space.xl,
              marginBottom: space.sm,
              borderRadius: radius.xl,
              borderCurve: "continuous",
              backgroundColor: colors.primarySoft,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                position: "absolute",
                width: 140,
                height: 140,
                borderRadius: 70,
                right: -55,
                top: -60,
                borderWidth: 20,
                borderColor: colors.accent,
                opacity: 0.3,
              }}
            />
            <BunnaMark size={96} />
            <Text role="title" align="center">
              {t("auth.gateTitle")}
            </Text>
            <Text role="body" color="inkMuted" align="center">
              {t("auth.gateBody")}
            </Text>
          </View>

          <View
            style={{
              gap: space.lg,
              padding: space.lg,
              borderRadius: radius.lg,
              borderCurve: "continuous",
              backgroundColor: colors.surfaceRaised,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Field
              label={t("auth.email")}
              value={email}
              onChange={setEmail}
              keyboardType="email-address"
            />

            {mode === "signUp" ? (
              <>
                <Field
                  label={t("auth.handle")}
                  value={handle}
                  onChange={setHandle}
                  hint={t("auth.handleHint")}
                />
                <Field
                  label={t("auth.displayName")}
                  value={displayName}
                  onChange={setDisplayName}
                  autoCapitalize="words"
                />
              </>
            ) : null}

            <Field label={t("auth.password")} value={password} onChange={setPassword} secure />
          </View>

          {error ? (
            <View
              style={{
                padding: space.md,
                borderRadius: radius.md,
                backgroundColor: colors.primarySoft,
              }}
            >
              <Text role="label" color="negative">
                {error}
              </Text>
            </View>
          ) : null}

          <Button
            label={mode === "signUp" ? t("auth.createAccount") : t("auth.signIn")}
            onPress={submit}
            busy={busy}
          />

          <Pressable
            onPress={() => {
              setMode(mode === "signUp" ? "signIn" : "signUp");
              setError(null);
            }}
            accessibilityRole="button"
            style={{ paddingVertical: space.md, alignItems: "center" }}
          >
            <Text role="label" color="primary">
              {mode === "signUp" ? t("auth.haveAccount") : t("auth.noAccount")}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
