import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/api/client";
import type { User } from "@/api/types";
import { useAuth } from "@/auth/AuthProvider";
import { useMyDoodle } from "@/data/me";
import { useProfile } from "@/data/queries";
import { Doodle } from "@/design/doodle/Doodle";
import { useI18n } from "@/i18n/context";
import { languageNames } from "@/i18n/strings";
import { useNavigation } from "@/nav/Navigation";
import { BackControl } from "@/telegram/buttons";
import { inTelegram } from "@/telegram/sdk";
import { bpEdit } from "@/ui/glyphs";
import { Icon } from "@/ui/Icon";
import { handleLine } from "../passport/Passport";
import "./profile.css";

/**
 * Profile, opened from your doodle on the Passport header: who you are, your
 * doodle, and every setting the Mini App has, kept together in one card.
 */
export function Profile() {
  const { t, language } = useI18n();
  const { back, push } = useNavigation();
  const { firstName } = useAuth();
  const { data: profile } = useProfile();
  const doodle = useMyDoodle();

  return (
    <main className="screen screen--glow profile">
      <BackControl onBack={back} label={t("common.back")} />
      <header className="profile__header">
        <Doodle
          seed={doodle.seed}
          mood={doodle.awake ? "awake" : "sleepy"}
          size={96}
          label={t(doodle.awake ? "doodle.mineAwake" : "doodle.mineSleepy")}
        />
        <h1 className="profile__name">{profile?.display_name ?? firstName ?? ""}</h1>
        {profile ? <span className="profile__handle">{handleLine(profile, t, language)}</span> : null}
        <button type="button" className="pill-button" onClick={() => push({ name: "studio" })}>
          <Icon path={bpEdit} size={16} />
          {t("passport.editDoodle")}
        </button>
      </header>

      <Settings profile={profile} />
    </main>
  );
}

/** Language, what friends can see of you, the bot's nudge, and signing out. */
function Settings({ profile }: { profile: User | undefined }) {
  const { t, language, setLanguage } = useI18n();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  async function toggleSharing(change: { shares_cup_status: boolean } | { shares_visits: boolean }) {
    setSaving(true);
    try {
      const { data } = await api.updateProfile(change);
      queryClient.setQueryData(["profile"], data);
      void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    } finally {
      setSaving(false);
    }
  }

  async function toggleNudges(next: boolean) {
    setSaving(true);
    try {
      const { data } = await api.updateProfile({ daily_nudges: next });
      queryClient.setQueryData(["profile"], data);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card settings" aria-labelledby="settings-title">
      <h2 id="settings-title" className="eyebrow">
        {t("passport.settings")}
      </h2>
      <div className="settings__row">
        <span>{t("passport.language")}</span>
        <div className="segment" role="group" aria-label={t("passport.language")}>
          {(["en", "am"] as const).map((code) => (
            <button key={code} type="button" aria-pressed={language === code} onClick={() => setLanguage(code)} lang={code}>
              {languageNames[code]}
            </button>
          ))}
        </div>
      </div>
      {profile ? (
        <label className="settings__row settings__toggle">
          <span className="settings__text">
            {t("passport.shareCupStatus")}
            <span className="muted">{t("passport.shareCupStatusHint")}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={profile.shares_cup_status}
            disabled={saving}
            onChange={(event) => void toggleSharing({ shares_cup_status: event.target.checked })}
          />
        </label>
      ) : null}
      {profile ? (
        <label className="settings__row settings__toggle">
          <span className="settings__text">
            {t("passport.shareVisits")}
            <span className="muted">{t("passport.shareVisitsHint")}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={profile.shares_visits}
            disabled={saving}
            onChange={(event) => void toggleSharing({ shares_visits: event.target.checked })}
          />
        </label>
      ) : null}
      {profile && inTelegram ? (
        <label className="settings__row settings__toggle">
          <span className="settings__text">
            {t("passport.dailyNudges")}
            <span className="muted">{t("passport.dailyNudgesHint")}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={profile.daily_nudges}
            disabled={saving}
            onChange={(event) => void toggleNudges(event.target.checked)}
          />
        </label>
      ) : null}
      {inTelegram ? null : (
        <button type="button" className="link-button" onClick={() => void signOut()}>
          {t("profile.signOut")}
        </button>
      )}
    </section>
  );
}
