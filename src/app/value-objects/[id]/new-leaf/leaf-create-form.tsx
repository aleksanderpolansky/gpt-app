"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type LeafCreateFormProps = {
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
  draftNotice: string;
  fixedKind: string;
  fixedRole: string;
  leafRule: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    eyebrow: "Activity observation leaf",
    title: "Create an activity leaf",
    description:
      "A leaf is a repeatable activity pattern under the selected structural parent. Its branch, owner and root path are inherited on the server.",
    activeProfile: "Current active profile",
    parent: "Structural parent",
    inheritedBranch: "Inherited branch",
    objectTitle: "Activity pattern name",
    objectDescription: "Description",
    titlePlaceholder: "For example: Morning strength workout",
    descriptionPlaceholder:
      "What repeatable activity does this leaf represent?",
    create: "Create leaf",
    creating: "Creating…",
    back: "Back to parent",
    errorPrefix: "Could not create the leaf:",
    draftNotice: "The new leaf will be a private draft by default.",
    fixedKind: "Object kind",
    fixedRole: "Node role",
    leafRule:
      "A leaf cannot contain child objects. Parameters and target standards are added in the next authoring step.",
  },
  pl: {
    eyebrow: "Liść obserwacji aktywności",
    title: "Utwórz liść aktywności",
    description:
      "Liść to powtarzalny wzorzec aktywności pod wybranym obiektem strukturalnym. Gałąź, właściciel i ścieżka korzenia są dziedziczone po stronie serwera.",
    activeProfile: "Aktualnie aktywny profil",
    parent: "Nadrzędny obiekt strukturalny",
    inheritedBranch: "Dziedziczona gałąź",
    objectTitle: "Nazwa wzorca aktywności",
    objectDescription: "Opis",
    titlePlaceholder: "Na przykład: Poranny trening siłowy",
    descriptionPlaceholder:
      "Jaką powtarzalną aktywność reprezentuje ten liść?",
    create: "Utwórz liść",
    creating: "Tworzenie…",
    back: "Wróć do obiektu nadrzędnego",
    errorPrefix: "Nie udało się utworzyć liścia:",
    draftNotice: "Nowy liść będzie domyślnie prywatnym szkicem.",
    fixedKind: "Rodzaj obiektu",
    fixedRole: "Rola węzła",
    leafRule:
      "Liść nie może zawierać obiektów podrzędnych. Parametry i standardy docelowe zostaną dodane w następnym kroku.",
  },
  ru: {
    eyebrow: "Лист наблюдения активности",
    title: "Создать лист активности",
    description:
      "Лист — повторяемый шаблон активности под выбранным структурным объектом. Ветвь, владелец и полный путь к корню наследуются на сервере.",
    activeProfile: "Текущий активный профиль",
    parent: "Родительский структурный объект",
    inheritedBranch: "Унаследованная ветвь",
    objectTitle: "Название шаблона активности",
    objectDescription: "Описание",
    titlePlaceholder: "Например: Утренняя силовая тренировка",
    descriptionPlaceholder:
      "Какую повторяемую активность представляет этот лист?",
    create: "Создать лист",
    creating: "Создание…",
    back: "Назад к родительскому объекту",
    errorPrefix: "Не удалось создать лист:",
    draftNotice: "Новый лист по умолчанию будет приватным черновиком.",
    fixedKind: "Вид объекта",
    fixedRole: "Роль узла",
    leafRule:
      "Лист не может иметь дочерних объектов. Параметры и целевые стандарты добавляются на следующем этапе.",
  },
  uk: {
    eyebrow: "Листок спостереження активності",
    title: "Створити листок активності",
    description:
      "Листок — повторюваний шаблон активності під вибраним структурним об’єктом. Гілка, власник і повний шлях до кореня успадковуються на сервері.",
    activeProfile: "Поточний активний профіль",
    parent: "Батьківський структурний об’єкт",
    inheritedBranch: "Успадкована гілка",
    objectTitle: "Назва шаблону активності",
    objectDescription: "Опис",
    titlePlaceholder: "Наприклад: Ранкове силове тренування",
    descriptionPlaceholder:
      "Яку повторювану активність представляє цей листок?",
    create: "Створити листок",
    creating: "Створення…",
    back: "Назад до батьківського об’єкта",
    errorPrefix: "Не вдалося створити листок:",
    draftNotice: "Новий листок за замовчуванням буде приватною чернеткою.",
    fixedKind: "Вид об’єкта",
    fixedRole: "Роль вузла",
    leafRule:
      "Листок не може мати дочірніх об’єктів. Параметри та цільові стандарти додаються на наступному етапі.",
  },
  de: {
    eyebrow: "Aktivitäts-Beobachtungsblatt",
    title: "Aktivitätsblatt erstellen",
    description:
      "Ein Blatt ist ein wiederholbares Aktivitätsmuster unter dem ausgewählten Strukturobjekt. Zweig, Eigentümer und Wurzelpfad werden serverseitig geerbt.",
    activeProfile: "Aktuell aktives Profil",
    parent: "Übergeordnetes Strukturobjekt",
    inheritedBranch: "Geerbter Zweig",
    objectTitle: "Name des Aktivitätsmusters",
    objectDescription: "Beschreibung",
    titlePlaceholder: "Zum Beispiel: Morgendliches Krafttraining",
    descriptionPlaceholder:
      "Welche wiederholbare Aktivität stellt dieses Blatt dar?",
    create: "Blatt erstellen",
    creating: "Wird erstellt…",
    back: "Zurück zum übergeordneten Objekt",
    errorPrefix: "Blatt konnte nicht erstellt werden:",
    draftNotice: "Das neue Blatt ist standardmäßig ein privater Entwurf.",
    fixedKind: "Objektart",
    fixedRole: "Knotenrolle",
    leafRule:
      "Ein Blatt kann keine untergeordneten Objekte enthalten. Parameter und Zielstandards folgen im nächsten Schritt.",
  },
  es: {
    eyebrow: "Hoja de observación de actividad",
    title: "Crear hoja de actividad",
    description:
      "Una hoja es un patrón de actividad repetible bajo el objeto estructural seleccionado. La rama, el propietario y la ruta raíz se heredan en el servidor.",
    activeProfile: "Perfil activo actual",
    parent: "Objeto estructural padre",
    inheritedBranch: "Rama heredada",
    objectTitle: "Nombre del patrón de actividad",
    objectDescription: "Descripción",
    titlePlaceholder: "Por ejemplo: Entrenamiento de fuerza matutino",
    descriptionPlaceholder:
      "¿Qué actividad repetible representa esta hoja?",
    create: "Crear hoja",
    creating: "Creando…",
    back: "Volver al objeto padre",
    errorPrefix: "No se pudo crear la hoja:",
    draftNotice: "La nueva hoja será privada y borrador por defecto.",
    fixedKind: "Tipo de objeto",
    fixedRole: "Rol del nodo",
    leafRule:
      "Una hoja no puede contener objetos hijos. Los parámetros y estándares objetivo se añadirán en el siguiente paso.",
  },
  cs: {
    eyebrow: "List pozorování aktivity",
    title: "Vytvořit list aktivity",
    description:
      "List je opakovatelný vzor aktivity pod vybraným strukturálním objektem. Větev, vlastník a cesta ke kořeni se dědí na serveru.",
    activeProfile: "Aktuálně aktivní profil",
    parent: "Nadřazený strukturální objekt",
    inheritedBranch: "Zděděná větev",
    objectTitle: "Název vzoru aktivity",
    objectDescription: "Popis",
    titlePlaceholder: "Například: Ranní silový trénink",
    descriptionPlaceholder:
      "Jakou opakovatelnou aktivitu tento list představuje?",
    create: "Vytvořit list",
    creating: "Vytváření…",
    back: "Zpět k nadřazenému objektu",
    errorPrefix: "List se nepodařilo vytvořit:",
    draftNotice: "Nový list bude ve výchozím stavu soukromý koncept.",
    fixedKind: "Druh objektu",
    fixedRole: "Role uzlu",
    leafRule:
      "List nemůže obsahovat podřízené objekty. Parametry a cílové standardy budou přidány v dalším kroku.",
  },
};

type LeafCreateResponse = {
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

export function LeafCreateForm({
  locale,
  activeProfileName,
  parent,
}: LeafCreateFormProps) {
  const router = useRouter();
  const copy = COPY[locale];
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
          creationMode: "leaf_draft_v3",
          parentValueObjectId: parent.id,
          title: normalizedTitle,
          description: description.trim() || null,
          locale,
        }),
      });

      const data = (await response.json()) as LeafCreateResponse;

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
            [copy.fixedRole, "activity_leaf"],
            [copy.fixedKind, "activity_pattern"],
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

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[#dfe6ff] bg-[#f7f9ff] p-4 text-[13px] font-semibold text-[#4a4f6a]">
              {copy.draftNotice}
            </div>
            <div className="rounded-2xl border border-[#e9ddff] bg-[#faf7ff] p-4 text-[13px] font-semibold text-[#5f4b8b]">
              {copy.leafRule}
            </div>
          </div>

          {errorMessage && (
            <div className="mt-4 rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-4 text-[13px] font-semibold text-[#b91c1c]">
              {errorMessage}
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Link
              href={buildLocaleHref(`/value-objects/${parent.id}`, locale)}
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
