"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  ValueObjectCreateSuccessCard,
  getValueObjectCreatedLabel,
} from "@/components/workspace/value-objects/value-object-create-success-card";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type IntermediateCreateFormProps = {
  locale: LocaleCode;
  activeProfileName: string;
  parent: {
    id: string;
    title: string;
    branchTypeCode: string;
    objectKind: string;
    rootValueObjectId: string;
    status: string;
  };
};

type Copy = {
  eyebrow: string;
  title: string;
  description: string;
  activeProfile: string;
  parent: string;
  inheritedBranch: string;
  objectTitle: string;
  objectDescription: string;
  titlePlaceholder: string;
  descriptionPlaceholder: string;
  create: string;
  creating: string;
  back: string;
  errorPrefix: string;
  activeNotice: string;
  fixedRole: string;
  nestingRule: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    eyebrow: "Intermediate observation object",
    title: "Create an intermediate object",
    description:
      "An intermediate object groups child objects inside the same root. It can be created under a root or another intermediate object, with no fixed nesting limit.",
    activeProfile: "Current active profile",
    parent: "Structural parent",
    inheritedBranch: "Inherited branch",
    objectTitle: "Intermediate object name",
    objectDescription: "Description",
    titlePlaceholder: "For example: Pulling exercises",
    descriptionPlaceholder:
      "What child objects should this structural group organize?",
    create: "Create intermediate",
    creating: "Creating…",
    back: "Back to parent",
    errorPrefix: "Could not create the intermediate object:",
    activeNotice:
      "The new intermediate object becomes active immediately. Its meaning is defined by its place in the observation tree.",
    fixedRole: "Node role",
    nestingRule:
      "Intermediate objects may contain leaves and other intermediate objects. Insertion and reparenting remain a separate controlled step.",
  },
  pl: {
    eyebrow: "Pośredni obiekt obserwacji",
    title: "Utwórz obiekt pośredni",
    description:
      "Obiekt pośredni grupuje obiekty podrzędne w obrębie tego samego korzenia. Może powstać pod korzeniem albo innym obiektem pośrednim, bez stałego limitu zagnieżdżenia.",
    activeProfile: "Aktualnie aktywny profil",
    parent: "Nadrzędny obiekt strukturalny",
    inheritedBranch: "Dziedziczona gałąź",
    objectTitle: "Nazwa obiektu pośredniego",
    objectDescription: "Opis",
    titlePlaceholder: "Na przykład: Ćwiczenia przyciągające",
    descriptionPlaceholder:
      "Jakie obiekty podrzędne ma porządkować ta grupa strukturalna?",
    create: "Utwórz obiekt pośredni",
    creating: "Tworzenie…",
    back: "Wróć do obiektu nadrzędnego",
    errorPrefix: "Nie udało się utworzyć obiektu pośredniego:",
    activeNotice:
      "Nowy obiekt pośredni staje się aktywny od razu. Jego znaczenie określa miejsce w drzewie obserwacji.",
    fixedRole: "Rola węzła",
    nestingRule:
      "Obiekty pośrednie mogą zawierać liście i kolejne obiekty pośrednie. Wstawianie i przepinanie dzieci pozostają osobnym kontrolowanym krokiem.",
  },
  ru: {
    eyebrow: "Промежуточный объект наблюдения",
    title: "Создать промежуточный объект",
    description:
      "Промежуточный объект группирует дочерние объекты внутри одного корня. Его можно создавать под корнем или другим промежуточным объектом без фиксированного ограничения глубины.",
    activeProfile: "Текущий активный профиль",
    parent: "Родительский структурный объект",
    inheritedBranch: "Унаследованная ветвь",
    objectTitle: "Название промежуточного объекта",
    objectDescription: "Описание",
    titlePlaceholder: "Например: Тяговые упражнения",
    descriptionPlaceholder:
      "Какие дочерние объекты должна объединять эта структурная группа?",
    create: "Создать промежуточный объект",
    creating: "Создание…",
    back: "Назад к родительскому объекту",
    errorPrefix: "Не удалось создать промежуточный объект:",
    activeNotice:
      "Новый промежуточный объект сразу становится действующим. Его смысл определяется местом в дереве наблюдений.",
    fixedRole: "Роль узла",
    nestingRule:
      "Промежуточные объекты могут содержать листья и другие промежуточные объекты. Вставка между существующими узлами и переподчинение остаются отдельным контролируемым шагом.",
  },
  uk: {
    eyebrow: "Проміжний об’єкт спостереження",
    title: "Створити проміжний об’єкт",
    description:
      "Проміжний об’єкт групує дочірні об’єкти всередині одного кореня. Його можна створювати під коренем або іншим проміжним об’єктом без фіксованого обмеження глибини.",
    activeProfile: "Поточний активний профіль",
    parent: "Батьківський структурний об’єкт",
    inheritedBranch: "Успадкована гілка",
    objectTitle: "Назва проміжного об’єкта",
    objectDescription: "Опис",
    titlePlaceholder: "Наприклад: Тягові вправи",
    descriptionPlaceholder:
      "Які дочірні об’єкти має об’єднувати ця структурна група?",
    create: "Створити проміжний об’єкт",
    creating: "Створення…",
    back: "Назад до батьківського об’єкта",
    errorPrefix: "Не вдалося створити проміжний об’єкт:",
    activeNotice:
      "Новий проміжний об’єкт одразу стає діючим. Його зміст визначається місцем у дереві спостережень.",
    fixedRole: "Роль вузла",
    nestingRule:
      "Проміжні об’єкти можуть містити листки та інші проміжні об’єкти. Вставка між наявними вузлами й перепідпорядкування залишаються окремим контрольованим кроком.",
  },
  de: {
    eyebrow: "Zwischen-Beobachtungsobjekt",
    title: "Zwischenobjekt erstellen",
    description:
      "Ein Zwischenobjekt gruppiert untergeordnete Objekte innerhalb derselben Wurzel. Es kann unter einer Wurzel oder einem weiteren Zwischenobjekt ohne feste Verschachtelungsgrenze erstellt werden.",
    activeProfile: "Aktuell aktives Profil",
    parent: "Übergeordnetes Strukturobjekt",
    inheritedBranch: "Geerbter Zweig",
    objectTitle: "Name des Zwischenobjekts",
    objectDescription: "Beschreibung",
    titlePlaceholder: "Zum Beispiel: Zugübungen",
    descriptionPlaceholder:
      "Welche untergeordneten Objekte soll diese Strukturgruppe ordnen?",
    create: "Zwischenobjekt erstellen",
    creating: "Wird erstellt…",
    back: "Zurück zum übergeordneten Objekt",
    errorPrefix: "Zwischenobjekt konnte nicht erstellt werden:",
    activeNotice:
      "Das neue Zwischenobjekt wird sofort aktiv. Seine Bedeutung ergibt sich aus seiner Position im Beobachtungsbaum.",
    fixedRole: "Knotenrolle",
    nestingRule:
      "Zwischenobjekte können Blätter und weitere Zwischenobjekte enthalten. Einfügen und Umhängen bleiben ein eigener kontrollierter Schritt.",
  },
  es: {
    eyebrow: "Objeto intermedio de observación",
    title: "Crear un objeto intermedio",
    description:
      "Un objeto intermedio agrupa objetos hijos dentro de la misma raíz. Puede crearse bajo una raíz u otro objeto intermedio sin un límite fijo de profundidad.",
    activeProfile: "Perfil activo actual",
    parent: "Objeto estructural padre",
    inheritedBranch: "Rama heredada",
    objectTitle: "Nombre del objeto intermedio",
    objectDescription: "Descripción",
    titlePlaceholder: "Por ejemplo: Ejercicios de tracción",
    descriptionPlaceholder:
      "¿Qué objetos hijos debe organizar este grupo estructural?",
    create: "Crear objeto intermedio",
    creating: "Creando…",
    back: "Volver al objeto padre",
    errorPrefix: "No se pudo crear el objeto intermedio:",
    activeNotice:
      "El nuevo objeto intermedio queda activo de inmediato. Su significado lo define su posición en el árbol de observación.",
    fixedRole: "Rol del nodo",
    nestingRule:
      "Los objetos intermedios pueden contener hojas y otros objetos intermedios. La inserción y el cambio de padre siguen siendo un paso controlado separado.",
  },
  cs: {
    eyebrow: "Mezilehlý objekt pozorování",
    title: "Vytvořit mezilehlý objekt",
    description:
      "Mezilehlý objekt seskupuje podřízené objekty uvnitř stejného kořene. Lze jej vytvořit pod kořenem nebo jiným mezilehlým objektem bez pevného limitu hloubky.",
    activeProfile: "Aktuálně aktivní profil",
    parent: "Nadřazený strukturální objekt",
    inheritedBranch: "Zděděná větev",
    objectTitle: "Název mezilehlého objektu",
    objectDescription: "Popis",
    titlePlaceholder: "Například: Tahové cviky",
    descriptionPlaceholder:
      "Jaké podřízené objekty má tato strukturální skupina uspořádat?",
    create: "Vytvořit mezilehlý objekt",
    creating: "Vytváření…",
    back: "Zpět k nadřazenému objektu",
    errorPrefix: "Mezilehlý objekt se nepodařilo vytvořit:",
    activeNotice:
      "Nový mezilehlý objekt je aktivní okamžitě. Jeho význam určuje místo ve stromu pozorování.",
    fixedRole: "Role uzlu",
    nestingRule:
      "Mezilehlé objekty mohou obsahovat listy a další mezilehlé objekty. Vložení a změna rodiče zůstávají samostatným řízeným krokem.",
  },
};

type IntermediateCreateResponse = {
  ok?: boolean;
  error?: string;
  redirectUrl?: string;
};

function buildLocaleHref(pathname: string, locale: LocaleCode) {
  if (locale === "en") {
    return pathname;
  }

  return `${pathname}?locale=${encodeURIComponent(locale)}`;
}

export function IntermediateCreateForm({
  locale,
  activeProfileName,
  parent,
}: IntermediateCreateFormProps) {
  const router = useRouter();
  const copy = COPY[locale];
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  async function submit() {
    if (pending || createdUrl) {
      return;
    }

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
          creationMode: "intermediate_branch_active_v4",
          parentValueObjectId: parent.id,
          title: normalizedTitle,
          description: description.trim() || null,
          locale,
        }),
      });

      const data = (await response.json()) as IntermediateCreateResponse;

      if (!response.ok || !data.ok || !data.redirectUrl) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setCreatedUrl(data.redirectUrl);
      router.prefetch(data.redirectUrl);
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
              href={buildLocaleHref(`/value-objects/${parent.id}`, locale)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
            >
              {copy.back}
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            [copy.activeProfile, activeProfileName],
            [copy.parent, parent.title],
            [copy.inheritedBranch, parent.branchTypeCode],
            [copy.fixedRole, "structural"],
            ["root_value_object_id", parent.rootValueObjectId],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-sm"
            >
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                {label}
              </div>
              <div className="mt-2 break-words font-mono text-[14px] font-semibold text-[#111827]">
                {value}
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-[26px] border border-black/[0.07] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="grid gap-2 lg:col-span-2">
              <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">
                {copy.objectTitle}
              </span>
              <input
                disabled={pending || Boolean(createdUrl)}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={180}
                placeholder={copy.titlePlaceholder}
                className="min-h-12 rounded-2xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] font-semibold outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
              />
            </label>


            <label className="grid gap-2 lg:col-span-2">
              <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">
                {copy.objectDescription}
              </span>
              <textarea
                disabled={pending || Boolean(createdUrl)}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={4000}
                rows={5}
                placeholder={copy.descriptionPlaceholder}
                className="rounded-2xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] leading-6 outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
              />
            </label>
          </div>


          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[#dfe6ff] bg-[#f7f9ff] p-4 text-[13px] font-semibold text-[#4a4f6a]">
              {copy.activeNotice}
            </div>
            <div className="rounded-2xl border border-[#e9ddff] bg-[#faf7ff] p-4 text-[13px] font-semibold text-[#5f4a82]">
              {copy.nestingRule}
            </div>
          </div>

          {errorMessage && (
            <div className="mt-4 rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-4 text-[13px] font-semibold text-[#b91c1c]">
              {errorMessage}
            </div>
          )}

          {createdUrl ? (
            <ValueObjectCreateSuccessCard
              locale={locale}
              title={title.trim()}
              role="intermediate"
              parentTitle={parent.title}
              objectHref={createdUrl}
              backHref={buildLocaleHref(`/value-objects/${parent.id}`, locale)}
              backLabel={copy.back}
            />
          ) : null}

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Link
              href={buildLocaleHref(`/value-objects/${parent.id}`, locale)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-5 py-3 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
            >
              {copy.back}
            </Link>

            <button
              type="button"
              disabled={pending || Boolean(createdUrl)}
              onClick={() => void submit()}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#3b6ef8] px-6 py-3 text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(59,110,248,0.24)] transition hover:bg-[#315fd8] disabled:cursor-wait disabled:opacity-60"
            >
              {createdUrl
                ? getValueObjectCreatedLabel(locale)
                : pending
                  ? copy.creating
                  : copy.create}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
