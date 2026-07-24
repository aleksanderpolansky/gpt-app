"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  VALUE_OBJECT_BRANCH_TYPE_CODES_V2,
  VALUE_OBJECT_KINDS_V2,
  type ValueObjectBranchTypeCodeV2,
  type ValueObjectKindV2,
} from "@/types/reality-core/reality-core-contracts-v2";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type Copy = {
  eyebrow: string;
  title: string;
  description: string;
  activeProfile: string;
  branch: string;
  kind: string;
  objectTitle: string;
  objectDescription: string;
  titlePlaceholder: string;
  descriptionPlaceholder: string;
  branchHint: string;
  kindHint: string;
  create: string;
  creating: string;
  back: string;
  errorPrefix: string;
  draftNotice: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    eyebrow: "Root observation object",
    title: "Create a root observation object",
    description:
      "A root is the top-level subject of observation. It has no parent, starts as a private draft, and belongs to the currently active profile.",
    activeProfile: "Current active profile",
    branch: "Branch policy",
    kind: "Object kind",
    objectTitle: "Name",
    objectDescription: "Description",
    titlePlaceholder: "For example: Physical health",
    descriptionPlaceholder:
      "What exactly belongs to this direction and why do you observe it?",
    branchHint:
      "The branch defines stable system rules. Child objects will inherit it.",
    kindHint:
      "Choose the closest semantic nature of the root. Activity pattern is reserved for leaves.",
    create: "Create root",
    creating: "Creating…",
    back: "Back to observation objects",
    errorPrefix: "Could not create the root:",
    draftNotice: "The new root will be private and draft by default.",
  },
  pl: {
    eyebrow: "Korzeniowy obiekt obserwacji",
    title: "Utwórz korzeniowy obiekt obserwacji",
    description:
      "Korzeń to najwyższy przedmiot obserwacji. Nie ma rodzica, powstaje jako prywatny szkic i należy do aktualnie aktywnego profilu.",
    activeProfile: "Aktualnie aktywny profil",
    branch: "Polityka gałęzi",
    kind: "Rodzaj obiektu",
    objectTitle: "Nazwa",
    objectDescription: "Opis",
    titlePlaceholder: "Na przykład: Zdrowie fizyczne",
    descriptionPlaceholder:
      "Co dokładnie należy do tego kierunku i dlaczego to obserwujesz?",
    branchHint:
      "Gałąź definiuje stałe reguły systemowe. Obiekty podrzędne ją odziedziczą.",
    kindHint:
      "Wybierz najbliższą naturę semantyczną korzenia. Wzorzec aktywności jest zarezerwowany dla liści.",
    create: "Utwórz korzeń",
    creating: "Tworzenie…",
    back: "Wróć do obiektów obserwacji",
    errorPrefix: "Nie udało się utworzyć korzenia:",
    draftNotice: "Nowy korzeń będzie domyślnie prywatnym szkicem.",
  },
  ru: {
    eyebrow: "Корневой объект наблюдения",
    title: "Создать корневой объект наблюдения",
    description:
      "Корень — верхний предмет наблюдения. У него нет родителя, он создаётся как приватный черновик и принадлежит текущему активному профилю.",
    activeProfile: "Текущий активный профиль",
    branch: "Политика ветви",
    kind: "Вид объекта",
    objectTitle: "Название",
    objectDescription: "Описание",
    titlePlaceholder: "Например: Физическое здоровье",
    descriptionPlaceholder:
      "Что именно входит в это направление и зачем вы за ним наблюдаете?",
    branchHint:
      "Ветвь задаёт стабильные системные правила. Дочерние объекты унаследуют её.",
    kindHint:
      "Выберите ближайшую смысловую природу корня. Шаблон активности предназначен только для листьев.",
    create: "Создать корень",
    creating: "Создание…",
    back: "Назад к объектам наблюдения",
    errorPrefix: "Не удалось создать корень:",
    draftNotice: "Новый корень по умолчанию будет приватным черновиком.",
  },
  uk: {
    eyebrow: "Кореневий об’єкт спостереження",
    title: "Створити кореневий об’єкт спостереження",
    description:
      "Корінь — верхній предмет спостереження. Він не має батьківського об’єкта, створюється як приватна чернетка й належить поточному активному профілю.",
    activeProfile: "Поточний активний профіль",
    branch: "Політика гілки",
    kind: "Вид об’єкта",
    objectTitle: "Назва",
    objectDescription: "Опис",
    titlePlaceholder: "Наприклад: Фізичне здоров’я",
    descriptionPlaceholder:
      "Що саме входить до цього напряму і навіщо ви за ним спостерігаєте?",
    branchHint:
      "Гілка задає сталі системні правила. Дочірні об’єкти успадкують її.",
    kindHint:
      "Оберіть найближчу смислову природу кореня. Шаблон активності призначений лише для листків.",
    create: "Створити корінь",
    creating: "Створення…",
    back: "Назад до об’єктів спостереження",
    errorPrefix: "Не вдалося створити корінь:",
    draftNotice: "Новий корінь за замовчуванням буде приватною чернеткою.",
  },
  de: {
    eyebrow: "Wurzel-Beobachtungsobjekt",
    title: "Wurzel-Beobachtungsobjekt erstellen",
    description:
      "Eine Wurzel ist der oberste Beobachtungsgegenstand. Sie hat kein übergeordnetes Objekt, startet als privater Entwurf und gehört zum aktuell aktiven Profil.",
    activeProfile: "Aktuell aktives Profil",
    branch: "Zweigregel",
    kind: "Objektart",
    objectTitle: "Name",
    objectDescription: "Beschreibung",
    titlePlaceholder: "Zum Beispiel: Körperliche Gesundheit",
    descriptionPlaceholder:
      "Was gehört genau zu diesem Bereich und warum beobachten Sie ihn?",
    branchHint:
      "Der Zweig definiert stabile Systemregeln. Untergeordnete Objekte erben ihn.",
    kindHint:
      "Wählen Sie die passende semantische Art der Wurzel. Aktivitätsmuster sind Blättern vorbehalten.",
    create: "Wurzel erstellen",
    creating: "Wird erstellt…",
    back: "Zurück zu Beobachtungsobjekten",
    errorPrefix: "Wurzel konnte nicht erstellt werden:",
    draftNotice: "Die neue Wurzel ist standardmäßig ein privater Entwurf.",
  },
  es: {
    eyebrow: "Objeto raíz de observación",
    title: "Crear un objeto raíz de observación",
    description:
      "Una raíz es el objeto superior de observación. No tiene padre, comienza como borrador privado y pertenece al perfil activo actual.",
    activeProfile: "Perfil activo actual",
    branch: "Política de rama",
    kind: "Tipo de objeto",
    objectTitle: "Nombre",
    objectDescription: "Descripción",
    titlePlaceholder: "Por ejemplo: Salud física",
    descriptionPlaceholder:
      "¿Qué pertenece exactamente a esta dirección y por qué la observas?",
    branchHint:
      "La rama define reglas estables del sistema. Los objetos hijos la heredarán.",
    kindHint:
      "Elige la naturaleza semántica más cercana de la raíz. El patrón de actividad está reservado para hojas.",
    create: "Crear raíz",
    creating: "Creando…",
    back: "Volver a objetos de observación",
    errorPrefix: "No se pudo crear la raíz:",
    draftNotice: "La nueva raíz será privada y borrador por defecto.",
  },
  cs: {
    eyebrow: "Kořenový objekt pozorování",
    title: "Vytvořit kořenový objekt pozorování",
    description:
      "Kořen je nejvyšší předmět pozorování. Nemá rodiče, vzniká jako soukromý koncept a patří aktuálně aktivnímu profilu.",
    activeProfile: "Aktuálně aktivní profil",
    branch: "Politika větve",
    kind: "Druh objektu",
    objectTitle: "Název",
    objectDescription: "Popis",
    titlePlaceholder: "Například: Fyzické zdraví",
    descriptionPlaceholder:
      "Co přesně do této oblasti patří a proč ji pozorujete?",
    branchHint:
      "Větev určuje stabilní systémová pravidla. Podřízené objekty ji zdědí.",
    kindHint:
      "Vyberte nejbližší sémantickou povahu kořene. Vzor aktivity je vyhrazen listům.",
    create: "Vytvořit kořen",
    creating: "Vytváření…",
    back: "Zpět k objektům pozorování",
    errorPrefix: "Kořen se nepodařilo vytvořit:",
    draftNotice: "Nový kořen bude ve výchozím stavu soukromý koncept.",
  },
};

const BRANCH_LABELS: Record<
  ValueObjectBranchTypeCodeV2,
  Record<LocaleCode, string>
> = {
  external_capital: {
    en: "External capital",
    pl: "Kapitał zewnętrzny",
    ru: "Внешний капитал",
    uk: "Зовнішній капітал",
    de: "Externes Kapital",
    es: "Capital externo",
    cs: "Vnější kapitál",
  },
  internal_capability: {
    en: "Internal capability",
    pl: "Zdolność wewnętrzna",
    ru: "Внутренняя способность",
    uk: "Внутрішня спроможність",
    de: "Interne Fähigkeit",
    es: "Capacidad interna",
    cs: "Vnitřní schopnost",
  },
  resource: {
    en: "Resource",
    pl: "Zasób",
    ru: "Ресурс",
    uk: "Ресурс",
    de: "Ressource",
    es: "Recurso",
    cs: "Zdroj",
  },
  biological_system: {
    en: "Biological system",
    pl: "Układ biologiczny",
    ru: "Биологическая система",
    uk: "Біологічна система",
    de: "Biologisches System",
    es: "Sistema biológico",
    cs: "Biologický systém",
  },
  mediator_hormone: {
    en: "Mediator or hormone",
    pl: "Mediator lub hormon",
    ru: "Медиатор или гормон",
    uk: "Медіатор або гормон",
    de: "Mediator oder Hormon",
    es: "Mediador u hormona",
    cs: "Mediátor nebo hormon",
  },
};

type ActorContextResponse = {
  ok?: boolean;
  activeProfile?: {
    profileId?: string;
    actorId?: string;
    displayName?: string | null;
    profileKind?: string | null;
  };
  error?: string;
};

type RootCreateResponse = {
  ok?: boolean;
  error?: string;
  redirectUrl?: string;
};

const ROOT_OBJECT_KINDS = VALUE_OBJECT_KINDS_V2.filter(
  (value): value is ValueObjectKindV2 => value !== "activity_pattern",
);

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

function humanizeCode(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildLocaleHref(pathname: string, locale: LocaleCode) {
  if (locale === "en") {
    return pathname;
  }

  return `${pathname}?locale=${encodeURIComponent(locale)}`;
}

export default function NewRootObservationObjectPage() {
  const router = useRouter();
  const [locale, setLocale] = useState<LocaleCode>("en");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [branchTypeCode, setBranchTypeCode] =
    useState<ValueObjectBranchTypeCodeV2>("resource");
  const [objectKind, setObjectKind] = useState<ValueObjectKindV2>("other");
  const [activeProfileName, setActiveProfileName] = useState("—");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setLocale(normalizeLocale(searchParams.get("locale")));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadActorContext() {
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
    }

    void loadActorContext();

    return () => {
      cancelled = true;
    };
  }, []);

  const copy = COPY[locale];

  const branchOptions = useMemo(
    () =>
      VALUE_OBJECT_BRANCH_TYPE_CODES_V2.map((code) => ({
        code,
        label: BRANCH_LABELS[code][locale],
      })),
    [locale],
  );

  async function submit() {
    setErrorMessage("");

    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      setErrorMessage(`${copy.errorPrefix} ${copy.objectTitle}.`);
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
          creationMode: "root_draft_v3",
          title: normalizedTitle,
          description: description.trim() || null,
          branchTypeCode,
          objectKind,
          locale,
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

  return (
    <main className="min-h-full bg-[#f0f2f7] px-4 py-8 text-[#1a1d2e]">
      <div className="mx-auto grid w-full max-w-[1180px] gap-5">
        <header className="rounded-[26px] border border-black/[0.07] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#3b6ef8]">
            {copy.eyebrow}
          </div>

          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-[760px]">
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

        <section className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
              {copy.activeProfile}
            </div>
            <div className="mt-2 text-[17px] font-bold text-[#111827]">
              {activeProfileName}
            </div>
          </div>

          <div className="rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
              node_role_code
            </div>
            <div className="mt-2 font-mono text-[14px] font-semibold text-[#3b6ef8]">
              structural
            </div>
          </div>

          <div className="rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
              status
            </div>
            <div className="mt-2 font-mono text-[14px] font-semibold text-[#8b5cf6]">
              draft
            </div>
          </div>

          <div className="rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
              visibility
            </div>
            <div className="mt-2 font-mono text-[14px] font-semibold text-[#111827]">
              private
            </div>
          </div>
        </section>

        <section className="rounded-[26px] border border-black/[0.07] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="grid gap-5 lg:grid-cols-2">
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
                {copy.branch}
              </span>
              <select
                value={branchTypeCode}
                onChange={(event) =>
                  setBranchTypeCode(
                    event.target.value as ValueObjectBranchTypeCodeV2,
                  )
                }
                className="min-h-12 rounded-2xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] font-semibold outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
              >
                {branchOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label} · {option.code}
                  </option>
                ))}
              </select>
              <span className="text-[12px] leading-5 text-[#7c8099]">
                {copy.branchHint}
              </span>
            </label>

            <label className="grid gap-2 lg:col-span-2">
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

            <label className="grid gap-2 lg:col-span-2">
              <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">
                {copy.kind}
              </span>
              <select
                value={objectKind}
                onChange={(event) =>
                  setObjectKind(event.target.value as ValueObjectKindV2)
                }
                className="min-h-12 rounded-2xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] font-semibold outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
              >
                {ROOT_OBJECT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {humanizeCode(kind)} · {kind}
                  </option>
                ))}
              </select>
              <span className="text-[12px] leading-5 text-[#7c8099]">
                {copy.kindHint}
              </span>
            </label>
          </div>

          <div className="mt-6 rounded-2xl border border-[#dfe6ff] bg-[#f7f9ff] p-4 text-[13px] font-semibold text-[#4a4f6a]">
            {copy.draftNotice}
          </div>

          {errorMessage && (
            <div className="mt-4 rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-4 text-[13px] font-semibold text-[#b91c1c]">
              {errorMessage}
            </div>
          )}

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
