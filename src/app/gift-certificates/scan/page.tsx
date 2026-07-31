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
import { RedeemGiftCertificateButton } from "./redeem-gift-certificate-button";

export const dynamic = "force-dynamic";

type ScanPageProps = {
  readonly searchParams?: Promise<{
    readonly certificate?: string | string[];
    readonly code?: string | string[];
    readonly token?: string | string[];
    readonly locale?: string | string[];
  }>;
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
  readonly redeemed_at: string | null;
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
  readonly validity: string;
  readonly state: string;
  readonly active: string;
  readonly redeemed: string;
  readonly redeemedAt: string;
  readonly warningTitle: string;
  readonly warningText: string;
  readonly noFinancialChange: string;
  readonly confirmButton: string;
  readonly confirming: string;
  readonly confirmation: string;
  readonly success: string;
  readonly genericError: string;
  readonly inactive: string;
  readonly notYetValid: string;
  readonly expired: string;
  readonly back: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PUBLIC_CODE_PATTERN = /^GC-[A-F0-9]{20}$/;
const RAW_QR_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const COPY: Record<string, Copy> = {
  en: {
    eyebrow: "Provider QR redemption",
    title: "Redeem gift certificate",
    invalidQr: "This QR is invalid or incomplete.",
    signIn:
      "Sign in and select the provider's managing profile to redeem the certificate.",
    unauthorized:
      "The active profile is not authorized to redeem this certificate.",
    activeProfile: "Active managing profile",
    certificate: "Certificate",
    publicCode: "Public code",
    provider: "Provider",
    validity: "Validity",
    state: "State",
    active: "Ordered and active",
    redeemed: "Redeemed",
    redeemedAt: "Redeemed",
    warningTitle: "Irreversible action",
    warningText:
      "Confirm only after the product or service has actually been provided. Confirmation immediately and permanently marks the certificate as redeemed.",
    noFinancialChange:
      "Redemption does not debit or award POINTS and does not change reputation.",
    confirmButton: "Confirm redemption",
    confirming: "Confirming…",
    confirmation:
      "Has the product or service actually been provided? After confirmation this certificate cannot be used again.",
    success: "The certificate has been redeemed.",
    genericError: "The certificate could not be redeemed.",
    inactive: "This certificate is no longer active.",
    notYetValid: "The certificate validity period has not started.",
    expired: "The certificate validity period has ended.",
    back: "Open certificate details",
  },
  pl: {
    eyebrow: "Realizacja QR przez dostawcę",
    title: "Zrealizuj bon podarunkowy",
    invalidQr: "Ten kod QR jest nieprawidłowy lub niekompletny.",
    signIn:
      "Zaloguj się i wybierz profil zarządzający dostawcą.",
    unauthorized:
      "Aktywny profil nie ma prawa zrealizować tego bonu.",
    activeProfile: "Aktywny profil zarządzający",
    certificate: "Bon",
    publicCode: "Kod publiczny",
    provider: "Dostawca",
    validity: "Ważność",
    state: "Stan",
    active: "Zamówiony i aktywny",
    redeemed: "Zrealizowany",
    redeemedAt: "Zrealizowano",
    warningTitle: "Działanie nieodwracalne",
    warningText:
      "Potwierdź dopiero po faktycznym przekazaniu produktu lub wykonaniu usługi. Potwierdzenie natychmiast i trwale oznaczy bon jako zrealizowany.",
    noFinancialChange:
      "Realizacja nie pobiera ani nie przyznaje POINTS i nie zmienia reputacji.",
    confirmButton: "Potwierdź realizację",
    confirming: "Potwierdzanie…",
    confirmation:
      "Czy produkt lub usługa zostały faktycznie przekazane? Po potwierdzeniu bonu nie będzie można użyć ponownie.",
    success: "Bon został zrealizowany.",
    genericError: "Nie udało się zrealizować bonu.",
    inactive: "Ten bon nie jest już aktywny.",
    notYetValid: "Okres ważności bonu jeszcze się nie rozpoczął.",
    expired: "Okres ważności bonu już minął.",
    back: "Otwórz szczegóły bonu",
  },
  ru: {
    eyebrow: "Погашение QR предоставляющим",
    title: "Использовать подарочный сертификат",
    invalidQr: "Этот QR-код недействителен или содержит неполные данные.",
    signIn:
      "Войдите и выберите профиль, который управляет предоставляющим.",
    unauthorized:
      "Активный профиль не имеет права использовать этот сертификат.",
    activeProfile: "Активный управляющий профиль",
    certificate: "Сертификат",
    publicCode: "Публичный код",
    provider: "Предоставляющий",
    validity: "Срок действия",
    state: "Состояние",
    active: "Заказан и активен",
    redeemed: "Использован",
    redeemedAt: "Использован",
    warningTitle: "Необратимое действие",
    warningText:
      "Подтверждайте только после того, как товар или услуга действительно предоставлены. Подтверждение немедленно и навсегда отметит сертификат использованным.",
    noFinancialChange:
      "При использовании POINTS не списываются и не начисляются, репутация не меняется.",
    confirmButton: "Подтвердить использование",
    confirming: "Подтверждение…",
    confirmation:
      "Товар или услуга действительно предоставлены? После подтверждения сертификат нельзя будет использовать повторно.",
    success: "Сертификат отмечен использованным.",
    genericError: "Не удалось использовать сертификат.",
    inactive: "Этот сертификат больше не активен.",
    notYetValid: "Срок действия сертификата ещё не начался.",
    expired: "Срок действия сертификата уже закончился.",
    back: "Открыть сведения о сертификате",
  },
  uk: {
    eyebrow: "Погашення QR надавачем",
    title: "Використати подарунковий сертифікат",
    invalidQr: "Цей QR-код недійсний або містить неповні дані.",
    signIn:
      "Увійдіть і виберіть профіль, який керує надавачем.",
    unauthorized:
      "Активний профіль не має права використати цей сертифікат.",
    activeProfile: "Активний керівний профіль",
    certificate: "Сертифікат",
    publicCode: "Публічний код",
    provider: "Надавач",
    validity: "Строк дії",
    state: "Стан",
    active: "Замовлений і активний",
    redeemed: "Використаний",
    redeemedAt: "Використано",
    warningTitle: "Незворотна дія",
    warningText:
      "Підтверджуйте лише після фактичного надання товару або послуги. Підтвердження негайно й назавжди позначить сертифікат використаним.",
    noFinancialChange:
      "Під час використання POINTS не списуються й не нараховуються, репутація не змінюється.",
    confirmButton: "Підтвердити використання",
    confirming: "Підтвердження…",
    confirmation:
      "Товар або послугу справді надано? Після підтвердження сертифікат не можна використати повторно.",
    success: "Сертифікат позначено використаним.",
    genericError: "Не вдалося використати сертифікат.",
    inactive: "Цей сертифікат більше не активний.",
    notYetValid: "Строк дії сертифіката ще не почався.",
    expired: "Строк дії сертифіката вже завершився.",
    back: "Відкрити відомості про сертифікат",
  },
  de: {
    eyebrow: "QR-Einlösung durch Anbieter",
    title: "Geschenkgutschein einlösen",
    invalidQr: "Dieser QR-Code ist ungültig oder unvollständig.",
    signIn:
      "Melden Sie sich an und wählen Sie das verwaltende Anbieterprofil.",
    unauthorized:
      "Das aktive Profil darf diesen Gutschein nicht einlösen.",
    activeProfile: "Aktives Verwaltungsprofil",
    certificate: "Gutschein",
    publicCode: "Öffentlicher Code",
    provider: "Anbieter",
    validity: "Gültigkeit",
    state: "Status",
    active: "Bestellt und aktiv",
    redeemed: "Eingelöst",
    redeemedAt: "Eingelöst",
    warningTitle: "Unwiderrufliche Aktion",
    warningText:
      "Bestätigen Sie erst, nachdem das Produkt oder die Dienstleistung tatsächlich erbracht wurde. Die Bestätigung markiert den Gutschein sofort und dauerhaft als eingelöst.",
    noFinancialChange:
      "Bei der Einlösung werden keine POINTS abgebucht oder gutgeschrieben und die Reputation ändert sich nicht.",
    confirmButton: "Einlösung bestätigen",
    confirming: "Bestätigung…",
    confirmation:
      "Wurde das Produkt oder die Dienstleistung tatsächlich erbracht? Danach kann der Gutschein nicht erneut verwendet werden.",
    success: "Der Gutschein wurde eingelöst.",
    genericError: "Der Gutschein konnte nicht eingelöst werden.",
    inactive: "Dieser Gutschein ist nicht mehr aktiv.",
    notYetValid: "Die Gültigkeit des Gutscheins hat noch nicht begonnen.",
    expired: "Die Gültigkeit des Gutscheins ist abgelaufen.",
    back: "Gutscheindetails öffnen",
  },
  es: {
    eyebrow: "Canje QR por el proveedor",
    title: "Canjear certificado de regalo",
    invalidQr: "Este código QR no es válido o está incompleto.",
    signIn:
      "Inicia sesión y selecciona el perfil que gestiona al proveedor.",
    unauthorized:
      "El perfil activo no está autorizado para canjear este certificado.",
    activeProfile: "Perfil gestor activo",
    certificate: "Certificado",
    publicCode: "Código público",
    provider: "Proveedor",
    validity: "Validez",
    state: "Estado",
    active: "Pedido y activo",
    redeemed: "Canjeado",
    redeemedAt: "Canjeado",
    warningTitle: "Acción irreversible",
    warningText:
      "Confirma solo después de que el producto o servicio haya sido realmente entregado. La confirmación marcará el certificado inmediatamente y de forma permanente como canjeado.",
    noFinancialChange:
      "El canje no carga ni concede POINTS y no cambia la reputación.",
    confirmButton: "Confirmar canje",
    confirming: "Confirmando…",
    confirmation:
      "¿El producto o servicio se ha entregado realmente? Después no se podrá usar el certificado otra vez.",
    success: "El certificado ha sido canjeado.",
    genericError: "No se pudo canjear el certificado.",
    inactive: "Este certificado ya no está activo.",
    notYetValid: "El periodo de validez aún no ha comenzado.",
    expired: "El periodo de validez ha terminado.",
    back: "Abrir detalles del certificado",
  },
  cs: {
    eyebrow: "Uplatnění QR poskytovatelem",
    title: "Uplatnit dárkový certifikát",
    invalidQr: "Tento QR kód je neplatný nebo neúplný.",
    signIn:
      "Přihlaste se a vyberte profil, který spravuje poskytovatele.",
    unauthorized:
      "Aktivní profil nemá oprávnění tento certifikát uplatnit.",
    activeProfile: "Aktivní správcovský profil",
    certificate: "Certifikát",
    publicCode: "Veřejný kód",
    provider: "Poskytovatel",
    validity: "Platnost",
    state: "Stav",
    active: "Objednaný a aktivní",
    redeemed: "Uplatněný",
    redeemedAt: "Uplatněno",
    warningTitle: "Nevratná akce",
    warningText:
      "Potvrďte až po skutečném předání produktu nebo poskytnutí služby. Potvrzení okamžitě a trvale označí certifikát jako uplatněný.",
    noFinancialChange:
      "Při uplatnění se POINTS neodečítají ani nepřičítají a reputace se nemění.",
    confirmButton: "Potvrdit uplatnění",
    confirming: "Potvrzování…",
    confirmation:
      "Byl produkt nebo služba skutečně poskytnuta? Poté již certifikát nebude možné použít znovu.",
    success: "Certifikát byl uplatněn.",
    genericError: "Certifikát se nepodařilo uplatnit.",
    inactive: "Tento certifikát již není aktivní.",
    notYetValid: "Doba platnosti certifikátu ještě nezačala.",
    expired: "Doba platnosti certifikátu skončila.",
    back: "Otevřít podrobnosti certifikátu",
  },
};

function firstValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function resolveOptionalViewer(): Promise<
  ResolvedActorContext | null
> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return null;
  }

  try {
    return await resolveActiveActorContext(session.user.sub);
  } catch (error) {
    if (error instanceof ActorContextError) {
      return null;
    }

    throw error;
  }
}

function statusLabel(status: string, copy: Copy): string {
  return status === "redeemed" ? copy.redeemed : copy.active;
}

function formatDateTime(value: string, locale: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(
        locale === "en" ? "en-US" : locale,
        {
          dateStyle: "medium",
          timeStyle: "short",
        },
      ).format(date);
}

export default async function GiftCertificateScanPage({
  searchParams,
}: ScanPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const locale = normalizeGiftCertificateLocale(params?.locale);
  const copy = COPY[locale] ?? COPY.en;
  const activityEventId = firstValue(params?.certificate)?.trim();
  const publicCode = firstValue(params?.code)?.trim().toUpperCase();
  const qrToken = firstValue(params?.token)?.trim();

  const qrShapeValid =
    Boolean(activityEventId && UUID_PATTERN.test(activityEventId)) &&
    Boolean(publicCode && PUBLIC_CODE_PATTERN.test(publicCode)) &&
    Boolean(qrToken && RAW_QR_TOKEN_PATTERN.test(qrToken));

  const detailsHref =
    activityEventId && UUID_PATTERN.test(activityEventId)
      ? buildGiftCertificateLocaleHref(
          `/certificates/${activityEventId}`,
          locale,
        )
      : buildGiftCertificateLocaleHref("/certificates", locale);

  if (!qrShapeValid || !activityEventId || !publicCode || !qrToken) {
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

  const [{ data: termsData, error: termsError }, viewer] =
    await Promise.all([
      supabase
        .from("activity_gift_certificate_terms")
        .select(
          [
            "activity_event_id",
            "value_object_id",
            "provider_owner_user_id",
            "provider_manager_actor_id",
            "provider_actor_id",
            "lifecycle_status",
            "available_from",
            "available_until",
            "public_code",
            "recipient_user_id",
            "recipient_actor_id",
            "redeemed_at",
          ].join(","),
        )
        .eq("activity_event_id", activityEventId)
        .maybeSingle(),
      resolveOptionalViewer(),
    ]);

  const terms = termsData as TermsRow | null;

  if (
    termsError ||
    !terms ||
    terms.public_code !== publicCode
  ) {
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

  const [{ data: objectData }, { data: providerData }] =
    await Promise.all([
      supabase
        .from("value_objects")
        .select("title")
        .eq("id", terms.value_object_id)
        .maybeSingle(),
      supabase
        .from("actors")
        .select("display_name")
        .eq("id", terms.provider_actor_id)
        .maybeSingle(),
    ]);

  const objectTitle =
    typeof objectData?.title === "string"
      ? objectData.title
      : copy.certificate;
  const providerName =
    typeof providerData?.display_name === "string"
      ? providerData.display_name
      : copy.provider;

  const authorized =
    viewer?.appUserId === terms.provider_owner_user_id &&
    viewer?.actorId === terms.provider_manager_actor_id;
  const canRedeem =
    authorized && terms.lifecycle_status === "active";

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
            <div className="rounded-2xl bg-[#f6f8fc] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#6574a6]">
                {copy.certificate}
              </div>
              <div className="mt-1 font-bold text-[#111827]">
                {objectTitle}
              </div>
            </div>

            <div className="rounded-2xl bg-[#f6f8fc] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#6574a6]">
                {copy.publicCode}
              </div>
              <div className="mt-1 font-mono font-bold text-[#111827]">
                {publicCode}
              </div>
            </div>

            <div className="rounded-2xl bg-[#f6f8fc] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#6574a6]">
                {copy.provider}
              </div>
              <div className="mt-1 font-bold text-[#111827]">
                {providerName}
              </div>
            </div>

            <div className="rounded-2xl bg-[#f6f8fc] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#6574a6]">
                {copy.state}
              </div>
              <div className="mt-1 font-bold text-[#111827]">
                {statusLabel(terms.lifecycle_status, copy)}
              </div>
            </div>

            <div className="rounded-2xl bg-[#f6f8fc] p-4 sm:col-span-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#6574a6]">
                {copy.validity}
              </div>
              <div className="mt-1 font-bold text-[#111827]">
                {formatGiftCertificateDate(
                  terms.available_from,
                  locale,
                )}
                {" — "}
                {formatGiftCertificateDate(
                  terms.available_until,
                  locale,
                )}
              </div>
            </div>
          </div>

          {!viewer ? (
            <p className="mt-5 rounded-2xl border border-[#c7d2fe] bg-[#eef2ff] p-4 text-[14px] font-semibold text-[#3730a3]">
              {copy.signIn}
            </p>
          ) : null}

          {viewer && !authorized ? (
            <p className="mt-5 rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-4 text-[14px] font-semibold text-[#b91c1c]">
              {copy.unauthorized}
            </p>
          ) : null}

          {viewer ? (
            <div className="mt-5 rounded-2xl border border-[#dbe3f1] bg-[#f8fafc] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#6574a6]">
                {copy.activeProfile}
              </div>
              <div className="mt-1 font-bold text-[#111827]">
                {viewer.profile.displayName}
              </div>
            </div>
          ) : null}

          {authorized && terms.lifecycle_status === "redeemed" ? (
            <div className="mt-5 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-4">
              <p className="font-bold text-[#166534]">
                {copy.redeemed}
              </p>
              {terms.redeemed_at ? (
                <p className="mt-1 text-[13px] text-[#166534]">
                  {copy.redeemedAt}:{" "}
                  {formatDateTime(terms.redeemed_at, locale)}
                </p>
              ) : null}
            </div>
          ) : null}

          {canRedeem ? (
            <div className="mt-5 rounded-[24px] border border-[#fecaca] bg-[#fff7f7] p-5">
              <h2 className="text-[17px] font-black text-[#991b1b]">
                {copy.warningTitle}
              </h2>
              <p className="mt-2 text-[14px] font-semibold leading-6 text-[#7f1d1d]">
                {copy.warningText}
              </p>
              <p className="mt-2 text-[13px] leading-5 text-[#7f1d1d]">
                {copy.noFinancialChange}
              </p>

              <div className="mt-5">
                <RedeemGiftCertificateButton
                  activityEventId={activityEventId}
                  publicCode={publicCode}
                  qrToken={qrToken}
                  locale={locale}
                  buttonLabel={copy.confirmButton}
                  submittingLabel={copy.confirming}
                  confirmationText={copy.confirmation}
                  successText={copy.success}
                  genericErrorText={copy.genericError}
                  invalidQrText={copy.invalidQr}
                  unauthorizedText={copy.unauthorized}
                  inactiveText={copy.inactive}
                  notYetValidText={copy.notYetValid}
                  expiredText={copy.expired}
                />
              </div>
            </div>
          ) : null}

          {authorized &&
          terms.lifecycle_status !== "active" &&
          terms.lifecycle_status !== "redeemed" ? (
            <p className="mt-5 rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-4 text-[14px] font-semibold text-[#92400e]">
              {copy.inactive}
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
