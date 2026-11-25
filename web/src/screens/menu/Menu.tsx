import type { MenuCategory, MenuItem } from "@/api/types";
import { useI18n } from "@/i18n/context";
import "./menu.css";

const CATEGORY_ORDER: MenuCategory[] = ["coffee", "tea", "drinks", "food", "sweets"];

/**
 * The café's menu, in both languages: the reader's first, the other under
 * it, so a QR scan works for whoever is at the table. Nothing when the café
 * has no menu yet.
 */
export function ShopMenu({ items }: { items: MenuItem[] }) {
  const { t, language } = useI18n();
  if (items.length === 0) return null;

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <section className="card shop-menu" aria-labelledby="shop-menu">
      <h2 id="shop-menu" className="eyebrow">
        {t("shop.menu")}
      </h2>
      {groups.map((group) => (
        <div key={group.category} className="shop-menu__group">
          {groups.length > 1 ? <h3 className="shop-menu__category">{t(`shop.menu.${group.category}`)}</h3> : null}
          <ul>
            {group.items.map((item) => {
              const [first, second] = menuNames(item, language);
              return (
                <li key={item.id} className="shop-menu__item">
                  <span className="shop-menu__names">
                    <span lang={first.lang}>{first.text}</span>
                    {second ? (
                      <span className="shop-menu__other" lang={second.lang}>
                        {second.text}
                      </span>
                    ) : null}
                  </span>
                  {item.price_birr ? (
                    <span className="shop-menu__price mono">{t("shop.menu.price", { price: item.price_birr })}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

type Name = { text: string; lang: "en" | "am" };

/** The item's name in the reader's language first, then the other one if it differs. */
export function menuNames(item: Pick<MenuItem, "name" | "name_am">, language: string): [Name, Name | null] {
  const en: Name = { text: item.name, lang: "en" };
  const am: Name | null = item.name_am ? { text: item.name_am, lang: "am" } : null;
  if (!am) return [en, null];
  return language === "am" ? [am, en] : [en, am];
}
