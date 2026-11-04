import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { Icon } from "@/ui/Icon";
import { phPlus } from "@/ui/icons";
import "./contribute.css";

/** Under a search that found nothing: add the café, with what was typed as its name. */
export function AddMissing({ query }: { query: string }) {
  const { t } = useI18n();
  const { push } = useNavigation();
  const name = query.trim();
  return (
    <button type="button" className="add-missing" onClick={() => push({ name: "addCafe", cafeName: name })}>
      <Icon path={phPlus} size={16} />
      {name ? t("addCafe.entryNamed", { name }) : t("addCafe.entry")}
    </button>
  );
}
