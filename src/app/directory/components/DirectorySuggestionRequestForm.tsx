"use client";

import { FormEvent, useState } from "react";

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

const MIN_TEXT_LENGTH = 5;
const MAX_TEXT_LENGTH = 4000;

export default function DirectorySuggestionRequestForm() {
  const [userText, setUserText] = useState("");
  const [submitStatus, setSubmitStatus] =
    useState<SuggestionSubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);

  const trimmedUserText = userText.trim();
  const isSubmitting = submitStatus === "submitting";
  const isSubmitDisabled =
    isSubmitting ||
    trimmedUserText.length < MIN_TEXT_LENGTH ||
    trimmedUserText.length > MAX_TEXT_LENGTH;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitDisabled) {
      return;
    }

    setSubmitStatus("submitting");
    setErrorMessage(null);
    setCreatedRequestId(null);

    try {
      const response = await fetch("/api/object-action/suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          userText: trimmedUserText,
          locale: "ru",
          contextCode: "business_directory",
          entityType: "general",
          requestSource: "directory_category_picker",
        }),
      });

      const json = (await response.json()) as SuggestionApiResponse;

      if (!response.ok || !json.ok || !json.suggestionRequest) {
        setSubmitStatus("error");
        setErrorMessage(
          json.error ?? "Не удалось отправить заявку. Попробуйте ещё раз."
        );
        return;
      }

      setSubmitStatus("success");
      setCreatedRequestId(json.suggestionRequest.id);
      setUserText("");
    } catch (error) {
      setSubmitStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Не удалось отправить заявку. Попробуйте ещё раз."
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
        Не нашли подходящее направление?
      </h2>

      <p
        style={{
          margin: "0 0 14px",
          color: "#1e40af",
          fontSize: "14px",
          lineHeight: "1.5",
        }}
      >
        Опишите обычными словами, чем занимается предприятие. Система сохранит
        заявку на рассмотрение. Новая категория не появится в публичном каталоге
        автоматически — сначала её должен проверить администратор.
      </p>

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
          Описание направления деятельности
          <textarea
            value={userText}
            onChange={(event) => setUserText(event.target.value)}
            placeholder="Например: Я ремонтирую электросамокаты. / У меня салон массажа и восстановления после травм. / Мы обслуживаем кофемашины для офисов."
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
                trimmedUserText.length > MAX_TEXT_LENGTH ? "#a40000" : "#1e40af",
              fontSize: "13px",
              lineHeight: "1.4",
            }}
          >
            {trimmedUserText.length}/{MAX_TEXT_LENGTH} символов. Минимум:{" "}
            {MIN_TEXT_LENGTH}.
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
            {isSubmitting ? "Отправляем..." : "Отправить на рассмотрение"}
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
          <strong>Заявка отправлена.</strong> Она сохранена со статусом{" "}
          <strong>needs_review</strong> и не будет опубликована без модерации.
          {createdRequestId ? (
            <div
              style={{
                marginTop: "6px",
                fontSize: "13px",
                color: "#166534",
              }}
            >
              ID заявки: {createdRequestId}
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
          <strong>Ошибка отправки.</strong>{" "}
          {errorMessage ?? "Попробуйте ещё раз."}
        </div>
      ) : null}
    </section>
  );
}