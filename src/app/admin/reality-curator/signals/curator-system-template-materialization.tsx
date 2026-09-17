"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import type {
  LocaleCode,
} from "@/i18n";

type Suggestion = {
  title: string;
  titleEn: string;

  description: string;
  descriptionEn: string;
};

type Materialization = {
  templateId: string;
  profileId: string;

  versionNo: number;

  title: string | null;
  titleEn: string | null;

  fingerprint: string | null;

  materializedAt: string | null;
};

type ApiState = {
  ok?: boolean;

  error?: string;
  errorCode?: string;

  ready?: boolean;

  suggestion?: Suggestion | null;

  materialization?:
    Materialization | null;
};

type Props = {
  signalId: string;
  locale: LocaleCode;
  onChanged: () => void;
};

type Copy = {
  title: string;
  hint: string;

  canonicalHint: string;

  localizedName: string;
  englishName: string;

  localizedDescription: string;
  englishDescription: string;

  publish: string;
  publishing: string;

  completed: string;
  completedHint: string;

  profileVersion: string;

  openCatalog: string;

  waiting: string;
  loadError: string;
};

const EN: Copy = {
  title:
    "Publish the system typical activity",

  hint:
    "All parameter-to-observation-object mappings have been confirmed. Review the proposed activity card and publish the ownerless system activity together with a versioned parameter profile.",

  canonicalHint:
    "English is stored as canonical system text. The current-language title and description are stored in localization metadata. Personal activity text is not copied into the system catalog.",

  localizedName:
    "Name in the current language",

  englishName:
    "Canonical name in English",

  localizedDescription:
    "Description in the current language",

  englishDescription:
    "Canonical description in English",

  publish:
    "Publish system typical activity",

  publishing:
    "Publishing…",

  completed:
    "System typical activity published",

  completedHint:
    "The ownerless system activity and its active parameter_registry_v2 profile are now available in the shared system catalog.",

  profileVersion:
    "Profile version",

  openCatalog:
    "Open typical activities",

  waiting:
    "The system activity can be published after all parameter mappings are confirmed.",

  loadError:
    "Could not load or publish the system typical activity.",
};

const RU: Copy = {
  title:
    "Опубликовать системную типовую активность",

  hint:
    "Все соответствия параметров объектам наблюдения подтверждены. Проверьте подготовленную карточку и опубликуйте системную активность без личного владельца вместе с версионным профилем параметров.",

  canonicalHint:
    "Английский текст хранится как канонический системный. Название и описание на текущем языке сохраняются в данных локализации. Исходный личный текст активности в системный каталог не копируется.",

  localizedName:
    "Название на текущем языке",

  englishName:
    "Каноническое название на английском",

  localizedDescription:
    "Описание на текущем языке",

  englishDescription:
    "Каноническое описание на английском",

  publish:
    "Опубликовать системную типовую активность",

  publishing:
    "Публикуем…",

  completed:
    "Системная типовая активность опубликована",

  completedHint:
    "Системная активность без личного владельца и её активный профиль parameter_registry_v2 теперь доступны в общем системном каталоге.",

  profileVersion:
    "Версия профиля",

  openCatalog:
    "Открыть типовые активности",

  waiting:
    "Системную активность можно публиковать после подтверждения соответствий для всех параметров.",

  loadError:
    "Не удалось загрузить или опубликовать системную типовую активность.",
};

const PL: Copy = {
  ...EN,

  title:
    "Opublikuj systemową aktywność typową",

  publish:
    "Opublikuj systemową aktywność typową",

  publishing:
    "Publikowanie…",

  completed:
    "Systemowa aktywność typowa została opublikowana",

  openCatalog:
    "Otwórz aktywności typowe",
};

const UK: Copy = {
  ...EN,

  title:
    "Опублікувати системну типову активність",

  publish:
    "Опублікувати системну типову активність",

  publishing:
    "Публікуємо…",

  completed:
    "Системну типову активність опубліковано",

  openCatalog:
    "Відкрити типові активності",
};

const DE: Copy = {
  ...EN,

  title:
    "Systemische typische Aktivität veröffentlichen",

  publish:
    "Systemische typische Aktivität veröffentlichen",

  publishing:
    "Veröffentlichen…",

  completed:
    "Systemische typische Aktivität veröffentlicht",

  openCatalog:
    "Typische Aktivitäten öffnen",
};

const ES: Copy = {
  ...EN,

  title:
    "Publicar la actividad típica del sistema",

  publish:
    "Publicar actividad típica del sistema",

  publishing:
    "Publicando…",

  completed:
    "Actividad típica del sistema publicada",

  openCatalog:
    "Abrir actividades típicas",
};

const CS: Copy = {
  ...EN,

  title:
    "Publikovat systémovou typickou aktivitu",

  publish:
    "Publikovat systémovou typickou aktivitu",

  publishing:
    "Publikování…",

  completed:
    "Systémová typická aktivita byla publikována",

  openCatalog:
    "Otevřít typické aktivity",
};

const COPY:
  Record<LocaleCode, Copy> = {
    en: EN,
    ru: RU,
    pl: PL,
    uk: UK,
    de: DE,
    es: ES,
    cs: CS,
  };

export function
CuratorSystemTemplateMaterialization({
  signalId,
  locale,
  onChanged,
}: Props) {

  const copy =
    COPY[locale] ??
    EN;

  const [
    state,
    setState,
  ] =
    useState<ApiState | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
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

  useEffect(() => {

    const controller =
      new AbortController();

    const url =
      `/api/admin/reality-curator/signals/system-template-materialization?signalId=${encodeURIComponent(signalId)}&locale=${encodeURIComponent(locale)}`;

    void fetch(
      url,
      {
        method:
          "GET",

        cache:
          "no-store",

        signal:
          controller.signal,
      },
    )
      .then(
        async (
          response,
        ) => {

          const payload =
            (
              await response
                .json()
                .catch(
                  () =>
                    null,
                )
            ) as ApiState | null;

          if (
            !response.ok ||
            !payload?.ok
          ) {
            throw new Error(
              payload?.error ||
              payload?.errorCode ||
              `HTTP_${response.status}`,
            );
          }

          setState(
            payload,
          );

          if (
            payload.suggestion &&
            !payload.materialization
          ) {
            setTitle(
              payload.suggestion.title,
            );

            setTitleEn(
              payload.suggestion.titleEn,
            );

            setDescription(
              payload.suggestion.description,
            );

            setDescriptionEn(
              payload.suggestion.descriptionEn,
            );
          }

          setError(
            null,
          );
        },
      )
      .catch(
        (
          cause: unknown,
        ) => {

          if (
            !controller.signal.aborted
          ) {
            setError(
              cause instanceof Error
                ? cause.message
                : "UNKNOWN",
            );
          }
        },
      )
      .finally(
        () => {

          if (
            !controller.signal.aborted
          ) {
            setLoading(
              false,
            );
          }
        },
      );

    return () =>
      controller.abort();

  }, [
    locale,
    signalId,
  ]);

  async function publish() {

    setBusy(
      true,
    );

    setError(
      null,
    );

    try {

      const response =
        await fetch(
          "/api/admin/reality-curator/signals/system-template-materialization",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                signalId,
                locale,

                title,
                titleEn,

                description,
                descriptionEn,
              }),
          },
        );

      const payload =
        (
          await response
            .json()
            .catch(
              () =>
                null,
            )
        ) as ApiState | null;

      if (
        !response.ok ||
        !payload?.ok
      ) {
        throw new Error(
          payload?.error ||
          payload?.errorCode ||
          `HTTP_${response.status}`,
        );
      }

      setState(
        payload,
      );

      onChanged();

    } catch (
      cause
    ) {

      setError(
        cause instanceof Error
          ? cause.message
          : "UNKNOWN",
      );

    } finally {

      setBusy(
        false,
      );
    }
  }

  if (loading) {

    return (
      <div className="rounded-2xl border border-[#dce3f5] bg-[#f8faff] p-4 text-sm text-[#727991]">
        {copy.publishing}
      </div>
    );
  }

  if (!state) {

    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {copy.loadError} {error}
      </div>
    );
  }

  if (
    state.materialization
  ) {

    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
        <div className="text-sm font-extrabold text-emerald-900">
          {copy.completed}
        </div>

        <div className="mt-1 text-xs leading-5 text-emerald-800">
          {copy.completedHint}
        </div>

        <div className="mt-3 rounded-xl border border-emerald-200 bg-white px-3 py-3 text-xs leading-5 text-[#526079]">
          <div>
            <span className="font-bold">
              {state.materialization.title ||
               state.materialization.titleEn ||
               "—"}
            </span>
          </div>

          <div>
            {copy.profileVersion}:{" "}
            <span className="font-bold">
              {state.materialization.versionNo}
            </span>
          </div>

          <div className="break-all">
            template_id:{" "}
            {state.materialization.templateId}
          </div>

          <div className="break-all">
            profile_id:{" "}
            {state.materialization.profileId}
          </div>
        </div>

        <div className="mt-3">
          <Link
            href={`/activity-templates?locale=${locale}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-bold text-emerald-800"
          >
            {copy.openCatalog}
          </Link>
        </div>
      </div>
    );
  }

  if (!state.ready) {

    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        {copy.waiting}
      </div>
    );
  }

  const valid =
    Boolean(
      title.trim() &&
      titleEn.trim() &&
      title.length <= 180 &&
      titleEn.length <= 180 &&
      description.length <= 4000 &&
      descriptionEn.length <= 4000,
    );

  return (
    <div className="rounded-2xl border border-[#cfd8ef] bg-[#f8faff] p-4">

      <div className="text-sm font-extrabold text-[#263044]">
        {copy.title}
      </div>

      <div className="mt-1 text-xs leading-5 text-[#727991]">
        {copy.hint}
      </div>

      <div className="mt-3 rounded-xl border border-[#dce3f5] bg-white px-3 py-2 text-xs leading-5 text-[#59647b]">
        {copy.canonicalHint}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">

        <label className="block">
          <div className="mb-1 text-xs font-bold text-[#4b5563]">
            {copy.localizedName}
          </div>

          <input
            value={title}
            maxLength={180}
            onChange={(event) =>
              setTitle(
                event.target.value,
              )
            }
            className="h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-xs font-bold text-[#4b5563]">
            {copy.englishName}
          </div>

          <input
            value={titleEn}
            maxLength={180}
            onChange={(event) =>
              setTitleEn(
                event.target.value,
              )
            }
            className="h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-xs font-bold text-[#4b5563]">
            {copy.localizedDescription}
          </div>

          <textarea
            value={description}
            maxLength={4000}
            rows={4}
            onChange={(event) =>
              setDescription(
                event.target.value,
              )
            }
            className="w-full resize-y rounded-xl border border-[#d8def0] bg-white px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-xs font-bold text-[#4b5563]">
            {copy.englishDescription}
          </div>

          <textarea
            value={descriptionEn}
            maxLength={4000}
            rows={4}
            onChange={(event) =>
              setDescriptionEn(
                event.target.value,
              )
            }
            className="w-full resize-y rounded-xl border border-[#d8def0] bg-white px-3 py-2 text-sm outline-none"
          />
        </label>

      </div>

      <button
        type="button"
        disabled={
          busy ||
          !valid
        }
        onClick={() =>
          void publish()
        }
        className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
      >
        {busy
          ? copy.publishing
          : copy.publish}
      </button>

      {error ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800">
          {copy.loadError} {error}
        </div>
      ) : null}

    </div>
  );
}