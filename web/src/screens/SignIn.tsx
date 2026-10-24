import { useState, type FormEvent } from "react";
import { ApiRequestError } from "@/api/errors";
import { useAuth } from "@/auth/AuthProvider";
import { Doodle } from "@/design/doodle/Doodle";
import { useI18n } from "@/i18n/context";
import { PrimaryAction } from "@/telegram/buttons";
import { bpEye, bpEyeOff } from "@/ui/glyphs";
import { Headline } from "@/ui/Headline";
import { Icon } from "@/ui/Icon";
import "./signin.css";

/**
 * The plain website's way in (handoff, Sign-in fallback). Inside Telegram
 * nobody sees this: initData signs them in before the first screen.
 */
export function SignIn() {
  const { t } = useI18n();
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = email.trim().length > 0 && password.length > 0;

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (failure) {
      setError(t(failure instanceof ApiRequestError && failure.isUnauthorized ? "auth.invalid" : "common.somethingWrong"));
      setBusy(false);
    }
  }

  return (
    <main className="screen screen--glow signin">
      <div className="signin__doodle" aria-hidden="true">
        <Doodle seed="bunna" mood="sleepy" size={96} decorative />
      </div>
      <Headline first={t("signin.title")} second={t("signin.titleB")} size={34} />
      <p className="signin__body">{t("signin.body")}</p>

      <form className="signin__form" onSubmit={submit} noValidate>
        <label className="field">
          <span className="field__label">{t("auth.email")}</span>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">{t("auth.password")}</span>
          <span className="field__row">
            <input
              type={reveal ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="field__reveal"
              aria-label={t(reveal ? "auth.hidePassword" : "auth.showPassword")}
              onClick={() => setReveal(!reveal)}
            >
              <Icon path={reveal ? bpEyeOff : bpEye} size={20} />
            </button>
          </span>
        </label>
        {error ? (
          <p className="signin__error" role="alert">
            {error}
          </p>
        ) : null}
        {/* Enter submits; the visible button is the action bar below. */}
        <button type="submit" hidden />
      </form>

      <PrimaryAction text={t("auth.signIn")} onClick={() => void submit()} disabled={!ready} loading={busy} />
    </main>
  );
}
