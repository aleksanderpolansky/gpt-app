"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getActivityParameterPresentation,
  getActivityUnitLabel,
} from "@/lib/activity/activity-parameter-presentation";

import {
  ActivityTemplateScopeTabs,
} from "./activity-template-scope-tabs";

import {
  SystemActivityTemplateCreate,
} from "./system-activity-template-create";

type LocaleCode =
  | "en"
  | "pl"
  | "ru"
  | "uk"
  | "de"
  | "es"
  | "cs";

type TemplateListItem = {
  id: string;
  title: string;
  canonicalTitle: string;
  description: string | null;
  defaultDurationMinutes: number | null;
  status: string;
  isActive: boolean;
  visibility: string;
  sourceType: string;
  updatedAt: string;
  activeProfile: {
    id: string;
    versionNo: number;
    routingContractCode: string;
    parameterCount: number;
    objectCount: number;
    updatedAt: string;
  } | null;
};

type ParameterItem = {
  id: string;
  parameterCode: string;
  title: string;
  description: string | null;
  dimensionCode: string;
  canonicalUnitCode: string;
};

type ObservationObject = {
  id: string;
  title: string;
  pathText: string;
  scopeCode: string | null;
  level:
    | "root"
    | "intermediate"
    | "leaf";
};

type DetailPayload = {
  ok?: boolean;
  error?: string;

  template?: {
    id: string;
    title: string;
    canonicalTitle: string;
    description: string | null;
    defaultDurationMinutes: number | null;
    status: string;
    isActive: boolean;
    visibility: string;
    sourceType: string;
    updatedAt: string;
    creationLocale: string | null;
    publicationState: string | null;
    sourceSignalId: string | null;
  };

  profile?: {
    id: string;
    versionNo: number;
    status: string;
    notes: string | null;
    routingContractCode: string;
    createdAt: string;
    updatedAt: string;
  } | null;

  parameters?: ParameterItem[];

  targetValueObjectIds?: string[];
};

type Copy = {
  pageTitle: string;
  pageIntro: string;

  listTitle: string;
  empty: string;
  loading: string;

  readOnlyTitle: string;
  readOnlyBody: string;

  choose: string;

  description: string;
  canonicalName: string;

  profileVersion: string;
  parameters: string;
  objects: string;

  noParameters: string;
  noObjects: string;

  status: string;
  routing: string;

  usualDuration: string;
  minutes: string;

  technical: string;
  templateId: string;
  profileId: string;

  loadError: string;
};

const EN: Copy = {
  pageTitle:
    "Typical activities",

  pageIntro:
    "Browse shared system typical activities and their active parameter profiles.",

  listTitle:
    "System typical activities",

  empty:
    "No system typical activities yet.",

  loading:
    "Loading…",

  readOnlyTitle:
    "System catalog",

  readOnlyBody:
    "Existing system typical activities remain read-only here. Use the creation form below to publish a new system activity through the same canonical curator materialization path.",

  choose:
    "Select a system typical activity.",

  description:
    "Description",

  canonicalName:
    "Canonical English name",

  profileVersion:
    "Profile version",

  parameters:
    "Parameters",

  objects:
    "Observation objects",

  noParameters:
    "No parameters in the active profile.",

  noObjects:
    "No observation objects in the active profile.",

  status:
    "Status",

  routing:
    "Routing contract",

  usualDuration:
    "Typical duration",

  minutes:
    "min",

  technical:
    "Technical details",

  templateId:
    "Template ID",

  profileId:
    "Profile ID",

  loadError:
    "Could not load the system typical activities catalog.",
};

const RU: Copy = {
  pageTitle:
    "Типовые активности",

  pageIntro:
    "Просмотр общего каталога системных типовых активностей и их действующих профилей параметров.",

  listTitle:
    "Системные типовые активности",

  empty:
    "Системных типовых активностей пока нет.",

  loading:
    "Загрузка…",

  readOnlyTitle:
    "Системный каталог",

  readOnlyBody:
    "Существующие системные типовые активности здесь остаются только для просмотра. Новую системную типовую активность можно опубликовать формой ниже через тот же канонический контур Куратора модели.",

  choose:
    "Выберите системную типовую активность.",

  description:
    "Описание",

  canonicalName:
    "Каноническое название на английском",

  profileVersion:
    "Версия профиля",

  parameters:
    "Параметры",

  objects:
    "Объекты наблюдения",

  noParameters:
    "В действующем профиле нет параметров.",

  noObjects:
    "В действующем профиле нет объектов наблюдения.",

  status:
    "Статус",

  routing:
    "Контракт маршрутизации",

  usualDuration:
    "Типовая продолжительность",

  minutes:
    "мин",

  technical:
    "Технические сведения",

  templateId:
    "ID типовой активности",

  profileId:
    "ID профиля",

  loadError:
    "Не удалось загрузить каталог системных типовых активностей.",
};

const COPY:
  Record<LocaleCode, Copy> = {
    en: EN,

    ru: RU,

    uk: {
      ...EN,
      pageTitle:
        "Типові активності",
      pageIntro:
        "Перегляд спільного каталогу системних типових активностей та їх активних профілів.",
      listTitle:
        "Системні типові активності",
      empty:
        "Системних типових активностей ще немає.",
      loading:
        "Завантаження…",
      readOnlyTitle:
        "Системний каталог",
      readOnlyBody:
        "Системні типові активності змінюються через Куратора моделі.",
      choose:
        "Виберіть системну типову активність.",
      description:
        "Опис",
      canonicalName:
        "Канонічна назва англійською",
      profileVersion:
        "Версія профілю",
      parameters:
        "Параметри",
      objects:
        "Об’єкти спостереження",
      noParameters:
        "В активному профілі немає параметрів.",
      noObjects:
        "В активному профілі немає об’єктів спостереження.",
      status:
        "Статус",
      technical:
        "Технічні відомості",
    },

    pl: {
      ...EN,
      pageTitle:
        "Aktywności typowe",
      pageIntro:
        "Przegląd wspólnego katalogu systemowych aktywności typowych i ich aktywnych profili.",
      listTitle:
        "Systemowe aktywności typowe",
      empty:
        "Brak systemowych aktywności typowych.",
      loading:
        "Ładowanie…",
      readOnlyTitle:
        "Katalog systemowy",
      readOnlyBody:
        "Systemowe aktywności typowe są zmieniane przez Kuratora modelu.",
      choose:
        "Wybierz systemową aktywność typową.",
      description:
        "Opis",
      canonicalName:
        "Kanoniczna nazwa angielska",
      profileVersion:
        "Wersja profilu",
      parameters:
        "Parametry",
      objects:
        "Obiekty obserwacji",
      noParameters:
        "Brak parametrów w aktywnym profilu.",
      noObjects:
        "Brak obiektów obserwacji w aktywnym profilu.",
      status:
        "Status",
      technical:
        "Dane techniczne",
    },

    de: {
      ...EN,
      pageTitle:
        "Typische Aktivitäten",
      pageIntro:
        "Gemeinsamen Katalog systemischer typischer Aktivitäten und ihrer aktiven Profile anzeigen.",
      listTitle:
        "Systemische typische Aktivitäten",
      empty:
        "Noch keine systemischen typischen Aktivitäten.",
      loading:
        "Laden…",
      readOnlyTitle:
        "Systemkatalog",
      readOnlyBody:
        "Systemische typische Aktivitäten werden über den Modellkurator gepflegt.",
      choose:
        "Wählen Sie eine systemische typische Aktivität.",
      description:
        "Beschreibung",
      canonicalName:
        "Kanonischer englischer Name",
      profileVersion:
        "Profilversion",
      parameters:
        "Parameter",
      objects:
        "Beobachtungsobjekte",
      noParameters:
        "Keine Parameter im aktiven Profil.",
      noObjects:
        "Keine Beobachtungsobjekte im aktiven Profil.",
      status:
        "Status",
      technical:
        "Technische Angaben",
    },

    es: {
      ...EN,
      pageTitle:
        "Actividades típicas",
      pageIntro:
        "Consulta del catálogo compartido de actividades típicas del sistema y sus perfiles activos.",
      listTitle:
        "Actividades típicas del sistema",
      empty:
        "Todavía no hay actividades típicas del sistema.",
      loading:
        "Cargando…",
      readOnlyTitle:
        "Catálogo del sistema",
      readOnlyBody:
        "Las actividades típicas del sistema se mantienen mediante el Curador del modelo.",
      choose:
        "Seleccione una actividad típica del sistema.",
      description:
        "Descripción",
      canonicalName:
        "Nombre canónico en inglés",
      profileVersion:
        "Versión del perfil",
      parameters:
        "Parámetros",
      objects:
        "Objetos de observación",
      noParameters:
        "No hay parámetros en el perfil activo.",
      noObjects:
        "No hay objetos de observación en el perfil activo.",
      status:
        "Estado",
      technical:
        "Datos técnicos",
    },

    cs: {
      ...EN,
      pageTitle:
        "Typické aktivity",
      pageIntro:
        "Prohlížení společného katalogu systémových typických aktivit a jejich aktivních profilů.",
      listTitle:
        "Systémové typické aktivity",
      empty:
        "Zatím nejsou žádné systémové typické aktivity.",
      loading:
        "Načítání…",
      readOnlyTitle:
        "Systémový katalog",
      readOnlyBody:
        "Systémové typické aktivity se mění prostřednictvím Kurátora modelu.",
      choose:
        "Vyberte systémovou typickou aktivitu.",
      description:
        "Popis",
      canonicalName:
        "Kanonický anglický název",
      profileVersion:
        "Verze profilu",
      parameters:
        "Parametry",
      objects:
        "Objekty pozorování",
      noParameters:
        "Aktivní profil nemá žádné parametry.",
      noObjects:
        "Aktivní profil nemá žádné objekty pozorování.",
      status:
        "Stav",
      technical:
        "Technické údaje",
    },
  };

const CREATE_BUTTON_LABEL:
  Record<
    LocaleCode,
    string
  > = {
    en:
      "+ Add system typical activity",
    ru:
      "+ Добавить системную типовую активность",
    uk:
      "+ Додати системну типову активність",
    pl:
      "+ Dodaj systemową aktywność typową",
    de:
      "+ Systemische typische Aktivität hinzufügen",
    es:
      "+ Añadir actividad típica del sistema",
    cs:
      "+ Přidat systémovou typickou aktivitu",
  };

export function SystemActivityTemplateCatalog({
  locale,
}: {
  locale: LocaleCode;
}) {
  const copy =
    COPY[locale] ??
    COPY.en;

  const [
    templates,
    setTemplates,
  ] =
    useState<
      TemplateListItem[]
    >([]);

  const [
    createOpen,
    setCreateOpen,
  ] =
    useState(
      false,
    );

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<
      string | null
    >(null);

  const [
    detail,
    setDetail,
  ] =
    useState<
      DetailPayload | null
    >(null);

  const [
    objects,
    setObjects,
  ] =
    useState<
      ObservationObject[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    detailLoading,
    setDetailLoading,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const loadTemplates =
    useCallback(
      async () => {
        const params =
          new URLSearchParams({
            locale,
          });

        const response =
          await fetch(
            `/api/activity-template-impact-profiles/system?${params.toString()}`,
            {
              cache:
                "no-store",
            },
          );

        const payload =
          await response.json();

        if (
          !response.ok ||
          payload?.ok !== true
        ) {
          throw new Error(
            payload?.error ||
              "System catalog load failed",
          );
        }

        const next =
          (
            payload.templates ??
            []
          ) as TemplateListItem[];

        setTemplates(
          next,
        );

        setSelectedId(
          (current) => {
            if (
              current &&
              next.some(
                (item) =>
                  item.id === current,
              )
            ) {
              return current;
            }

            return (
              next[0]?.id ??
              null
            );
          },
        );
      },
      [
        locale,
      ],
    );

  const handleCreated =
    useCallback(
      async (
        templateId: string,
      ) => {
        await loadTemplates();

        setCreateOpen(
          false,
        );

        setSelectedId(
          templateId,
        );
      },
      [
        loadTemplates,
      ],
    );

  useEffect(
    () => {
      void (
        async () => {
          try {
            setLoading(
              true,
            );

            setMessage(
              "",
            );

            await loadTemplates();
          } catch (
            error
          ) {
            setMessage(
              error instanceof Error
                ? error.message
                : copy.loadError,
            );
          } finally {
            setLoading(
              false,
            );
          }
        }
      )();
    },
    [
      copy.loadError,
      loadTemplates,
    ],
  );

  useEffect(
    () => {
      if (!selectedId) {
        return;
      }

      const controller =
        new AbortController();

      void (
        async () => {
          try {
            setDetailLoading(
              true,
            );

            setMessage(
              "",
            );

            const params =
              new URLSearchParams({
                locale,
              });

            const response =
              await fetch(
                `/api/activity-template-impact-profiles/system/${encodeURIComponent(selectedId)}?${params.toString()}`,
                {
                  cache:
                    "no-store",

                  signal:
                    controller.signal,
                },
              );

            const payload =
              (
                await response.json()
              ) as DetailPayload;

            if (
              !response.ok ||
              payload?.ok !== true
            ) {
              throw new Error(
                payload?.error ||
                  "System template load failed",
              );
            }

            if (
              controller.signal.aborted
            ) {
              return;
            }

            setDetail(
              payload,
            );

            const ids =
              payload.targetValueObjectIds ??
              [];

            if (
              ids.length === 0
            ) {
              setObjects(
                [],
              );

              return;
            }

            const selectorParams =
              new URLSearchParams({
                level:
                  "leaf",

                includeGlobal:
                  "1",

                limit:
                  "120",

                locale,

                pinnedIds:
                  ids.join(","),
              });

            const selectorResponse =
              await fetch(
                `/api/value-objects/selector?${selectorParams.toString()}`,
                {
                  cache:
                    "no-store",

                  signal:
                    controller.signal,
                },
              );

            const selectorPayload =
              await selectorResponse.json();

            if (
              controller.signal.aborted
            ) {
              return;
            }

            if (
              selectorResponse.ok &&
              selectorPayload?.ok === true
            ) {
              const rows =
                (
                  selectorPayload.pinnedValueObjects ??
                  []
                ) as ObservationObject[];

              const byId =
                new Map(
                  rows.map(
                    (row) => [
                      row.id,
                      row,
                    ],
                  ),
                );

              setObjects(
                ids.map(
                  (id) =>
                    byId.get(id) ?? {
                      id,
                      title:
                        id,
                      pathText:
                        "",
                      scopeCode:
                        "system",
                      level:
                        "leaf" as const,
                    },
                ),
              );
            } else {
              setObjects(
                ids.map(
                  (id) => ({
                    id,
                    title:
                      id,
                    pathText:
                      "",
                    scopeCode:
                      "system",
                    level:
                      "leaf" as const,
                  }),
                ),
              );
            }
          } catch (
            error
          ) {
            if (
              error instanceof DOMException &&
              error.name ===
                "AbortError"
            ) {
              return;
            }

            setMessage(
              error instanceof Error
                ? error.message
                : copy.loadError,
            );
          } finally {
            if (
              !controller.signal.aborted
            ) {
              setDetailLoading(
                false,
              );
            }
          }
        }
      )();

      return () =>
        controller.abort();
    },
    [
      copy.loadError,
      locale,
      selectedId,
    ],
  );

  const parameters =
    useMemo(
      () =>
        (
          detail?.parameters ??
          []
        ).map(
          (parameter) => {
            const presentation =
              getActivityParameterPresentation(
                parameter.parameterCode,
                locale,
                parameter.title,
                parameter.description,
              );

            return {
              ...parameter,

              title:
                presentation.title,

              description:
                presentation.description,
            };
          },
        ),
      [
        detail,
        locale,
      ],
    );

  return (
    <main className="min-h-full bg-[#f5f6fb] p-3 text-[#1a1d2e] sm:p-5">
      <ActivityTemplateScopeTabs
        locale={locale}
        scope="system"
      />

      <div className="mx-auto grid w-full max-w-[1120px] gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-[20px] border border-black/[0.07] bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:self-start">
          <h2 className="text-[15px] font-bold">
            {copy.listTitle}
          </h2>

          <button
            type="button"
            onClick={() =>
              setCreateOpen(
                true,
              )
            }
            className="mt-3 w-full rounded-xl bg-[#3b6ef8] px-3 py-2.5 text-[13px] font-bold text-white"
          >
            {
              CREATE_BUTTON_LABEL[
                locale
              ]
            }
          </button>

          <div className="mt-3 text-[11px] text-slate-400">
            {loading
              ? copy.loading
              : `${templates.length}`}
          </div>

          <div className="mt-3 space-y-2">
            {loading ? (
              <p className="text-xs text-slate-500">
                {copy.loading}
              </p>
            ) : templates.length === 0 ? (
              <p className="text-xs text-slate-500">
                {copy.empty}
              </p>
            ) : (
              templates.map(
                (template) => (
                  <button
                    key={
                      template.id
                    }
                    type="button"
                    onClick={() =>
                      setSelectedId(
                        template.id,
                      )
                    }
                    className={[
                      "w-full rounded-xl border px-3 py-2.5 text-left transition",
                      selectedId ===
                      template.id
                        ? "border-[#3b6ef8]/40 bg-[#eef3ff]"
                        : "border-black/[0.07] bg-white hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <span className="block text-[13px] font-semibold">
                      {
                        template.title
                      }
                    </span>

                    {template.activeProfile ? (
                      <span className="mt-1 block text-[11px] text-slate-500">
                        v
                        {
                          template
                            .activeProfile
                            .versionNo
                        }
                        {" · "}
                        {
                          template
                            .activeProfile
                            .parameterCount
                        }
                        {" · "}
                        {
                          template
                            .activeProfile
                            .objectCount
                        }
                      </span>
                    ) : null}
                  </button>
                ),
              )
            )}
          </div>
        </aside>

        <section>
          <header className="mb-3 px-1">
            <h1 className="text-xl font-bold">
              {copy.pageTitle}
            </h1>

            <p className="mt-1 max-w-3xl text-[13px] leading-5 text-slate-500">
              {copy.pageIntro}
            </p>
          </header>

          <div className="mb-4 rounded-[18px] border border-black/[0.07] bg-white px-4 py-3 shadow-sm">
            <div className="text-[13px] font-bold text-[#1a1d2e]">
              {copy.readOnlyTitle}
            </div>

            <div className="mt-1 text-xs leading-5 text-slate-500">
              {copy.readOnlyBody}
            </div>
          </div>

          <SystemActivityTemplateCreate
            locale={locale}
            onCreated={handleCreated}
            open={createOpen}
            onOpenChange={setCreateOpen}
            hideTrigger
          />

          {message ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {copy.loadError}
              {" "}
              {message}
            </div>
          ) : null}

          {!selectedId ? (
            <div className="rounded-[22px] border border-black/[0.07] bg-white p-5 text-sm text-slate-500 shadow-sm">
              {copy.choose}
            </div>
          ) : detailLoading ? (
            <div className="rounded-[22px] border border-black/[0.07] bg-white p-5 text-sm text-slate-500 shadow-sm">
              {copy.loading}
            </div>
          ) : detail?.template ? (
            <div className="space-y-4">
              <div className="rounded-[22px] border border-black/[0.07] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">
                      {
                        detail.template
                          .title
                      }
                    </h2>

                    {detail.template
                      .canonicalTitle !==
                    detail.template
                      .title ? (
                      <div className="mt-1 text-xs text-slate-500">
                        {
                          copy.canonicalName
                        }
                        :
                        {" "}
                        <span className="font-semibold text-slate-700">
                          {
                            detail
                              .template
                              .canonicalTitle
                          }
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                    {
                      detail.template
                        .status
                    }
                  </span>
                </div>

                {detail.template
                  .description ? (
                  <div className="mt-4">
                    <div className="text-xs font-bold text-slate-500">
                      {
                        copy.description
                      }
                    </div>

                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      {
                        detail
                          .template
                          .description
                      }
                    </p>
                  </div>
                ) : null}

                {detail.template
                  .defaultDurationMinutes !==
                null ? (
                  <div className="mt-4 text-xs text-slate-500">
                    {
                      copy.usualDuration
                    }
                    :
                    {" "}
                    <span className="font-semibold text-slate-700">
                      {
                        detail
                          .template
                          .defaultDurationMinutes
                      }
                      {" "}
                      {
                        copy.minutes
                      }
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[18px] border border-black/[0.07] bg-white p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {
                      copy.profileVersion
                    }
                  </div>

                  <div className="mt-2 text-2xl font-bold">
                    {
                      detail.profile
                        ?.versionNo ??
                      "—"
                    }
                  </div>
                </div>

                <div className="rounded-[18px] border border-black/[0.07] bg-white p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {
                      copy.parameters
                    }
                  </div>

                  <div className="mt-2 text-2xl font-bold">
                    {
                      parameters.length
                    }
                  </div>
                </div>

                <div className="rounded-[18px] border border-black/[0.07] bg-white p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {
                      copy.objects
                    }
                  </div>

                  <div className="mt-2 text-2xl font-bold">
                    {
                      objects.length
                    }
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-black/[0.07] bg-white p-5 shadow-sm">
                <h3 className="text-[15px] font-bold">
                  {copy.parameters}
                </h3>

                <div className="mt-3 space-y-2">
                  {parameters.length ===
                  0 ? (
                    <p className="text-xs text-slate-500">
                      {
                        copy.noParameters
                      }
                    </p>
                  ) : (
                    parameters.map(
                      (
                        parameter,
                      ) => (
                        <div
                          key={
                            parameter.id
                          }
                          className="rounded-xl border border-slate-200 px-3 py-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="text-[13px] font-semibold">
                                {
                                  parameter.title
                                }
                              </div>

                              <div className="mt-1 text-[11px] text-slate-400">
                                {
                                  parameter.parameterCode
                                }
                              </div>
                            </div>

                            <div className="text-[11px] font-medium text-slate-500">
                              {
                                getActivityUnitLabel(
                                  parameter.canonicalUnitCode,
                                  locale,
                                )
                              }
                            </div>
                          </div>

                          {parameter.description ? (
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              {
                                parameter.description
                              }
                            </p>
                          ) : null}
                        </div>
                      ),
                    )
                  )}
                </div>
              </div>

              <div className="rounded-[22px] border border-black/[0.07] bg-white p-5 shadow-sm">
                <h3 className="text-[15px] font-bold">
                  {copy.objects}
                </h3>

                <div className="mt-3 space-y-2">
                  {objects.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      {copy.noObjects}
                    </p>
                  ) : (
                    objects.map(
                      (object) => (
                        <div
                          key={
                            object.id
                          }
                          className="rounded-xl border border-slate-200 px-3 py-3"
                        >
                          <div className="text-[13px] font-semibold">
                            {
                              object.title
                            }
                          </div>

                          {object.pathText ? (
                            <div className="mt-1 text-[11px] leading-4 text-slate-400">
                              {
                                object.pathText
                              }
                            </div>
                          ) : null}
                        </div>
                      ),
                    )
                  )}
                </div>
              </div>

              <details className="rounded-[18px] border border-black/[0.07] bg-white p-4 shadow-sm">
                <summary className="cursor-pointer text-[13px] font-bold">
                  {copy.technical}
                </summary>

                <div className="mt-3 space-y-2 break-all text-[11px] leading-5 text-slate-500">
                  <div>
                    {
                      copy.status
                    }
                    :
                    {" "}
                    {
                      detail.template
                        .status
                    }
                  </div>

                  <div>
                    {
                      copy.routing
                    }
                    :
                    {" "}
                    {
                      detail.profile
                        ?.routingContractCode ??
                      "—"
                    }
                  </div>

                  <div>
                    {
                      copy.templateId
                    }
                    :
                    {" "}
                    {
                      detail.template
                        .id
                    }
                  </div>

                  <div>
                    {
                      copy.profileId
                    }
                    :
                    {" "}
                    {
                      detail.profile
                        ?.id ??
                      "—"
                    }
                  </div>
                </div>
              </details>
            </div>
          ) : (
            <div className="rounded-[22px] border border-black/[0.07] bg-white p-5 text-sm text-slate-500 shadow-sm">
              {copy.choose}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}