"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Home } from "lucide-react";

import { getLocaleSearchParam, type LocaleCode } from "@/i18n";

type BetaNoticeContent = {
  eyebrow: string;
  title: string;
  paragraphs: string[];
  closing: string;
  signature: string;
  backHome: string;
};

const betaNoticeContent: Record<LocaleCode, BetaNoticeContent> = {
  ru: {
    eyebrow: "Тестовая версия",
    title: "Внимание: тестовая версия",
    paragraphs: [
      "ARCTor.app сейчас является экспериментальным проектом в beta-версии. Сайт в значительной степени создан при помощи ChatGPT и всё ещё развивается, тестируется и исправляется.",
      "Это означает, что я не могу гарантировать его непрерывную работу, полную стабильность или то, что все функции всегда будут доступны и будут вести себя именно так, как было запланировано.",
      "Поэтому прошу рассматривать ARCTor.app как место для тестирования идеи, а не как инструмент, от которого зависят важные решения, деньги, здоровье, работа или единственная копия важных данных.",
      "Не сохраняйте здесь ничего, потеря чего могла бы стать для вас серьёзной проблемой. Если вы пользуетесь функциями AI, воспринимайте ответы как вспомогательные предложения, а не как профессиональную медицинскую, юридическую, финансовую или карьерную консультацию.",
      "Если проект окажется полезным и начнёт иметь коммерческий смысл, следующим шагом будет его профессиональное упорядочивание: технический аудит, безопасность, стабильная инфраструктура, регламент, политика конфиденциальности и дальнейшее развитие с участием специалистов.",
    ],
    closing: "С уважением",
    signature: "Aleksander Polański",
    backHome: "Вернуться на главную",
  },
  pl: {
    eyebrow: "Wersja testowa",
    title: "Uwaga: wersja testowa",
    paragraphs: [
      "ARCTor.app jest obecnie projektem eksperymentalnym w wersji beta. Strona została stworzona w dużej mierze przy pomocy ChatGPT i jest nadal rozwijana, testowana oraz poprawiana.",
      "Oznacza to, że nie mogę zagwarantować jej nieprzerwanego działania, pełnej stabilności ani tego, że wszystkie funkcje będą zawsze dostępne lub zachowają się dokładnie tak, jak planowano.",
      "Dlatego proszę traktować ARCTor.app jako miejsce do testowania pomysłu, a nie jako narzędzie, od którego zależą ważne decyzje, pieniądze, zdrowie, praca lub jedyna kopia istotnych danych.",
      "Nie zapisujcie tutaj niczego, czego utrata mogłaby być dla Was poważnym problemem. Jeśli korzystacie z funkcji AI, traktujcie odpowiedzi jako pomocnicze sugestie, a nie profesjonalną poradę medyczną, prawną, finansową ani zawodową.",
      "Jeżeli projekt okaże się przydatny i zacznie mieć sens komercyjny, kolejnym krokiem będzie jego profesjonalne uporządkowanie: audyt techniczny, bezpieczeństwo, stabilna infrastruktura, regulamin, polityka prywatności i dalszy rozwój z udziałem specjalistów.",
    ],
    closing: "Z poważaniem",
    signature: "Aleksander Polański",
    backHome: "Wróć na stronę główną",
  },
  en: {
    eyebrow: "Test version",
    title: "Notice: test version",
    paragraphs: [
      "ARCTor.app is currently an experimental beta project. The site was created largely with the help of ChatGPT and is still being developed, tested and improved.",
      "This means that I cannot guarantee uninterrupted operation, full stability, or that every function will always be available or behave exactly as planned.",
      "Please treat ARCTor.app as a place for testing an idea, not as a tool on which important decisions, money, health, work or the only copy of important data should depend.",
      "Do not save anything here whose loss could become a serious problem for you. If you use AI functions, treat the responses as supporting suggestions, not as professional medical, legal, financial or career advice.",
      "If the project proves useful and begins to make commercial sense, the next step will be professional organization: technical audit, security, stable infrastructure, terms of use, privacy policy and further development with specialists involved.",
    ],
    closing: "Respectfully",
    signature: "Aleksander Polański",
    backHome: "Back to home",
  },
  es: {
    eyebrow: "Versión de prueba",
    title: "Aviso: versión de prueba",
    paragraphs: [
      "ARCTor.app es actualmente un proyecto experimental en versión beta. El sitio se creó en gran medida con ayuda de ChatGPT y todavía se está desarrollando, probando y corrigiendo.",
      "Esto significa que no puedo garantizar su funcionamiento ininterrumpido, su estabilidad completa ni que todas las funciones estén siempre disponibles o se comporten exactamente como estaba previsto.",
      "Por eso, trata ARCTor.app como un lugar para probar una idea, no como una herramienta de la que dependan decisiones importantes, dinero, salud, trabajo o la única copia de datos importantes.",
      "No guardes aquí nada cuya pérdida pueda ser un problema serio para ti. Si utilizas funciones de AI, trata las respuestas como sugerencias de apoyo, no como asesoramiento médico, legal, financiero o profesional.",
      "Si el proyecto resulta útil y empieza a tener sentido comercial, el siguiente paso será organizarlo profesionalmente: auditoría técnica, seguridad, infraestructura estable, términos de uso, política de privacidad y desarrollo posterior con especialistas.",
    ],
    closing: "Atentamente",
    signature: "Aleksander Polański",
    backHome: "Volver al inicio",
  },
  uk: {
    eyebrow: "Тестова версія",
    title: "Увага: тестова версія",
    paragraphs: [
      "ARCTor.app зараз є експериментальним проєктом у beta-версії. Сайт значною мірою створено за допомогою ChatGPT, і він досі розвивається, тестується та виправляється.",
      "Це означає, що я не можу гарантувати його безперервну роботу, повну стабільність або те, що всі функції завжди будуть доступні й поводитимуться саме так, як було заплановано.",
      "Тому прошу сприймати ARCTor.app як місце для тестування ідеї, а не як інструмент, від якого залежать важливі рішення, гроші, здоров’я, робота або єдина копія важливих даних.",
      "Не зберігайте тут нічого, втрата чого могла б стати для вас серйозною проблемою. Якщо ви користуєтеся функціями AI, сприймайте відповіді як допоміжні пропозиції, а не як професійну медичну, юридичну, фінансову чи кар’єрну консультацію.",
      "Якщо проєкт виявиться корисним і почне мати комерційний сенс, наступним кроком буде його професійне впорядкування: технічний аудит, безпека, стабільна інфраструктура, правила користування, політика конфіденційності та подальший розвиток із залученням фахівців.",
    ],
    closing: "З повагою",
    signature: "Aleksander Polański",
    backHome: "Повернутися на головну",
  },
  de: {
    eyebrow: "Testversion",
    title: "Hinweis: Testversion",
    paragraphs: [
      "ARCTor.app ist derzeit ein experimentelles Beta-Projekt. Die Seite wurde zu einem großen Teil mit Hilfe von ChatGPT erstellt und wird weiterhin entwickelt, getestet und verbessert.",
      "Das bedeutet, dass ich keinen unterbrechungsfreien Betrieb, keine vollständige Stabilität und nicht garantieren kann, dass alle Funktionen jederzeit verfügbar sind oder sich genau wie geplant verhalten.",
      "Bitte betrachten Sie ARCTor.app als Ort zum Testen einer Idee und nicht als Werkzeug, von dem wichtige Entscheidungen, Geld, Gesundheit, Arbeit oder die einzige Kopie wichtiger Daten abhängen.",
      "Speichern Sie hier nichts, dessen Verlust für Sie ein ernstes Problem wäre. Wenn Sie AI-Funktionen nutzen, behandeln Sie die Antworten als unterstützende Vorschläge und nicht als professionelle medizinische, rechtliche, finanzielle oder berufliche Beratung.",
      "Wenn sich das Projekt als nützlich erweist und kommerziell sinnvoll wird, ist der nächste Schritt eine professionelle Ordnung: technisches Audit, Sicherheit, stabile Infrastruktur, Nutzungsbedingungen, Datenschutzrichtlinie und weitere Entwicklung mit Fachleuten.",
    ],
    closing: "Mit freundlichen Grüßen",
    signature: "Aleksander Polański",
    backHome: "Zur Startseite",
  },
  cs: {
    eyebrow: "Testovací verze",
    title: "Upozornění: testovací verze",
    paragraphs: [
      "ARCTor.app je v současnosti experimentální projekt ve verzi beta. Stránka byla z velké části vytvořena s pomocí ChatGPT a stále se vyvíjí, testuje a opravuje.",
      "To znamená, že nemohu zaručit nepřetržitý provoz, plnou stabilitu ani to, že všechny funkce budou vždy dostupné nebo se budou chovat přesně podle plánu.",
      "Proto prosím berte ARCTor.app jako místo pro testování nápadu, nikoli jako nástroj, na kterém závisí důležitá rozhodnutí, peníze, zdraví, práce nebo jediná kopie důležitých dat.",
      "Neukládejte zde nic, jehož ztráta by pro vás mohla být vážným problémem. Pokud používáte funkce AI, berte odpovědi jako pomocné návrhy, nikoli jako odborné lékařské, právní, finanční nebo pracovní poradenství.",
      "Pokud se projekt ukáže jako užitečný a začne dávat komerční smysl, dalším krokem bude jeho profesionální uspořádání: technický audit, bezpečnost, stabilní infrastruktura, podmínky používání, zásady ochrany soukromí a další rozvoj se zapojením specialistů.",
    ],
    closing: "S pozdravem",
    signature: "Aleksander Polański",
    backHome: "Zpět na hlavní stránku",
  },
};

function useInterfaceLocale(): LocaleCode {
  const [locale, setLocale] = useState<LocaleCode>("en");

  useEffect(() => {
    function syncLocaleFromUrl() {
      if (typeof window === "undefined") {
        return;
      }

      setLocale(getLocaleSearchParam(new URLSearchParams(window.location.search)));
    }

    syncLocaleFromUrl();
    window.addEventListener("popstate", syncLocaleFromUrl);

    return () => {
      window.removeEventListener("popstate", syncLocaleFromUrl);
    };
  }, []);

  return locale;
}

function buildLocaleAwareHref(pathname: string, locale: LocaleCode): string {
  if (locale === "en") {
    return pathname;
  }

  return `${pathname}?locale=${encodeURIComponent(locale)}`;
}

export default function BetaNoticePage() {
  const locale = useInterfaceLocale();
  const content = useMemo(() => betaNoticeContent[locale] ?? betaNoticeContent.en, [locale]);
  const homeHref = buildLocaleAwareHref("/", locale);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 py-6 sm:px-7 lg:px-9">
      <section className="rounded-[28px] border border-red-100 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertTriangle size={24} strokeWidth={2.4} />
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-red-500">
              {content.eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-[#1a1d2e] sm:text-4xl">
              {content.title}
            </h1>
          </div>
        </div>

        <div className="space-y-4 text-[15px] leading-7 text-[#4a4f6a]">
          {content.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-[#e4e7f2] bg-[#f8f9fd] p-4 text-[15px] text-[#1a1d2e]">
          <p>{content.closing}</p>
          <p className="mt-1 font-semibold">{content.signature}</p>
        </div>

        <a
          href={homeHref}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#dfe4ff] bg-white px-4 py-2 text-[13px] font-semibold text-[#3b6ef8] shadow-sm transition-colors hover:bg-[#eef2ff]"
        >
          <Home size={15} />
          {content.backHome}
        </a>
      </section>
    </main>
  );
}
