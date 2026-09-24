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
    requestedLocale: LocaleCode;
    hasRequestedLocalization: boolean;
    fallbackUsed: boolean;
    fallbackLocale: LocaleCode;
    availableLocales: LocaleCode[];
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
    "System typical activities are managed by platform administrators. Localized name and description can be edited for the selected language without changing the active profile, parameters or routing.",

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
    "Системные типовые активности управляются администраторами платформы. Название и описание выбранной локализации можно редактировать без изменения профиля, параметров и маршрутизации.",

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
        "Системні типові активності керуються адміністраторами платформи. Назву й опис вибраної локалізації можна редагувати без зміни профілю, параметрів і маршрутизації.",
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
        "Systemowymi aktywnościami typowymi zarządzają administratorzy platformy. Nazwę i opis wybranej lokalizacji można edytować bez zmiany profilu, parametrów ani routingu.",
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
        "Systemische typische Aktivitäten werden von Plattformadministratoren verwaltet. Name und Beschreibung der ausgewählten Lokalisierung können ohne Änderung von Profil, Parametern oder Routing bearbeitet werden.",
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
        "Las actividades típicas del sistema las gestionan los administradores de la plataforma. El nombre y la descripción de la localización seleccionada pueden editarse sin cambiar el perfil, los parámetros ni el enrutamiento.",
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
        "Systémové typické aktivity spravují administrátoři platformy. Název a popis vybrané lokalizace lze upravit bez změny profilu, parametrů nebo směrování.",
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


type LocalizationEditorCopy = {
  edit: string;
  add: string;
  title: string;
  intro: string;
  language: string;
  ownLocalization: string;
  fallback: string;
  fallbackBody: string;
  available: string;
  titleField: string;
  descriptionField: string;
  save: string;
  saving: string;
  cancel: string;
  saved: string;
  saveError: string;
  titleRequired: string;
  canonicalHint: string;
};

const LOCALIZATION_EDITOR_COPY: Record<LocaleCode, LocalizationEditorCopy> = {
  en: {
    edit: "Edit localization",
    add: "Add localization",
    title: "Localization",
    intro: "Edit only the text for the selected interface language. The activity profile, parameters, observation objects and routing are not changed.",
    language: "Language",
    ownLocalization: "Confirmed localization",
    fallback: "English fallback",
    fallbackBody: "This language has no confirmed localization yet. The canonical English text is shown temporarily.",
    available: "Available",
    titleField: "Localized name",
    descriptionField: "Localized description",
    save: "Save localization",
    saving: "Saving…",
    cancel: "Cancel",
    saved: "Localization saved.",
    saveError: "Could not save the localization.",
    titleRequired: "The localized name is required.",
    canonicalHint: "English is canonical. Editing another language changes only that localization.",
  },
  ru: {
    edit: "Редактировать локализацию",
    add: "Добавить локализацию",
    title: "Локализация",
    intro: "Редактируется только текст выбранного языка интерфейса. Профиль активности, параметры, объекты наблюдения и маршрутизация не меняются.",
    language: "Язык",
    ownLocalization: "Подтверждённая локализация",
    fallback: "Показывается английская версия",
    fallbackBody: "Для этого языка подтверждённая локализация ещё не заполнена. Временно отображается канонический английский текст.",
    available: "Заполнены",
    titleField: "Название на выбранном языке",
    descriptionField: "Описание на выбранном языке",
    save: "Сохранить локализацию",
    saving: "Сохраняем…",
    cancel: "Отмена",
    saved: "Локализация сохранена.",
    saveError: "Не удалось сохранить локализацию.",
    titleRequired: "Название на выбранном языке обязательно.",
    canonicalHint: "Английский остаётся каноническим. Редактирование другого языка меняет только его локализацию.",
  },
  pl: {
    edit: "Edytuj lokalizację",
    add: "Dodaj lokalizację",
    title: "Lokalizacja",
    intro: "Edytowany jest wyłącznie tekst dla wybranego języka interfejsu. Profil aktywności, parametry, obiekty obserwacji i routing nie są zmieniane.",
    language: "Język",
    ownLocalization: "Potwierdzona lokalizacja",
    fallback: "Wyświetlana jest wersja angielska",
    fallbackBody: "Dla tego języka nie ma jeszcze potwierdzonej lokalizacji. Tymczasowo wyświetlany jest kanoniczny tekst angielski.",
    available: "Dostępne",
    titleField: "Nazwa w wybranym języku",
    descriptionField: "Opis w wybranym języku",
    save: "Zapisz lokalizację",
    saving: "Zapisywanie…",
    cancel: "Anuluj",
    saved: "Lokalizacja została zapisana.",
    saveError: "Nie udało się zapisać lokalizacji.",
    titleRequired: "Nazwa w wybranym języku jest wymagana.",
    canonicalHint: "Angielski pozostaje językiem kanonicznym. Edycja innego języka zmienia tylko jego lokalizację.",
  },
  uk: {
    edit: "Редагувати локалізацію",
    add: "Додати локалізацію",
    title: "Локалізація",
    intro: "Редагується лише текст вибраної мови інтерфейсу. Профіль активності, параметри, об’єкти спостереження та маршрутизація не змінюються.",
    language: "Мова",
    ownLocalization: "Підтверджена локалізація",
    fallback: "Показується англійська версія",
    fallbackBody: "Для цієї мови ще немає підтвердженої локалізації. Тимчасово показується канонічний англійський текст.",
    available: "Заповнені",
    titleField: "Назва вибраною мовою",
    descriptionField: "Опис вибраною мовою",
    save: "Зберегти локалізацію",
    saving: "Зберігаємо…",
    cancel: "Скасувати",
    saved: "Локалізацію збережено.",
    saveError: "Не вдалося зберегти локалізацію.",
    titleRequired: "Назва вибраною мовою є обов’язковою.",
    canonicalHint: "Англійська залишається канонічною. Редагування іншої мови змінює лише її локалізацію.",
  },
  de: {
    edit: "Lokalisierung bearbeiten",
    add: "Lokalisierung hinzufügen",
    title: "Lokalisierung",
    intro: "Bearbeitet wird nur der Text für die ausgewählte Oberflächensprache. Aktivitätsprofil, Parameter, Beobachtungsobjekte und Routing bleiben unverändert.",
    language: "Sprache",
    ownLocalization: "Bestätigte Lokalisierung",
    fallback: "Englische Version wird angezeigt",
    fallbackBody: "Für diese Sprache gibt es noch keine bestätigte Lokalisierung. Vorübergehend wird der kanonische englische Text angezeigt.",
    available: "Verfügbar",
    titleField: "Name in der ausgewählten Sprache",
    descriptionField: "Beschreibung in der ausgewählten Sprache",
    save: "Lokalisierung speichern",
    saving: "Speichern…",
    cancel: "Abbrechen",
    saved: "Lokalisierung gespeichert.",
    saveError: "Lokalisierung konnte nicht gespeichert werden.",
    titleRequired: "Der Name in der ausgewählten Sprache ist erforderlich.",
    canonicalHint: "Englisch bleibt kanonisch. Das Bearbeiten einer anderen Sprache ändert nur deren Lokalisierung.",
  },
  es: {
    edit: "Editar localización",
    add: "Añadir localización",
    title: "Localización",
    intro: "Solo se edita el texto del idioma de interfaz seleccionado. El perfil de actividad, los parámetros, los objetos de observación y el enrutamiento no cambian.",
    language: "Idioma",
    ownLocalization: "Localización confirmada",
    fallback: "Se muestra la versión inglesa",
    fallbackBody: "Este idioma aún no tiene una localización confirmada. Temporalmente se muestra el texto canónico en inglés.",
    available: "Disponibles",
    titleField: "Nombre en el idioma seleccionado",
    descriptionField: "Descripción en el idioma seleccionado",
    save: "Guardar localización",
    saving: "Guardando…",
    cancel: "Cancelar",
    saved: "Localización guardada.",
    saveError: "No se pudo guardar la localización.",
    titleRequired: "El nombre en el idioma seleccionado es obligatorio.",
    canonicalHint: "El inglés sigue siendo canónico. Editar otro idioma cambia solo esa localización.",
  },
  cs: {
    edit: "Upravit lokalizaci",
    add: "Přidat lokalizaci",
    title: "Lokalizace",
    intro: "Upravuje se pouze text pro vybraný jazyk rozhraní. Profil aktivity, parametry, objekty pozorování a směrování se nemění.",
    language: "Jazyk",
    ownLocalization: "Potvrzená lokalizace",
    fallback: "Zobrazuje se anglická verze",
    fallbackBody: "Pro tento jazyk zatím není potvrzená lokalizace. Dočasně se zobrazuje kanonický anglický text.",
    available: "Dostupné",
    titleField: "Název ve vybraném jazyce",
    descriptionField: "Popis ve vybraném jazyce",
    save: "Uložit lokalizaci",
    saving: "Ukládání…",
    cancel: "Zrušit",
    saved: "Lokalizace uložena.",
    saveError: "Lokalizaci se nepodařilo uložit.",
    titleRequired: "Název ve vybraném jazyce je povinný.",
    canonicalHint: "Angličtina zůstává kanonická. Úprava jiného jazyka mění pouze jeho lokalizaci.",
  },
};

export function SystemActivityTemplateCatalog({
  locale,
}: {
  locale: LocaleCode;
}) {
  const copy =
    COPY[locale] ??
    COPY.en;

  const localizationCopy =
    LOCALIZATION_EDITOR_COPY[locale] ??
    LOCALIZATION_EDITOR_COPY.en;

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


  const [
    localizationEditOpen,
    setLocalizationEditOpen,
  ] = useState(false);

  const [
    localizationTitle,
    setLocalizationTitle,
  ] = useState("");

  const [
    localizationDescription,
    setLocalizationDescription,
  ] = useState("");

  const [
    localizationSaving,
    setLocalizationSaving,
  ] = useState(false);

  const [
    localizationMessage,
    setLocalizationMessage,
  ] = useState("");

  const [
    localizationError,
    setLocalizationError,
  ] = useState("");

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

            setLocalizationEditOpen(false);
            setLocalizationMessage("");
            setLocalizationError("");

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


  const beginLocalizationEdit =
    useCallback(
      () => {
        const template =
          detail?.template;

        if (!template) {
          return;
        }

        setLocalizationTitle(
          template.title,
        );
        setLocalizationDescription(
          template.description ?? "",
        );
        setLocalizationMessage("");
        setLocalizationError("");
        setLocalizationEditOpen(true);
      },
      [detail],
    );

  const saveLocalization =
    useCallback(
      async () => {
        const template =
          detail?.template;

        if (!template || !selectedId) {
          return;
        }

        const nextTitle =
          localizationTitle.trim();

        if (!nextTitle) {
          setLocalizationError(
            localizationCopy.titleRequired,
          );
          return;
        }

        try {
          setLocalizationSaving(true);
          setLocalizationError("");
          setLocalizationMessage("");

          const response =
            await fetch(
              `/api/activity-template-impact-profiles/system/${encodeURIComponent(selectedId)}`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  locale,
                  title: nextTitle,
                  description:
                    localizationDescription,
                  expectedUpdatedAt:
                    template.updatedAt,
                }),
              },
            );

          const payload =
            (await response.json()) as DetailPayload;

          if (
            !response.ok ||
            payload?.ok !== true ||
            !payload.template
          ) {
            throw new Error(
              payload?.error ||
                localizationCopy.saveError,
            );
          }

          setDetail((current) =>
            current
              ? {
                  ...current,
                  template:
                    payload.template,
                }
              : current,
          );

          await loadTemplates();

          setLocalizationEditOpen(false);
          setLocalizationMessage(
            localizationCopy.saved,
          );
        } catch (error) {
          setLocalizationError(
            error instanceof Error
              ? error.message
              : localizationCopy.saveError,
          );
        } finally {
          setLocalizationSaving(false);
        }
      },
      [
        detail,
        loadTemplates,
        locale,
        localizationCopy.saveError,
        localizationCopy.saved,
        localizationCopy.titleRequired,
        localizationDescription,
        localizationTitle,
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

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                      {
                        detail.template
                          .status
                      }
                    </span>

                    <button
                      type="button"
                      onClick={
                        beginLocalizationEdit
                      }
                      className="rounded-xl border border-[#3b6ef8]/20 bg-white px-3 py-2 text-[12px] font-semibold text-[#3b6ef8] shadow-sm transition hover:border-[#3b6ef8]/35 hover:bg-[#eef3ff] focus:outline-none focus:ring-2 focus:ring-[#3b6ef8]/20"
                    >
                      {
                        detail.template
                          .hasRequestedLocalization
                          ? localizationCopy.edit
                          : localizationCopy.add
                      }
                    </button>
                  </div>

                </div>

                <div className="mt-4 rounded-[18px] border border-black/[0.07] bg-[#f8f9fd] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                        {localizationCopy.title}
                      </div>

                      <div className="mt-1 text-[12px] font-semibold text-[#1a1d2e]">
                        {localizationCopy.language}
                        {": "}
                        {locale.toUpperCase()}
                      </div>
                    </div>

                    <span
                      className={[
                        "rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                        detail.template.hasRequestedLocalization
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-[#3b6ef8]/20 bg-[#eef3ff] text-[#3b6ef8]",
                      ].join(" ")}
                    >
                      {detail.template.hasRequestedLocalization
                        ? localizationCopy.ownLocalization
                        : localizationCopy.fallback}
                    </span>
                  </div>

                  <p className="mt-2 text-[11px] leading-5 text-slate-500">
                    {localizationCopy.intro}
                  </p>

                  {detail.template.fallbackUsed ? (
                    <div className="mt-3 rounded-xl border border-[#3b6ef8]/15 bg-[#eef3ff] px-3 py-2.5">
                      <div className="text-[11px] font-semibold text-[#315dcc]">
                        {localizationCopy.fallback}
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-[#52617b]">
                        {localizationCopy.fallbackBody}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                    <span className="font-semibold uppercase tracking-wide">
                      {localizationCopy.available}:
                    </span>
                    {detail.template.availableLocales.length > 0 ? (
                      detail.template.availableLocales.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-black/[0.06] bg-white px-2 py-1 font-semibold text-slate-600"
                        >
                          {item.toUpperCase()}
                        </span>
                      ))
                    ) : (
                      <span>—</span>
                    )}
                  </div>

                  {localizationEditOpen ? (
                    <div className="mt-4 rounded-[16px] border border-[#3b6ef8]/20 bg-white p-4 shadow-sm">
                      <div className="grid gap-4">
                        <label className="block">
                          <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">
                            {localizationCopy.titleField}
                          </span>
                          <input
                            value={localizationTitle}
                            onChange={(event) =>
                              setLocalizationTitle(
                                event.target.value,
                              )
                            }
                            maxLength={240}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-[#1a1d2e] shadow-sm outline-none transition placeholder:text-slate-300 focus:border-[#3b6ef8]/55 focus:ring-2 focus:ring-[#3b6ef8]/10"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">
                            {localizationCopy.descriptionField}
                          </span>
                          <textarea
                            value={localizationDescription}
                            onChange={(event) =>
                              setLocalizationDescription(
                                event.target.value,
                              )
                            }
                            maxLength={6000}
                            rows={5}
                            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] leading-5 text-[#1a1d2e] shadow-sm outline-none transition placeholder:text-slate-300 focus:border-[#3b6ef8]/55 focus:ring-2 focus:ring-[#3b6ef8]/10"
                          />
                        </label>
                      </div>

                      <div className="mt-3 text-[10px] leading-4 text-slate-400">
                        {localizationCopy.canonicalHint}
                      </div>

                      {localizationError ? (
                        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">
                          {localizationError}
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setLocalizationEditOpen(false);
                            setLocalizationError("");
                          }}
                          disabled={localizationSaving}
                          className="rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          {localizationCopy.cancel}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void saveLocalization()
                          }
                          disabled={localizationSaving}
                          className="rounded-xl bg-[#3b6ef8] px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#315dcc] focus:outline-none focus:ring-2 focus:ring-[#3b6ef8]/25 disabled:cursor-wait disabled:opacity-60"
                        >
                          {localizationSaving
                            ? localizationCopy.saving
                            : localizationCopy.save}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {localizationMessage ? (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-800">
                      {localizationMessage}
                    </div>
                  ) : null}
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
