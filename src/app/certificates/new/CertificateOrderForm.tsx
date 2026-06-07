"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

type AuthUser = {
  readonly name?: unknown;
  readonly nickname?: unknown;
  readonly given_name?: unknown;
  readonly family_name?: unknown;
  readonly email?: unknown;
};

type MeApiResponse = {
  readonly user?: AuthUser | null;
  readonly profile?: AuthUser | null;
  readonly name?: unknown;
  readonly nickname?: unknown;
  readonly given_name?: unknown;
  readonly family_name?: unknown;
  readonly email?: unknown;
  readonly error?: string;
};

type CertificateRequestResponse = {
  readonly ok?: boolean;
  readonly error?: string;
  readonly result?: {
    readonly certificate_id?: string;
    readonly certificate_code?: string;
    readonly status?: string;
    readonly points_status?: string;
    readonly points_reserved?: number;
    readonly available_balance_after?: number;
    readonly reserved_balance_after?: number;
  };
  readonly certificate?: {
    readonly certificate_id?: string;
    readonly certificate_code?: string;
    readonly status?: string;
    readonly points_status?: string;
    readonly points_reserved?: number;
  };
};

type CreatedCertificateView = {
  readonly certificateId: string;
  readonly certificateCode: string;
  readonly status: string;
  readonly pointsStatus: string;
  readonly pointsReserved: number;
};

type CertificateOrderFormProps = {
  readonly offerId: string;
  readonly offerTitle: string;
  readonly organizationName: string;
  readonly canOrderCertificate: boolean;
};

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractUser(payload: MeApiResponse): AuthUser | null {
  if (isRecord(payload.user)) {
    return payload.user as AuthUser;
  }

  if (isRecord(payload.profile)) {
    return payload.profile as AuthUser;
  }

  if (
    getString(payload.name) ||
    getString(payload.email) ||
    getString(payload.nickname)
  ) {
    return payload as AuthUser;
  }

  return null;
}

function buildDisplayName(user: AuthUser | null) {
  if (!user) {
    return "";
  }

  const directName = getString(user.name);

  if (directName) {
    return directName;
  }

  const givenName = getString(user.given_name);
  const familyName = getString(user.family_name);
  const combinedName = [givenName, familyName].filter(Boolean).join(" ").trim();

  if (combinedName) {
    return combinedName;
  }

  const nickname = getString(user.nickname);

  if (nickname) {
    return nickname;
  }

  const email = getString(user.email);

  if (email.includes("@")) {
    return email.split("@")[0] ?? "";
  }

  return email;
}

function extractCreatedCertificate(
  payload: CertificateRequestResponse,
): CreatedCertificateView | null {
  const source = payload.result ?? payload.certificate ?? null;

  if (!source) {
    return null;
  }

  const certificateCode = getString(source.certificate_code);
  const certificateId = getString(source.certificate_id);

  if (!certificateCode && !certificateId) {
    return null;
  }

  return {
    certificateId,
    certificateCode,
    status: getString(source.status) || "created",
    pointsStatus: getString(source.points_status) || "reserved",
    pointsReserved: getNumber(source.points_reserved),
  };
}

export default function CertificateOrderForm({
  offerId,
  offerTitle,
  organizationName,
  canOrderCertificate,
}: CertificateOrderFormProps) {
  const [receiverName, setReceiverName] = useState("");
  const [receiverEmail, setReceiverEmail] = useState("");
  const [message, setMessage] = useState("");
  const [profileStatus, setProfileStatus] = useState(
    "Пробую заполнить данные из вашего профиля...",
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [createdCertificate, setCreatedCertificate] =
    useState<CreatedCertificateView | null>(null);

  const userEditedNameRef = useRef(false);
  const userEditedEmailRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      try {
        const response = await fetch("/api/me", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!response.ok) {
          if (isMounted) {
            setProfileStatus(
              "Не удалось автоматически загрузить профиль. Поля можно заполнить вручную.",
            );
          }

          return;
        }

        const payload = (await response.json()) as MeApiResponse;
        const user = extractUser(payload);
        const nextName = buildDisplayName(user);
        const nextEmail = getString(user?.email);

        if (!isMounted) {
          return;
        }

        if (nextName && !userEditedNameRef.current) {
          setReceiverName(nextName);
        }

        if (nextEmail && !userEditedEmailRef.current) {
          setReceiverEmail(nextEmail);
        }

        if (nextName || nextEmail) {
          setProfileStatus(
            "Данные получателя заполнены из вашего профиля. Их можно изменить, если сертификат нужен другому человеку.",
          );
        } else {
          setProfileStatus(
            "В профиле не найдено имя или email. Заполните данные получателя вручную.",
          );
        }
      } catch {
        if (isMounted) {
          setProfileStatus(
            "Не удалось автоматически загрузить профиль. Поля можно заполнить вручную.",
          );
        }
      }
    }

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const canSubmit = useMemo(() => {
    return (
      canOrderCertificate &&
      !isSubmitting &&
      offerId.trim().length > 0 &&
      receiverName.trim().length >= 2 &&
      receiverEmail.trim().includes("@")
    );
  }, [canOrderCertificate, isSubmitting, offerId, receiverEmail, receiverName]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitMessage("");
    setSubmitError("");
    setCreatedCertificate(null);

    if (!canOrderCertificate) {
      setSubmitError("Сертификат для этого предложения сейчас недоступен.");
      return;
    }

    if (receiverName.trim().length < 2) {
      setSubmitError("Введите имя получателя.");
      return;
    }

    if (!receiverEmail.trim().includes("@")) {
      setSubmitError("Введите корректный email получателя.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/certificates/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          offerId,
          receiverPersonName: receiverName.trim(),
          receiverEmail: receiverEmail.trim(),
          message: message.trim() || null,
        }),
      });

      const payload = (await response.json()) as CertificateRequestResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Не удалось получить сертификат.");
      }

      const certificate = extractCreatedCertificate(payload);

      setCreatedCertificate(certificate);
      setSubmitMessage(
        "Сертификат создан. Он должен появиться в списке заказанных сертификатов в личном кабинете.",
      );
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Неизвестная ошибка получения сертификата.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="mb-5 border-b border-[#edf0f7] pb-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7c8099]">
          Certificate order
        </div>

        <h2 className="mt-2 text-[26px] font-bold tracking-[-0.03em] text-[#111827]">
          Получить сертификат
        </h2>

        <p className="mt-2 max-w-[820px] text-[14px] leading-6 text-[#5a5f7a]">
          Сертификат создаётся на базе выбранного предложения предприятия.
          Получателем по умолчанию является залогиненный пользователь, но данные
          можно изменить, если сертификат покупается в подарок.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5">
        <section className="grid gap-4 rounded-2xl border border-[#dbeafe] bg-[#eff6ff] p-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1d4ed8]">
              Получатель сертификата
            </div>

            <p className="mt-2 text-[13px] leading-5 text-[#1d4ed8]">
              {profileStatus}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-[13px] font-semibold text-[#1e3a8a]">
                Имя получателя
              </span>
              <input
                type="text"
                name="receiver_person_name"
                value={receiverName}
                onChange={(event) => {
                  userEditedNameRef.current = true;
                  setReceiverName(event.target.value);
                }}
                placeholder="Например: Anna Kowalska"
                disabled={!canOrderCertificate || isSubmitting}
                className="w-full rounded-xl border border-[#bfdbfe] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10 disabled:cursor-not-allowed disabled:bg-[#f1f5f9] disabled:text-[#94a3b8]"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-[13px] font-semibold text-[#1e3a8a]">
                Email получателя
              </span>
              <input
                type="email"
                name="receiver_email"
                value={receiverEmail}
                onChange={(event) => {
                  userEditedEmailRef.current = true;
                  setReceiverEmail(event.target.value);
                }}
                placeholder="email@example.com"
                disabled={!canOrderCertificate || isSubmitting}
                className="w-full rounded-xl border border-[#bfdbfe] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10 disabled:cursor-not-allowed disabled:bg-[#f1f5f9] disabled:text-[#94a3b8]"
              />
            </label>
          </div>

          <div className="rounded-xl border border-[#bfdbfe] bg-white px-4 py-3 text-[12px] leading-5 text-[#4a4f6a]">
            Если сертификат покупается для вас — оставьте данные без изменений.
            Если это подарок — замените имя и email на данные получателя.
          </div>
        </section>

        <label className="grid gap-2">
          <span className="text-[13px] font-semibold text-[#343854]">
            Сообщение для получателя
          </span>
          <textarea
            name="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Например: Życzę miłego odpoczynku i regeneracji."
            disabled={!canOrderCertificate || isSubmitting}
            rows={4}
            className="w-full resize-y rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] leading-6 text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10 disabled:cursor-not-allowed disabled:bg-[#f1f5f9] disabled:text-[#94a3b8]"
          />
        </label>

        <section className="rounded-2xl border border-[#edf0f7] bg-[#f8f9fd] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
            Что будет создано
          </div>

          <div className="mt-2 grid gap-2 text-[13px] leading-5 text-[#5a5f7a]">
            <p className="m-0">
              <strong className="text-[#343854]">Предприятие:</strong>{" "}
              {organizationName}
            </p>
            <p className="m-0">
              <strong className="text-[#343854]">Предложение:</strong>{" "}
              {offerTitle}
            </p>
            <p className="m-0">
              <strong className="text-[#343854]">Email:</strong> пока не
              отправляем. TODO: подключить email-уведомление после проверки
              сертификатного flow.
            </p>
          </div>
        </section>

        {submitError ? (
          <div className="rounded-xl border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-[13px] font-medium text-[#b42318]">
            {submitError}
          </div>
        ) : null}

        {submitMessage ? (
          <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[13px] font-medium text-[#166534]">
            {submitMessage}
          </div>
        ) : null}

        {createdCertificate ? (
          <section className="rounded-[18px] border border-[#bbf7d0] bg-[#f0fdf4] p-5 text-[#14532d]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#15803d]">
              Сертификат создан
            </div>

            <h3 className="mt-2 text-[22px] font-bold">
              {createdCertificate.certificateCode || "Код будет доступен в кабинете"}
            </h3>

            <div className="mt-3 grid gap-2 text-[13px] leading-5 text-[#166534]">
              <p className="m-0">
                <strong>ID:</strong>{" "}
                {createdCertificate.certificateId || "не указан"}
              </p>
              <p className="m-0">
                <strong>Статус:</strong> {createdCertificate.status}
              </p>
              <p className="m-0">
                <strong>POINTS:</strong> {createdCertificate.pointsStatus}; reserved{" "}
                {createdCertificate.pointsReserved}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/my-certificates"
                className="rounded-xl bg-[#3b6ef8] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#2f5fe3]"
              >
                Мои сертификаты
              </Link>

              <Link
                href="/certificates"
                className="rounded-xl border border-[#bbf7d0] bg-white px-4 py-3 text-[13px] font-bold text-[#15803d] transition hover:bg-[#dcfce7]"
              >
                Все сертификаты
              </Link>
            </div>
          </section>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-[#3b6ef8] px-5 py-3 text-[14px] font-bold text-white shadow-[0_10px_20px_rgba(59,110,248,0.24)] transition hover:bg-[#2f5fe3] disabled:cursor-not-allowed disabled:bg-[#aeb6c8] disabled:shadow-none"
        >
          {isSubmitting ? "Создаю сертификат..." : "Получить сертификат"}
        </button>
      </form>
    </section>
  );
}
