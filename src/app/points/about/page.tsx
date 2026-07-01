import Link from "next/link";

export const dynamic = "force-dynamic";

type PointsAboutLocale = "en" | "pl" | "uk" | "ru" | "de" | "es" | "cs";

type PointsAboutCopy = {
  back: string;
  eyebrow: string;
  title: string;
  description: string;
  sections: Array<{
    title: string;
    body: string;
  }>;
  rulesTitle: string;
  rules: string[];
};

const COPY: Record<PointsAboutLocale, PointsAboutCopy> = {
  en: {
    back: "Back to POINTS",
    eyebrow: "POINTS rules",
    title: "How POINTS work",
    description:
      "POINTS are loyalty units connected with confirmed external purchases, certificates and public trust between a buyer and a business.",
    sections: [
      {
        title: "How they are awarded",
        body:
          "A buyer sends a purchase confirmation request from a business profile. The business checks the request and confirms or rejects it. POINTS are awarded only after confirmation.",
      },
      {
        title: "How they are used",
        body:
          "POINTS can reduce the money part of a certificate. When POINTS are used for a certificate, they are burned and are not transferred to the business.",
      },
      {
        title: "Reliability",
        body:
          "A buyer cannot confirm their own request. The business sees incoming requests and decides whether the purchase is real. The system keeps a transaction history instead of manually editing balances.",
      },
    ],
    rulesTitle: "Current product rules",
    rules: [
      "A user can receive no more than 2,000 POINTS.",
      "POINTS cannot be bought.",
      "POINTS cannot be transferred to another user.",
      "1 POINT is referenced as 1 EUR for value comparison.",
      "A business on the Free package can confirm up to 3 purchases per month.",
    ],
  },
  pl: {
    back: "Wróć do POINTS",
    eyebrow: "Zasady POINTS",
    title: "Jak działają POINTS",
    description:
      "POINTS to jednostki lojalnościowe powiązane z potwierdzonymi zakupami zewnętrznymi, certyfikatami i zaufaniem publicznym między kupującym a firmą.",
    sections: [
      {
        title: "Jak są naliczane",
        body:
          "Kupujący wysyła zgłoszenie potwierdzenia zakupu ze strony firmy. Firma sprawdza zgłoszenie i potwierdza je albo odrzuca. POINTS są naliczane dopiero po potwierdzeniu.",
      },
      {
        title: "Jak są używane",
        body:
          "POINTS mogą zmniejszyć część pieniężną certyfikatu. Po użyciu na certyfikat POINTS spalają się i nie są przekazywane firmie.",
      },
      {
        title: "Wiarygodność",
        body:
          "Kupujący nie może potwierdzić własnego zgłoszenia. Firma widzi przychodzące zgłoszenia i decyduje, czy zakup jest prawdziwy. System prowadzi historię transakcji zamiast ręcznie zmieniać saldo.",
      },
    ],
    rulesTitle: "Aktualne zasady produktu",
    rules: [
      "Jeden użytkownik może otrzymać maksymalnie 2 000 POINTS.",
      "POINTS nie można kupować.",
      "POINTS nie można przekazywać innemu użytkownikowi.",
      "1 POINT jest traktowany referencyjnie jako 1 EUR.",
      "Firma w pakiecie Free może potwierdzić maksymalnie 3 zakupy miesięcznie.",
    ],
  },
  uk: {
    back: "Назад до POINTS",
    eyebrow: "Правила POINTS",
    title: "Як працюють POINTS",
    description:
      "POINTS — це одиниці лояльності, пов’язані з підтвердженими зовнішніми покупками, сертифікатами та публічною довірою між покупцем і підприємством.",
    sections: [
      {
        title: "Як вони нараховуються",
        body:
          "Покупець надсилає заявку на підтвердження покупки зі сторінки підприємства. Підприємство перевіряє заявку і підтверджує або відхиляє її. POINTS нараховуються тільки після підтвердження.",
      },
      {
        title: "Як вони використовуються",
        body:
          "POINTS можуть зменшити грошову частину сертифіката. При використанні на сертифікат POINTS згорають і не передаються підприємству.",
      },
      {
        title: "Надійність",
        body:
          "Покупець не може підтвердити власну заявку. Підприємство бачить вхідні заявки і вирішує, чи покупка реальна. Система зберігає історію транзакцій замість ручного редагування балансу.",
      },
    ],
    rulesTitle: "Поточні правила продукту",
    rules: [
      "Один користувач може отримати не більше 2 000 POINTS.",
      "POINTS не можна купувати.",
      "POINTS не можна передавати іншому користувачу.",
      "1 POINT референтно дорівнює 1 EUR.",
      "Підприємство на пакеті Free може підтвердити максимум 3 покупки на місяць.",
    ],
  },
  ru: {
    back: "Назад к POINTS",
    eyebrow: "Правила POINTS",
    title: "Как работают POINTS",
    description:
      "POINTS — это единицы лояльности, связанные с подтверждёнными внешними покупками, сертификатами и публичным доверием между покупателем и предприятием.",
    sections: [
      {
        title: "Как они начисляются",
        body:
          "Покупатель отправляет заявку на подтверждение покупки со страницы предприятия. Предприятие проверяет заявку и подтверждает или отклоняет её. POINTS начисляются только после подтверждения.",
      },
      {
        title: "Как они используются",
        body:
          "POINTS могут уменьшить денежную часть сертификата. При использовании на сертификат POINTS сгорают и не передаются предприятию.",
      },
      {
        title: "Надёжность",
        body:
          "Покупатель не может подтвердить собственную заявку. Предприятие видит входящие заявки и решает, реальна ли покупка. Система хранит историю транзакций вместо ручного изменения баланса.",
      },
    ],
    rulesTitle: "Текущие правила продукта",
    rules: [
      "Один пользователь может получить не больше 2 000 POINTS.",
      "POINTS нельзя покупать.",
      "POINTS нельзя передавать другому пользователю.",
      "1 POINT референтно равен 1 EUR.",
      "Предприятие на пакете Free может подтвердить максимум 3 покупки в месяц.",
    ],
  },
  de: {
    back: "Zurück zu POINTS",
    eyebrow: "POINTS-Regeln",
    title: "Wie POINTS funktionieren",
    description:
      "POINTS sind Treueeinheiten, die mit bestätigten externen Käufen, Zertifikaten und öffentlichem Vertrauen zwischen Käufer und Unternehmen verbunden sind.",
    sections: [
      {
        title: "Wie sie gutgeschrieben werden",
        body:
          "Ein Käufer sendet eine Kaufbestätigungsanfrage über das Unternehmensprofil. Das Unternehmen prüft die Anfrage und bestätigt oder lehnt sie ab. POINTS werden erst nach Bestätigung gutgeschrieben.",
      },
      {
        title: "Wie sie verwendet werden",
        body:
          "POINTS können den Geldanteil eines Zertifikats reduzieren. Bei Verwendung für ein Zertifikat werden POINTS verbrannt und nicht an das Unternehmen übertragen.",
      },
      {
        title: "Zuverlässigkeit",
        body:
          "Ein Käufer kann seine eigene Anfrage nicht bestätigen. Das Unternehmen sieht eingehende Anfragen und entscheidet, ob der Kauf echt ist. Das System führt eine Transaktionshistorie, statt Guthaben manuell zu ändern.",
      },
    ],
    rulesTitle: "Aktuelle Produktregeln",
    rules: [
      "Ein Nutzer kann höchstens 2.000 POINTS erhalten.",
      "POINTS können nicht gekauft werden.",
      "POINTS können nicht an andere Nutzer übertragen werden.",
      "1 POINT wird referenziell als 1 EUR betrachtet.",
      "Ein Unternehmen im Free-Paket kann bis zu 3 Käufe pro Monat bestätigen.",
    ],
  },
  es: {
    back: "Volver a POINTS",
    eyebrow: "Reglas de POINTS",
    title: "Cómo funcionan POINTS",
    description:
      "POINTS son unidades de fidelización conectadas con compras externas confirmadas, certificados y confianza pública entre comprador y empresa.",
    sections: [
      {
        title: "Cómo se conceden",
        body:
          "El comprador envía una solicitud de confirmación desde el perfil de la empresa. La empresa la revisa y la confirma o rechaza. Los POINTS se conceden solo después de la confirmación.",
      },
      {
        title: "Cómo se usan",
        body:
          "Los POINTS pueden reducir la parte monetaria de un certificado. Al usarlos para un certificado, se queman y no se transfieren a la empresa.",
      },
      {
        title: "Fiabilidad",
        body:
          "El comprador no puede confirmar su propia solicitud. La empresa ve las solicitudes entrantes y decide si la compra es real. El sistema mantiene un historial de transacciones en lugar de editar saldos manualmente.",
      },
    ],
    rulesTitle: "Reglas actuales del producto",
    rules: [
      "Un usuario puede recibir como máximo 2.000 POINTS.",
      "Los POINTS no se pueden comprar.",
      "Los POINTS no se pueden transferir a otro usuario.",
      "1 POINT se toma como referencia de 1 EUR.",
      "Una empresa en el paquete Free puede confirmar hasta 3 compras al mes.",
    ],
  },
  cs: {
    back: "Zpět na POINTS",
    eyebrow: "Pravidla POINTS",
    title: "Jak fungují POINTS",
    description:
      "POINTS jsou věrnostní jednotky spojené s potvrzenými externími nákupy, certifikáty a veřejnou důvěrou mezi kupujícím a podnikem.",
    sections: [
      {
        title: "Jak se připisují",
        body:
          "Kupující odešle žádost o potvrzení nákupu z profilu podniku. Podnik žádost zkontroluje a potvrdí nebo odmítne. POINTS se připisují až po potvrzení.",
      },
      {
        title: "Jak se používají",
        body:
          "POINTS mohou snížit peněžní část certifikátu. Při použití na certifikát se POINTS spálí a nepřevádějí se podniku.",
      },
      {
        title: "Spolehlivost",
        body:
          "Kupující nemůže potvrdit vlastní žádost. Podnik vidí příchozí žádosti a rozhoduje, zda je nákup skutečný. Systém vede historii transakcí místo ruční úpravy zůstatků.",
      },
    ],
    rulesTitle: "Aktuální pravidla produktu",
    rules: [
      "Jeden uživatel může získat nejvýše 2 000 POINTS.",
      "POINTS nelze kupovat.",
      "POINTS nelze převádět na jiného uživatele.",
      "1 POINT je referenčně roven 1 EUR.",
      "Podnik v balíčku Free může potvrdit nejvýše 3 nákupy měsíčně.",
    ],
  },
};

type PageProps = {
  searchParams?: Promise<{
    locale?: string | string[];
    lang?: string | string[];
  }>;
};

function normalizeLocaleParam(value: string | string[] | undefined) {
  if (!value) {
    return "";
  }

  return Array.isArray(value) ? value[0] ?? "" : value;
}

function normalizeLocale(locale: string | undefined): PointsAboutLocale {
  if (
    locale === "pl" ||
    locale === "uk" ||
    locale === "ru" ||
    locale === "de" ||
    locale === "es" ||
    locale === "cs"
  ) {
    return locale;
  }

  return "en";
}

function hrefWithLocale(pathname: string, locale: PointsAboutLocale) {
  const searchParams = new URLSearchParams();
  searchParams.set("locale", locale);
  return `${pathname}?${searchParams.toString()}`;
}

export default async function PointsAboutPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const locale = normalizeLocale(
    normalizeLocaleParam(resolvedSearchParams?.locale) ||
      normalizeLocaleParam(resolvedSearchParams?.lang),
  );
  const copy = COPY[locale] ?? COPY.en;

  return (
    <main className="min-h-screen bg-[#eef1f7] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href={hrefWithLocale("/points", locale)}
          className="inline-flex min-h-[34px] items-center rounded-full border border-[#d7e3ff] bg-white px-4 text-[13px] font-medium text-[#3b6ef8] shadow-sm"
        >
          ← {copy.back}
        </Link>

        <section className="mt-5 rounded-[26px] border border-[#e5e7f0] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)] md:p-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b5cf6]">
            {copy.eyebrow}
          </div>
          <h1 className="mt-3 text-[32px] font-bold tracking-[-0.03em] text-[#111827] md:text-[42px]">
            {copy.title}
          </h1>
          <p className="mt-3 max-w-3xl text-[16px] leading-7 text-[#5a5f7a]">
            {copy.description}
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {copy.sections.map((section) => (
              <article
                key={section.title}
                className="rounded-2xl border border-[#edf0f7] bg-[#f8fafc] p-5"
              >
                <h2 className="text-[16px] font-bold text-[#111827]">
                  {section.title}
                </h2>
                <p className="mt-3 text-[14px] leading-6 text-[#5a5f7a]">
                  {section.body}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-5">
            <h2 className="text-[18px] font-bold text-[#14532d]">
              {copy.rulesTitle}
            </h2>
            <ul className="mt-3 grid gap-2 text-[14px] leading-6 text-[#166534]">
              {copy.rules.map((rule) => (
                <li key={rule} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#22c55e]" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
