import { createHash } from "node:crypto";

import Link from "next/link";

import {
  ActorContextError,
  resolveActiveActorContext,
  type ResolvedActorContext,
} from "../../../../lib/actor-context";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";
import {
  buildGiftCertificateLocaleHref,
  formatGiftCertificateDate,
  normalizeGiftCertificateLocale,
} from "../../certificates/gift-certificate-copy";
import { RegisterGiftCertificateCheckinButton } from "./register-gift-certificate-checkin-button";

export const dynamic = "force-dynamic";

type ScanPageProps = {
  readonly searchParams?: Promise<{
    readonly session?: string | string[];
    readonly token?: string | string[];
    readonly locale?: string | string[];
  }>;
};

type SessionRow = {
  readonly id: string;
  readonly planned_activity_event_id: string;
  readonly recipient_user_id: string;
  readonly recipient_actor_id: string;
  readonly public_code_snapshot: string;
  readonly token_hash: string;
  readonly token_version: string;
  readonly status: string;
  readonly issued_at: string;
  readonly expires_at: string;
  readonly consumed_at: string | null;
};

type TermsRow = {
  readonly activity_event_id: string;
  readonly value_object_id: string;
  readonly provider_owner_user_id: string;
  readonly provider_manager_actor_id: string;
  readonly provider_actor_id: string;
  readonly lifecycle_status: string;
  readonly available_from: string;
  readonly available_until: string;
  readonly public_code: string | null;
  readonly recipient_user_id: string | null;
  readonly recipient_actor_id: string | null;
};

type CheckinRow = {
  readonly id: string;
  readonly status: string;
  readonly checked_in_at: string;
};

type Copy = {
  readonly eyebrow: string;
  readonly title: string;
  readonly invalidQr: string;
  readonly signIn: string;
  readonly unauthorized: string;
  readonly activeProfile: string;
  readonly certificate: string;
  readonly publicCode: string;
  readonly provider: string;
  readonly buyer: string;
  readonly validity: string;
  readonly state: string;
  readonly qrExpiry: string;
  readonly ready: string;
  readonly checkedIn: string;
  readonly checkedInAt: string;
  readonly warningTitle: string;
  readonly warningText: string;
  readonly noFinalConfirmation: string;
  readonly confirmButton: string;
  readonly processing: string;
  readonly confirmation: string;
  readonly success: string;
  readonly genericError: string;
  readonly inactive: string;
  readonly expired: string;
  readonly alreadyCheckedIn: string;
  readonly back: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RAW_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const EN: Copy = {
  eyebrow: "Provider check-in",
  title: "Register buyer arrival",
  invalidQr: "This live QR is invalid or incomplete.",
  signIn: "Sign in with the provider owner's account.",
  unauthorized: "The active account and profile do not manage this provider.",
  activeProfile: "Active managing profile",
  certificate: "Certificate",
  publicCode: "Public code",
  provider: "Provider",
  buyer: "Buyer",
  validity: "Validity",
  state: "State",
  qrExpiry: "Live QR expires",
  ready: "Ready for check-in",
  checkedIn: "Arrival registered",
  checkedInAt: "Registered",
  warningTitle: "Register arrival",
  warningText:
    "Confirm that the person presenting this live QR is physically present and is being admitted under this certificate.",
  noFinalConfirmation:
    "This records arrival only. It does not confirm completion, spend POINTS, or change reputation.",
  confirmButton: "Register arrival",
  processing: "Registering…",
  confirmation:
    "Is the person presenting this live QR physically present and being admitted under this certificate?",
  success: "Buyer arrival has been registered.",
  genericError: "Arrival could not be registered.",
  inactive: "This certificate cannot be checked in now.",
  expired: "The live QR has expired.",
  alreadyCheckedIn: "Arrival has already been registered.",
  back: "Open certificate details",
};

const COPY: Record<string, Copy> = {
  en: EN,
  pl: {
    ...EN,
    eyebrow: "Rejestracja u dostawcy",
    title: "Zarejestruj przybycie kupującego",
    invalidQr: "Ten żywy QR jest nieprawidłowy lub niekompletny.",
    signIn: "Zaloguj się na konto właściciela dostawcy.",
    unauthorized: "Aktywne konto i profil nie zarządzają tym dostawcą.",
    activeProfile: "Aktywny profil zarządzający",
    certificate: "Bon",
    publicCode: "Kod publiczny",
    provider: "Dostawca",
    buyer: "Kupujący",
    validity: "Ważność",
    state: "Stan",
    qrExpiry: "Żywy QR wygasa",
    ready: "Gotowy do rejestracji",
    checkedIn: "Przybycie zarejestrowane",
    checkedInAt: "Zarejestrowano",
    warningTitle: "Zarejestruj przybycie",
    warningText:
      "Potwierdź, że osoba pokazująca ten żywy QR jest obecna i zostaje przyjęta na podstawie bonu.",
    noFinalConfirmation:
      "To rejestruje tylko przybycie. Nie potwierdza zakończenia, nie zmienia POINTS ani reputacji.",
    confirmButton: "Zarejestruj przybycie",
    processing: "Rejestrowanie…",
    confirmation:
      "Czy osoba pokazująca ten żywy QR jest obecna i zostaje przyjęta?",
    success: "Przybycie kupującego zostało zarejestrowane.",
    genericError: "Nie udało się zarejestrować przybycia.",
    inactive: "Tego bonu nie można teraz zarejestrować.",
    expired: "Żywy QR wygasł.",
    alreadyCheckedIn: "Przybycie zostało już zarejestrowane.",
    back: "Otwórz szczegóły bonu",
  },
  ru: {
    ...EN,
    eyebrow: "Регистрация у предоставляющего",
    title: "Зарегистрировать приход покупателя",
    invalidQr: "Этот живой QR недействителен или неполон.",
    signIn: "Войдите под учётной записью владельца предоставляющего.",
    unauthorized:
      "Текущая учётная запись и профиль не управляют этим предоставляющим.",
    activeProfile: "Активный управляющий профиль",
    certificate: "Сертификат",
    publicCode: "Публичный код",
    provider: "Предоставляющий",
    buyer: "Покупатель",
    validity: "Срок действия",
    state: "Состояние",
    qrExpiry: "Живой QR действует до",
    ready: "Готов к регистрации прихода",
    checkedIn: "Приход зарегистрирован",
    checkedInAt: "Зарегистрирован",
    warningTitle: "Регистрация прихода",
    warningText:
      "Подтвердите, что человек, показывающий этот живой QR, действительно находится перед вами и допускается по этому сертификату.",
    noFinalConfirmation:
      "Это фиксирует только приход. Завершение услуги не подтверждается, POINTS и репутация не меняются.",
    confirmButton: "Зарегистрировать приход",
    processing: "Регистрация…",
    confirmation:
      "Человек, показывающий этот живой QR, действительно находится перед вами и допускается по сертификату?",
    success: "Приход покупателя зарегистрирован.",
    genericError: "Не удалось зарегистрировать приход.",
    inactive: "Сейчас зарегистрировать приход по этому сертификату нельзя.",
    expired: "Срок действия живого QR закончился.",
    alreadyCheckedIn: "Приход уже зарегистрирован.",
    back: "Открыть подробности сертификата",
  },
  uk: {
    ...EN,
    eyebrow: "Реєстрація у надавача",
    title: "Зареєструвати прибуття покупця",
    invalidQr: "Цей живий QR недійсний або неповний.",
    signIn: "Увійдіть під обліковим записом власника надавача.",
    unauthorized: "Поточний обліковий запис і профіль не керують цим надавачем.",
    activeProfile: "Активний керівний профіль",
    certificate: "Сертифікат",
    publicCode: "Публічний код",
    provider: "Надавач",
    buyer: "Покупець",
    validity: "Строк дії",
    state: "Стан",
    qrExpiry: "Живий QR діє до",
    ready: "Готовий до реєстрації",
    checkedIn: "Прибуття зареєстровано",
    checkedInAt: "Зареєстровано",
    warningTitle: "Реєстрація прибуття",
    warningText:
      "Підтвердьте, що людина з цим живим QR дійсно присутня та допускається за сертифікатом.",
    noFinalConfirmation:
      "Це фіксує лише прибуття. Завершення, POINTS і репутація не змінюються.",
    confirmButton: "Зареєструвати прибуття",
    processing: "Реєстрація…",
    confirmation:
      "Людина з цим живим QR дійсно присутня та допускається?",
    success: "Прибуття покупця зареєстровано.",
    genericError: "Не вдалося зареєструвати прибуття.",
    inactive: "Зараз реєстрація за цим сертифікатом неможлива.",
    expired: "Строк дії живого QR завершився.",
    alreadyCheckedIn: "Прибуття вже зареєстровано.",
    back: "Відкрити деталі сертифіката",
  },
  de: {
    ...EN,
    eyebrow: "Check-in beim Anbieter",
    title: "Ankunft des Käufers registrieren",
    invalidQr: "Dieser Live-QR ist ungültig oder unvollständig.",
    signIn: "Melden Sie sich mit dem Konto des Anbieterinhabers an.",
    unauthorized: "Das aktive Konto und Profil verwalten diesen Anbieter nicht.",
    activeProfile: "Aktives Verwaltungsprofil",
    certificate: "Gutschein",
    publicCode: "Öffentlicher Code",
    provider: "Anbieter",
    buyer: "Käufer",
    validity: "Gültigkeit",
    state: "Status",
    qrExpiry: "Live-QR läuft ab",
    ready: "Bereit zum Check-in",
    checkedIn: "Ankunft registriert",
    checkedInAt: "Registriert",
    warningTitle: "Ankunft registrieren",
    warningText:
      "Bestätigen Sie, dass die Person mit diesem Live-QR anwesend ist und zugelassen wird.",
    noFinalConfirmation:
      "Dies registriert nur die Ankunft. Abschluss, POINTS und Reputation bleiben unverändert.",
    confirmButton: "Ankunft registrieren",
    processing: "Registrierung…",
    confirmation:
      "Ist die Person mit diesem Live-QR anwesend und wird sie zugelassen?",
    success: "Die Ankunft wurde registriert.",
    genericError: "Die Ankunft konnte nicht registriert werden.",
    inactive: "Dieser Gutschein kann jetzt nicht eingecheckt werden.",
    expired: "Der Live-QR ist abgelaufen.",
    alreadyCheckedIn: "Die Ankunft wurde bereits registriert.",
    back: "Gutscheindetails öffnen",
  },
  es: {
    ...EN,
    eyebrow: "Registro con el proveedor",
    title: "Registrar la llegada del comprador",
    invalidQr: "Este QR activo no es válido o está incompleto.",
    signIn: "Inicia sesión con la cuenta del propietario del proveedor.",
    unauthorized: "La cuenta y el perfil activos no gestionan a este proveedor.",
    activeProfile: "Perfil gestor activo",
    certificate: "Certificado",
    publicCode: "Código público",
    provider: "Proveedor",
    buyer: "Comprador",
    validity: "Validez",
    state: "Estado",
    qrExpiry: "El QR activo caduca",
    ready: "Listo para registrar",
    checkedIn: "Llegada registrada",
    checkedInAt: "Registrado",
    warningTitle: "Registrar llegada",
    warningText:
      "Confirma que la persona que muestra este QR está presente y será admitida.",
    noFinalConfirmation:
      "Solo registra la llegada. No confirma la finalización ni cambia POINTS o reputación.",
    confirmButton: "Registrar llegada",
    processing: "Registrando…",
    confirmation:
      "¿La persona que muestra este QR está presente y será admitida?",
    success: "La llegada del comprador ha sido registrada.",
    genericError: "No se pudo registrar la llegada.",
    inactive: "Este certificado no se puede registrar ahora.",
    expired: "El QR activo ha caducado.",
    alreadyCheckedIn: "La llegada ya ha sido registrada.",
    back: "Abrir detalles del certificado",
  },
  cs: {
    ...EN,
    eyebrow: "Registrace u poskytovatele",
    title: "Zaregistrovat příchod kupujícího",
    invalidQr: "Tento živý QR je neplatný nebo neúplný.",
    signIn: "Přihlaste se účtem vlastníka poskytovatele.",
    unauthorized: "Aktivní účet a profil tohoto poskytovatele nespravují.",
    activeProfile: "Aktivní správcovský profil",
    certificate: "Certifikát",
    publicCode: "Veřejný kód",
    provider: "Poskytovatel",
    buyer: "Kupující",
    validity: "Platnost",
    state: "Stav",
    qrExpiry: "Živý QR vyprší",
    ready: "Připraven k registraci",
    checkedIn: "Příchod zaregistrován",
    checkedInAt: "Zaregistrováno",
    warningTitle: "Zaregistrovat příchod",
    warningText:
      "Potvrďte, že osoba s tímto živým QR skutečně přišla a je přijímána.",
    noFinalConfirmation:
      "Zaznamená se pouze příchod. Dokončení, POINTS ani reputace se nemění.",
    confirmButton: "Zaregistrovat příchod",
    processing: "Registrace…",
    confirmation:
      "Je osoba s tímto živým QR přítomna a je přijímána?",
    success: "Příchod kupujícího byl zaregistrován.",
    genericError: "Příchod se nepodařilo zaregistrovat.",
    inactive: "Tento certifikát nyní nelze zaregistrovat.",
    expired: "Platnost živého QR skončila.",
    alreadyCheckedIn: "Příchod již byl zaregistrován.",
    back: "Otevřít podrobnosti certifikátu",
  },
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function resolveOptionalViewer(): Promise<ResolvedActorContext | null> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) return null;

  try {
    return await resolveActiveActorContext(session.user.sub);
  } catch (error) {
    if (error instanceof ActorContextError) return null;
    throw error;
  }
}

function formatDateTime(value: string, locale: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(
        locale === "en" ? "en-US" : locale,
        { dateStyle: "medium", timeStyle: "medium" },
      ).format(date);
}

function InvalidQr({ copy }: { readonly copy: Copy }) {
  return (
    <main className="min-h-screen bg-[#f3f6fb] px-4 py-10">
      <section className="mx-auto max-w-3xl rounded-[28px] border border-[#fecaca] bg-white p-6 shadow-sm">
        <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#b91c1c]">
          {copy.eyebrow}
        </div>
        <h1 className="mt-3 text-3xl font-black text-[#111827]">
          {copy.title}
        </h1>
        <p className="mt-4 text-[15px] font-semibold text-[#b91c1c]">
          {copy.invalidQr}
        </p>
      </section>
    </main>
  );
}

export default async function GiftCertificateScanPage({
  searchParams,
}: ScanPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const locale = normalizeGiftCertificateLocale(params?.locale);
  const copy = COPY[locale] ?? COPY.en;
  const qrSessionId = firstValue(params?.session)?.trim();
  const rawToken = firstValue(params?.token)?.trim();

  const qrShapeValid =
    Boolean(qrSessionId && UUID_PATTERN.test(qrSessionId)) &&
    Boolean(rawToken && RAW_TOKEN_PATTERN.test(rawToken));

  if (!qrShapeValid || !qrSessionId || !rawToken) {
    return <InvalidQr copy={copy} />;
  }

  const tokenHash = createHash("sha256")
    .update(rawToken, "utf8")
    .digest("hex");

  const [{ data: sessionData, error: sessionError }, viewer] =
    await Promise.all([
      supabase
        .from("activity_fulfillment_qr_sessions")
        .select(
          "id,planned_activity_event_id,recipient_user_id,recipient_actor_id,public_code_snapshot,token_hash,token_version,status,issued_at,expires_at,consumed_at",
        )
        .eq("id", qrSessionId)
        .maybeSingle(),
      resolveOptionalViewer(),
    ]);

  const qrSession = sessionData as SessionRow | null;

  if (
    sessionError ||
    !qrSession ||
    qrSession.token_hash !== tokenHash ||
    qrSession.token_version !== "sha256-v1"
  ) {
    return <InvalidQr copy={copy} />;
  }

  const { data: termsData, error: termsError } = await supabase
    .from("activity_gift_certificate_terms")
    .select(
      "activity_event_id,value_object_id,provider_owner_user_id,provider_manager_actor_id,provider_actor_id,lifecycle_status,available_from,available_until,public_code,recipient_user_id,recipient_actor_id",
    )
    .eq("activity_event_id", qrSession.planned_activity_event_id)
    .maybeSingle();

  const terms = termsData as TermsRow | null;
  const detailsHref = buildGiftCertificateLocaleHref(
    `/certificates/${qrSession.planned_activity_event_id}`,
    locale,
  );

  if (
    termsError ||
    !terms ||
    terms.public_code !== qrSession.public_code_snapshot ||
    terms.recipient_user_id !== qrSession.recipient_user_id ||
    terms.recipient_actor_id !== qrSession.recipient_actor_id
  ) {
    return <InvalidQr copy={copy} />;
  }

  const authorized =
    viewer?.appUserId === terms.provider_owner_user_id &&
    viewer?.actorId === terms.provider_manager_actor_id;

  if (!viewer || !authorized) {
    return (
      <main className="min-h-screen bg-[#f3f6fb] px-4 py-10">
        <section className="mx-auto max-w-3xl rounded-[28px] border border-[#dbe3f1] bg-white p-6 shadow-sm">
          <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#3b6ef8]">
            {copy.eyebrow}
          </div>
          <h1 className="mt-3 text-3xl font-black text-[#111827]">
            {copy.title}
          </h1>
          <p className={`mt-5 rounded-2xl border p-4 text-[14px] font-semibold ${
            viewer
              ? "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]"
              : "border-[#c7d2fe] bg-[#eef2ff] text-[#3730a3]"
          }`}>
            {viewer ? copy.unauthorized : copy.signIn}
          </p>
        </section>
      </main>
    );
  }

  const [
    { data: objectData },
    { data: providerData },
    { data: recipientData },
    { data: checkinData },
  ] = await Promise.all([
    supabase.from("value_objects").select("title")
      .eq("id", terms.value_object_id).maybeSingle(),
    supabase.from("actors").select("display_name")
      .eq("id", terms.provider_actor_id).maybeSingle(),
    supabase.from("actors").select("display_name")
      .eq("id", qrSession.recipient_actor_id).maybeSingle(),
    supabase.from("activity_fulfillment_checkins")
      .select("id,status,checked_in_at")
      .eq("planned_activity_event_id", qrSession.planned_activity_event_id)
      .eq("status", "registered")
      .maybeSingle(),
  ]);

  const checkin = checkinData as CheckinRow | null;
  const objectTitle =
    typeof objectData?.title === "string" ? objectData.title : copy.certificate;
  const providerName =
    typeof providerData?.display_name === "string"
      ? providerData.display_name
      : copy.provider;
  const recipientName =
    typeof recipientData?.display_name === "string"
      ? recipientData.display_name
      : copy.buyer;
  const expired = new Date(qrSession.expires_at).getTime() <= Date.now();
  const checkedIn =
    qrSession.status === "consumed" && checkin?.status === "registered";
  const canCheckIn =
    terms.lifecycle_status === "active" &&
    qrSession.status === "issued" &&
    !expired &&
    !checkedIn;

  const detailRows: ReadonlyArray<readonly [string, string]> = [
    [copy.certificate, objectTitle],
    [copy.publicCode, qrSession.public_code_snapshot],
    [copy.provider, providerName],
    [copy.buyer, recipientName],
    [
      copy.state,
      checkedIn
        ? copy.checkedIn
        : canCheckIn
          ? copy.ready
          : expired
            ? copy.expired
            : copy.inactive,
    ],
    [copy.qrExpiry, formatDateTime(qrSession.expires_at, locale)],
  ];

  return (
    <main className="min-h-screen bg-[#f3f6fb] px-4 py-10">
      <section className="mx-auto max-w-3xl">
        <div className="rounded-[28px] border border-[#dbe3f1] bg-white p-6 shadow-sm">
          <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#3b6ef8]">
            {copy.eyebrow}
          </div>
          <h1 className="mt-3 text-3xl font-black text-[#111827]">
            {copy.title}
          </h1>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {detailRows.map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#f6f8fc] p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#6574a6]">
                  {label}
                </div>
                <div className="mt-1 font-bold text-[#111827]">
                  {value}
                </div>
              </div>
            ))}

            <div className="rounded-2xl bg-[#f6f8fc] p-4 sm:col-span-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#6574a6]">
                {copy.validity}
              </div>
              <div className="mt-1 font-bold text-[#111827]">
                {formatGiftCertificateDate(terms.available_from, locale)}
                {" — "}
                {formatGiftCertificateDate(terms.available_until, locale)}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[#dbe3f1] bg-[#f8fafc] p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#6574a6]">
              {copy.activeProfile}
            </div>
            <div className="mt-1 font-bold text-[#111827]">
              {viewer.profile.displayName}
            </div>
          </div>

          {checkedIn && checkin ? (
            <div className="mt-5 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-4">
              <p className="font-bold text-[#166534]">{copy.checkedIn}</p>
              <p className="mt-1 text-[13px] text-[#166534]">
                {copy.checkedInAt}:{" "}
                {formatDateTime(checkin.checked_in_at, locale)}
              </p>
            </div>
          ) : null}

          {canCheckIn ? (
            <div className="mt-5 rounded-[24px] border border-[#bfdbfe] bg-[#eff6ff] p-5">
              <h2 className="text-[17px] font-black text-[#1e3a8a]">
                {copy.warningTitle}
              </h2>
              <p className="mt-2 text-[14px] font-semibold leading-6 text-[#1e3a8a]">
                {copy.warningText}
              </p>
              <p className="mt-2 text-[13px] leading-5 text-[#42507a]">
                {copy.noFinalConfirmation}
              </p>
              <div className="mt-5">
                <RegisterGiftCertificateCheckinButton
                  qrSessionId={qrSession.id}
                  token={rawToken}
                  locale={locale}
                  expiresAt={qrSession.expires_at}
                  buttonLabel={copy.confirmButton}
                  processingLabel={copy.processing}
                  confirmationText={copy.confirmation}
                  successText={copy.success}
                  genericErrorText={copy.genericError}
                  expiredText={copy.expired}
                  unauthorizedText={copy.unauthorized}
                  inactiveText={copy.inactive}
                  alreadyCheckedInText={copy.alreadyCheckedIn}
                />
              </div>
            </div>
          ) : null}

          {!canCheckIn && !checkedIn ? (
            <p className="mt-5 rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-4 text-[14px] font-semibold text-[#92400e]">
              {expired ? copy.expired : copy.inactive}
            </p>
          ) : null}

          <div className="mt-6">
            <Link
              href={detailsHref}
              className="text-[13px] font-bold text-[#3b6ef8] hover:underline"
            >
              {copy.back}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
