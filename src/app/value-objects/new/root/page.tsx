"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type Copy = {
  eyebrow: string;
  title: string;
  description: string;
  activeProfile: string;
  objectTitle: string;
  objectDescription: string;
  titlePlaceholder: string;
  descriptionPlaceholder: string;
  fixedRole: string;
  fixedFacet: string;
  fixedKind: string;
  fixedStatus: string;
  fixedVisibility: string;
  ontologyNotice: string;
  create: string;
  creating: string;
  back: string;
  errorPrefix: string;
  titleRequired: string;
  descriptionRequired: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    eyebrow: "Root observation object",
    title: "Create a root observation object",
    description:
      "A root is the top-level subject of observation. Its semantic root role is fixed by the ontology; detailed meaning is added in the description and later child objects.",
    activeProfile: "Current active profile",
    objectTitle: "Name",
    objectDescription: "Description",
    titlePlaceholder: "For example: Physical health",
    descriptionPlaceholder: "What belongs to this direction and what does it mean?",
    fixedRole: "Ontology role",
    fixedFacet: "Facet",
    fixedKind: "Ontology kind",
    fixedStatus: "Status",
    fixedVisibility: "Visibility",
    ontologyNotice:
      "Root ontology fields are fixed: DOMAIN / domain_root / root. Branch policies and semantic child kinds are selected only below the root, where they have real meaning.",
    create: "Create root",
    creating: "Creating…",
    back: "Back to observation objects",
    errorPrefix: "Could not create the root:",
    titleRequired: "Enter a name.",
    descriptionRequired: "Enter a short semantic description.",
  },
  pl: {
    eyebrow: "Korzeniowy obiekt obserwacji",
    title: "Utwórz korzeniowy obiekt obserwacji",
    description:
      "Korzeń jest najwyższym przedmiotem obserwacji. Jego rola semantyczna jest ustalona przez ontologię; dokładne znaczenie opisuje się w definicji i obiektach podrzędnych.",
    activeProfile: "Aktualnie aktywny profil",
    objectTitle: "Nazwa",
    objectDescription: "Opis",
    titlePlaceholder: "Na przykład: Zdrowie fizyczne",
    descriptionPlaceholder: "Co należy do tego kierunku i co on oznacza?",
    fixedRole: "Rola ontologiczna",
    fixedFacet: "Płaszczyzna",
    fixedKind: "Rodzaj ontologiczny",
    fixedStatus: "Status",
    fixedVisibility: "Widoczność",
    ontologyNotice:
      "Pola ontologii korzenia są stałe: DOMAIN / domain_root / root. Polityki i rodzaje semantyczne wybiera się dopiero dla obiektów podrzędnych, gdzie mają rzeczywiste znaczenie.",
    create: "Utwórz korzeń",
    creating: "Tworzenie…",
    back: "Wróć do obiektów obserwacji",
    errorPrefix: "Nie udało się utworzyć korzenia:",
    titleRequired: "Wpisz nazwę.",
    descriptionRequired: "Wpisz krótki opis semantyczny.",
  },
  ru: {
    eyebrow: "Корневой объект наблюдения",
    title: "Создать корневой объект наблюдения",
    description:
      "Корень — верхний предмет наблюдения. Его смысловая роль фиксируется онтологией; конкретный смысл задаётся описанием и последующими дочерними объектами.",
    activeProfile: "Текущий активный профиль",
    objectTitle: "Название",
    objectDescription: "Описание",
    titlePlaceholder: "Например: Физическое здоровье",
    descriptionPlaceholder: "Что относится к этому направлению и что именно оно означает?",
    fixedRole: "Роль в онтологии",
    fixedFacet: "Смысловая плоскость",
    fixedKind: "Вид в онтологии",
    fixedStatus: "Статус",
    fixedVisibility: "Видимость",
    ontologyNotice:
      "Поля корня фиксированы онтологией: DOMAIN / domain_root / root. Политику ветви и смысловой вид выбирают уже у дочерних объектов, где эти различия действительно имеют смысл.",
    create: "Создать корень",
    creating: "Создание…",
    back: "Назад к объектам наблюдения",
    errorPrefix: "Не удалось создать корень:",
    titleRequired: "Введите название.",
    descriptionRequired: "Введите короткое смысловое описание.",
  },
  uk: {
    eyebrow: "Кореневий об’єкт спостереження",
    title: "Створити кореневий об’єкт спостереження",
    description:
      "Корінь — верхній предмет спостереження. Його смислова роль фіксується онтологією; конкретний зміст задається описом і дочірніми об’єктами.",
    activeProfile: "Поточний активний профіль",
    objectTitle: "Назва",
    objectDescription: "Опис",
    titlePlaceholder: "Наприклад: Фізичне здоров’я",
    descriptionPlaceholder: "Що належить до цього напряму і що саме він означає?",
    fixedRole: "Роль в онтології",
    fixedFacet: "Смислова площина",
    fixedKind: "Вид в онтології",
    fixedStatus: "Статус",
    fixedVisibility: "Видимість",
    ontologyNotice:
      "Поля кореня фіксуються онтологією: DOMAIN / domain_root / root. Політика гілки та смисловий вид обираються вже для дочірніх об’єктів, де ці відмінності мають реальний зміст.",
    create: "Створити корінь",
    creating: "Створення…",
    back: "Назад до об’єктів спостереження",
    errorPrefix: "Не вдалося створити корінь:",
    titleRequired: "Введіть назву.",
    descriptionRequired: "Введіть короткий смисловий опис.",
  },
  de: {
    eyebrow: "Wurzel-Beobachtungsobjekt",
    title: "Wurzel-Beobachtungsobjekt erstellen",
    description:
      "Die Wurzel ist der oberste Beobachtungsgegenstand. Ihre semantische Rolle ist durch die Ontologie festgelegt; die konkrete Bedeutung wird in Beschreibung und Unterobjekten definiert.",
    activeProfile: "Aktuell aktives Profil",
    objectTitle: "Name",
    objectDescription: "Beschreibung",
    titlePlaceholder: "Zum Beispiel: Körperliche Gesundheit",
    descriptionPlaceholder: "Was gehört zu diesem Bereich und was bedeutet er genau?",
    fixedRole: "Ontologie-Rolle",
    fixedFacet: "Facette",
    fixedKind: "Ontologie-Art",
    fixedStatus: "Status",
    fixedVisibility: "Sichtbarkeit",
    ontologyNotice:
      "Die Ontologie-Felder der Wurzel sind fest: DOMAIN / domain_root / root. Zweigregeln und semantische Arten werden erst bei Unterobjekten gewählt, wo sie tatsächlich Bedeutung haben.",
    create: "Wurzel erstellen",
    creating: "Wird erstellt…",
    back: "Zurück zu Beobachtungsobjekten",
    errorPrefix: "Wurzel konnte nicht erstellt werden:",
    titleRequired: "Geben Sie einen Namen ein.",
    descriptionRequired: "Geben Sie eine kurze semantische Beschreibung ein.",
  },
  es: {
    eyebrow: "Objeto raíz de observación",
    title: "Crear un objeto raíz de observación",
    description:
      "La raíz es el objeto superior de observación. Su rol semántico está fijado por la ontología; el significado concreto se define en la descripción y los objetos hijos.",
    activeProfile: "Perfil activo actual",
    objectTitle: "Nombre",
    objectDescription: "Descripción",
    titlePlaceholder: "Por ejemplo: Salud física",
    descriptionPlaceholder: "¿Qué pertenece a esta dirección y qué significa exactamente?",
    fixedRole: "Rol ontológico",
    fixedFacet: "Faceta",
    fixedKind: "Tipo ontológico",
    fixedStatus: "Estado",
    fixedVisibility: "Visibilidad",
    ontologyNotice:
      "Los campos ontológicos de la raíz son fijos: DOMAIN / domain_root / root. Las políticas de rama y los tipos semánticos se eligen en los objetos hijos, donde realmente tienen significado.",
    create: "Crear raíz",
    creating: "Creando…",
    back: "Volver a objetos de observación",
    errorPrefix: "No se pudo crear la raíz:",
    titleRequired: "Introduce un nombre.",
    descriptionRequired: "Introduce una breve descripción semántica.",
  },
  cs: {
    eyebrow: "Kořenový objekt pozorování",
    title: "Vytvořit kořenový objekt pozorování",
    description:
      "Kořen je nejvyšší předmět pozorování. Jeho sémantická role je pevně určena ontologií; konkrétní význam se popisuje definicí a podřízenými objekty.",
    activeProfile: "Aktuálně aktivní profil",
    objectTitle: "Název",
    objectDescription: "Popis",
    titlePlaceholder: "Například: Fyzické zdraví",
    descriptionPlaceholder: "Co do této oblasti patří a co přesně znamená?",
    fixedRole: "Role v ontologii",
    fixedFacet: "Fazeta",
    fixedKind: "Druh v ontologii",
    fixedStatus: "Stav",
    fixedVisibility: "Viditelnost",
    ontologyNotice:
      "Ontologická pole kořene jsou pevná: DOMAIN / domain_root / root. Politika větve a sémantický druh se volí až u podřízených objektů, kde mají skutečný význam.",
    create: "Vytvořit kořen",
    creating: "Vytváření…",
    back: "Zpět k objektům pozorování",
    errorPrefix: "Kořen se nepodařilo vytvořit:",
    titleRequired: "Zadejte název.",
    descriptionRequired: "Zadejte krátký sémantický popis.",
  },
};

type ActorContextResponse = {
  ok?: boolean;
  activeProfile?: {
    displayName?: string | null;
    profileKind?: string | null;
  };
};

type RootCreateResponse = {
  ok?: boolean;
  error?: string;
  redirectUrl?: string;
};

function normalizeLocale(value: string | null): LocaleCode {
  if (
    value === "pl" ||
    value === "ru" ||
    value === "uk" ||
    value === "de" ||
    value === "es" ||
    value === "cs"
  ) {
    return value;
  }

  return "en";
}

function buildLocaleHref(pathname: string, locale: LocaleCode) {
  return locale === "en"
    ? pathname
    : `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function newIdempotencyKey() {
  return `vo-ui-root-${crypto.randomUUID()}`;
}

export default function ValueObjectRootCreatePage() {
  const router = useRouter();
  const [locale, setLocale] = useState<LocaleCode>("en");
  const [activeProfileName, setActiveProfileName] = useState("—");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const nextLocale = normalizeLocale(
      new URLSearchParams(window.location.search).get("locale"),
    );
    const timeoutId = window.setTimeout(() => {
      setLocale(nextLocale);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/actor-context", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const data = (await response.json()) as ActorContextResponse;

        if (!cancelled && response.ok && data.ok) {
          setActiveProfileName(
            data.activeProfile?.displayName?.trim() ||
              data.activeProfile?.profileKind ||
              "Active profile",
          );
        }
      } catch {
        if (!cancelled) {
          setActiveProfileName("—");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const copy = COPY[locale];

  async function submit() {
    setErrorMessage("");

    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();

    if (!normalizedTitle) {
      setErrorMessage(`${copy.errorPrefix} ${copy.titleRequired}`);
      return;
    }

    if (!normalizedDescription) {
      setErrorMessage(`${copy.errorPrefix} ${copy.descriptionRequired}`);
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/value-objects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          creationMode: "root_branch_active_v4",
          title: normalizedTitle,
          description: normalizedDescription,
          locale,
          idempotencyKey: newIdempotencyKey(),
        }),
      });

      const data = (await response.json()) as RootCreateResponse;

      if (!response.ok || !data.ok || !data.redirectUrl) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      router.push(data.redirectUrl);
    } catch (error) {
      setErrorMessage(
        `${copy.errorPrefix} ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    } finally {
      setPending(false);
    }
  }

  const fixedCards = [
    [copy.activeProfile, activeProfileName],
    [copy.fixedRole, "root"],
    [copy.fixedFacet, "DOMAIN"],
    [copy.fixedKind, "domain_root"],
    [copy.fixedStatus, "active"],
    [copy.fixedVisibility, "private"],
  ] as const;

  return (
    <main className="min-h-full bg-[#f0f2f7] px-4 py-8 text-[#1a1d2e]">
      <div className="mx-auto grid w-full max-w-[1180px] gap-5">
        <header className="rounded-[26px] border border-black/[0.07] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#3b6ef8]">
            {copy.eyebrow}
          </div>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-[800px]">
              <h1 className="text-[30px] font-bold tracking-[-0.03em] text-[#111827]">
                {copy.title}
              </h1>
              <p className="mt-3 text-[14px] leading-6 text-[#5a5f7a]">
                {copy.description}
              </p>
            </div>
            <Link
              href={buildLocaleHref("/value-objects", locale)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
            >
              {copy.back}
            </Link>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {fixedCards.map(([label, value]) => (
            <div
              key={label}
              className="rounded-[22px] border border-black/[0.07] bg-white p-4 shadow-sm"
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">
                {label}
              </div>
              <div className="mt-2 break-words font-mono text-[13px] font-semibold text-[#111827]">
                {value}
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-[26px] border border-black/[0.07] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="grid gap-5">
            <label className="grid gap-2">
              <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">
                {copy.objectTitle}
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={180}
                placeholder={copy.titlePlaceholder}
                className="min-h-12 rounded-2xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] font-semibold outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">
                {copy.objectDescription}
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={4000}
                rows={5}
                placeholder={copy.descriptionPlaceholder}
                className="rounded-2xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] leading-6 outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
              />
            </label>
          </div>

          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[12px] leading-5 text-amber-900">
            {copy.ontologyNotice}
          </p>

          {errorMessage ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] font-semibold text-red-800">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Link
              href={buildLocaleHref("/value-objects", locale)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-5 py-3 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
            >
              {copy.back}
            </Link>
            <button
              type="button"
              disabled={pending}
              onClick={() => void submit()}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#3b6ef8] px-6 py-3 text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(59,110,248,0.24)] transition hover:bg-[#315fdc] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? copy.creating : copy.create}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
