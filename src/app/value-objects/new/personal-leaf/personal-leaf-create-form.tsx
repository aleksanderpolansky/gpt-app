"use client";

import Link from "next/link";
import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type CatalogRow = {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  scope_code?: unknown;
  origin_type_code?: unknown;
  ontology_node_role_code?: unknown;
  status?: unknown;
};

type CatalogPayload = {
  ok?: boolean;
  valueObjects?: CatalogRow[];
  error?: string;
};

type ParentOption = {
  id: string;
  title: string;
  description: string | null;
};

type CreateResponse = {
  ok?: boolean;
  error?: string;
  errorCode?: string;
  redirectUrl?: string;
};

type Copy = {
  title: string;
  intro: string;
  back: string;
  profile: string;
  parent: string;
  parentHelp: string;
  parentPlaceholder: string;
  parentNoMatches: string;
  position: string;
  positionValue: string;
  name: string;
  description: string;
  namePlaceholder: string;
  descriptionPlaceholder: string;
  submit: string;
  busy: string;
  loadError: string;
  requiredParent: string;
  created: string;
  returnToProject: string;
};

const EN: Copy = {
  title: "Add personal observation leaf",
  intro:
    "Create a personal leaf under a system intermediate observation object. The selected system parent determines its place in the ontology.",
  back: "Back to project map",
  profile: "Active profile",
  parent: "Parent observation object",
  parentHelp: "Only active system intermediate observation objects are available.",
  parentPlaceholder: "Search system intermediate object",
  parentNoMatches: "No matching system intermediate objects",
  position: "Tree position",
  positionValue: "Personal leaf",
  name: "Name",
  description: "Description",
  namePlaceholder: "For example: My German B2",
  descriptionPlaceholder: "What exactly should be observed?",
  submit: "Create leaf",
  busy: "Creating…",
  loadError: "Could not load system observation objects.",
  requiredParent: "Choose a system intermediate parent.",
  created: "Observation object created.",
  returnToProject: "Return to project map",
};

const COPY: Record<LocaleCode, Copy> = {
  en: EN,
  ru: {
    ...EN,
    title: "Добавить персональный листовой объект наблюдения",
    intro:
      "Создайте персональный листовой объект под системным промежуточным объектом наблюдения. Выбранный системный родитель определяет его место в онтологии.",
    back: "Назад к карте проекта",
    profile: "Активный профиль",
    parent: "Родительский объект наблюдения",
    parentHelp:
      "Можно выбрать только активный системный промежуточный объект наблюдения.",
    parentPlaceholder: "Найти системный промежуточный ОН",
    parentNoMatches: "Подходящие системные промежуточные ОН не найдены",
    position: "Положение в дереве",
    positionValue: "Персональный листовой объект",
    name: "Название",
    description: "Описание",
    namePlaceholder: "Например: Мой немецкий B2",
    descriptionPlaceholder: "Что именно мы наблюдаем?",
    submit: "Создать лист",
    busy: "Создаю…",
    loadError: "Не удалось загрузить системные объекты наблюдения.",
    requiredParent: "Выберите системный промежуточный родительский ОН.",
    created: "Объект наблюдения создан.",
    returnToProject: "Вернуться к карте проекта",
  },
  uk: {
    ...EN,
    title: "Додати персональний листовий об'єкт спостереження",
    intro:
      "Створіть персональний листовий об'єкт під системним проміжним об'єктом спостереження. Обраний системний батьківський об'єкт визначає його місце в онтології.",
    back: "Назад до карти проєкту",
    profile: "Активний профіль",
    parent: "Батьківський об'єкт спостереження",
    parentHelp:
      "Можна вибрати лише активний системний проміжний об'єкт спостереження.",
    parentPlaceholder: "Знайти системний проміжний ОН",
    parentNoMatches: "Відповідні системні проміжні ОН не знайдено",
    position: "Положення в дереві",
    positionValue: "Персональний листовий об'єкт",
    name: "Назва",
    description: "Опис",
    namePlaceholder: "Наприклад: Моя німецька B2",
    descriptionPlaceholder: "Що саме ми спостерігаємо?",
    submit: "Створити лист",
    busy: "Створюю…",
    loadError: "Не вдалося завантажити системні об'єкти спостереження.",
    requiredParent: "Оберіть системний проміжний батьківський ОН.",
    created: "Об'єкт спостереження створено.",
    returnToProject: "Повернутися до карти проєкту",
  },
  pl: {
    ...EN,
    title: "Dodaj osobisty liściowy obiekt obserwacji",
    intro:
      "Utwórz osobisty liść pod systemowym pośrednim obiektem obserwacji. Wybrany rodzic systemowy określa jego miejsce w ontologii.",
    back: "Wróć do mapy projektu",
    profile: "Aktywny profil",
    parent: "Nadrzędny obiekt obserwacji",
    parentHelp:
      "Można wybrać wyłącznie aktywny systemowy obiekt pośredni.",
    parentPlaceholder: "Szukaj systemowego obiektu pośredniego",
    parentNoMatches: "Brak pasujących systemowych obiektów pośrednich",
    position: "Pozycja w drzewie",
    positionValue: "Osobisty liść",
    name: "Nazwa",
    description: "Opis",
    namePlaceholder: "Na przykład: Mój niemiecki B2",
    descriptionPlaceholder: "Co dokładnie obserwujemy?",
    submit: "Utwórz liść",
    busy: "Tworzenie…",
    loadError: "Nie udało się załadować systemowych obiektów obserwacji.",
    requiredParent: "Wybierz systemowy obiekt pośredni.",
    created: "Obiekt obserwacji został utworzony.",
    returnToProject: "Wróć do mapy projektu",
  },
  de: {
    ...EN,
    title: "Persönliches Beobachtungsblatt hinzufügen",
    back: "Zur Projektkarte",
    parent: "Übergeordnetes Beobachtungsobjekt",
    parentPlaceholder: "System-Zwischenobjekt suchen",
    positionValue: "Persönliches Blatt",
    name: "Name",
    description: "Beschreibung",
    submit: "Blatt erstellen",
    busy: "Wird erstellt…",
    returnToProject: "Zur Projektkarte",
  },
  es: {
    ...EN,
    title: "Añadir hoja de observación personal",
    back: "Volver al mapa del proyecto",
    parent: "Objeto de observación padre",
    parentPlaceholder: "Buscar objeto intermedio del sistema",
    positionValue: "Hoja personal",
    name: "Nombre",
    description: "Descripción",
    submit: "Crear hoja",
    busy: "Creando…",
    returnToProject: "Volver al mapa del proyecto",
  },
  cs: {
    ...EN,
    title: "Přidat osobní listový objekt pozorování",
    back: "Zpět na mapu projektu",
    parent: "Nadřazený objekt pozorování",
    parentPlaceholder: "Hledat systémový mezilehlý objekt",
    positionValue: "Osobní list",
    name: "Název",
    description: "Popis",
    submit: "Vytvořit list",
    busy: "Vytváření…",
    returnToProject: "Zpět na mapu projektu",
  },
};

function localeHref(pathname: string, locale: LocaleCode) {
  if (locale === "en") return pathname;
  return `${pathname}${pathname.includes("?") ? "&" : "?"}locale=${encodeURIComponent(locale)}`;
}

function textValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalized(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
}

function isSystemIntermediate(row: CatalogRow) {
  return (
    textValue(row.id) !== null &&
    textValue(row.scope_code) === "global" &&
    textValue(row.origin_type_code) === "system_model" &&
    textValue(row.ontology_node_role_code) === "intermediate" &&
    textValue(row.status) === "active"
  );
}

export function PersonalLeafCreateForm({
  locale,
  activeProfileName,
}: {
  locale: LocaleCode;
  activeProfileName: string;
}) {
  const copy = COPY[locale];

  const [parents, setParents] = useState<ParentOption[]>([]);
  const [parentQuery, setParentQuery] = useState("");
  const [parentId, setParentId] = useState("");
  const [parentOpen, setParentOpen] = useState(false);
  const [loadingParents, setLoadingParents] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  const selectedParent = useMemo(
    () => parents.find((option) => option.id === parentId) ?? null,
    [parents, parentId],
  );

  const filteredParents = useMemo(() => {
    const query = normalized(parentQuery);

    if (!query) return parents.slice(0, 60);

    return parents
      .filter((option) =>
        normalized(`${option.title} ${option.description ?? ""}`).includes(query),
      )
      .slice(0, 60);
  }, [parentQuery, parents]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoadingParents(true);
        setError("");

        try {
          const response = await fetch(
            `/api/value-objects?locale=${encodeURIComponent(locale)}`,
            { cache: "no-store" },
          );
          const payload = (await response.json().catch(() => null)) as
            | CatalogPayload
            | null;

          if (!response.ok || payload?.ok !== true) {
            throw new Error(payload?.error || copy.loadError);
          }

          const nextParents = (payload.valueObjects ?? [])
            .filter(isSystemIntermediate)
            .map((row): ParentOption => ({
              id: textValue(row.id) as string,
              title: textValue(row.title) ?? (textValue(row.id) as string),
              description: textValue(row.description),
            }))
            .sort((left, right) =>
              left.title.localeCompare(right.title, locale),
            );

          setParents(nextParents);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : copy.loadError);
        } finally {
          setLoadingParents(false);
        }
      })();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [copy.loadError, locale]);

  function chooseParent(option: ParentOption) {
    setParentId(option.id);
    setParentQuery(option.title);
    setParentOpen(false);
  }

  async function submit() {
    if (busy || createdUrl) return;

    const normalizedTitle = title.trim();

    if (!parentId) {
      setError(copy.requiredParent);
      return;
    }

    if (!normalizedTitle) {
      setError(copy.name);
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/value-objects", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creationMode: "leaf_system_parent_active_v1",
          parentValueObjectId: parentId,
          title: normalizedTitle,
          description: description.trim() || undefined,
          locale,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | CreateResponse
        | null;

      if (!response.ok || payload?.ok !== true || !payload.redirectUrl) {
        throw new Error(
          payload?.error ||
            payload?.errorCode ||
            `Leaf creation failed: ${response.status}`,
        );
      }

      setCreatedUrl(payload.redirectUrl);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Leaf creation failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  const projectHref = localeHref("/projects", locale);

  return (
    <main className="min-h-full bg-[#f5f6fb] p-5 text-[#1a1d2e]">
      <div className="mx-auto grid w-full max-w-[920px] gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={projectHref}
            className="rounded-full border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a]"
          >
            {copy.back}
          </Link>
          <span className="text-[12px] font-semibold text-[#7c8099]">
            {copy.profile}: {activeProfileName}
          </span>
        </div>

        <section className="rounded-[26px] border border-black/[0.07] bg-white p-6 shadow-sm">
          <h1 className="text-[26px] font-bold text-[#111827]">{copy.title}</h1>
          <p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#5a5f7a]">
            {copy.intro}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="relative rounded-2xl border border-[#e8eaf2] bg-[#fafbff] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">
                {copy.parent}
              </div>

              <div className="relative mt-2">
                <div
                  className={`flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 ${
                    parentOpen ? "border-[#6f8fff]" : "border-[#dfe3f1]"
                  }`}
                >
                  <Search size={15} className="shrink-0 text-[#8b94ab]" />
                  <input
                    disabled={busy || Boolean(createdUrl) || loadingParents}
                    value={
                      selectedParent && !parentOpen
                        ? selectedParent.title
                        : parentQuery
                    }
                    onFocus={() => setParentOpen(true)}
                    onChange={(event) => {
                      setParentQuery(event.target.value);
                      setParentId("");
                      setParentOpen(true);
                    }}
                    placeholder={copy.parentPlaceholder}
                    className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-[#30384e] outline-none placeholder:text-[#aab2c5]"
                  />
                  <button
                    type="button"
                    disabled={busy || Boolean(createdUrl) || loadingParents}
                    onClick={() => setParentOpen((value) => !value)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[#818ba3]"
                    aria-label={copy.parent}
                  >
                    <ChevronDown
                      size={15}
                      className={parentOpen ? "rotate-180" : ""}
                    />
                  </button>
                </div>

                {parentOpen && !createdUrl ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-[300px] overflow-y-auto rounded-xl border border-[#dfe3f1] bg-white p-1.5 shadow-xl">
                    {filteredParents.length > 0 ? (
                      filteredParents.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            chooseParent(option);
                          }}
                          className="flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-[#f2f5ff]"
                        >
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#6f8fff]" />
                          <span className="min-w-0">
                            <span className="block text-[12px] font-bold text-[#30384e]">
                              {option.title}
                            </span>
                            {option.description ? (
                              <span className="mt-0.5 line-clamp-2 block text-[10px] leading-4 text-[#8a92a6]">
                                {option.description}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-[11px] text-[#8a92a6]">
                        {copy.parentNoMatches}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="mt-2 text-[10px] leading-4 text-[#7c8099]">
                {copy.parentHelp}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e8eaf2] bg-[#fafbff] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">
                {copy.position}
              </div>
              <div className="mt-1 text-[13px] font-bold text-[#111827]">
                {copy.positionValue}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="text-[13px] font-bold text-[#343854]">
              {copy.name}
              <input
                disabled={busy || Boolean(createdUrl)}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={180}
                placeholder={copy.namePlaceholder}
                className="mt-2 w-full rounded-xl border border-[#dfe3f1] px-4 py-3 text-[14px] outline-none focus:border-[#3b6ef8]"
              />
            </label>

            <label className="text-[13px] font-bold text-[#343854]">
              {copy.description}
              <textarea
                disabled={busy || Boolean(createdUrl)}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={4000}
                rows={4}
                placeholder={copy.descriptionPlaceholder}
                className="mt-2 w-full resize-y rounded-xl border border-[#dfe3f1] px-4 py-3 text-[14px] outline-none focus:border-[#3b6ef8]"
              />
            </label>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] font-semibold text-red-800">
              {error}
            </div>
          ) : null}

          {createdUrl ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-[13px] font-bold text-emerald-800">
                <Check size={16} />
                {copy.created}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={createdUrl}
                  className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-[12px] font-bold text-emerald-800"
                >
                  {title.trim()}
                </Link>
                <Link
                  href={projectHref}
                  className="rounded-xl bg-[#3b6ef8] px-3 py-2 text-[12px] font-bold text-white"
                >
                  {copy.returnToProject}
                </Link>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            disabled={busy || Boolean(createdUrl)}
            onClick={() => void submit()}
            className="mt-6 w-full rounded-xl bg-[#3b6ef8] px-4 py-3 text-[14px] font-bold text-white disabled:opacity-50"
          >
            {busy ? copy.busy : copy.submit}
          </button>
        </section>
      </div>
    </main>
  );
}
