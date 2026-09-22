"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getActivityUnitLabel,
} from "@/lib/activity/activity-parameter-presentation";

type LocaleCode =
  | "en"
  | "pl"
  | "ru"
  | "uk"
  | "de"
  | "es"
  | "cs";

type ParameterItem = {
  id: string;
  scopeCode?: string;
  parameterCode: string;
  title: string;
  description: string | null;
  dimensionCode: string;
  valueTypeCode: string;
  canonicalUnitCode: string;
};

type ValueObjectItem = {
  id: string;
  canonicalKey: string | null;
  title: string;
  titleEn: string;
  description: string | null;
};

type Props = {
  locale: LocaleCode;
  onCreated:
    (
      templateId: string,
    ) => void |
      Promise<void>;

  open?: boolean;
  onOpenChange?: (
    open: boolean,
  ) => void;
  hideTrigger?: boolean;
};

type Copy = {
  open: string;
  title: string;
  intro: string;
  localizedTitle: string;
  localizedTitlePlaceholder: string;
  englishTitle: string;
  englishTitlePlaceholder: string;
  localizedDescription: string;
  englishDescription: string;
  parameters: string;
  parameterHelp: string;
  parameterSearch: string;
  noParameters: string;
  chooseExisting: string;
  createNew: string;
  createAndAdd: string;
  newParameterTitle: string;
  newParameterDescription: string;
  technicalCode: string;
  dimension: string;
  valueType: string;
  canonicalUnit: string;
  aggregation: string;
  defaultWindow: string;
  allowNegative: string;
  mappings: string;
  mappingsHelp: string;
  objectSearch: string;
  noObjects: string;
  selected: string;
  publish: string;
  publishing: string;
  cancel: string;
  created: string;
  loading: string;
  loadError: string;
};

const EN: Copy = {
  open:
    "+ Add system typical activity",
  title:
    "New system typical activity",
  intro:
    "Create a system activity directly, without creating a raw user activity. The same canonical curator materialization publishes the ownerless system template and parameter_registry_v2 profile.",
  localizedTitle:
    "Name in the current language",
  localizedTitlePlaceholder:
    "For example: Protein supplement intake",
  englishTitle:
    "Canonical name in English",
  englishTitlePlaceholder:
    "Protein supplement intake",
  localizedDescription:
    "Description in the current language",
  englishDescription:
    "Canonical description in English",
  parameters:
    "Parameters",
  parameterHelp:
    "Choose the measurements that can be recorded for one execution of this activity.",
  parameterSearch:
    "Search parameter…",
  noParameters:
    "No matching active system parameters.",
  chooseExisting:
    "Choose existing",
  createNew:
    "Create new",
  createAndAdd:
    "Create system parameter and add it",
  newParameterTitle:
    "Name",
  newParameterDescription:
    "Description",
  technicalCode:
    "Technical code",
  dimension:
    "Dimension",
  valueType:
    "Value type",
  canonicalUnit:
    "Canonical unit",
  aggregation:
    "Aggregation",
  defaultWindow:
    "Default window",
  allowNegative:
    "Allow negative values",
  mappings:
    "Observation objects for the parameter",
  mappingsHelp:
    "Choose one or more active System leaf observation objects measured by this parameter. Missing System assignments are created during publication.",
  objectSearch:
    "Search observation object…",
  noObjects:
    "No active System leaf observation objects found.",
  selected:
    "Selected",
  publish:
    "Publish system typical activity",
  publishing:
    "Publishing…",
  cancel:
    "Cancel",
  created:
    "System typical activity published.",
  loading:
    "Loading…",
  loadError:
    "Could not load or publish the system typical activity.",
};

const RU: Copy = {
  ...EN,
  open:
    "+ Добавить системную типовую активность",
  title:
    "Новая системная типовая активность",
  intro:
    "Создайте системную типовую активность напрямую, без сырой пользовательской активности. Публикация использует тот же канонический контур Куратора модели и создаёт системную активность без владельца вместе с профилем parameter_registry_v2.",
  localizedTitle:
    "Название на текущем языке",
  localizedTitlePlaceholder:
    "Например: Употребление протеиновой добавки",
  englishTitle:
    "Каноническое название на английском",
  englishTitlePlaceholder:
    "Protein supplement intake",
  localizedDescription:
    "Описание на текущем языке",
  englishDescription:
    "Каноническое описание на английском",
  parameters:
    "Параметры",
  parameterHelp:
    "Выберите показатели, значения которых могут фиксироваться при конкретном выполнении этой активности.",
  parameterSearch:
    "Поиск параметра…",
  noParameters:
    "Подходящих активных системных параметров нет.",
  chooseExisting:
    "Выбрать существующий",
  createNew:
    "Создать новый",
  createAndAdd:
    "Создать системный параметр и добавить",
  newParameterTitle:
    "Название",
  newParameterDescription:
    "Описание",
  technicalCode:
    "Технический код",
  dimension:
    "Измерение",
  valueType:
    "Тип значения",
  canonicalUnit:
    "Каноническая единица",
  aggregation:
    "Агрегация",
  defaultWindow:
    "Окно по умолчанию",
  allowNegative:
    "Разрешить отрицательные значения",
  mappings:
    "Объекты наблюдения для параметра",
  mappingsHelp:
    "Выберите один или несколько системных листовых ОН, значение которых измеряет этот параметр. Если назначения ещё нет, оно будет создано при публикации.",
  objectSearch:
    "Поиск объекта наблюдения…",
  noObjects:
    "Системные листовые ОН не найдены.",
  selected:
    "Выбрано",
  publish:
    "Опубликовать системную типовую активность",
  publishing:
    "Публикуем…",
  cancel:
    "Отмена",
  created:
    "Системная типовая активность опубликована.",
  loading:
    "Загрузка…",
  loadError:
    "Не удалось загрузить или опубликовать системную типовую активность.",
};

const COPY:
  Record<
    LocaleCode,
    Copy
  > = {
    en:
      EN,
    ru:
      RU,
    pl: {
      ...EN,
      open:
        "+ Dodaj systemową aktywność typową",
      title:
        "Nowa systemowa aktywność typowa",
      publish:
        "Opublikuj systemową aktywność typową",
      publishing:
        "Publikowanie…",
      cancel:
        "Anuluj",
    },
    uk: {
      ...EN,
      open:
        "+ Додати системну типову активність",
      title:
        "Нова системна типова активність",
      publish:
        "Опублікувати системну типову активність",
      publishing:
        "Публікуємо…",
      cancel:
        "Скасувати",
    },
    de: {
      ...EN,
      open:
        "+ Systemische typische Aktivität hinzufügen",
      title:
        "Neue systemische typische Aktivität",
      publish:
        "Systemische typische Aktivität veröffentlichen",
      publishing:
        "Veröffentlichen…",
      cancel:
        "Abbrechen",
    },
    es: {
      ...EN,
      open:
        "+ Añadir actividad típica del sistema",
      title:
        "Nueva actividad típica del sistema",
      publish:
        "Publicar actividad típica del sistema",
      publishing:
        "Publicando…",
      cancel:
        "Cancelar",
    },
    cs: {
      ...EN,
      open:
        "+ Přidat systémovou typickou aktivitu",
      title:
        "Nová systémová typická aktivita",
      publish:
        "Publikovat systémovou typickou aktivitu",
      publishing:
        "Publikování…",
      cancel:
        "Zrušit",
    },
  };

const DIMENSIONS = [
  "time",
  "distance",
  "count",
  "volume",
  "mass",
  "force",
  "energy",
  "money",
  "rate",
  "score",
  "temperature",
  "text",
  "boolean",
  "timestamp",
  "pressure",
  "ratio",
  "sound_level",
  "illuminance",
] as const;

const VALUE_TYPES = [
  "numeric",
  "text",
  "boolean",
  "timestamp",
] as const;

const AGGREGATIONS = [
  "sum",
  "average",
  "minimum",
  "maximum",
  "latest",
  "count",
  "duration",
  "rate",
  "none",
] as const;

const WINDOWS = [
  "event",
  "hour",
  "day",
  "week",
  "month",
  "rolling_7_days",
  "rolling_30_days",
] as const;

const TECHNICAL_CODE_RE =
  /^[a-z][a-z0-9_]{1,79}$/;

function newRequestId() {
  return crypto.randomUUID();
}

export function
SystemActivityTemplateCreate({
  locale,
  onCreated,
  open:
    controlledOpen,
  onOpenChange,
  hideTrigger =
    false,
}: Props) {
  const copy =
    COPY[locale] ??
    EN;

  const [
    internalOpen,
    setInternalOpen,
  ] =
    useState(
      false,
    );

  const open =
    controlledOpen ??
    internalOpen;

  function setOpen(
    nextOpen: boolean,
  ) {
    if (
      controlledOpen ===
      undefined
    ) {
      setInternalOpen(
        nextOpen,
      );
    }

    onOpenChange?.(
      nextOpen,
    );
  }

  const [
    busy,
    setBusy,
  ] =
    useState(
      false,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      false,
    );

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    requestId,
    setRequestId,
  ] =
    useState(
      newRequestId,
    );

  const [
    title,
    setTitle,
  ] =
    useState("");

  const [
    titleEn,
    setTitleEn,
  ] =
    useState("");

  const [
    description,
    setDescription,
  ] =
    useState("");

  const [
    descriptionEn,
    setDescriptionEn,
  ] =
    useState("");

  const [
    parameters,
    setParameters,
  ] =
    useState<
      ParameterItem[]
    >([]);

  const [
    selectedParameterIds,
    setSelectedParameterIds,
  ] =
    useState<
      string[]
    >([]);

  const [
    parameterSearch,
    setParameterSearch,
  ] =
    useState("");

  const [
    parameterMode,
    setParameterMode,
  ] =
    useState<
      "existing" |
      "new"
    >(
      "existing",
    );

  const [
    newParameterTitle,
    setNewParameterTitle,
  ] =
    useState("");

  const [
    newParameterDescription,
    setNewParameterDescription,
  ] =
    useState("");

  const [
    newParameterCode,
    setNewParameterCode,
  ] =
    useState("");

  const [
    newDimension,
    setNewDimension,
  ] =
    useState(
      "mass",
    );

  const [
    newValueType,
    setNewValueType,
  ] =
    useState(
      "numeric",
    );

  const [
    newUnit,
    setNewUnit,
  ] =
    useState(
      "kilogram",
    );

  const [
    newAggregation,
    setNewAggregation,
  ] =
    useState(
      "sum",
    );

  const [
    newWindow,
    setNewWindow,
  ] =
    useState(
      "event",
    );

  const [
    newAllowNegative,
    setNewAllowNegative,
  ] =
    useState(
      false,
    );

  const [
    valueObjectsByParameter,
    setValueObjectsByParameter,
  ] =
    useState<
      Record<
        string,
        ValueObjectItem[]
      >
    >({});

  const [
    objectSearchByParameter,
    setObjectSearchByParameter,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    selectedObjectIdsByParameter,
    setSelectedObjectIdsByParameter,
  ] =
    useState<
      Record<
        string,
        string[]
      >
    >({});

  const selectedParameters =
    useMemo(
      () => {
        const byId =
          new Map(
            parameters.map(
              (item) => [
                item.id,
                item,
              ],
            ),
          );

        return selectedParameterIds
          .flatMap(
            (id) => {
              const row =
                byId.get(
                  id,
                );

              return row
                ? [
                    row,
                  ]
                : [];
            },
          );
      },
      [
        parameters,
        selectedParameterIds,
      ],
    );

  const filteredParameters =
    useMemo(
      () => {
        const query =
          parameterSearch
            .trim()
            .toLocaleLowerCase();

        const selected =
          new Set(
            selectedParameterIds,
          );

        return parameters
          .filter(
            (item) => {
              if (
                selected.has(
                  item.id,
                )
              ) {
                return false;
              }

              if (!query) {
                return true;
              }

              return [
                item.title,
                item.parameterCode,
                item.description ??
                  "",
                item.dimensionCode,
                item.canonicalUnitCode,
              ]
                .join(
                  " ",
                )
                .toLocaleLowerCase()
                .includes(
                  query,
                );
            },
          )
          .slice(
            0,
            40,
          );
      },
      [
        parameterSearch,
        parameters,
        selectedParameterIds,
      ],
    );

  const loadParameters =
    useCallback(
      async () => {
        setLoading(
          true,
        );

        setMessage("");

        try {
          const response =
            await fetch(
              "/api/activity-template-impact-profiles/catalog",
              {
                cache:
                  "no-store",
              },
            );

          const payload =
            await response
              .json();

          if (
            !response.ok ||
            payload?.ok !== true
          ) {
            throw new Error(
              payload?.error ||
                copy.loadError,
            );
          }

          const systemParameters =
            (
              payload.parameters ??
              []
            )
              .filter(
                (
                  item:
                    ParameterItem,
                ) =>
                  item.scopeCode ===
                    "system" &&
                  item.parameterCode !==
                    "process_count",
              );

          setParameters(
            systemParameters,
          );
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
      },
      [
        copy.loadError,
      ],
    );

  function openForm() {
    setOpen(
      true,
    );
  }

  useEffect(
    () => {
      if (!open) {
        return;
      }

      const initialLoadTimer =
        window.setTimeout(
          () => {
            void loadParameters();
          },
          0,
        );

      const reload = () => {
        void loadParameters();
      };

      window.addEventListener(
        "arctor:activity-parameter-catalog-changed",
        reload,
      );

      return () => {
        window.clearTimeout(
          initialLoadTimer,
        );

        window.removeEventListener(
          "arctor:activity-parameter-catalog-changed",
          reload,
        );
      };
    },
    [
      loadParameters,
      open,
    ],
  );

  async function
  createAndAddParameter() {
    const normalizedCode =
      newParameterCode
        .trim()
        .toLowerCase();

    if (
      !newParameterTitle
        .trim() ||
      !TECHNICAL_CODE_RE.test(
        normalizedCode,
      ) ||
      !newUnit.trim()
    ) {
      setMessage(
        copy.loadError,
      );
      return;
    }

    setBusy(
      true,
    );
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/activity-parameter-definitions",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                title:
                  newParameterTitle
                    .trim(),
                description:
                  newParameterDescription
                    .trim(),
                parameterCode:
                  normalizedCode,
                dimensionCode:
                  newDimension,
                valueTypeCode:
                  newValueType,
                canonicalUnitCode:
                  newUnit
                    .trim()
                    .toLowerCase(),
                allowedUnitCodes: [
                  newUnit
                    .trim()
                    .toLowerCase(),
                ],
                aggregationMethodCode:
                  newAggregation,
                defaultWindowCode:
                  newWindow,
                allowNegative:
                  newAllowNegative,
              }),
          },
        );

      const payload =
        await response
          .json();

      if (
        !response.ok ||
        payload?.ok !== true ||
        !payload
          ?.definition
          ?.id
      ) {
        throw new Error(
          payload?.error ||
            copy.loadError,
        );
      }

      const created =
        payload.definition as
          ParameterItem;

      const normalizedCreated:
        ParameterItem = {
          ...created,
          scopeCode:
            "system",
        };

      setParameters(
        (
          current,
        ) => [
          normalizedCreated,
          ...current.filter(
            (
              item,
            ) =>
              item.id !==
              normalizedCreated.id,
          ),
        ],
      );

      await addParameter(
        normalizedCreated,
      );

      setParameterMode(
        "existing",
      );
      setNewParameterTitle(
        "",
      );
      setNewParameterDescription(
        "",
      );
      setNewParameterCode(
        "",
      );
      setNewDimension(
        "mass",
      );
      setNewValueType(
        "numeric",
      );
      setNewUnit(
        "kilogram",
      );
      setNewAggregation(
        "sum",
      );
      setNewWindow(
        "event",
      );
      setNewAllowNegative(
        false,
      );

      window.dispatchEvent(
        new Event(
          "arctor:activity-parameter-catalog-changed",
        ),
      );
    } catch (
      error
    ) {
      setMessage(
        error instanceof Error
          ? error.message
          : copy.loadError,
      );
    } finally {
      setBusy(
        false,
      );
    }
  }


  async function
  loadTargets(
    parameterDefinitionId:
      string,
  ) {
    if (
      valueObjectsByParameter[
        parameterDefinitionId
      ]
    ) {
      return;
    }

    const params =
      new URLSearchParams({
        locale,
        parameterDefinitionId,
      });

    const response =
      await fetch(
        `/api/admin/activity-templates/system/create?${params.toString()}`,
        {
          cache:
            "no-store",
        },
      );

    const payload =
      await response
        .json();

    if (
      !response.ok ||
      payload?.ok !== true
    ) {
      throw new Error(
        payload?.error ||
          copy.loadError,
      );
    }

    setValueObjectsByParameter(
      (
        current,
      ) => ({
        ...current,
        [parameterDefinitionId]:
          (
            payload
              .valueObjects ??
            []
          ) as
            ValueObjectItem[],
      }),
    );
  }

  async function addParameter(
    parameter:
      ParameterItem,
  ) {
    if (
      selectedParameterIds
        .includes(
          parameter.id,
        )
    ) {
      return;
    }

    setSelectedParameterIds(
      (
        current,
      ) => [
        ...current,
        parameter.id,
      ],
    );

    setParameterSearch(
      "",
    );

    try {
      await loadTargets(
        parameter.id,
      );
    } catch (
      error
    ) {
      setMessage(
        error instanceof Error
          ? error.message
          : copy.loadError,
      );
    }
  }

  function removeParameter(
    parameterDefinitionId:
      string,
  ) {
    setSelectedParameterIds(
      (
        current,
      ) =>
        current.filter(
          (id) =>
            id !==
            parameterDefinitionId,
        ),
    );

    setSelectedObjectIdsByParameter(
      (
        current,
      ) => {
        const next = {
          ...current,
        };

        delete next[
          parameterDefinitionId
        ];

        return next;
      },
    );
  }

  function toggleObject(
    parameterDefinitionId:
      string,
    valueObjectId:
      string,
  ) {
    setSelectedObjectIdsByParameter(
      (
        current,
      ) => {
        const existing =
          current[
            parameterDefinitionId
          ] ??
          [];

        const next =
          existing.includes(
            valueObjectId,
          )
            ? existing.filter(
                (id) =>
                  id !==
                  valueObjectId,
              )
            : [
                ...existing,
                valueObjectId,
              ];

        return {
          ...current,
          [parameterDefinitionId]:
            next,
        };
      },
    );
  }

  function resetForm() {
    setRequestId(
      newRequestId(),
    );
    setTitle(
      "",
    );
    setTitleEn(
      "",
    );
    setDescription(
      "",
    );
    setDescriptionEn(
      "",
    );
    setSelectedParameterIds(
      [],
    );
    setParameterSearch(
      "",
    );
    setParameterMode(
      "existing",
    );
    setNewParameterTitle(
      "",
    );
    setNewParameterDescription(
      "",
    );
    setNewParameterCode(
      "",
    );
    setObjectSearchByParameter(
      {},
    );
    setSelectedObjectIdsByParameter(
      {},
    );
    setMessage(
      "",
    );
  }

  async function publish() {
    const normalizedTitle =
      title.trim();

    const normalizedTitleEn =
      titleEn.trim();

    if (
      !normalizedTitle ||
      !normalizedTitleEn
    ) {
      setMessage(
        copy.loadError,
      );
      return;
    }

    if (
      selectedParameterIds
        .length ===
      0
    ) {
      setMessage(
        copy.parameterHelp,
      );
      return;
    }

    const mappings =
      selectedParameterIds
        .flatMap(
          (
            parameterDefinitionId,
          ) =>
            (
              selectedObjectIdsByParameter[
                parameterDefinitionId
              ] ??
              []
            )
              .map(
                (
                  valueObjectId,
                ) => ({
                  parameterDefinitionId,
                  valueObjectId,
                }),
              ),
        );

    if (
      selectedParameterIds
        .some(
          (
            parameterDefinitionId,
          ) =>
            !(
              selectedObjectIdsByParameter[
                parameterDefinitionId
              ] ??
              []
            )
              .length,
        )
    ) {
      setMessage(
        copy.mappingsHelp,
      );
      return;
    }

    setBusy(
      true,
    );
    setMessage(
      "",
    );

    try {
      const response =
        await fetch(
          "/api/admin/activity-templates/system/create",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                requestId,
                locale,
                title:
                  normalizedTitle,
                titleEn:
                  normalizedTitleEn,
                description:
                  description.trim(),
                descriptionEn:
                  descriptionEn.trim(),
                parameterDefinitionIds:
                  selectedParameterIds,
                mappings,
              }),
          },
        );

      const payload =
        await response
          .json();

      if (
        !response.ok ||
        payload?.ok !==
          true ||
        !payload
          ?.result
          ?.templateId
      ) {
        throw new Error(
          payload?.error ||
            copy.loadError,
        );
      }

      const templateId =
        String(
          payload
            .result
            .templateId,
        );

      await onCreated(
        templateId,
      );

      resetForm();

      setOpen(
        false,
      );
    } catch (
      error
    ) {
      setMessage(
        error instanceof Error
          ? error.message
          : copy.loadError,
      );
    } finally {
      setBusy(
        false,
      );
    }
  }

  if (!open) {
    if (hideTrigger) {
      return null;
    }

    return (
      <div className="mb-4">
        <button
          type="button"
          onClick={() =>
            void openForm()
          }
          className="rounded-xl bg-[#3b6ef8] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-95"
        >
          {copy.open}
        </button>
      </div>
    );
  }

  return (
    <section className="mb-4 rounded-[22px] border border-black/[0.07] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">
            {copy.title}
          </h2>

          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            {copy.intro}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setOpen(
              false,
            );
          }}
          className="rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          {copy.cancel}
        </button>
      </div>

      {message ? (
        <div className="mt-4 rounded-xl border border-black/[0.08] bg-[#f5f6fb] px-3 py-2 text-xs font-semibold text-slate-600">
          {message}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-slate-600">
            {copy.localizedTitle}
          </span>

          <input
            value={title}
            maxLength={180}
            onChange={(event) =>
              setTitle(
                event
                  .target
                  .value,
              )
            }
            placeholder={
              copy.localizedTitlePlaceholder
            }
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#3b6ef8]"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-slate-600">
            {copy.englishTitle}
          </span>

          <input
            value={titleEn}
            maxLength={180}
            onChange={(event) =>
              setTitleEn(
                event
                  .target
                  .value,
              )
            }
            placeholder={
              copy.englishTitlePlaceholder
            }
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#3b6ef8]"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-slate-600">
            {copy.localizedDescription}
          </span>

          <textarea
            value={description}
            maxLength={4000}
            rows={4}
            onChange={(event) =>
              setDescription(
                event
                  .target
                  .value,
              )
            }
            className="resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#3b6ef8]"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-slate-600">
            {copy.englishDescription}
          </span>

          <textarea
            value={descriptionEn}
            maxLength={4000}
            rows={4}
            onChange={(event) =>
              setDescriptionEn(
                event
                  .target
                  .value,
              )
            }
            className="resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#3b6ef8]"
          />
        </label>
      </div>

      <div className="mt-5">
        <div className="text-sm font-bold">
          {copy.parameters}
        </div>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {copy.parameterHelp}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {
            selectedParameters.map(
              (
                parameter,
              ) => (
                <span
                  key={
                    parameter.id
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-[#f5f6fb] px-3 py-1.5 text-xs font-bold text-slate-700"
                >
                  {
                    parameter.title
                  }

                  <button
                    type="button"
                    onClick={() =>
                      removeParameter(
                        parameter.id,
                      )
                    }
                    className="text-slate-400 hover:text-slate-700"
                    aria-label={`Remove ${parameter.title}`}
                  >
                    ×
                  </button>
                </span>
              ),
            )
          }
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setParameterMode(
                "existing",
              )
            }
            className={[
              "rounded-xl border px-3 py-2 text-xs font-bold",
              parameterMode ===
              "existing"
                ? "border-[#3b6ef8] bg-[#eef2ff] text-[#3b6ef8]"
                : "border-black/[0.08] bg-white text-slate-600",
            ].join(
              " ",
            )}
          >
            {copy.chooseExisting}
          </button>

          <button
            type="button"
            onClick={() =>
              setParameterMode(
                "new",
              )
            }
            className={[
              "rounded-xl border px-3 py-2 text-xs font-bold",
              parameterMode ===
              "new"
                ? "border-[#3b6ef8] bg-[#eef2ff] text-[#3b6ef8]"
                : "border-black/[0.08] bg-white text-slate-600",
            ].join(
              " ",
            )}
          >
            {copy.createNew}
          </button>
        </div>

        {parameterMode ===
        "existing" ? (
          <>
            <input
              value={
                parameterSearch
              }
              onChange={
                (
                  event,
                ) =>
                  setParameterSearch(
                    event
                      .target
                      .value,
                  )
              }
              placeholder={
                copy.parameterSearch
              }
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#3b6ef8]"
            />

            <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-black/[0.07] p-1">
              {loading ? (
                <p className="px-3 py-3 text-xs text-slate-500">
                  {copy.loading}
                </p>
              ) : filteredParameters
                  .length === 0 ? (
                <p className="px-3 py-3 text-xs text-slate-500">
                  {copy.noParameters}
                </p>
              ) : (
                filteredParameters.map(
                  (
                    parameter,
                  ) => (
                    <button
                      key={
                        parameter.id
                      }
                      type="button"
                      onClick={() =>
                        void addParameter(
                          parameter,
                        )
                      }
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-[#f5f6fb]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">
                          {
                            parameter.title
                          }
                        </span>

                        <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                          {
                            parameter
                              .parameterCode
                          }
                        </span>
                      </span>

                      <span className="shrink-0 text-[11px] text-slate-400">
                        {
                          getActivityUnitLabel(
                            parameter
                              .canonicalUnitCode,
                            locale,
                          )
                        }
                      </span>
                    </button>
                  ),
                )
              )}
            </div>
          </>
        ) : (
          <div className="mt-3 rounded-[18px] border border-black/[0.07] bg-[#f5f6fb] p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5 md:col-span-2">
                <span className="text-xs font-bold text-slate-600">
                  {copy.newParameterTitle}
                </span>
                <input
                  value={
                    newParameterTitle
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      setNewParameterTitle(
                        event
                          .target
                          .value,
                      )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>

              <label className="grid gap-1.5 md:col-span-2">
                <span className="text-xs font-bold text-slate-600">
                  {copy.newParameterDescription}
                </span>
                <textarea
                  rows={2}
                  value={
                    newParameterDescription
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      setNewParameterDescription(
                        event
                          .target
                          .value,
                      )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>

              <label className="grid gap-1.5 md:col-span-2">
                <span className="text-xs font-bold text-slate-600">
                  {copy.technicalCode}
                </span>
                <input
                  value={
                    newParameterCode
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      setNewParameterCode(
                        event
                          .target
                          .value
                          .toLowerCase()
                          .replace(
                            /\s+/gu,
                            "_",
                          ),
                      )
                  }
                  placeholder="mass"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-slate-600">
                  {copy.dimension}
                </span>
                <select
                  value={
                    newDimension
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      setNewDimension(
                        event
                          .target
                          .value,
                      )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {
                    DIMENSIONS.map(
                      (
                        code,
                      ) => (
                        <option
                          key={
                            code
                          }
                          value={
                            code
                          }
                        >
                          {code}
                        </option>
                      ),
                    )
                  }
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-slate-600">
                  {copy.valueType}
                </span>
                <select
                  value={
                    newValueType
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      setNewValueType(
                        event
                          .target
                          .value,
                      )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {
                    VALUE_TYPES.map(
                      (
                        code,
                      ) => (
                        <option
                          key={
                            code
                          }
                          value={
                            code
                          }
                        >
                          {code}
                        </option>
                      ),
                    )
                  }
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-slate-600">
                  {copy.canonicalUnit}
                </span>
                <input
                  value={
                    newUnit
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      setNewUnit(
                        event
                          .target
                          .value
                          .toLowerCase(),
                      )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-slate-600">
                  {copy.aggregation}
                </span>
                <select
                  value={
                    newAggregation
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      setNewAggregation(
                        event
                          .target
                          .value,
                      )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {
                    AGGREGATIONS.map(
                      (
                        code,
                      ) => (
                        <option
                          key={
                            code
                          }
                          value={
                            code
                          }
                        >
                          {code}
                        </option>
                      ),
                    )
                  }
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-slate-600">
                  {copy.defaultWindow}
                </span>
                <select
                  value={
                    newWindow
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      setNewWindow(
                        event
                          .target
                          .value,
                      )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {
                    WINDOWS.map(
                      (
                        code,
                      ) => (
                        <option
                          key={
                            code
                          }
                          value={
                            code
                          }
                        >
                          {code}
                        </option>
                      ),
                    )
                  }
                </select>
              </label>

              <label className="flex items-center gap-2 md:col-span-2">
                <input
                  type="checkbox"
                  checked={
                    newAllowNegative
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      setNewAllowNegative(
                        event
                          .target
                          .checked,
                      )
                  }
                />
                <span className="text-xs font-bold text-slate-600">
                  {copy.allowNegative}
                </span>
              </label>
            </div>

            <button
              type="button"
              onClick={() =>
                void createAndAddParameter()
              }
              disabled={
                busy ||
                !newParameterTitle
                  .trim() ||
                !TECHNICAL_CODE_RE.test(
                  newParameterCode
                    .trim()
                    .toLowerCase(),
                ) ||
                !newUnit
                  .trim()
              }
              className="mt-4 rounded-xl bg-[#3b6ef8] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {copy.createAndAdd}
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 space-y-4">
        {
          selectedParameters.map(
            (
              parameter,
            ) => {
              const all =
                valueObjectsByParameter[
                  parameter.id
                ] ??
                [];

              const query =
                (
                  objectSearchByParameter[
                    parameter.id
                  ] ??
                  ""
                )
                  .trim()
                  .toLocaleLowerCase();

              const selected =
                new Set(
                  selectedObjectIdsByParameter[
                    parameter.id
                  ] ??
                  [],
                );

              const visible =
                all
                  .filter(
                    (
                      item,
                    ) =>
                      !query ||
                      [
                        item.title,
                        item.titleEn,
                        item.canonicalKey ??
                          "",
                      ]
                        .join(
                          " ",
                        )
                        .toLocaleLowerCase()
                        .includes(
                          query,
                        ),
                  )
                  .slice(
                    0,
                    80,
                  );

              return (
                <div
                  key={
                    parameter.id
                  }
                  className="rounded-[18px] border border-black/[0.07] bg-[#fafbfe] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold">
                        {
                          parameter.title
                        }
                      </div>

                      <div className="mt-1 text-[11px] text-slate-400">
                        {
                          parameter
                            .parameterCode
                        }
                        {" · "}
                        {
                          getActivityUnitLabel(
                            parameter
                              .canonicalUnitCode,
                            locale,
                          )
                        }
                      </div>
                    </div>

                    <div className="text-xs font-bold text-slate-500">
                      {
                        copy.selected
                      }
                      :
                      {" "}
                      {
                        selected
                          .size
                      }
                    </div>
                  </div>

                  <div className="mt-3 text-xs font-bold text-slate-600">
                    {copy.mappings}
                  </div>

                  <p className="mt-1 text-[11px] leading-4 text-slate-400">
                    {
                      copy.mappingsHelp
                    }
                  </p>

                  <div className="mt-2 rounded-xl border border-black/[0.07] bg-white px-3 py-2 text-[11px] leading-4 text-slate-500">
                    {
                      locale ===
                      "ru"
                        ? "Способ получения исходного значения (прямое / расчётное) будет задаваться для каждой связи «параметр → ОН» на следующем этапе. В этом релизе создаётся только каноническая связь измерения."
                        : "The source-value resolution strategy (direct / calculated) will be attached to each parameter → observation-object mapping in the next stage. This release creates only the canonical measurement mapping."
                    }
                  </div>

                  <input
                    value={
                      objectSearchByParameter[
                        parameter.id
                      ] ??
                      ""
                    }
                    onChange={
                      (
                        event,
                      ) =>
                        setObjectSearchByParameter(
                          (
                            current,
                          ) => ({
                            ...current,
                            [parameter.id]:
                              event
                                .target
                                .value,
                          }),
                        )
                    }
                    placeholder={
                      copy.objectSearch
                    }
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#3b6ef8]"
                  />

                  <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-black/[0.07] bg-white p-1">
                    {
                      all.length ===
                      0 ? (
                        <p className="px-3 py-3 text-xs text-slate-500">
                          {
                            copy.noObjects
                          }
                        </p>
                      ) : (
                        visible.map(
                          (
                            item,
                          ) => {
                            const checked =
                              selected.has(
                                item.id,
                              );

                            return (
                              <button
                                key={
                                  item.id
                                }
                                type="button"
                                onClick={() =>
                                  toggleObject(
                                    parameter.id,
                                    item.id,
                                  )
                                }
                                className={[
                                  "flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left",
                                  checked
                                    ? "bg-[#eef3ff]"
                                    : "hover:bg-[#f5f6fb]",
                                ].join(
                                  " ",
                                )}
                              >
                                <span
                                  className={[
                                    "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-black",
                                    checked
                                      ? "border-[#3b6ef8] bg-[#3b6ef8] text-white"
                                      : "border-slate-300 bg-white text-transparent",
                                  ].join(
                                    " ",
                                  )}
                                >
                                  ✓
                                </span>

                                <span className="min-w-0">
                                  <span className="block text-sm font-bold text-slate-700">
                                    {
                                      item.title
                                    }
                                  </span>

                                  {
                                    item
                                      .titleEn !==
                                    item
                                      .title ? (
                                      <span className="mt-0.5 block text-[11px] text-slate-400">
                                        {
                                          item.titleEn
                                        }
                                      </span>
                                    ) : null
                                  }
                                </span>
                              </button>
                            );
                          },
                        )
                      )
                    }
                  </div>
                </div>
              );
            },
          )
        }
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-black/[0.07] pt-4">
        <button
          type="button"
          onClick={() => {
            resetForm();
            setOpen(
              false,
            );
          }}
          disabled={busy}
          className="rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-sm font-bold text-slate-600 disabled:opacity-50"
        >
          {copy.cancel}
        </button>

        <button
          type="button"
          onClick={() =>
            void publish()
          }
          disabled={
            busy ||
            loading
          }
          className="rounded-xl bg-[#3b6ef8] px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {
            busy
              ? copy.publishing
              : copy.publish
          }
        </button>
      </div>
    </section>
  );
}
