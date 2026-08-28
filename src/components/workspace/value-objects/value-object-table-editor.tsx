"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type ValueObjectTableEditPatch = {
  id: string;
  title?: string | null;
  description?: string | null;
};

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

export type EditableValueObject = {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  canonical_key?: string | null;
  ontology_node_role_code?: string | null;
  scope_code?: string | null;
  origin_type_code?: string | null;
  parent_value_object_id?: string | null;
};

export type ValueObjectTableEditStrategy =
  | "ontology"
  | "draft"
  | "readonly_system"
  | "readonly_contract";

export type ValueObjectTableEditableField = "title" | "description";

type Copy = {
  enableMode: string;
  disableMode: string;
  selectRow: string;
  editing: string;
  title: string;
  description: string;
  parent: string;
  save: string;
  saving: string;
  cancel: string;
  saved: string;
  noChanges: string;
  titleRequired: string;
  open: string;
  restructure: string;
  structuralHint: string;
  readOnlySystem: string;
  readOnlyContract: string;
  saveFailed: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    enableMode: "Edit table",
    disableMode: "Exit editing",
    selectRow: "On a phone, tap a Name or Description cell once; on desktop, double-click. The editor expands over the table. Leaving it saves; Esc cancels. Gray cells are read-only.",
    editing: "Editing observation object",
    title: "Name",
    description: "Description",
    parent: "Parent",
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    saved: "Saved.",
    noChanges: "No changes to save.",
    titleRequired: "Name cannot be empty.",
    open: "Open object",
    restructure: "Restructure tree",
    structuralHint: "The structural parent is not edited in the table. Parent changes use the controlled restructure preview/apply flow.",
    readOnlySystem: "Global/system observation objects are read-only in this table.",
    readOnlyContract: "This object is not editable through the safe table contract. Open the object card to use its available authoring flow.",
    saveFailed: "Could not save the change.",
  },
  pl: {
    enableMode: "Edytuj tabelę",
    disableMode: "Zakończ edycję",
    selectRow: "Na telefonie stuknij komórkę Nazwa lub Opis jeden raz; na komputerze kliknij ją dwukrotnie. Edytor rozszerza się nad tabelą. Wyjście zapisuje; Esc anuluje. Szare komórki są tylko do odczytu.",
    editing: "Edycja obiektu obserwacji",
    title: "Nazwa",
    description: "Opis",
    parent: "Nadrzędny",
    save: "Zapisz",
    saving: "Zapisywanie…",
    cancel: "Anuluj",
    saved: "Zapisano.",
    noChanges: "Brak zmian do zapisania.",
    titleRequired: "Nazwa nie może być pusta.",
    open: "Otwórz obiekt",
    restructure: "Przebuduj drzewo",
    structuralHint: "Rodzic strukturalny nie jest edytowany w tabeli. Zmiana rodzica korzysta z kontrolowanego procesu podgląd/zastosowanie przebudowy.",
    readOnlySystem: "Globalne/systemowe obiekty obserwacji są w tej tabeli tylko do odczytu.",
    readOnlyContract: "Tego obiektu nie można edytować przez bezpieczny kontrakt tabeli. Otwórz kartę obiektu i użyj dostępnego procesu edycji.",
    saveFailed: "Nie udało się zapisać zmiany.",
  },
  ru: {
    enableMode: "Редактировать таблицу",
    disableMode: "Завершить редактирование",
    selectRow: "На смартфоне один раз нажмите ячейку «Название» или «Описание»; на компьютере — дважды. Редактор раскрывается поверх таблицы. Выход сохраняет; Esc отменяет. Серые ячейки доступны только для чтения.",
    editing: "Редактирование объекта наблюдения",
    title: "Название",
    description: "Описание",
    parent: "Родитель",
    save: "Сохранить",
    saving: "Сохранение…",
    cancel: "Отмена",
    saved: "Сохранено.",
    noChanges: "Нет изменений для сохранения.",
    titleRequired: "Название не может быть пустым.",
    open: "Открыть объект",
    restructure: "Перестроить дерево",
    structuralHint: "Структурный родитель не редактируется в таблице. Перенос выполняется только через контролируемый preview/apply-процесс перестройки дерева.",
    readOnlySystem: "Глобальные/системные объекты наблюдения в этой таблице доступны только для чтения.",
    readOnlyContract: "Этот объект нельзя редактировать через безопасный табличный контракт. Откройте карточку объекта и используйте доступный процесс редактирования.",
    saveFailed: "Не удалось сохранить изменение.",
  },
  uk: {
    enableMode: "Редагувати таблицю",
    disableMode: "Завершити редагування",
    selectRow: "На смартфоні один раз натисніть клітинку «Назва» або «Опис»; на комп’ютері — двічі. Редактор розгортається поверх таблиці. Вихід зберігає; Esc скасовує. Сірі клітинки доступні лише для читання.",
    editing: "Редагування об’єкта спостереження",
    title: "Назва",
    description: "Опис",
    parent: "Батьківський об’єкт",
    save: "Зберегти",
    saving: "Збереження…",
    cancel: "Скасувати",
    saved: "Збережено.",
    noChanges: "Немає змін для збереження.",
    titleRequired: "Назва не може бути порожньою.",
    open: "Відкрити об’єкт",
    restructure: "Перебудувати дерево",
    structuralHint: "Структурний батьківський об’єкт не редагується в таблиці. Перенесення виконується лише через контрольований preview/apply-процес перебудови дерева.",
    readOnlySystem: "Глобальні/системні об’єкти спостереження в цій таблиці доступні лише для читання.",
    readOnlyContract: "Цей об’єкт не можна редагувати через безпечний табличний контракт. Відкрийте картку об’єкта та використайте доступний процес редагування.",
    saveFailed: "Не вдалося зберегти зміну.",
  },
  de: {
    enableMode: "Tabelle bearbeiten",
    disableMode: "Bearbeitung beenden",
    selectRow: "Auf dem Smartphone tippen Sie einmal auf Name oder Beschreibung; am Computer doppelklicken Sie. Der Editor klappt über der Tabelle auf. Verlassen speichert; Esc bricht ab. Graue Zellen sind schreibgeschützt.",
    editing: "Beobachtungsobjekt bearbeiten",
    title: "Name",
    description: "Beschreibung",
    parent: "Übergeordnet",
    save: "Speichern",
    saving: "Speichern…",
    cancel: "Abbrechen",
    saved: "Gespeichert.",
    noChanges: "Keine Änderungen zu speichern.",
    titleRequired: "Der Name darf nicht leer sein.",
    open: "Objekt öffnen",
    restructure: "Baum umstrukturieren",
    structuralHint: "Das strukturelle Elternobjekt wird nicht in der Tabelle bearbeitet. Änderungen des Elternobjekts verwenden den kontrollierten Vorschau/Anwenden-Ablauf der Umstrukturierung.",
    readOnlySystem: "Globale/System-Beobachtungsobjekte sind in dieser Tabelle schreibgeschützt.",
    readOnlyContract: "Dieses Objekt kann über den sicheren Tabellenvertrag nicht bearbeitet werden. Öffnen Sie die Objektkarte und verwenden Sie den verfügbaren Bearbeitungsablauf.",
    saveFailed: "Die Änderung konnte nicht gespeichert werden.",
  },
  es: {
    enableMode: "Editar tabla",
    disableMode: "Salir de edición",
    selectRow: "En el teléfono, toque una vez una celda Nombre o Descripción; en el ordenador, haga doble clic. El editor se amplía sobre la tabla. Al salir se guarda; Esc cancela. Las celdas grises son de solo lectura.",
    editing: "Edición del objeto de observación",
    title: "Nombre",
    description: "Descripción",
    parent: "Padre",
    save: "Guardar",
    saving: "Guardando…",
    cancel: "Cancelar",
    saved: "Guardado.",
    noChanges: "No hay cambios para guardar.",
    titleRequired: "El nombre no puede estar vacío.",
    open: "Abrir objeto",
    restructure: "Reestructurar árbol",
    structuralHint: "El padre estructural no se edita en la tabla. Los cambios de padre usan el flujo controlado de vista previa/aplicación de la reestructuración.",
    readOnlySystem: "Los objetos de observación globales/del sistema son de solo lectura en esta tabla.",
    readOnlyContract: "Este objeto no se puede editar mediante el contrato seguro de la tabla. Abra la ficha del objeto y use el flujo de edición disponible.",
    saveFailed: "No se pudo guardar el cambio.",
  },
  cs: {
    enableMode: "Upravit tabulku",
    disableMode: "Ukončit úpravy",
    selectRow: "Na telefonu klepněte na buňku Název nebo Popis jednou; na počítači dvakrát. Editor se rozbalí nad tabulkou. Opuštění uloží změnu; Esc ji zruší. Šedé buňky jsou pouze pro čtení.",
    editing: "Úprava objektu pozorování",
    title: "Název",
    description: "Popis",
    parent: "Nadřazený objekt",
    save: "Uložit",
    saving: "Ukládání…",
    cancel: "Zrušit",
    saved: "Uloženo.",
    noChanges: "Nejsou žádné změny k uložení.",
    titleRequired: "Název nesmí být prázdný.",
    open: "Otevřít objekt",
    restructure: "Přestavět strom",
    structuralHint: "Strukturální nadřazený objekt se v tabulce neupravuje. Změna rodiče používá řízený proces náhledu a použití přestavby stromu.",
    readOnlySystem: "Globální/systémové objekty pozorování jsou v této tabulce pouze pro čtení.",
    readOnlyContract: "Tento objekt nelze upravit přes bezpečný tabulkový kontrakt. Otevřete kartu objektu a použijte dostupný postup úprav.",
    saveFailed: "Změnu se nepodařilo uložit.",
  },
};

function normalizeLocale(locale: string): LocaleCode {
  return locale === "pl" || locale === "ru" || locale === "uk" || locale === "de" || locale === "es" || locale === "cs"
    ? locale
    : "en";
}

export function getValueObjectTableEditorCopy(locale: string) {
  return COPY[normalizeLocale(locale)];
}

export function getValueObjectTableEditStrategy(
  valueObject: EditableValueObject,
): ValueObjectTableEditStrategy {
  if (valueObject.scope_code === "global" || valueObject.origin_type_code === "system") {
    return "readonly_system";
  }

  if (valueObject.canonical_key && valueObject.ontology_node_role_code) {
    return "ontology";
  }

  if (valueObject.status === "draft") {
    return "draft";
  }

  return "readonly_contract";
}

function buildLocaleAwareHref(pathname: string, locale: LocaleCode) {
  return locale === "en" ? pathname : `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function makeIdempotencyKey(valueObjectId: string, kind: string) {
  const nonce =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `table-edit-${kind}-${valueObjectId}-${nonce}`.slice(0, 200);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readJsonResponse(response: Response) {
  return (await response.json().catch(() => null)) as Record<string, unknown> | null;
}

function responseError(payload: Record<string, unknown> | null, fallback: string) {
  if (payload && typeof payload.error === "string" && payload.error.trim()) {
    return payload.error.trim();
  }

  if (payload && typeof payload.errorMessage === "string" && payload.errorMessage.trim()) {
    return payload.errorMessage.trim();
  }

  return fallback;
}

async function requestOntologyEdit(args: {
  valueObjectId: string;
  locale: LocaleCode;
  editKind: "rename" | "semantic_definition";
  patch: Record<string, unknown>;
}) {
  const response = await fetch(
    `/api/value-objects/${encodeURIComponent(args.valueObjectId)}/ontology-definition`,
    {
      method: "PATCH",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        editKind: args.editKind,
        patch: args.patch,
        idempotencyKey: makeIdempotencyKey(args.valueObjectId, args.editKind),
        locale: args.locale,
      }),
    },
  );

  const payload = await readJsonResponse(response);

  if (!response.ok || (isRecord(payload) && payload.ok === false)) {
    throw new Error(responseError(payload, `HTTP ${response.status}`));
  }
}

async function requestDraftEdit(args: {
  valueObjectId: string;
  titleChanged: boolean;
  descriptionChanged: boolean;
  title: string;
  description: string | null;
}) {
  const body: Record<string, unknown> = {};

  if (args.titleChanged) {
    body.title = args.title;
  }

  if (args.descriptionChanged) {
    body.description = args.description;
  }

  const response = await fetch(`/api/value-objects/${encodeURIComponent(args.valueObjectId)}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await readJsonResponse(response);

  if (!response.ok || (isRecord(payload) && payload.ok === false)) {
    throw new Error(responseError(payload, `HTTP ${response.status}`));
  }
}

export function canEditValueObjectTableCells(valueObject: EditableValueObject) {
  const strategy = getValueObjectTableEditStrategy(valueObject);
  return strategy === "ontology" || strategy === "draft";
}

export async function saveValueObjectTableField(args: {
  valueObject: EditableValueObject;
  field: ValueObjectTableEditableField;
  value: string;
  locale: string;
}): Promise<ValueObjectTableEditPatch | null> {
  const locale = normalizeLocale(args.locale);
  const copy = COPY[locale];
  const selectedValueObject = args.valueObject;

  if (!selectedValueObject.id) {
    throw new Error(copy.saveFailed);
  }

  const strategy = getValueObjectTableEditStrategy(selectedValueObject);
  if (strategy === "readonly_system") {
    throw new Error(copy.readOnlySystem);
  }
  if (strategy === "readonly_contract") {
    throw new Error(copy.readOnlyContract);
  }

  if (args.field === "title") {
    const nextTitle = args.value.trim();
    const previousTitle = selectedValueObject.title?.trim() ?? "";

    if (!nextTitle) {
      throw new Error(copy.titleRequired);
    }
    if (nextTitle.length > 180) {
      throw new Error(`${copy.title}: max 180`);
    }
    if (nextTitle === previousTitle) {
      return null;
    }

    if (strategy === "ontology") {
      await requestOntologyEdit({
        valueObjectId: selectedValueObject.id,
        locale,
        editKind: "rename",
        patch: { title: nextTitle },
      });
    } else {
      await requestDraftEdit({
        valueObjectId: selectedValueObject.id,
        titleChanged: true,
        descriptionChanged: false,
        title: nextTitle,
        description: selectedValueObject.description?.trim() || null,
      });
    }

    return { id: selectedValueObject.id, title: nextTitle };
  }

  const nextDescriptionText = args.value.trim();
  const previousDescription = selectedValueObject.description?.trim() ?? "";
  if (nextDescriptionText.length > 4000) {
    throw new Error(`${copy.description}: max 4000`);
  }
  if (nextDescriptionText === previousDescription) {
    return null;
  }

  const nextDescription = nextDescriptionText || null;
  if (strategy === "ontology") {
    await requestOntologyEdit({
      valueObjectId: selectedValueObject.id,
      locale,
      editKind: "semantic_definition",
      patch: { description: nextDescription },
    });
  } else {
    await requestDraftEdit({
      valueObjectId: selectedValueObject.id,
      titleChanged: false,
      descriptionChanged: true,
      title: selectedValueObject.title?.trim() ?? "",
      description: nextDescription,
    });
  }

  return { id: selectedValueObject.id, description: nextDescription };
}

export function ValueObjectTableEditor({
  valueObject,
  parentTitle,
  locale: rawLocale,
  onClose,
  onSaved,
}: {
  readonly valueObject: EditableValueObject | null;
  readonly parentTitle: string;
  readonly locale: string;
  readonly onClose: () => void;
  readonly onSaved: (patch: ValueObjectTableEditPatch) => void;
}) {
  const locale = normalizeLocale(rawLocale);
  const copy = COPY[locale];
  const [titleDraft, setTitleDraft] = useState(
    () => valueObject?.title?.trim() ?? "",
  );
  const [descriptionDraft, setDescriptionDraft] = useState(
    () => valueObject?.description ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const strategy = useMemo(
    () => (valueObject ? getValueObjectTableEditStrategy(valueObject) : null),
    [valueObject],
  );

  if (!valueObject?.id) {
    return (
      <div className="rounded-xl border border-dashed border-[#c9d5ff] bg-[#f7f9ff] px-4 py-3 text-[12px] font-semibold text-[#5a6484]">
        {copy.selectRow}
      </div>
    );
  }

  // Capture the narrowed selection in this render. TypeScript intentionally does not
  // preserve prop narrowing inside async closures because props may change later.
  // The parent remounts this editor by selected object id, so this immutable local
  // value is the correct save target for the lifetime of this editor instance.
  const selectedValueObject = valueObject;

  const objectHref = buildLocaleAwareHref(`/value-objects/${selectedValueObject.id}`, locale);
  const restructureHref = buildLocaleAwareHref(
    `/value-objects/${selectedValueObject.id}/restructure`,
    locale,
  );

  const readOnlyMessage =
    strategy === "readonly_system"
      ? copy.readOnlySystem
      : strategy === "readonly_contract"
        ? copy.readOnlyContract
        : null;

  async function saveChanges() {
    if (!selectedValueObject.id || saving || readOnlyMessage) {
      return;
    }

    const nextTitle = titleDraft.trim();
    const previousTitle = selectedValueObject.title?.trim() ?? "";
    const previousDescription = selectedValueObject.description?.trim() ?? "";
    const nextDescriptionText = descriptionDraft.trim();
    const nextDescription = nextDescriptionText || null;
    const titleChanged = nextTitle !== previousTitle;
    const descriptionChanged = nextDescriptionText !== previousDescription;

    setMessage("");
    setError("");

    if (!nextTitle) {
      setError(copy.titleRequired);
      return;
    }

    if (nextTitle.length > 180) {
      setError(`${copy.title}: max 180`);
      return;
    }

    if (nextDescriptionText.length > 4000) {
      setError(`${copy.description}: max 4000`);
      return;
    }

    if (!titleChanged && !descriptionChanged) {
      setMessage(copy.noChanges);
      return;
    }

    setSaving(true);

    try {
      if (strategy === "ontology") {
        if (titleChanged) {
          await requestOntologyEdit({
            valueObjectId: selectedValueObject.id,
            locale,
            editKind: "rename",
            patch: { title: nextTitle },
          });
          onSaved({ id: selectedValueObject.id, title: nextTitle });
        }

        if (descriptionChanged) {
          await requestOntologyEdit({
            valueObjectId: selectedValueObject.id,
            locale,
            editKind: "semantic_definition",
            patch: { description: nextDescription },
          });
          onSaved({ id: selectedValueObject.id, description: nextDescription });
        }
      } else if (strategy === "draft") {
        await requestDraftEdit({
          valueObjectId: selectedValueObject.id,
          titleChanged,
          descriptionChanged,
          title: nextTitle,
          description: nextDescription,
        });

        onSaved({
          id: selectedValueObject.id,
          ...(titleChanged ? { title: nextTitle } : {}),
          ...(descriptionChanged ? { description: nextDescription } : {}),
        });
      }

      setMessage(copy.saved);
    } catch (saveError) {
      setError(
        saveError instanceof Error && saveError.message
          ? `${copy.saveFailed} ${saveError.message}`
          : copy.saveFailed,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-3 rounded-xl border border-[#c9d5ff] bg-[#f8faff] p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6370a0]">
            {copy.editing}
          </div>
          <div className="mt-1 text-[13px] font-bold text-[#111827]">
            {selectedValueObject.title?.trim() || "—"}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={objectHref}
            className="rounded-lg border border-[#dfe3f1] bg-white px-3 py-1.5 text-[11px] font-bold text-[#3b6ef8] hover:bg-[#eef2ff]"
          >
            {copy.open}
          </Link>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-[#dfe3f1] bg-white px-3 py-1.5 text-[11px] font-bold text-[#5a6484] disabled:opacity-50"
          >
            {copy.cancel}
          </button>
        </div>
      </div>

      {readOnlyMessage ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-5 text-amber-800">
          {readOnlyMessage}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,0.8fr)_minmax(340px,1.6fr)]">
          <label className="grid gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#747da0]">
            {copy.title}
            <input
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              disabled={saving}
              maxLength={180}
              className="h-10 rounded-lg border border-[#dfe3f1] bg-white px-3 text-[12px] font-semibold normal-case tracking-normal text-[#111827] outline-none focus:border-[#8aa7ff] disabled:bg-slate-100"
            />
          </label>

          <label className="grid gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#747da0]">
            {copy.description}
            <textarea
              value={descriptionDraft}
              onChange={(event) => setDescriptionDraft(event.target.value)}
              disabled={saving}
              maxLength={4000}
              rows={2}
              className="min-h-10 resize-y rounded-lg border border-[#dfe3f1] bg-white px-3 py-2 text-[12px] font-medium normal-case leading-5 tracking-normal text-[#111827] outline-none focus:border-[#8aa7ff] disabled:bg-slate-100"
            />
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-[#e6eaff] pt-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#747da0]">
          {copy.parent}:
        </span>
        <span className="text-[11px] font-semibold text-[#4a4f6a]">{parentTitle}</span>
        <Link
          href={restructureHref}
          className="rounded-lg px-2 py-1 text-[11px] font-bold text-[#3b6ef8] hover:bg-[#eef2ff]"
        >
          {copy.restructure}
        </Link>
        <span className="min-w-[260px] flex-1 text-[10px] leading-4 text-[#7c8099]">
          {copy.structuralHint}
        </span>
        {!readOnlyMessage ? (
          <button
            type="button"
            onClick={() => void saveChanges()}
            disabled={saving}
            className="ml-auto rounded-lg bg-[#3b6ef8] px-4 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#315fdc] disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? copy.saving : copy.save}
          </button>
        ) : null}
      </div>

      {message ? (
        <div className="text-[11px] font-semibold text-emerald-700">{message}</div>
      ) : null}
      {error ? (
        <div className="text-[11px] font-semibold text-rose-700">{error}</div>
      ) : null}
    </div>
  );
}
