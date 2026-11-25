import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/api/client";
import type { EditableMenuItem, MenuCategory, MenuItemInput, OpaqueId } from "@/api/types";
import { useShop } from "@/data/queries";
import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { BackControl } from "@/telegram/buttons";
import { hapticError, hapticSuccess } from "@/telegram/haptics";
import { Headline } from "@/ui/Headline";
import { FormError, PhotoField, sendFailure } from "../contribute/Fields";
import "../contribute/contribute.css";
import "./owner.css";

const CATEGORIES: MenuCategory[] = ["coffee", "tea", "drinks", "food", "sweets"];

/**
 * An owner's tools for their café: the menu, a photo, and the hours and
 * landmark (through the edit form, which goes live for an owner).
 */
export function ManageCafe({ shopId }: { shopId: OpaqueId }) {
  const { t } = useI18n();
  const { back, push } = useNavigation();
  const { data: shop } = useShop(shopId);

  return (
    <main className="screen contribute manage-cafe">
      <BackControl onBack={back} label={t("common.back")} />
      <Headline first={t("manage.titleA")} second={shop?.name ?? ""} size={30} />
      <p className="contribute__body">{t("manage.body")}</p>

      <MenuEditor shopId={shopId} />
      <PhotoUpload shopId={shopId} />

      <section className="card manage-cafe__section">
        <h2 className="eyebrow">{t("manage.details")}</h2>
        <p className="manage-cafe__hint">{t("manage.detailsHint")}</p>
        <button type="button" className="pin-field__button" onClick={() => push({ name: "suggestEdit", shopId })}>
          {t("manage.editDetails")}
        </button>
      </section>
    </main>
  );
}

function MenuEditor({ shopId }: { shopId: OpaqueId }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const menu = useQuery({ queryKey: ["menuItems", shopId], queryFn: async () => (await api.listMenuItems(shopId)).data });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["menuItems", shopId] });
    void queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
  };

  return (
    <section className="card manage-cafe__section" aria-labelledby="manage-menu">
      <h2 id="manage-menu" className="eyebrow">
        {t("shop.menu")}
      </h2>
      {menu.isPending ? <div className="skeleton" style={{ height: 120 }} /> : null}
      {menu.isError ? <FormError>{t("common.somethingWrong")}</FormError> : null}
      {menu.data?.length === 0 ? <p className="manage-cafe__hint">{t("manage.menuEmpty")}</p> : null}
      <ul className="menu-editor">
        {menu.data?.map((item) => <MenuLine key={item.id} shopId={shopId} item={item} onSaved={refresh} />)}
      </ul>
      <MenuLineForm
        submitLabel={t("manage.menuAdd")}
        onSubmit={async (input) => {
          await api.createMenuItem(shopId, input);
          refresh();
        }}
        resetOnSubmit
      />
    </section>
  );
}

function MenuLine({ shopId, item, onSaved }: { shopId: OpaqueId; item: EditableMenuItem; onSaved: () => void }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  // A second tap removes: Telegram's webviews don't all allow confirm().
  const [confirming, setConfirming] = useState(false);
  const toggle = useMutation({
    mutationFn: () => api.updateMenuItem(shopId, item.id, { available: !item.available }),
    onSuccess: onSaved,
    onError: hapticError,
  });
  const remove = useMutation({
    mutationFn: () => api.deleteMenuItem(shopId, item.id),
    onSuccess: onSaved,
    onError: hapticError,
  });

  if (editing) {
    return (
      <li className="menu-editor__line menu-editor__line--editing">
        <MenuLineForm
          initial={item}
          submitLabel={t("manage.menuSave")}
          onSubmit={async (input) => {
            await api.updateMenuItem(shopId, item.id, input);
            setEditing(false);
            onSaved();
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className={item.available ? "menu-editor__line" : "menu-editor__line menu-editor__line--off"}>
      <span className="menu-editor__names">
        <span>{item.name}</span>
        {item.name_am ? <span lang="am">{item.name_am}</span> : null}
      </span>
      <span className="menu-editor__price mono">{item.price_birr ? t("shop.menu.price", { price: item.price_birr }) : "–"}</span>
      <span className="menu-editor__actions">
        <button type="button" className="link-button" onClick={() => setEditing(true)}>
          {t("manage.menuEdit")}
        </button>
        <button type="button" className="link-button" disabled={toggle.isPending} onClick={() => toggle.mutate()}>
          {t(item.available ? "manage.menuHide" : "manage.menuShow")}
        </button>
        <button
          type="button"
          className="link-button menu-editor__remove"
          disabled={remove.isPending}
          onClick={() => (confirming ? remove.mutate() : setConfirming(true))}
        >
          {t(confirming ? "manage.menuRemoveConfirm" : "manage.menuRemove")}
        </button>
      </span>
    </li>
  );
}

function MenuLineForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  resetOnSubmit = false,
}: {
  initial?: EditableMenuItem;
  submitLabel: string;
  onSubmit: (input: MenuItemInput) => Promise<void>;
  onCancel?: () => void;
  resetOnSubmit?: boolean;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(initial?.name ?? "");
  const [nameAm, setNameAm] = useState(initial?.name_am ?? "");
  const [price, setPrice] = useState(initial?.price_birr ? String(initial.price_birr) : "");
  const [category, setCategory] = useState<MenuCategory>(initial?.category ?? "coffee");
  const save = useMutation({
    mutationFn: () =>
      onSubmit({ name: name.trim(), name_am: nameAm.trim() || null, price_birr: price ? Number(price) : null, category }),
    onSuccess: () => {
      hapticSuccess();
      if (resetOnSubmit) {
        setName("");
        setNameAm("");
        setPrice("");
      }
    },
    onError: hapticError,
  });
  const priceOk = price === "" || (/^\d{1,6}$/.test(price) && Number(price) >= 1 && Number(price) <= 100000);

  return (
    <form
      className="menu-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim() && priceOk && !save.isPending) save.mutate();
      }}
    >
      <input value={name} maxLength={80} required placeholder={t("manage.menuName")} aria-label={t("manage.menuName")} onChange={(e) => setName(e.target.value)} />
      <input value={nameAm} maxLength={80} lang="am" placeholder={t("manage.menuNameAm")} aria-label={t("manage.menuNameAm")} onChange={(e) => setNameAm(e.target.value)} />
      <div className="menu-form__row">
        <input
          value={price}
          inputMode="numeric"
          placeholder={t("manage.menuPrice")}
          aria-label={t("manage.menuPrice")}
          aria-invalid={!priceOk}
          onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
        />
        <select value={category} aria-label={t("manage.menuCategory")} onChange={(e) => setCategory(e.target.value as MenuCategory)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`shop.menu.${c}`)}
            </option>
          ))}
        </select>
      </div>
      {save.isError ? <FormError>{t(sendFailure(save.error))}</FormError> : null}
      <div className="menu-form__row">
        <button type="submit" className="pin-field__button" disabled={!name.trim() || !priceOk || save.isPending}>
          {submitLabel}
        </button>
        {onCancel ? (
          <button type="button" className="link-button" onClick={onCancel}>
            {t("manage.menuCancel")}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function PhotoUpload({ shopId }: { shopId: OpaqueId }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const upload = useMutation({
    mutationFn: async (photo: File) => (await api.submitPhoto(shopId, photo)).data,
    onSuccess: () => {
      hapticSuccess();
      setFile(null);
      void queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
    },
    onError: hapticError,
  });

  return (
    <section className="card manage-cafe__section">
      <h2 className="eyebrow">{t("manage.photos")}</h2>
      <PhotoField value={file} onChange={setFile} />
      {upload.isError ? <FormError>{t(sendFailure(upload.error))}</FormError> : null}
      {upload.isSuccess && !file ? <p className="manage-cafe__hint">{t("manage.photoLive")}</p> : null}
      {file ? (
        <button type="button" className="pin-field__button" disabled={upload.isPending} onClick={() => upload.mutate(file)}>
          {t("manage.photoUpload")}
        </button>
      ) : null}
    </section>
  );
}
