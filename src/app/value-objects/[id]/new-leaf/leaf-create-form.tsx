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
    rootValueObjectId: string;
    status: string;
    ontologyNodeRoleCode: "intermediate";
  };
};

type CreateLeafResponse = {
  ok?: boolean;
  error?: string;
  errorCode?: string;
  redirectUrl?: string;
};

type Copy = {
  title: string;
  intro: string;
  back: string;
  profile: string;
  parent: string;
  position: string;
  positionValue: string;
  name: string;
  description: string;
  namePlaceholder: string;
  descriptionPlaceholder: string;
  submit: string;
  busy: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    title: "Add observation leaf",
    intro:
      "This leaf is an ordinary observation object. Its meaning comes from the branch where it is placed; there is no separate observation-kind choice here.",
    back: "Back to parent",
    profile: "Active profile",
    parent: "Parent branch",
    position: "Tree position",
    positionValue: "Leaf",
    name: "Name",
    description: "Description",
    namePlaceholder: "For example: Neck pain",
    descriptionPlaceholder: "What exactly should be observed?",
    submit: "Create leaf",
    busy: "Creating…",
  },
  pl: {
    title: "Dodaj liściowy obiekt obserwacji",
    intro:
      "Ten liść jest zwykłym obiektem obserwacji. Jego znaczenie wynika z gałęzi, w której się znajduje; nie wybiera się tutaj osobnego rodzaju obserwacji.",
    back: "Wróć do rodzica",
    profile: "Aktywny profil",
    parent: "Gałąź nadrzędna",
    position: "Pozycja w drzewie",
    positionValue: "Liść",
    name: "Nazwa",
    description: "Opis",
    namePlaceholder: "Na przykład: Ból szyi",
    descriptionPlaceholder: "Co dokładnie ma być obserwowane?",
    submit: "Utwórz liść",
    busy: "Tworzenie…",
  },
  ru: {
    title: "Добавить листовой объект наблюдения",
    intro:
      "Это обычный объект наблюдения. Его смысл определяется веткой, в которой он находится; отдельного выбора вида наблюдения здесь нет.",
    back: "К родителю",
    profile: "Активный профиль",
    parent: "Родительская ветка",
    position: "Положение в дереве",
    positionValue: "Листовой объект",
    name: "Название",
    description: "Описание",
    namePlaceholder: "Например: Боль в шее",
    descriptionPlaceholder: "Что именно мы наблюдаем?",
    submit: "Создать лист",
    busy: "Создаю…",
  },
  uk: {
    title: "Додати листовий об'єкт спостереження",
    intro:
      "Це звичайний об'єкт спостереження. Його зміст визначається гілкою, у якій він розташований; окремого вибору виду спостереження тут немає.",
    back: "До батьківського об'єкта",
    profile: "Активний профіль",
    parent: "Батьківська гілка",
    position: "Положення в дереві",
    positionValue: "Листовий об'єкт",
    name: "Назва",
    description: "Опис",
    namePlaceholder: "Наприклад: Біль у шиї",
    descriptionPlaceholder: "Що саме ми спостерігаємо?",
    submit: "Створити лист",
    busy: "Створення…",
  },
  de: {
    title: "Beobachtungsblatt hinzufügen",
    intro:
      "Dieses Blatt ist ein gewöhnliches Beobachtungsobjekt. Seine Bedeutung ergibt sich aus dem Zweig, in dem es liegt; hier wird kein eigener Beobachtungstyp gewählt.",
    back: "Zurück",
    profile: "Aktives Profil",
    parent: "Übergeordneter Zweig",
    position: "Position im Baum",
    positionValue: "Blatt",
    name: "Name",
    description: "Beschreibung",
    namePlaceholder: "Zum Beispiel: Nackenschmerz",
    descriptionPlaceholder: "Was soll genau beobachtet werden?",
    submit: "Blatt erstellen",
    busy: "Wird erstellt…",
  },
  es: {
    title: "Añadir hoja de observación",
    intro:
      "Esta hoja es un objeto de observación normal. Su significado viene de la rama en la que se encuentra; aquí no se elige un tipo de observación separado.",
    back: "Volver",
    profile: "Perfil activo",
    parent: "Rama padre",
    position: "Posición en el árbol",
    positionValue: "Hoja",
    name: "Nombre",
    description: "Descripción",
    namePlaceholder: "Por ejemplo: Dolor de cuello",
    descriptionPlaceholder: "¿Qué se debe observar exactamente?",
    submit: "Crear hoja",
    busy: "Creando…",
  },
  cs: {
    title: "Přidat listový objekt pozorování",
    intro:
      "Tento list je běžný objekt pozorování. Jeho význam určuje větev, ve které se nachází; samostatný druh pozorování se zde nevybírá.",
    back: "Zpět",
    profile: "Aktivní profil",
    parent: "Nadřazená větev",
    position: "Pozice ve stromu",
    positionValue: "List",
    name: "Název",
    description: "Popis",
    namePlaceholder: "Například: Bolest krku",
    descriptionPlaceholder: "Co přesně se má pozorovat?",
    submit: "Vytvořit list",
    busy: "Vytváření…",
  },
};

function localeHref(pathname: string, locale: LocaleCode) {
  return locale === "en"
    ? pathname
    : `${pathname}?locale=${encodeURIComponent(locale)}`;
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      setError(copy.name);
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/value-objects", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creationMode: "leaf_branch_active_v4",
          parentValueObjectId: parent.id,
          title: normalizedTitle,
          description: description.trim() || undefined,
          locale,
        }),
      });
      const payload = (await response
        .json()
        .catch(() => null)) as CreateLeafResponse | null;

      if (!response.ok || payload?.ok !== true || !payload.redirectUrl) {
        throw new Error(
          payload?.error ||
            payload?.errorCode ||
            `Leaf creation failed: ${response.status}`,
        );
      }

      router.push(payload.redirectUrl);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Leaf creation failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-full bg-[#f5f6fb] p-5 text-[#1a1d2e]">
      <div className="mx-auto grid w-full max-w-[920px] gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={localeHref(`/value-objects/${parent.id}`, locale)}
            className="rounded-full border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a]"
          >
            {copy.back}
          </Link>
          <span className="text-[12px] font-semibold text-[#7c8099]">
            {copy.profile}: {activeProfileName}
          </span>
        </div>

        <section className="rounded-[26px] border border-black/[0.07] bg-white p-6 shadow-sm">
          <h1 className="text-[26px] font-bold text-[#111827]">{copy.title}</h1>
          <p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#5a5f7a]">
            {copy.intro}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              [copy.parent, parent.title],
              [copy.position, copy.positionValue],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-[#e8eaf2] bg-[#fafbff] p-4"
              >
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">
                  {label}
                </div>
                <div className="mt-1 text-[13px] font-bold text-[#111827]">
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4">
            <label className="text-[13px] font-bold text-[#343854]">
              {copy.name}
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={180}
                placeholder={copy.namePlaceholder}
                className="mt-2 w-full rounded-xl border border-[#dfe3f1] px-4 py-3 text-[14px] outline-none focus:border-[#3b6ef8]"
              />
            </label>
            <label className="text-[13px] font-bold text-[#343854]">
              {copy.description}
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={4000}
                rows={4}
                placeholder={copy.descriptionPlaceholder}
                className="mt-2 w-full resize-y rounded-xl border border-[#dfe3f1] px-4 py-3 text-[14px] outline-none focus:border-[#3b6ef8]"
              />
            </label>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] font-semibold text-red-800">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="mt-6 w-full rounded-xl bg-[#3b6ef8] px-4 py-3 text-[14px] font-bold text-white disabled:opacity-50"
          >
            {busy ? copy.busy : copy.submit}
          </button>
        </section>
      </div>
    </main>
  );
}
