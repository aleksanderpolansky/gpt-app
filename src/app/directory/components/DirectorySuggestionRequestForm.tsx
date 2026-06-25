"use client";

import { FormEvent, useState } from "react";


import {
  getDirectoryListMessage,
  type DirectoryListMessageKey,
} from "@/i18n/messages/directory-list";
import type { LocaleCode } from "@/i18n";
type SuggestionSubmitStatus = "idle" | "submitting" | "success" | "error";

type SuggestionApiResponse = {
  ok: boolean;
  suggestionRequest?: {
    id: string;
    user_text: string;
    locale: string;
    context_code: string;
    entity_type: string;
    entity_id: string | null;
    request_source: string;
    ai_status: string;
    status: string;
    created_at: string;
  };
  error?: string;
};

type DirectorySuggestionRequestFormProps = {
  title?: string;
  description?: string;
  textareaLabel?: string;
  textareaPlaceholder?: string;
  submitButtonLabel?: string;
  successTitle?: string;
  entityType?: "general" | "organization";
  entityId?: string | null;
  requestSource?: string;
  locale?: LocaleCode;
  contextCode?: string;
  initialText?: string;
  initialProposedCategoryText?: string;
  proposedCategoryLabel?: string;
  proposedCategoryPlaceholder?: string;
  showProposedCategoryField?: boolean;
};

const MIN_TEXT_LENGTH = 5;
const MAX_TEXT_LENGTH = 4000;
const MAX_PROPOSED_CATEGORY_LENGTH = 200;

const DEFAULT_GENERAL_TITLE_KEY: DirectoryListMessageKey = "directoryList.suggestion.generalTitle";
const DEFAULT_ORGANIZATION_TITLE_KEY: DirectoryListMessageKey = "directoryList.suggestion.organizationTitle";

const DEFAULT_GENERAL_DESCRIPTION_KEY: DirectoryListMessageKey = "directoryList.suggestion.generalDescription";

const DEFAULT_ORGANIZATION_DESCRIPTION_KEY: DirectoryListMessageKey = "directoryList.suggestion.organizationDescription";

const DEFAULT_TEXTAREA_LABEL_KEY: DirectoryListMessageKey = "directoryList.suggestion.textareaLabel";

const DEFAULT_GENERAL_PLACEHOLDER =
  "Example: electric scooters / massage and injury recovery studio / coffee machine maintenance for offices.";

const DEFAULT_ORGANIZATION_PLACEHOLDER =
  "Example: This company provides massage, wellness and recovery services for clients.";

const DEFAULT_PROPOSED_CATEGORY_LABEL_KEY: DirectoryListMessageKey = "directoryList.suggestion.proposedCategoryLabel";
const DEFAULT_PROPOSED_CATEGORY_PLACEHOLDER_KEY: DirectoryListMessageKey = "directoryList.suggestion.proposedCategoryPlaceholder";

function normalizeTextValue(value: string | null | undefined) {
  return value?.trim() ?? "";
}

export default function DirectorySuggestionRequestForm({
  title,
  description,
  textareaLabel,
  textareaPlaceholder,
  submitButtonLabel,
  successTitle,
  entityType = "general",
  entityId = null,
  requestSource = "directory_category_picker",
  locale = "ru",
  contextCode = "business_directory",
  initialText = "",
  initialProposedCategoryText = "",
  proposedCategoryLabel,
  proposedCategoryPlaceholder = DEFAULT_PROPOSED_CATEGORY_PLACEHOLDER_KEY,
  showProposedCategoryField,
}: DirectorySuggestionRequestFormProps) {
    const t = (key: DirectoryListMessageKey) => getDirectoryListMessage(key, locale);

const normalizedEntityType = entityType;
  const normalizedEntityId = normalizeTextValue(entityId);
  const shouldShowProposedCategoryField =
    showProposedCategoryField ?? normalizedEntityType === "organization";

  const [userText, setUserText] = useState(initialText);
  const [proposedCategoryText, setProposedCategoryText] = useState(
    initialProposedCategoryText
  );
  const [submitStatus, setSubmitStatus] =
    useState<SuggestionSubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);

  const trimmedUserText = userText.trim();
  const trimmedProposedCategoryText = proposedCategoryText.trim();
  const isSubmitting = submitStatus === "submitting";

  const isProposedCategoryTooLong =
    trimmedProposedCategoryText.length > MAX_PROPOSED_CATEGORY_LENGTH;

  const isSubmitDisabled =
    isSubmitting ||
    trimmedUserText.length < MIN_TEXT_LENGTH ||
    trimmedUserText.length > MAX_TEXT_LENGTH ||
    isProposedCategoryTooLong;

  const effectiveTitle =
    title ??
    t(
      normalizedEntityType === "organization"
        ? DEFAULT_ORGANIZATION_TITLE_KEY
        : DEFAULT_GENERAL_TITLE_KEY,
    );

  const effectiveDescription =
    description ??
    t(
      normalizedEntityType === "organization"
        ? DEFAULT_ORGANIZATION_DESCRIPTION_KEY
        : DEFAULT_GENERAL_DESCRIPTION_KEY,
    );

  const effectiveTextareaPlaceholder =
    textareaPlaceholder ??
    (normalizedEntityType === "organization"
      ? DEFAULT_ORGANIZATION_PLACEHOLDER
      : DEFAULT_GENERAL_PLACEHOLDER);
  const effectiveTextareaLabel =
    textareaLabel ?? t("directoryList.suggestion.textareaLabel");
  const effectiveSubmitButtonLabel =
    submitButtonLabel ?? t("directoryList.suggestion.submitButton");
  const effectiveSuccessTitle =
    successTitle ?? t("directoryList.suggestion.successTitle");
  const effectiveProposedCategoryLabel =
    proposedCategoryLabel ?? t("directoryList.suggestion.proposedCategoryLabel");





  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitDisabled) {
      return;
    }

    setSubmitStatus("submitting");
    setErrorMessage(null);
    setCreatedRequestId(null);

    const requestBody: {
      userText: string;
      locale: string;
      contextCode: string;
      entityType: string;
      entityId?: string;
      requestSource: string;
      proposedCategoryText?: string;
    } = {
      userText: trimmedUserText,
      locale,
      contextCode,
      entityType: normalizedEntityType,
      requestSource,
    };

    if (normalizedEntityId) {
      requestBody.entityId = normalizedEntityId;
    }

    if (trimmedProposedCategoryText) {
      requestBody.proposedCategoryText = trimmedProposedCategoryText;
    }

    try {
      const response = await fetch("/api/object-action/suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(requestBody),
      });

      const json = (await response.json()) as SuggestionApiResponse;

      if (!response.ok || !json.ok || !json.suggestionRequest) {
        setSubmitStatus("error");
        setErrorMessage(
          json.error ?? t("directoryList.suggestion.defaultError")
        );
        return;
      }

      setSubmitStatus("success");
      setCreatedRequestId(json.suggestionRequest.id);
      setUserText("");
      setProposedCategoryText("");
    } catch (error) {
      setSubmitStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t("directoryList.suggestion.defaultError")
      );
    }
  }

  return (
    <section
      style={{
        border: "1px solid #bfdbfe",
        borderRadius: "16px",
        padding: "20px",
        background: "#eff6ff",
        marginBottom: "24px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
      }}
    >
      <h2
        style={{
          margin: "0 0 8px",
          fontSize: "22px",
          color: "#1e3a8a",
        }}
      >
        {effectiveTitle}
      </h2>

      <p
        style={{
          margin: "0 0 14px",
          color: "#1e40af",
          fontSize: "14px",
          lineHeight: "1.5",
        }}
      >
        {effectiveDescription}
      </p>

      {normalizedEntityType === "organization" && normalizedEntityId ? (
        <p
          style={{
            margin: "0 0 14px",
            color: "#1e40af",
            fontSize: "13px",
            lineHeight: "1.5",
          }}
        >
          Organization request mode. Entity ID:{" "}
          <code
            style={{
              background: "#dbeafe",
              borderRadius: "6px",
              padding: "2px 5px",
              color: "#1e3a8a",
              fontWeight: 700,
            }}
          >
            {normalizedEntityId}
          </code>
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: "12px",
        }}
      >
        <label
          style={{
            display: "grid",
            gap: "7px",
            fontWeight: 700,
            color: "#1e3a8a",
          }}
        >
          {effectiveTextareaLabel}
          <textarea
            value={userText}
            onChange={(event) => setUserText(event.target.value)}
            placeholder={effectiveTextareaPlaceholder}
            rows={4}
            maxLength={MAX_TEXT_LENGTH}
            disabled={isSubmitting}
            style={{
              border: "1px solid #93c5fd",
              borderRadius: "10px",
              padding: "12px",
              fontSize: "15px",
              fontWeight: 400,
              background: "#ffffff",
              color: "#111111",
              resize: "vertical",
              minHeight: "96px",
            }}
          />
        </label>

        {shouldShowProposedCategoryField ? (
          <label
            style={{
              display: "grid",
              gap: "7px",
              fontWeight: 700,
              color: "#1e3a8a",
            }}
          >
            {effectiveProposedCategoryLabel}
            <input
              type="text"
              value={proposedCategoryText}
              onChange={(event) =>
                setProposedCategoryText(event.target.value)
              }
              placeholder={proposedCategoryPlaceholder}
              maxLength={MAX_PROPOSED_CATEGORY_LENGTH}
              disabled={isSubmitting}
              style={{
                border: "1px solid #93c5fd",
                borderRadius: "10px",
                padding: "12px",
                fontSize: "15px",
                fontWeight: 400,
                background: "#ffffff",
                color: "#111111",
              }}
            />
          </label>
        ) : null}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              color:
                trimmedUserText.length > MAX_TEXT_LENGTH ||
                isProposedCategoryTooLong
                  ? "#a40000"
                  : "#1e40af",
              fontSize: "13px",
              lineHeight: "1.4",
            }}
          >
            {t("directoryList.suggestion.descriptionCounter")}: {trimmedUserText.length}/{MAX_TEXT_LENGTH} {t("directoryList.suggestion.characters")}.
            Minimum: {MIN_TEXT_LENGTH}.
            {shouldShowProposedCategoryField ? (
              <>
                {" "}
                Suggested category: {trimmedProposedCategoryText.length}/
                {MAX_PROPOSED_CATEGORY_LENGTH}.
              </>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitDisabled}
            style={{
              border: isSubmitDisabled
                ? "1px solid #cbd5e1"
                : "1px solid #2563eb",
              borderRadius: "8px",
              padding: "11px 14px",
              background: isSubmitDisabled ? "#e5e7eb" : "#2563eb",
              color: isSubmitDisabled ? "#64748b" : "#ffffff",
              fontWeight: 800,
              cursor: isSubmitDisabled ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? t("directoryList.suggestion.sending") : effectiveSubmitButtonLabel}
          </button>
        </div>
      </form>

      {submitStatus === "success" ? (
        <div
          style={{
            marginTop: "14px",
            border: "1px solid #bbf7d0",
            borderRadius: "10px",
            padding: "12px",
            background: "#f0fdf4",
            color: "#166534",
            lineHeight: "1.5",
          }}
        >
          <strong>{effectiveSuccessTitle}</strong> {t("directoryList.suggestion.savedWithStatus")}{" "}
          <strong>needs_review</strong> {t("directoryList.suggestion.notPublishedWithoutApproval")}
          moderation.
          {createdRequestId ? (
            <div
              style={{
                marginTop: "6px",
                fontSize: "13px",
                color: "#166534",
              }}
            >
              Request ID: {createdRequestId}
            </div>
          ) : null}
        </div>
      ) : null}

      {submitStatus === "error" ? (
        <div
          style={{
            marginTop: "14px",
            border: "1px solid #f2b8b5",
            borderRadius: "10px",
            padding: "12px",
            background: "#fff5f5",
            color: "#a40000",
            lineHeight: "1.5",
          }}
        >
          <strong>{t("directoryList.suggestion.errorTitle")}</strong>{" "}
          {errorMessage ?? t("directoryList.suggestion.pleaseTryAgain")}
        </div>
      ) : null}
    </section>
  );
}
