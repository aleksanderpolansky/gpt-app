"use client";

import Link from "next/link";
import { useState } from "react";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type DeleteResponse = {
  ok?: boolean;
  error?: string;
  errorCode?: string;
  deletedId?: string;
  parentValueObjectId?: string | null;
  redirectUrl?: string;
  blocker?: {
    table?: string | null;
    column?: string | null;
    count?: number | null;
  } | null;
};

type Copy = {
  deleteObject: string;
  title: string;
  warning: string;
  cancel: string;
  confirm: string;
  deleting: string;
  deleted: string;
  deletedMessage: string;
  openParent: string;
  backToObjects: string;
  blocked: string;
  technicalDependency: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    deleteObject: "Delete observation object",
    title: "Delete observation object?",
    warning:
      "This permanently removes this unused object and its own creation history. Objects with children, facts, activity/template links, relations, goals, commercial references or other dependencies are blocked.",
    cancel: "Cancel",
    confirm: "Delete object",
    deleting: "Deleting…",
    deleted: "Observation object deleted",
    deletedMessage: "The object was removed successfully.",
    openParent: "Open parent",
    backToObjects: "Back to observation objects",
    blocked: "This object cannot be deleted safely.",
    technicalDependency: "Blocking dependency",
  },
  pl: {
    deleteObject: "Usuń obiekt obserwacji",
    title: "Usunąć obiekt obserwacji?",
    warning:
      "Operacja trwale usuwa ten nieużywany obiekt oraz jego własną historię utworzenia. Obiekty z dziećmi, faktami, powiązaniami aktywności/szablonów, relacjami, celami, odwołaniami handlowymi lub innymi zależnościami są blokowane.",
    cancel: "Anuluj",
    confirm: "Usuń obiekt",
    deleting: "Usuwanie…",
    deleted: "Obiekt obserwacji usunięty",
    deletedMessage: "Obiekt został pomyślnie usunięty.",
    openParent: "Otwórz rodzica",
    backToObjects: "Wróć do obiektów obserwacji",
    blocked: "Tego obiektu nie można bezpiecznie usunąć.",
    technicalDependency: "Blokująca zależność",
  },
  ru: {
    deleteObject: "Удалить объект наблюдения",
    title: "Удалить объект наблюдения?",
    warning:
      "Операция навсегда удалит этот неиспользуемый объект и его собственную историю создания. Объекты с дочерними узлами, фактами, связями активностей/шаблонов, отношениями, целями, коммерческими ссылками или другими зависимостями удалить нельзя.",
    cancel: "Отмена",
    confirm: "Удалить объект",
    deleting: "Удаление…",
    deleted: "Объект наблюдения удалён",
    deletedMessage: "Объект успешно удалён.",
    openParent: "Открыть родителя",
    backToObjects: "К объектам наблюдения",
    blocked: "Этот объект нельзя безопасно удалить.",
    technicalDependency: "Блокирующая зависимость",
  },
  uk: {
    deleteObject: "Видалити об’єкт спостереження",
    title: "Видалити об’єкт спостереження?",
    warning:
      "Операція назавжди видалить цей невикористаний об’єкт і його власну історію створення. Об’єкти з дочірніми вузлами, фактами, зв’язками активностей/шаблонів, відношеннями, цілями, комерційними посиланнями чи іншими залежностями заблоковані.",
    cancel: "Скасувати",
    confirm: "Видалити об’єкт",
    deleting: "Видалення…",
    deleted: "Об’єкт спостереження видалено",
    deletedMessage: "Об’єкт успішно видалено.",
    openParent: "Відкрити батьківський об’єкт",
    backToObjects: "До об’єктів спостереження",
    blocked: "Цей об’єкт неможливо безпечно видалити.",
    technicalDependency: "Блокуюча залежність",
  },
  de: {
    deleteObject: "Beobachtungsobjekt löschen",
    title: "Beobachtungsobjekt löschen?",
    warning:
      "Dadurch werden dieses unbenutzte Objekt und seine eigene Erstellungshistorie dauerhaft gelöscht. Objekte mit Kindern, Fakten, Aktivitäts-/Vorlagenverknüpfungen, Relationen, Zielen, kommerziellen Referenzen oder anderen Abhängigkeiten werden blockiert.",
    cancel: "Abbrechen",
    confirm: "Objekt löschen",
    deleting: "Wird gelöscht…",
    deleted: "Beobachtungsobjekt gelöscht",
    deletedMessage: "Das Objekt wurde erfolgreich entfernt.",
    openParent: "Übergeordnetes Objekt öffnen",
    backToObjects: "Zurück zu Beobachtungsobjekten",
    blocked: "Dieses Objekt kann nicht sicher gelöscht werden.",
    technicalDependency: "Blockierende Abhängigkeit",
  },
  es: {
    deleteObject: "Eliminar objeto de observación",
    title: "¿Eliminar objeto de observación?",
    warning:
      "Esta operación elimina permanentemente este objeto no utilizado y su propio historial de creación. Se bloquean los objetos con hijos, hechos, vínculos de actividades/plantillas, relaciones, objetivos, referencias comerciales u otras dependencias.",
    cancel: "Cancelar",
    confirm: "Eliminar objeto",
    deleting: "Eliminando…",
    deleted: "Objeto de observación eliminado",
    deletedMessage: "El objeto se eliminó correctamente.",
    openParent: "Abrir padre",
    backToObjects: "Volver a objetos de observación",
    blocked: "Este objeto no se puede eliminar de forma segura.",
    technicalDependency: "Dependencia bloqueante",
  },
  cs: {
    deleteObject: "Odstranit objekt pozorování",
    title: "Odstranit objekt pozorování?",
    warning:
      "Operace trvale odstraní tento nepoužívaný objekt a jeho vlastní historii vytvoření. Objekty s potomky, fakty, vazbami aktivit/šablon, vztahy, cíli, obchodními odkazy nebo jinými závislostmi jsou zablokovány.",
    cancel: "Zrušit",
    confirm: "Odstranit objekt",
    deleting: "Odstraňování…",
    deleted: "Objekt pozorování odstraněn",
    deletedMessage: "Objekt byl úspěšně odstraněn.",
    openParent: "Otevřít nadřazený objekt",
    backToObjects: "Zpět k objektům pozorování",
    blocked: "Tento objekt nelze bezpečně odstranit.",
    technicalDependency: "Blokující závislost",
  },
};

function localeHref(pathname: string, locale: LocaleCode) {
  return locale === "en"
    ? pathname
    : `${pathname}${pathname.includes("?") ? "&" : "?"}locale=${encodeURIComponent(locale)}`;
}

export function ValueObjectDeleteAction({
  locale,
  valueObjectId,
  title,
}: {
  locale: LocaleCode;
  valueObjectId: string;
  title: string;
}) {
  const copy = COPY[locale];
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DeleteResponse | null>(null);

  async function deleteObject() {
    if (pending || result?.ok) {
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch(
        `/api/value-objects/${encodeURIComponent(valueObjectId)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        },
      );
      const payload = (await response
        .json()
        .catch(() => null)) as DeleteResponse | null;

      if (!response.ok || payload?.ok !== true || !payload.redirectUrl) {
        const blockerText = payload?.blocker?.table
          ? ` ${copy.technicalDependency}: ${payload.blocker.table}${
              payload.blocker.column ? `.${payload.blocker.column}` : ""
            }.`
          : "";
        throw new Error(
          `${payload?.error || copy.blocked}${blockerText}`.trim(),
        );
      }

      setResult(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.blocked);
    } finally {
      setPending(false);
    }
  }

  const successHref = result?.redirectUrl
    ? localeHref(result.redirectUrl, locale)
    : localeHref("/value-objects", locale);
  const parentHref = result?.parentValueObjectId
    ? localeHref(`/value-objects/${result.parentValueObjectId}`, locale)
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="w-fit rounded-full border border-red-200 bg-white px-4 py-2 text-[12px] font-semibold text-red-700 shadow-sm transition hover:bg-red-50"
      >
        {copy.deleteObject}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="value-object-delete-title"
        >
          <div className="w-full max-w-[560px] rounded-[26px] border border-black/[0.08] bg-white p-6 shadow-2xl">
            {result?.ok ? (
              <div role="status" aria-live="polite">
                <div className="flex items-start gap-3">
                  <div
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[17px] font-black text-white"
                  >
                    ✓
                  </div>
                  <div>
                    <h2
                      id="value-object-delete-title"
                      className="text-[21px] font-bold text-[#111827]"
                    >
                      {copy.deleted}
                    </h2>
                    <p className="mt-2 text-[14px] leading-6 text-[#5a5f7a]">
                      {copy.deletedMessage}
                    </p>
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[14px] font-bold text-emerald-950">
                      {title}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <Link
                    href={successHref}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#3b6ef8] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[#315fd8]"
                  >
                    {parentHref ? copy.openParent : copy.backToObjects}
                  </Link>
                  {parentHref ? (
                    <Link
                      href={localeHref("/value-objects", locale)}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-2 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
                    >
                      {copy.backToObjects}
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
                <h2
                  id="value-object-delete-title"
                  className="text-[21px] font-bold text-[#111827]"
                >
                  {copy.title}
                </h2>
                <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-4">
                  <div className="break-words text-[15px] font-bold text-red-950">
                    {title}
                  </div>
                  <p className="mt-2 text-[13px] leading-5 text-red-900">
                    {copy.warning}
                  </p>
                </div>

                {error ? (
                  <div
                    role="alert"
                    className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] font-semibold text-red-800"
                  >
                    {error}
                  </div>
                ) : null}

                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setError("");
                      setOpen(false);
                    }}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-2 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    {copy.cancel}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void deleteObject()}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-[13px] font-bold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
                  >
                    {pending ? copy.deleting : copy.confirm}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
