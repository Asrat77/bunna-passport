import { useEffect } from "react";
import { useMyDoodle } from "@/data/me";
import { Doodle } from "@/design/doodle/Doodle";
import { useI18n, type Key } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { BackControl, PrimaryAction } from "@/telegram/buttons";
import { hapticSuccess } from "@/telegram/haptics";
import { Headline } from "@/ui/Headline";

/** The thank-you after a suggestion, a new café or a report goes in. */
export function Sent({ body }: { body: Key }) {
  const { t } = useI18n();
  const { back } = useNavigation();
  const doodle = useMyDoodle();

  useEffect(() => {
    hapticSuccess();
  }, []);

  return (
    <main className="screen screen--glow contribute-sent">
      <BackControl onBack={back} label={t("common.back")} />
      <div className="contribute-sent__doodle">
        <Doodle seed={doodle.seed} mood="awake" size={96} decorative />
      </div>
      <Headline first={t("sent.titleA")} second={t("sent.titleB")} size={30} align="center" />
      <p className="contribute-sent__body">{t(body)}</p>
      <PrimaryAction text={t("sent.done")} onClick={back} />
    </main>
  );
}
