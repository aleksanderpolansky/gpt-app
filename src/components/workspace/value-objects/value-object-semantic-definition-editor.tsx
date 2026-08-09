"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type Copy = {
  version: string;
  renameTitle: string;
  renameHelp: string;
  name: string;
  saveName: string;
  definitionTitle: string;
  definitionHelp: string;
  description: string;
  relation: string;
  visibility: string;
  privacy: string;
  saveDefinition: string;
  saving: string;
  cancel: string;
  noVersionForNoChange: string;
  saveError: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    version: "Definition version",
    renameTitle: "Primary name",
    renameHelp: "Changing the primary name creates a new immutable definition version.",
    name: "Name",
    saveName: "Save primary name",
    definitionTitle: "Semantic definition",
    definitionHelp: "Meaning and policy fields are versioned. Tree position is edited separately.",
    description: "Description",
    relation: "Meaning of relation to parent",
    visibility: "Visibility",
    privacy: "Privacy class",
    saveDefinition: "Save semantic definition",
    saving: "Saving...",
    cancel: "Cancel",
    noVersionForNoChange: "Saving identical values does not create a new version.",
    saveError: "Could not save changes.",
  },
  pl: {
    version: "Wersja definicji",
    renameTitle: "Nazwa główna",
    renameHelp: "Zmiana nazwy głównej tworzy nową, niezmienną wersję definicji.",
    name: "Nazwa",
    saveName: "Zapisz nazwę główną",
    definitionTitle: "Definicja semantyczna",
    definitionHelp: "Znaczenie i reguły są wersjonowane. Pozycję w drzewie zmienia się osobno.",
    description: "Opis",
    relation: "Znaczenie relacji do rodzica",
    visibility: "Widoczność",
    privacy: "Klasa prywatności",
    saveDefinition: "Zapisz definicję semantyczną",
    saving: "Zapisywanie...",
    cancel: "Anuluj",
    noVersionForNoChange: "Zapis identycznych wartości nie tworzy nowej wersji.",
    saveError: "Nie udało się zapisać zmian.",
  },
  ru: {
    version: "Версия определения",
    renameTitle: "Основное название",
    renameHelp: "Изменение основного названия создаёт новую неизменяемую версию определения.",
    name: "Название",
    saveName: "Сохранить основное название",
    definitionTitle: "Смысловое определение",
    definitionHelp: "Смысл и правила версионируются. Положение в дереве изменяется отдельно.",
    description: "Описание",
    relation: "Смысл связи с родителем",
    visibility: "Видимость",
    privacy: "Класс приватности",
    saveDefinition: "Сохранить смысловое определение",
    saving: "Сохраняем...",
    cancel: "Отмена",
    noVersionForNoChange: "Сохранение тех же значений не создаёт новую версию.",
    saveError: "Не удалось сохранить изменения.",
  },
  uk: {
    version: "Версія визначення",
    renameTitle: "Основна назва",
    renameHelp: "Зміна основної назви створює нову незмінну версію визначення.",
    name: "Назва",
    saveName: "Зберегти основну назву",
    definitionTitle: "Смислове визначення",
    definitionHelp: "Зміст і правила версіонуються. Положення в дереві змінюється окремо.",
    description: "Опис",
    relation: "Зміст зв’язку з батьківським об’єктом",
    visibility: "Видимість",
    privacy: "Клас приватності",
    saveDefinition: "Зберегти смислове визначення",
    saving: "Зберігаємо...",
    cancel: "Скасувати",
    noVersionForNoChange: "Збереження тих самих значень не створює нову версію.",
    saveError: "Не вдалося зберегти зміни.",
  },
  de: {
    version: "Definitionsversion",
    renameTitle: "Primärer Name",
    renameHelp: "Eine Änderung des primären Namens erzeugt eine neue unveränderliche Definitionsversion.",
    name: "Name",
    saveName: "Primären Namen speichern",
    definitionTitle: "Semantische Definition",
    definitionHelp: "Bedeutung und Regeln werden versioniert. Die Baumposition wird separat geändert.",
    description: "Beschreibung",
    relation: "Bedeutung der Beziehung zum Elternobjekt",
    visibility: "Sichtbarkeit",
    privacy: "Datenschutzklasse",
    saveDefinition: "Semantische Definition speichern",
    saving: "Speichern...",
    cancel: "Abbrechen",
    noVersionForNoChange: "Identische Werte erzeugen keine neue Version.",
    saveError: "Änderungen konnten nicht gespeichert werden.",
  },
  es: {
    version: "Versión de definición",
    renameTitle: "Nombre principal",
    renameHelp: "Cambiar el nombre principal crea una nueva versión inmutable de la definición.",
    name: "Nombre",
    saveName: "Guardar nombre principal",
    definitionTitle: "Definición semántica",
    definitionHelp: "El significado y las reglas se versionan. La posición del árbol se modifica por separado.",
    description: "Descripción",
    relation: "Significado de la relación con el padre",
    visibility: "Visibilidad",
    privacy: "Clase de privacidad",
    saveDefinition: "Guardar definición semántica",
    saving: "Guardando...",
    cancel: "Cancelar",
    noVersionForNoChange: "Guardar los mismos valores no crea una nueva versión.",
    saveError: "No se pudieron guardar los cambios.",
  },
  cs: {
    version: "Verze definice",
    renameTitle: "Hlavní název",
    renameHelp: "Změna hlavního názvu vytvoří novou neměnnou verzi definice.",
    name: "Název",
    saveName: "Uložit hlavní název",
    definitionTitle: "Sémantická definice",
    definitionHelp: "Význam a pravidla se verzují. Pozice ve stromu se mění samostatně.",
    description: "Popis",
    relation: "Význam vztahu k rodiči",
    visibility: "Viditelnost",
    privacy: "Třída soukromí",
    saveDefinition: "Uložit sémantickou definici",
    saving: "Ukládání...",
    cancel: "Zrušit",
    noVersionForNoChange: "Uložení stejných hodnot nevytvoří novou verzi.",
    saveError: "Změny se nepodařilo uložit.",
  },
};

type Props = {
  readonly valueObjectId: string;
  readonly locale: LocaleCode;
  readonly initialTitle: string;
  readonly initialDescription: string | null;
  readonly initialHierarchyRelationCode: string | null;
  readonly nodeRoleCode: string;
  readonly initialVisibilityCode: string;
  readonly initialPrivacyClassCode: string;
  readonly definitionVersion: number;
  readonly viewHref: string;
};

type PatchResponse = {
  readonly ok?: boolean;
  readonly error?: string;
};

const RELATIONS = [
  { value: "is_a", label: "is_a" },
  { value: "part_of", label: "part_of" },
  { value: "aspect_of", label: "aspect_of" },
  { value: "subprocess_of", label: "subprocess_of" },
];

const VISIBILITY = ["private", "shared", "public"];
const PRIVACY = ["public_ontology", "standard", "sensitive", "restricted"];

function newIdempotencyKey(kind: string) {
  return `p2c-ui-${kind}-${crypto.randomUUID()}`;
}

async function sendEdit(
  valueObjectId: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(
    `/api/value-objects/${encodeURIComponent(valueObjectId)}/ontology-definition`,
    {
      method: "PATCH",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const payload = (await response.json().catch(() => ({}))) as PatchResponse;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? `HTTP ${response.status}`);
  }
}

export function ValueObjectSemanticDefinitionEditor({
  valueObjectId,
  locale,
  initialTitle,
  initialDescription,
  initialHierarchyRelationCode,
  nodeRoleCode,
  initialVisibilityCode,
  initialPrivacyClassCode,
  definitionVersion,
  viewHref,
}: Props) {
  const copy = COPY[locale];
  const router = useRouter();

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [relation, setRelation] = useState(
    initialHierarchyRelationCode ?? "",
  );
  const [visibility, setVisibility] = useState(initialVisibilityCode);
  const [privacy, setPrivacy] = useState(initialPrivacyClassCode);

  const [savingKind, setSavingKind] = useState<"rename" | "definition" | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState("");

  const titleChanged = title.trim() !== initialTitle.trim();

  const definitionChanged = useMemo(
    () =>
      description.trim() !== (initialDescription ?? "").trim() ||
      relation !== (initialHierarchyRelationCode ?? "") ||
      visibility !== initialVisibilityCode ||
      privacy !== initialPrivacyClassCode,
    [
      description,
      initialDescription,
      initialHierarchyRelationCode,
      initialPrivacyClassCode,
      initialVisibilityCode,
      privacy,
      relation,
      visibility,
    ],
  );

  const titleValid = title.trim().length > 0 && title.trim().length <= 180;

  async function saveRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!titleChanged || !titleValid || savingKind) {
      return;
    }

    setSavingKind("rename");
    setErrorMessage("");

    try {
      await sendEdit(valueObjectId, {
        editKind: "rename",
        patch: {
          title: title.trim(),
        },
        idempotencyKey: newIdempotencyKey("rename"),
      });

      router.push(viewHref);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `${copy.saveError} ${error.message}`
          : copy.saveError,
      );
    } finally {
      setSavingKind(null);
    }
  }

  async function saveDefinition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!definitionChanged || savingKind) {
      return;
    }

    setSavingKind("definition");
    setErrorMessage("");

    try {
      const patch: Record<string, unknown> = {
        description: description.trim() || null,
        visibilityCode: visibility,
        privacyClassCode: privacy,
      };

      if (nodeRoleCode !== "root") {
        patch.hierarchyRelationCode = relation;
      }

      await sendEdit(valueObjectId, {
        editKind: "semantic_definition",
        patch,
        idempotencyKey: newIdempotencyKey("definition"),
      });

      router.push(viewHref);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `${copy.saveError} ${error.message}`
          : copy.saveError,
      );
    } finally {
      setSavingKind(null);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-2xl border border-[#dfe3f1] bg-white p-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">
          {copy.version}: {definitionVersion}
        </div>
      </div>

      <form
        onSubmit={saveRename}
        className="grid gap-4 rounded-2xl border border-[#dfe3f1] bg-white p-5"
      >
        <div>
          <h2 className="text-[16px] font-bold text-[#1a1d2e]">
            {copy.renameTitle}
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-[#7c8099]">
            {copy.renameHelp}
          </p>
        </div>

        <label className="grid gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c8099]">
          {copy.name}
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={180}
            className="w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[20px] font-semibold normal-case tracking-[-0.02em] text-[#111827] outline-none transition focus:border-[#8aa6ff] focus:ring-4 focus:ring-[#dfe6ff]"
          />
        </label>

        <button
          type="submit"
          disabled={!titleChanged || !titleValid || savingKind !== null}
          className="w-fit rounded-xl bg-[#3b6ef8] px-4 py-2 text-[12px] font-medium text-white transition hover:bg-[#315bd0] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {savingKind === "rename" ? copy.saving : copy.saveName}
        </button>
      </form>

      <form
        onSubmit={saveDefinition}
        className="grid gap-4 rounded-2xl border border-[#dfe3f1] bg-white p-5"
      >
        <div>
          <h2 className="text-[16px] font-bold text-[#1a1d2e]">
            {copy.definitionTitle}
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-[#7c8099]">
            {copy.definitionHelp}
          </p>
        </div>

        <label className="grid gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c8099]">
          {copy.description}
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={4000}
            rows={5}
            className="w-full resize-y rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-normal normal-case leading-5 tracking-normal text-[#1a1d2e] outline-none transition focus:border-[#8aa6ff] focus:ring-4 focus:ring-[#dfe6ff]"
          />
        </label>

        {nodeRoleCode !== "root" ? (
          <label className="grid gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c8099]">
            {copy.relation}
            <select
              value={relation}
              onChange={(event) => setRelation(event.target.value)}
              className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-medium normal-case tracking-normal text-[#1a1d2e] outline-none"
            >
              {RELATIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c8099]">
            {copy.visibility}
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value)}
              className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-medium normal-case tracking-normal text-[#1a1d2e] outline-none"
            >
              {VISIBILITY.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c8099]">
            {copy.privacy}
            <select
              value={privacy}
              onChange={(event) => setPrivacy(event.target.value)}
              className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-medium normal-case tracking-normal text-[#1a1d2e] outline-none"
            >
              {PRIVACY.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="text-[11px] leading-4 text-[#7c8099]">
          {copy.noVersionForNoChange}
        </p>

        <button
          type="submit"
          disabled={!definitionChanged || savingKind !== null}
          className="w-fit rounded-xl bg-[#3b6ef8] px-4 py-2 text-[12px] font-medium text-white transition hover:bg-[#315bd0] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {savingKind === "definition"
            ? copy.saving
            : copy.saveDefinition}
        </button>
      </form>

      {errorMessage ? (
        <p className="rounded-xl border border-[#fecaca] bg-[#fff7f7] px-4 py-3 text-[12px] leading-5 text-[#b42318]">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => router.push(viewHref)}
        disabled={savingKind !== null}
        className="w-fit rounded-xl border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-medium text-[#4a4f6a] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {copy.cancel}
      </button>
    </div>
  );
}
