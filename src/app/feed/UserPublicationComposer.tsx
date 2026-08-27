"use client";

import { ImagePlus, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { LocaleCode } from "@/i18n";
import {
  optimizePublicationImage,
  type OptimizedPublicationImage,
} from "@/lib/media/browserPublicationImage";
import { getFeedInteractionCopy } from "./feedInteractionCopy";

function publicationImageErrorMessage(
  error: unknown,
  copy: ReturnType<typeof getFeedInteractionCopy>,
) {
  const code = error instanceof Error ? error.message : "";

  if (code === "PUBLICATION_IMAGE_TYPE_UNSUPPORTED") {
    return copy.imageTypeUnsupported;
  }
  if (code === "PUBLICATION_IMAGE_SOURCE_TOO_LARGE") {
    return copy.imageSourceTooLarge;
  }

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

type PublicationAuthorOption = {
  actorId: string;
  kind: "personal" | "avatar" | "enterprise";
  displayName: string;
};

export default function UserPublicationComposer({
  locale,
  authorOptions,
  defaultAuthorActorId,
}: {
  locale: LocaleCode;
  authorOptions: PublicationAuthorOption[];
  defaultAuthorActorId: string;
}) {
  const router = useRouter();
  const copy = getFeedInteractionCopy(locale);
  const previewUrlRef = useRef<string | null>(null);
  const photoButtonRef = useRef<HTMLButtonElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const initialAuthorActorId =
    authorOptions.find((option) => option.actorId === defaultAuthorActorId)
      ?.actorId ??
    authorOptions[0]?.actorId ??
    "";
  const [authorActorId, setAuthorActorId] = useState(initialAuthorActorId);
  const [contentText, setContentText] = useState("");
  const [image, setImage] = useState<OptimizedPublicationImage | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [optimizingImage, setOptimizingImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmedText = contentText.trim();

  function authorKindLabel(kind: PublicationAuthorOption["kind"]) {
    if (kind === "personal") return copy.personalProfile;
    if (kind === "avatar") return copy.avatar;
    return copy.enterprise;
  }

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

    photoInputRef.current?.click();
  }

  async function selectImage(file: File | null) {
    if (!file) {
      photoButtonRef.current?.focus({ preventScroll: true });
      return;
    }

    setOptimizingImage(true);
    setErrorMessage(null);
    setNotice(null);

    try {
      const optimized = await optimizePublicationImage(file);
      clearSelectedImage();

      const previewUrl = URL.createObjectURL(optimized.blob);
      previewUrlRef.current = previewUrl;
      setImage(optimized);
      setImagePreviewUrl(previewUrl);
    } catch (error) {
      clearSelectedImage();
      setErrorMessage(publicationImageErrorMessage(error, copy));
    } finally {
      setOptimizingImage(false);
      photoButtonRef.current?.focus({ preventScroll: true });
    }
  }

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedText || !authorActorId || busy || optimizingImage) return;

    setBusy(true);
    setErrorMessage(null);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.set("contentText", trimmedText);
      formData.set("locale", locale);
      formData.set("authorActorId", authorActorId);

      if (image) {
        formData.set("image", image.blob, "publication.webp");
      }

      const response = await fetch("/api/publications", {
        method: "POST",
        body: formData,
      });
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
      setErrorMessage(publicationImageErrorMessage(error, copy));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={publish}
      className="mb-3 rounded-2xl border border-[#e2e6f0] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:px-5"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold text-[#4a4f6a]">
          {copy.newPublication}
        </div>
        <span className="text-[10px] text-[#9ca3b8]">
          {contentText.length}/5000
        </span>
      </div>

      <label className="mb-2 block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7c8099]">
          {copy.author}
        </span>
        <select
          value={authorActorId}
          onChange={(event) => setAuthorActorId(event.target.value)}
          disabled={busy || optimizingImage}
          className="h-9 w-full rounded-xl border border-[#dfe3f1] bg-white px-3 text-[12px] text-[#33384f] outline-none transition focus:border-[#9db3ff] focus:ring-2 focus:ring-[#e7edff] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {authorOptions.map((option) => (
            <option key={option.actorId} value={option.actorId}>
              {authorKindLabel(option.kind)} · {option.displayName}
            </option>
          ))}
        </select>
      </label>

      <textarea
        value={contentText}
        onChange={(event) => setContentText(event.target.value)}
        maxLength={5000}
        rows={3}
        placeholder={copy.publicationPlaceholder}
        className="w-full resize-y rounded-xl border border-[#dfe3f1] bg-white px-3 py-2 text-[12px] leading-5 text-[#33384f] outline-none transition placeholder:text-[#a4a9bd] focus:border-[#9db3ff] focus:ring-2 focus:ring-[#e7edff]"
      />

      {imagePreviewUrl ? (
        <div className="mt-2.5 overflow-hidden rounded-xl border border-[#e7eaf4] bg-[#f8f9fd]">
          {/* Optimized local object URL preview. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreviewUrl}
            alt=""
            className="max-h-[240px] w-full object-contain"
          />
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
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
          disabled={!trimmedText || !authorActorId || busy || optimizingImage}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#3b6ef8] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#315fd8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {busy ? copy.publishing : copy.publish}
        </button>
      </div>

      {errorMessage ? (
        <p className="mt-2 text-[11px] leading-4 text-[#b42318]">
          {errorMessage}
        </p>
      ) : null}

      {notice ? (
        <p className="mt-2 text-[11px] leading-4 text-[#16803a]">{notice}</p>
      ) : null}
    </form>
  );
}
