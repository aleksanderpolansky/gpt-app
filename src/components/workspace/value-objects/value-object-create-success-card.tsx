import Link from "next/link";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";
type NodeRole = "root" | "intermediate" | "leaf";

type Copy = {
  created: string;
  message: string;
  openObject: string;
  root: string;
  intermediate: string;
  leaf: string;
  parent: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    created: "Observation object created",
    message: "The object was saved successfully. You can open its card now.",
    openObject: "Open object",
    root: "Root",
    intermediate: "Intermediate",
    leaf: "Leaf",
    parent: "Parent",
  },
  pl: {
    created: "Obiekt obserwacji został utworzony",
    message: "Obiekt został zapisany. Możesz teraz otworzyć jego kartę.",
    openObject: "Otwórz obiekt",
    root: "Korzeń",
    intermediate: "Pośredni",
    leaf: "Liść",
    parent: "Rodzic",
  },
  ru: {
    created: "Объект наблюдения создан",
    message: "Объект успешно сохранён. Теперь можно открыть его карточку.",
    openObject: "Открыть объект",
    root: "Корень",
    intermediate: "Промежуточный",
    leaf: "Лист",
    parent: "Родитель",
  },
  uk: {
    created: "Об’єкт спостереження створено",
    message: "Об’єкт успішно збережено. Тепер можна відкрити його картку.",
    openObject: "Відкрити об’єкт",
    root: "Корінь",
    intermediate: "Проміжний",
    leaf: "Лист",
    parent: "Батьківський об’єкт",
  },
  de: {
    created: "Beobachtungsobjekt erstellt",
    message: "Das Objekt wurde erfolgreich gespeichert. Sie können jetzt seine Karte öffnen.",
    openObject: "Objekt öffnen",
    root: "Wurzel",
    intermediate: "Zwischenobjekt",
    leaf: "Blatt",
    parent: "Übergeordnetes Objekt",
  },
  es: {
    created: "Objeto de observación creado",
    message: "El objeto se guardó correctamente. Ahora puedes abrir su ficha.",
    openObject: "Abrir objeto",
    root: "Raíz",
    intermediate: "Intermedio",
    leaf: "Hoja",
    parent: "Padre",
  },
  cs: {
    created: "Objekt pozorování byl vytvořen",
    message: "Objekt byl úspěšně uložen. Nyní můžete otevřít jeho kartu.",
    openObject: "Otevřít objekt",
    root: "Kořen",
    intermediate: "Mezilehlý",
    leaf: "List",
    parent: "Nadřazený objekt",
  },
};

const CREATED_BUTTON: Record<LocaleCode, string> = {
  en: "Created",
  pl: "Utworzono",
  ru: "Создан",
  uk: "Створено",
  de: "Erstellt",
  es: "Creado",
  cs: "Vytvořeno",
};

export function getValueObjectCreatedLabel(locale: LocaleCode) {
  return CREATED_BUTTON[locale];
}

export function ValueObjectCreateSuccessCard({
  locale,
  title,
  role,
  parentTitle,
  objectHref,
  backHref,
  backLabel,
}: {
  locale: LocaleCode;
  title: string;
  role: NodeRole;
  parentTitle?: string | null;
  objectHref: string;
  backHref: string;
  backLabel: string;
}) {
  const copy = COPY[locale];
  const roleLabel = copy[role];

  return (
    <section
      role="status"
      aria-live="polite"
      className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950"
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[16px] font-black text-white"
        >
          ✓
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold">{copy.created}</div>
          <div className="mt-1 text-[13px] leading-5 text-emerald-900">
            {copy.message}
          </div>
          <div className="mt-3 rounded-xl border border-emerald-200/80 bg-white/70 p-3">
            <div className="break-words text-[15px] font-bold text-[#111827]">
              {title}
            </div>
            <div className="mt-1 text-[12px] font-semibold text-[#5a5f7a]">
              {roleLabel}
              {parentTitle ? ` · ${copy.parent}: ${parentTitle}` : ""}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={objectHref}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#3b6ef8] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[#315fd8]"
            >
              {copy.openObject}
            </Link>
            <Link
              href={backHref}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-2 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-emerald-50"
            >
              {backLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
