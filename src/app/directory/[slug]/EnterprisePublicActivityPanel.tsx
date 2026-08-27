"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  optimizePublicationImage,
  type OptimizedPublicationImage,
} from "@/lib/media/browserPublicationImage";
import type { PublicEnterpriseMessage } from "@/lib/messages/enterpriseMessages.server";

type LocaleKey = "en" | "pl" | "uk" | "ru" | "de" | "es" | "cs";

type Copy = {
  composerTitle: string;
  placeholder: string;
  publish: string;
  publishing: string;
  published: string;
  empty: string;
  loadError: string;
  sourceLabel: string;
  photo: string;
  removePhoto: string;
  optimizingPhoto: string;
  imageTypeUnsupported: string;
  imageSourceTooLarge: string;
  imageOptimizationFailed: string;
  imageServerRejected: string;
};

const COPY: Record<LocaleKey, Copy> = {
  en: {
    composerTitle: "New publication",
    placeholder: "Write an update for your public profile...",
    publish: "Publish",
    publishing: "Publishing...",
    published: "Published.",
    empty: "No public activity yet.",
    loadError: "Public activity could not be loaded.",
    sourceLabel: "ARCTor",
    photo: "Photo",
    removePhoto: "Remove photo",
    optimizingPhoto: "Optimizing photo...",
    imageTypeUnsupported: "Choose a JPEG, PNG or WebP image.",
    imageSourceTooLarge: "The selected image is larger than 10 MiB.",
    imageOptimizationFailed: "The photo could not be optimized for publication.",
    imageServerRejected: "The optimized photo was rejected by the server.",
  },
  pl: {
    composerTitle: "Nowa publikacja",
    placeholder: "Napisz aktualizację do profilu publicznego...",
    publish: "Opublikuj",
    publishing: "Publikowanie...",
    published: "Opublikowano.",
    empty: "Brak publicznej aktywności.",
    loadError: "Nie udało się wczytać aktywności publicznej.",
    sourceLabel: "ARCTor",
    photo: "Zdjęcie",
    removePhoto: "Usuń zdjęcie",
    optimizingPhoto: "Optymalizacja zdjęcia...",
    imageTypeUnsupported: "Wybierz obraz JPEG, PNG lub WebP.",
    imageSourceTooLarge: "Wybrany obraz jest większy niż 10 MiB.",
    imageOptimizationFailed: "Nie udało się zoptymalizować zdjęcia do publikacji.",
    imageServerRejected: "Serwer odrzucił zoptymalizowane zdjęcie.",
  },
  uk: {
    composerTitle: "Нова публікація",
    placeholder: "Напишіть оновлення для публічного профілю...",
    publish: "Опублікувати",
    publishing: "Публікація...",
    published: "Опубліковано.",
    empty: "Публічної активності ще немає.",
    loadError: "Не вдалося завантажити публічну активність.",
    sourceLabel: "ARCTor",
    photo: "Фото",
    removePhoto: "Видалити фото",
    optimizingPhoto: "Оптимізація фото...",
    imageTypeUnsupported: "Виберіть JPEG, PNG або WebP.",
    imageSourceTooLarge: "Вибране зображення перевищує 10 MiB.",
    imageOptimizationFailed: "Не вдалося оптимізувати фото для публікації.",
    imageServerRejected: "Сервер відхилив оптимізоване фото.",
  },
  ru: {
    composerTitle: "Новая публикация",
    placeholder: "Напишите обновление для публичного профиля...",
    publish: "Опубликовать",
    publishing: "Публикация...",
    published: "Опубликовано.",
    empty: "Публичной активности пока нет.",
    loadError: "Не удалось загрузить публичную активность.",
    sourceLabel: "ARCTor",
    photo: "Фото",
    removePhoto: "Удалить фото",
    optimizingPhoto: "Оптимизация фото...",
    imageTypeUnsupported: "Выберите изображение JPEG, PNG или WebP.",
    imageSourceTooLarge: "Выбранное изображение больше 10 MiB.",
    imageOptimizationFailed: "Не удалось оптимизировать фото для публикации.",
    imageServerRejected: "Сервер отклонил оптимизированное фото.",
  },
  de: {
    composerTitle: "Neue Veröffentlichung",
    placeholder: "Schreiben Sie ein Update für das öffentliche Profil...",
    publish: "Veröffentlichen",
    publishing: "Wird veröffentlicht...",
    published: "Veröffentlicht.",
    empty: "Noch keine öffentliche Aktivität.",
    loadError: "Öffentliche Aktivität konnte nicht geladen werden.",
    sourceLabel: "ARCTor",
    photo: "Foto",
    removePhoto: "Foto entfernen",
    optimizingPhoto: "Foto wird optimiert...",
    imageTypeUnsupported: "Wählen Sie ein JPEG-, PNG- oder WebP-Bild.",
    imageSourceTooLarge: "Das ausgewählte Bild ist größer als 10 MiB.",
    imageOptimizationFailed: "Das Foto konnte nicht optimiert werden.",
    imageServerRejected: "Der Server hat das optimierte Foto abgelehnt.",
  },
  es: {
    composerTitle: "Nueva publicación",
    placeholder: "Escribe una actualización para el perfil público...",
    publish: "Publicar",
    publishing: "Publicando...",
    published: "Publicado.",
    empty: "Todavía no hay actividad pública.",
    loadError: "No se pudo cargar la actividad pública.",
    sourceLabel: "ARCTor",
    photo: "Foto",
    removePhoto: "Eliminar foto",
    optimizingPhoto: "Optimizando foto...",
    imageTypeUnsupported: "Elige una imagen JPEG, PNG o WebP.",
    imageSourceTooLarge: "La imagen seleccionada supera los 10 MiB.",
    imageOptimizationFailed: "No se pudo optimizar la foto para publicarla.",
    imageServerRejected: "El servidor rechazó la foto optimizada.",
  },
  cs: {
    composerTitle: "Nová publikace",
    placeholder: "Napište aktualizaci pro veřejný profil...",
    publish: "Publikovat",
    publishing: "Publikování...",
    published: "Publikováno.",
    empty: "Zatím žádná veřejná aktivita.",
    loadError: "Veřejnou aktivitu se nepodařilo načíst.",
    sourceLabel: "ARCTor",
    photo: "Fotografie",
    removePhoto: "Odstranit fotografii",
    optimizingPhoto: "Optimalizace fotografie...",
    imageTypeUnsupported: "Vyberte obrázek JPEG, PNG nebo WebP.",
    imageSourceTooLarge: "Vybraný obrázek je větší než 10 MiB.",
    imageOptimizationFailed: "Fotografii se nepodařilo optimalizovat.",
    imageServerRejected: "Server optimalizovanou fotografii odmítl.",
  },
};

function getLocale(value: string | undefined): LocaleKey {
  if (
    value === "pl" ||
    value === "uk" ||
    value === "ru" ||
    value === "de" ||
    value === "es" ||
    value === "cs"
  ) {
    return value;
  }
  return "en";
}

function getIntlLocale(locale: LocaleKey) {
  const map: Record<LocaleKey, string> = {
    en: "en-GB", pl: "pl-PL", uk: "uk-UA", ru: "ru-RU",
    de: "de-DE", es: "es-ES", cs: "cs-CZ",
  };
  return map[locale];
}

function formatPublishedAt(value: string, locale: LocaleKey) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function publicationImageErrorMessage(error: unknown, copy: Copy) {
  const code = error instanceof Error ? error.message : "";

  if (code === "PUBLICATION_IMAGE_TYPE_UNSUPPORTED") return copy.imageTypeUnsupported;
  if (code === "PUBLICATION_IMAGE_SOURCE_TOO_LARGE") return copy.imageSourceTooLarge;

  if (
    code === "PUBLICATION_IMAGE_TOO_LARGE_AFTER_OPTIMIZATION" ||
    code === "PUBLICATION_IMAGE_WEBP_ENCODE_FAILED" ||
    code === "PUBLICATION_IMAGE_CANVAS_UNAVAILABLE" ||
    code === "PUBLICATION_IMAGE_DECODE_FAILED" ||
    code === "PUBLICATION_IMAGE_DIMENSIONS_INVALID" ||
    code === "PUBLICATION_IMAGE_EMPTY"
  ) {
    return copy.imageOptimizationFailed;
  }

  if (
    code.startsWith("PUBLICATION_IMAGE_") ||
    code.startsWith("MESSAGE_MEDIA_") ||
    code.startsWith("MEDIA_IMAGE_")
  ) {
    return copy.imageServerRejected;
  }

  return error instanceof Error ? error.message : copy.imageServerRejected;
}

type Props = {
  organizationId: string;
  organizationName: string;
  locale?: string;
  canPublish: boolean;
  messages: PublicEnterpriseMessage[];
  errorMessage: string | null;
};

export default function EnterprisePublicActivityPanel({
  organizationId,
  organizationName,
  locale,
  canPublish,
  messages,
  errorMessage,
}: Props) {
  const router = useRouter();
  const normalizedLocale = getLocale(locale);
  const copy = COPY[normalizedLocale];

  const previewUrlRef = useRef<string | null>(null);
  const photoButtonRef = useRef<HTMLButtonElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [contentText, setContentText] = useState("");
  const [image, setImage] = useState<OptimizedPublicationImage | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [optimizingImage, setOptimizingImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const trimmedText = contentText.trim();

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function clearSelectedImage() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setImagePreviewUrl(null);
    setImage(null);
  }

  function openImagePicker() {
    if (busy || optimizingImage) return;

    const input = photoInputRef.current;

    if (!input) return;

    input.value = "";
    input.click();

    window.requestAnimationFrame(() => {
      photoButtonRef.current?.focus({ preventScroll: true });
    });
  }

  async function selectImage(file: File | null) {
    if (!file || busy || optimizingImage) return;

    setOptimizingImage(true);
    setSubmitError(null);
    setNotice(null);

    try {
      const optimized = await optimizePublicationImage(file);
      clearSelectedImage();
      const previewUrl = URL.createObjectURL(optimized.blob);
      previewUrlRef.current = previewUrl;
      setImagePreviewUrl(previewUrl);
      setImage(optimized);
    } catch (error) {
      setSubmitError(publicationImageErrorMessage(error, copy));
    } finally {
      setOptimizingImage(false);
    }
  }

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedText || busy || optimizingImage) return;

    setBusy(true);
    setSubmitError(null);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.set("contentText", trimmedText);
      formData.set("locale", normalizedLocale);

      if (image) {
        formData.set("image", image.blob, "publication.webp");
      }

      const response = await fetch(
        `/api/organizations/${encodeURIComponent(organizationId)}/messages`,
        {
          method: "POST",
          body: formData,
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.error ?? `Publication failed with HTTP ${response.status}.`,
        );
      }

      setContentText("");
      clearSelectedImage();
      setNotice(copy.published);
      router.refresh();
    } catch (error) {
      setSubmitError(publicationImageErrorMessage(error, copy));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[140px]">
      {canPublish ? (
        <form
          onSubmit={publish}
          className="mb-4 rounded-xl border border-[#e2e6f3] bg-[#f8f9fd] p-3"
        >
          <div className="mb-2 text-[11px] font-semibold text-[#4a4f6a]">
            {copy.composerTitle}
          </div>

          <textarea
            value={contentText}
            onChange={(event) => setContentText(event.target.value)}
            maxLength={5000}
            rows={3}
            placeholder={copy.placeholder}
            className="w-full resize-y rounded-xl border border-[#dfe3f1] bg-white px-3 py-2 text-[12px] leading-5 text-[#33384f] outline-none transition placeholder:text-[#a4a9bd] focus:border-[#9db3ff] focus:ring-2 focus:ring-[#e7edff]"
          />

          {imagePreviewUrl ? (
            <div className="mt-2.5 overflow-hidden rounded-xl border border-[#e7eaf4] bg-[#f8f9fd]">
              {/* Optimized local object URL preview. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt=""
                className="max-h-[220px] w-full object-contain"
              />
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-[#9ca3b8]">
                {contentText.length}/5000
              </span>

              <button
                ref={photoButtonRef}
                type="button"
                onClick={openImagePicker}
                disabled={busy || optimizingImage}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#dfe3f1] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#4a4f6a] shadow-sm transition hover:border-[#b9c7ff] hover:bg-[#f5f7ff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ImagePlus className="h-3.5 w-3.5 text-[#3b6ef8]" />
                {optimizingImage ? copy.optimizingPhoto : copy.photo}
              </button>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy || optimizingImage}
                hidden
                tabIndex={-1}
                onClick={(event) => {
                  event.stopPropagation();
                }}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0] ?? null;
                  void selectImage(file);
                  event.currentTarget.value = "";
                }}
              />

              {image ? (
                <button
                  type="button"
                  onClick={clearSelectedImage}
                  disabled={busy || optimizingImage}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#f0d3d8] bg-white px-2 py-1.5 text-[10px] font-semibold text-[#b42318] transition hover:bg-[#fff7f7] disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                  {copy.removePhoto}
                </button>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={!trimmedText || busy || optimizingImage}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3b6ef8] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#315fd8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {busy ? copy.publishing : copy.publish}
            </button>
          </div>

          {submitError ? (
            <p className="mt-2 text-[11px] leading-4 text-[#b42318]">
              {submitError}
            </p>
          ) : null}

          {notice ? (
            <p className="mt-2 text-[11px] leading-4 text-[#16803a]">
              {notice}
            </p>
          ) : null}
        </form>
      ) : null}

      {errorMessage ? (
        <p className="mb-3 rounded-lg bg-[#fff5f5] px-3 py-2 text-[11px] leading-4 text-[#b42318]">
          {copy.loadError}
        </p>
      ) : null}

      {messages.length === 0 ? (
        <div className="flex min-h-[96px] items-center justify-center rounded-xl bg-[#f8f9fd] px-4 text-center text-[12px] text-[#9ca3b8]">
          {copy.empty}
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((message) => (
            <article
              key={message.id}
              className="rounded-xl border border-[#e7eaf4] bg-white px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-[11px] font-semibold text-[#30354d]">
                  {organizationName}
                </span>
                <span className="text-[10px] text-[#9ca3b8]">
                  {copy.sourceLabel}
                </span>
                <span className="text-[10px] text-[#b0b4c5]">
                  {formatPublishedAt(message.publishedAt, normalizedLocale)}
                </span>
              </div>

              {message.title ? (
                <div className="mt-1.5 text-[12px] font-semibold text-[#30354d]">
                  {message.title}
                </div>
              ) : null}

              {message.contentText ? (
                <p className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-5 text-[#5a5f7a]">
                  {message.contentText}
                </p>
              ) : null}

              {message.image ? (
                <div className="mt-2.5 flex justify-center overflow-hidden rounded-xl border border-[#e7eaf4] bg-[#f8f9fd]">
                  {/* Direct public Storage/CDN URL, not Next Image/Vercel proxy. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={message.image.url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="max-h-[300px] w-full object-contain"
                  />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
