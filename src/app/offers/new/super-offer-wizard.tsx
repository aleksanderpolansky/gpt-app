"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

export type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";
export type SuperOfferProviderKind =
  | "personal"
  | "avatar"
  | "organization";

export type SuperOfferProvider = {
  readonly key: string;
  readonly profileId: string;
  readonly actorId: string;
  readonly organizationId: string | null;
  readonly kind: SuperOfferProviderKind;
  readonly displayName: string;
  readonly imageUrl: string | null;
  readonly currency: string;
};

export type SuperOfferValueObject = {
  readonly id: string;
  readonly providerKey: string;
  readonly providerProfileId: string;
  readonly providerName: string;
  readonly providerKind: SuperOfferProviderKind;
  readonly providerImageUrl: string | null;
  readonly title: string;
  readonly description: string | null;
  readonly objectKind: "product_type" | "service_type";
  readonly ordinaryPrice: number;
  readonly currency: string;
  readonly ordinaryDurationMinutes: number | null;
  readonly status: string;
  readonly imageUrl: string | null;
};

type WizardMode = "new" | "existing";

type SuperOfferWizardProps = {
  readonly locale: LocaleCode;
  readonly activeProfileId: string;
  readonly providers: readonly SuperOfferProvider[];
  readonly items: readonly SuperOfferValueObject[];
  readonly initialMode: WizardMode | null;
  readonly initialProviderKey: string;
  readonly initialValueObjectId: string | null;
};

type Copy = {
  back: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  newChoice: string;
  newChoiceDescription: string;
  existingChoice: string;
  existingChoiceDescription: string;
  continueChoice: string;
  provider: string;
  providerPersonal: string;
  providerAvatar: string;
  providerOrganization: string;
  product: string;
  service: string;
  name: string;
  description: string;
  ordinaryPrice: string;
  currency: string;
  duration: string;
  durationHint: string;
  photo: string;
  addPhoto: string;
  replacePhoto: string;
  removePhoto: string;
  createAndContinue: string;
  creating: string;
  search: string;
  searchPlaceholder: string;
  noItems: string;
  noSearchResults: string;
  continueWithItem: string;
  opening: string;
  draft: string;
  active: string;
  selected: string;
  changeChoice: string;
  errorPrefix: string;
  invalidImage: string;
  imageTooLarge: string;
  requiredName: string;
  invalidPrice: string;
  invalidDuration: string;
  profileSwitchNotice: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    back: "← Back to my offers",
    eyebrow: "Super offer",
    title: "Add a super offer",
    subtitle:
      "Create a new product or service, or choose one you already added. The offer itself will be created as a separate planned activity.",
    newChoice: "Create a new product or service",
    newChoiceDescription:
      "Add the base item first and continue immediately to the offer terms.",
    existingChoice: "Choose an existing product or service",
    existingChoiceDescription:
      "Search all products and services belonging to your profiles, avatars and enterprises.",
    continueChoice: "Continue",
    provider: "Provider",
    providerPersonal: "Personal profile",
    providerAvatar: "Avatar",
    providerOrganization: "Enterprise",
    product: "Product",
    service: "Service",
    name: "Name",
    description: "Description",
    ordinaryPrice: "Ordinary price",
    currency: "Currency",
    duration: "Ordinary duration, minutes",
    durationHint: "Used for services only.",
    photo: "Photo",
    addPhoto: "Add photo",
    replacePhoto: "Replace photo",
    removePhoto: "Remove photo",
    createAndContinue: "Create and continue to offer",
    creating: "Creating…",
    search: "Search products and services",
    searchPlaceholder: "Enter any part of the name",
    noItems: "You have not created any products or services yet.",
    noSearchResults: "Nothing matches this search.",
    continueWithItem: "Create offer",
    opening: "Opening…",
    draft: "draft",
    active: "active",
    selected: "Selected",
    changeChoice: "Change choice",
    errorPrefix: "Could not continue:",
    invalidImage: "Choose a JPG, PNG or WebP image.",
    imageTooLarge: "The image is too large after optimization.",
    requiredName: "Enter a name.",
    invalidPrice: "Enter a valid non-negative price.",
    invalidDuration: "Enter a positive whole duration in minutes.",
    profileSwitchNotice:
      "When another profile or avatar is chosen, ARCTor safely switches the active profile before creating the offer.",
  },
  pl: {
    back: "← Wróć do moich ofert",
    eyebrow: "Superoferta",
    title: "Dodaj superofertę",
    subtitle:
      "Utwórz nowy produkt lub usługę albo wybierz wcześniej dodany obiekt. Sama oferta będzie osobną zaplanowaną aktywnością.",
    newChoice: "Utwórz nowy produkt lub usługę",
    newChoiceDescription:
      "Najpierw dodaj obiekt bazowy, a potem od razu przejdź do warunków oferty.",
    existingChoice: "Wybierz istniejący produkt lub usługę",
    existingChoiceDescription:
      "Przeszukaj produkty i usługi swoich profili, awatarów oraz przedsiębiorstw.",
    continueChoice: "Kontynuuj",
    provider: "Dostawca",
    providerPersonal: "Profil osobisty",
    providerAvatar: "Awatar",
    providerOrganization: "Przedsiębiorstwo",
    product: "Produkt",
    service: "Usługa",
    name: "Nazwa",
    description: "Opis",
    ordinaryPrice: "Zwykła cena",
    currency: "Waluta",
    duration: "Zwykły czas, minuty",
    durationHint: "Dotyczy tylko usług.",
    photo: "Zdjęcie",
    addPhoto: "Dodaj zdjęcie",
    replacePhoto: "Zmień zdjęcie",
    removePhoto: "Usuń zdjęcie",
    createAndContinue: "Utwórz i przejdź do oferty",
    creating: "Tworzenie…",
    search: "Szukaj produktów i usług",
    searchPlaceholder: "Wpisz dowolną część nazwy",
    noItems: "Nie utworzono jeszcze żadnych produktów ani usług.",
    noSearchResults: "Brak wyników dla tego wyszukiwania.",
    continueWithItem: "Utwórz ofertę",
    opening: "Otwieranie…",
    draft: "szkic",
    active: "aktywny",
    selected: "Wybrano",
    changeChoice: "Zmień wybór",
    errorPrefix: "Nie udało się kontynuować:",
    invalidImage: "Wybierz obraz JPG, PNG lub WebP.",
    imageTooLarge: "Obraz jest zbyt duży po optymalizacji.",
    requiredName: "Wpisz nazwę.",
    invalidPrice: "Wpisz prawidłową cenę nieujemną.",
    invalidDuration: "Wpisz dodatnią liczbę pełnych minut.",
    profileSwitchNotice:
      "Po wyborze innego profilu lub awatara ARCTor bezpiecznie przełączy aktywny profil przed utworzeniem oferty.",
  },
  ru: {
    back: "← Назад к моим предложениям",
    eyebrow: "Суперпредложение",
    title: "Добавить суперпредложение",
    subtitle:
      "Создайте новый товар или услугу либо выберите уже добавленный объект. Само предложение будет отдельной плановой активностью.",
    newChoice: "Создать новый товар или услугу",
    newChoiceDescription:
      "Сначала добавьте объект-основу и сразу перейдите к условиям предложения.",
    existingChoice: "Выбрать ранее созданный товар или услугу",
    existingChoiceDescription:
      "Найдите товары и услуги ваших профилей, аватаров и предприятий.",
    continueChoice: "Продолжить",
    provider: "Предоставляющий",
    providerPersonal: "Личный профиль",
    providerAvatar: "Аватар",
    providerOrganization: "Предприятие",
    product: "Товар",
    service: "Услуга",
    name: "Название",
    description: "Описание",
    ordinaryPrice: "Обычная цена",
    currency: "Валюта",
    duration: "Обычная продолжительность, минуты",
    durationHint: "Используется только для услуги.",
    photo: "Фотография",
    addPhoto: "Добавить фотографию",
    replacePhoto: "Заменить фотографию",
    removePhoto: "Удалить фотографию",
    createAndContinue: "Создать и перейти к предложению",
    creating: "Создаём…",
    search: "Поиск товаров и услуг",
    searchPlaceholder: "Введите любую часть названия",
    noItems: "У вас пока нет созданных товаров или услуг.",
    noSearchResults: "По этому запросу ничего не найдено.",
    continueWithItem: "Создать предложение",
    opening: "Открываем…",
    draft: "черновик",
    active: "активен",
    selected: "Выбрано",
    changeChoice: "Изменить выбор",
    errorPrefix: "Не удалось продолжить:",
    invalidImage: "Выберите изображение JPG, PNG или WebP.",
    imageTooLarge: "После оптимизации изображение всё ещё слишком большое.",
    requiredName: "Введите название.",
    invalidPrice: "Введите корректную неотрицательную цену.",
    invalidDuration: "Введите положительное целое количество минут.",
    profileSwitchNotice:
      "При выборе другого профиля или аватара ARCTor безопасно переключит активный профиль перед созданием предложения.",
  },
  uk: {
    back: "← Назад до моїх пропозицій",
    eyebrow: "Суперпропозиція",
    title: "Додати суперпропозицію",
    subtitle:
      "Створіть новий товар або послугу чи виберіть уже доданий об’єкт. Сама пропозиція буде окремою запланованою активністю.",
    newChoice: "Створити новий товар або послугу",
    newChoiceDescription:
      "Спочатку додайте базовий об’єкт і відразу перейдіть до умов пропозиції.",
    existingChoice: "Вибрати створений раніше товар або послугу",
    existingChoiceDescription:
      "Знайдіть товари й послуги ваших профілів, аватарів і підприємств.",
    continueChoice: "Продовжити",
    provider: "Надавач",
    providerPersonal: "Особистий профіль",
    providerAvatar: "Аватар",
    providerOrganization: "Підприємство",
    product: "Товар",
    service: "Послуга",
    name: "Назва",
    description: "Опис",
    ordinaryPrice: "Звичайна ціна",
    currency: "Валюта",
    duration: "Звичайна тривалість, хвилини",
    durationHint: "Використовується лише для послуги.",
    photo: "Фотографія",
    addPhoto: "Додати фотографію",
    replacePhoto: "Замінити фотографію",
    removePhoto: "Видалити фотографію",
    createAndContinue: "Створити й перейти до пропозиції",
    creating: "Створюємо…",
    search: "Пошук товарів і послуг",
    searchPlaceholder: "Введіть будь-яку частину назви",
    noItems: "У вас ще немає створених товарів або послуг.",
    noSearchResults: "За цим запитом нічого не знайдено.",
    continueWithItem: "Створити пропозицію",
    opening: "Відкриваємо…",
    draft: "чернетка",
    active: "активний",
    selected: "Вибрано",
    changeChoice: "Змінити вибір",
    errorPrefix: "Не вдалося продовжити:",
    invalidImage: "Оберіть зображення JPG, PNG або WebP.",
    imageTooLarge: "Після оптимізації зображення все ще завелике.",
    requiredName: "Введіть назву.",
    invalidPrice: "Введіть коректну невід’ємну ціну.",
    invalidDuration: "Введіть додатне ціле число хвилин.",
    profileSwitchNotice:
      "Після вибору іншого профілю або аватара ARCTor безпечно перемкне активний профіль перед створенням пропозиції.",
  },
  de: {
    back: "← Zurück zu meinen Angeboten",
    eyebrow: "Superangebot",
    title: "Superangebot hinzufügen",
    subtitle:
      "Erstellen Sie ein neues Produkt oder eine neue Dienstleistung oder wählen Sie ein vorhandenes Objekt. Das Angebot selbst wird eine separate geplante Aktivität.",
    newChoice: "Neues Produkt oder neue Dienstleistung erstellen",
    newChoiceDescription:
      "Zuerst das Basisobjekt anlegen und direkt zu den Angebotsbedingungen wechseln.",
    existingChoice: "Vorhandenes Produkt oder Dienstleistung wählen",
    existingChoiceDescription:
      "Durchsuchen Sie Produkte und Dienstleistungen Ihrer Profile, Avatare und Unternehmen.",
    continueChoice: "Weiter",
    provider: "Anbieter",
    providerPersonal: "Persönliches Profil",
    providerAvatar: "Avatar",
    providerOrganization: "Unternehmen",
    product: "Produkt",
    service: "Dienstleistung",
    name: "Name",
    description: "Beschreibung",
    ordinaryPrice: "Regulärer Preis",
    currency: "Währung",
    duration: "Übliche Dauer, Minuten",
    durationHint: "Nur für Dienstleistungen.",
    photo: "Foto",
    addPhoto: "Foto hinzufügen",
    replacePhoto: "Foto ersetzen",
    removePhoto: "Foto entfernen",
    createAndContinue: "Erstellen und zum Angebot wechseln",
    creating: "Wird erstellt…",
    search: "Produkte und Dienstleistungen suchen",
    searchPlaceholder: "Beliebigen Teil des Namens eingeben",
    noItems: "Es wurden noch keine Produkte oder Dienstleistungen erstellt.",
    noSearchResults: "Keine passenden Ergebnisse.",
    continueWithItem: "Angebot erstellen",
    opening: "Wird geöffnet…",
    draft: "Entwurf",
    active: "aktiv",
    selected: "Ausgewählt",
    changeChoice: "Auswahl ändern",
    errorPrefix: "Fortsetzung fehlgeschlagen:",
    invalidImage: "Bitte JPG, PNG oder WebP auswählen.",
    imageTooLarge: "Das Bild ist nach der Optimierung noch zu groß.",
    requiredName: "Geben Sie einen Namen ein.",
    invalidPrice: "Geben Sie einen gültigen nicht negativen Preis ein.",
    invalidDuration: "Geben Sie eine positive ganze Minutenzahl ein.",
    profileSwitchNotice:
      "Bei Auswahl eines anderen Profils oder Avatars wechselt ARCTor vor der Angebotserstellung sicher das aktive Profil.",
  },
  es: {
    back: "← Volver a mis ofertas",
    eyebrow: "Superoferta",
    title: "Añadir una superoferta",
    subtitle:
      "Cree un producto o servicio nuevo o elija un objeto ya añadido. La oferta será una actividad planificada independiente.",
    newChoice: "Crear un producto o servicio nuevo",
    newChoiceDescription:
      "Añada primero el objeto base y continúe directamente con las condiciones de la oferta.",
    existingChoice: "Elegir un producto o servicio existente",
    existingChoiceDescription:
      "Busque productos y servicios de sus perfiles, avatares y empresas.",
    continueChoice: "Continuar",
    provider: "Proveedor",
    providerPersonal: "Perfil personal",
    providerAvatar: "Avatar",
    providerOrganization: "Empresa",
    product: "Producto",
    service: "Servicio",
    name: "Nombre",
    description: "Descripción",
    ordinaryPrice: "Precio habitual",
    currency: "Moneda",
    duration: "Duración habitual, minutos",
    durationHint: "Solo se usa para servicios.",
    photo: "Foto",
    addPhoto: "Añadir foto",
    replacePhoto: "Cambiar foto",
    removePhoto: "Eliminar foto",
    createAndContinue: "Crear y continuar a la oferta",
    creating: "Creando…",
    search: "Buscar productos y servicios",
    searchPlaceholder: "Escriba cualquier parte del nombre",
    noItems: "Todavía no ha creado productos ni servicios.",
    noSearchResults: "No hay resultados para esta búsqueda.",
    continueWithItem: "Crear oferta",
    opening: "Abriendo…",
    draft: "borrador",
    active: "activo",
    selected: "Seleccionado",
    changeChoice: "Cambiar elección",
    errorPrefix: "No se pudo continuar:",
    invalidImage: "Elija una imagen JPG, PNG o WebP.",
    imageTooLarge: "La imagen sigue siendo demasiado grande tras optimizarla.",
    requiredName: "Introduzca un nombre.",
    invalidPrice: "Introduzca un precio no negativo válido.",
    invalidDuration: "Introduzca una cantidad entera positiva de minutos.",
    profileSwitchNotice:
      "Al elegir otro perfil o avatar, ARCTor cambiará de forma segura el perfil activo antes de crear la oferta.",
  },
  cs: {
    back: "← Zpět na moje nabídky",
    eyebrow: "Supernabídka",
    title: "Přidat supernabídku",
    subtitle:
      "Vytvořte nový produkt nebo službu, případně vyberte již přidaný objekt. Nabídka bude samostatnou plánovanou aktivitou.",
    newChoice: "Vytvořit nový produkt nebo službu",
    newChoiceDescription:
      "Nejprve přidejte základní objekt a hned pokračujte k podmínkám nabídky.",
    existingChoice: "Vybrat existující produkt nebo službu",
    existingChoiceDescription:
      "Prohledejte produkty a služby svých profilů, avatarů a podniků.",
    continueChoice: "Pokračovat",
    provider: "Poskytovatel",
    providerPersonal: "Osobní profil",
    providerAvatar: "Avatar",
    providerOrganization: "Podnik",
    product: "Produkt",
    service: "Služba",
    name: "Název",
    description: "Popis",
    ordinaryPrice: "Běžná cena",
    currency: "Měna",
    duration: "Běžná délka, minuty",
    durationHint: "Používá se jen pro služby.",
    photo: "Fotografie",
    addPhoto: "Přidat fotografii",
    replacePhoto: "Změnit fotografii",
    removePhoto: "Odstranit fotografii",
    createAndContinue: "Vytvořit a pokračovat k nabídce",
    creating: "Vytváření…",
    search: "Hledat produkty a služby",
    searchPlaceholder: "Zadejte libovolnou část názvu",
    noItems: "Zatím jste nevytvořili žádné produkty ani služby.",
    noSearchResults: "Tomuto hledání nic neodpovídá.",
    continueWithItem: "Vytvořit nabídku",
    opening: "Otevírání…",
    draft: "koncept",
    active: "aktivní",
    selected: "Vybráno",
    changeChoice: "Změnit volbu",
    errorPrefix: "Nelze pokračovat:",
    invalidImage: "Vyberte obrázek JPG, PNG nebo WebP.",
    imageTooLarge: "Obrázek je po optimalizaci stále příliš velký.",
    requiredName: "Zadejte název.",
    invalidPrice: "Zadejte platnou nezápornou cenu.",
    invalidDuration: "Zadejte kladný celý počet minut.",
    profileSwitchNotice:
      "Při výběru jiného profilu nebo avatara ARCTor před vytvořením nabídky bezpečně přepne aktivní profil.",
  },
};

const MAX_SOURCE_FILE_BYTES = 10 * 1024 * 1024;
const MAX_DATA_URL_LENGTH = 1_450_000;
const MAX_IMAGE_DIMENSION = 1200;

function appendLocale(pathname: string, locale: LocaleCode) {
  return locale === "en"
    ? pathname
    : `${pathname}${pathname.includes("?") ? "&" : "?"}locale=${encodeURIComponent(locale)}`;
}

function providerKindLabel(provider: SuperOfferProvider, copy: Copy) {
  return provider.kind === "organization"
    ? copy.providerOrganization
    : provider.kind === "avatar"
      ? copy.providerAvatar
      : copy.providerPersonal;
}

function formatMoney(value: number, currency: string, locale: LocaleCode) {
  try {
    return new Intl.NumberFormat(locale === "en" ? "en-US" : locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("IMAGE_READ_FAILED"));
    reader.onerror = () => reject(new Error("IMAGE_READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("IMAGE_DECODE_FAILED"));
    image.src = dataUrl;
  });
}

async function optimizeImage(file: File) {
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const scale = Math.min(
    1,
    MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("CANVAS_NOT_AVAILABLE");
  }

  context.drawImage(image, 0, 0, width, height);

  for (const quality of [0.86, 0.76, 0.66, 0.56]) {
    const optimized = canvas.toDataURL("image/webp", quality);

    if (optimized.length <= MAX_DATA_URL_LENGTH) {
      return optimized;
    }
  }

  throw new Error("IMAGE_TOO_LARGE");
}

function ProviderAvatar({
  imageUrl,
  name,
  compact = false,
}: {
  readonly imageUrl: string | null;
  readonly name: string;
  readonly compact?: boolean;
}) {
  const sizeClass = compact ? "h-10 w-10" : "h-12 w-12";

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        className={`${sizeClass} shrink-0 rounded-xl object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-[14px] font-bold text-[#3b6ef8]`}
      aria-hidden="true"
    >
      {name.trim().slice(0, 2).toUpperCase() || "AR"}
    </div>
  );
}

function ProductImage({
  imageUrl,
  label,
}: {
  readonly imageUrl: string | null;
  readonly label: string;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={label}
        className="h-28 w-28 shrink-0 rounded-2xl object-cover"
      />
    );
  }

  return (
    <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border border-[#dfe4ff] bg-[#eef2ff] text-[34px] text-[#3b6ef8]">
      ◇
    </div>
  );
}

export function SuperOfferWizard({
  locale,
  activeProfileId,
  providers,
  items,
  initialMode,
  initialProviderKey,
  initialValueObjectId,
}: SuperOfferWizardProps) {
  const router = useRouter();
  const copy = COPY[locale];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<WizardMode | null>(initialMode);
  const [providerKey, setProviderKey] = useState(initialProviderKey);
  const [currentActiveProfileId, setCurrentActiveProfileId] =
    useState(activeProfileId);
  const [objectKind, setObjectKind] =
    useState<"product_type" | "service_type">("product_type");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [selectedValueObjectId, setSelectedValueObjectId] = useState(
    initialValueObjectId ?? "",
  );
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedProvider =
    providers.find((provider) => provider.key === providerKey) ?? providers[0];
  const selectedItem = items.find(
    (item) => item.id === selectedValueObjectId,
  );

  const filteredItems = useMemo(() => {
    const query = searchText.trim().toLocaleLowerCase(locale);

    if (!query) {
      return items;
    }

    return items.filter((item) =>
      [item.title, item.description ?? "", item.providerName]
        .join(" ")
        .toLocaleLowerCase(locale)
        .includes(query),
    );
  }, [items, locale, searchText]);

  const groups = useMemo(
    () =>
      providers
        .map((provider) => ({
          provider,
          items: filteredItems.filter(
            (item) => item.providerKey === provider.key,
          ),
        }))
        .filter((group) => group.items.length > 0),
    [filteredItems, providers],
  );

  async function ensureActiveProfile(profileId: string) {
    if (profileId === currentActiveProfileId) {
      return;
    }

    const response = await fetch("/api/actor-context", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ profileId }),
    });
    const data = (await response.json()) as {
      ok?: boolean;
      error?: string;
      errorMessage?: string;
      activeProfile?: { profileId?: string };
    };

    if (!response.ok || !data.ok || !data.activeProfile?.profileId) {
      throw new Error(
        data.errorMessage || data.error || `HTTP ${response.status}`,
      );
    }

    setCurrentActiveProfileId(data.activeProfile.profileId);
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > MAX_SOURCE_FILE_BYTES
    ) {
      setErrorMessage(copy.invalidImage);
      return;
    }

    try {
      setErrorMessage(null);
      setImageUrl(await optimizeImage(file));
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message === "IMAGE_TOO_LARGE"
          ? copy.imageTooLarge
          : copy.invalidImage,
      );
    }
  }

  async function createNewValueObject() {
    if (!selectedProvider || pendingKey) {
      return;
    }

    const normalizedTitle = title.trim();
    const normalizedPrice = Number(defaultPrice.trim().replace(",", "."));
    const duration = defaultDurationMinutes.trim()
      ? Number(defaultDurationMinutes.trim())
      : null;

    if (!normalizedTitle) {
      setErrorMessage(copy.requiredName);
      return;
    }

    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
      setErrorMessage(copy.invalidPrice);
      return;
    }

    if (
      objectKind === "service_type" &&
      duration !== null &&
      (!Number.isInteger(duration) || duration <= 0)
    ) {
      setErrorMessage(copy.invalidDuration);
      return;
    }

    setPendingKey("create");
    setErrorMessage(null);

    try {
      await ensureActiveProfile(selectedProvider.profileId);

      const response = await fetch("/api/value-objects/product-service", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          objectKind,
          organizationId: selectedProvider.organizationId,
          title: normalizedTitle,
          description: description.trim() || null,
          defaultPrice: normalizedPrice,
          defaultCurrency: selectedProvider.currency,
          defaultDurationMinutes:
            objectKind === "service_type" ? duration : null,
          locale,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        valueObjectId?: string;
      };

      if (!response.ok || !data.ok || !data.valueObjectId) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (imageUrl) {
        const mediaResponse = await fetch(
          `/api/value-objects/${encodeURIComponent(data.valueObjectId)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              publicProfile: {
                imageUrl,
              },
            }),
          },
        );

        if (!mediaResponse.ok) {
          const mediaData = (await mediaResponse.json()) as {
            error?: string;
          };
          throw new Error(
            mediaData.error || `Photo HTTP ${mediaResponse.status}`,
          );
        }
      }

      router.push(
        appendLocale(
          `/value-objects/${data.valueObjectId}/gift-certificates/new`,
          locale,
        ),
      );
    } catch (error) {
      setErrorMessage(
        `${copy.errorPrefix} ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      setPendingKey(null);
    }
  }

  async function continueWithItem(item: SuperOfferValueObject) {
    if (pendingKey) {
      return;
    }

    setSelectedValueObjectId(item.id);
    setPendingKey(item.id);
    setErrorMessage(null);

    try {
      await ensureActiveProfile(item.providerProfileId);
      router.push(
        appendLocale(
          `/value-objects/${item.id}/gift-certificates/new`,
          locale,
        ),
      );
    } catch (error) {
      setErrorMessage(
        `${copy.errorPrefix} ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      setPendingKey(null);
    }
  }

  return (
    <main className="min-h-full bg-[#f5f6fb] px-5 py-5 text-[#1a1d2e]">
      <div className="mx-auto grid w-full max-w-[1280px] gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={appendLocale("/seller-certificates", locale)}
            className="rounded-full border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a] shadow-sm transition hover:bg-gray-50"
          >
            {copy.back}
          </Link>

          {mode ? (
            <button
              type="button"
              onClick={() => {
                setMode(null);
                setErrorMessage(null);
              }}
              className="rounded-full border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a] shadow-sm transition hover:bg-gray-50"
            >
              {copy.changeChoice}
            </button>
          ) : null}
        </div>

        <header>
          <div className="text-[12px] text-[#7c8099]">{copy.eyebrow}</div>
          <h1 className="mt-1 text-[20px] font-bold leading-tight text-[#111827]">
            {copy.title}
          </h1>
          <p className="mt-1 max-w-[850px] text-[13px] leading-5 text-[#7c8099]">
            {copy.subtitle}
          </p>
        </header>

        {errorMessage ? (
          <div className="rounded-[18px] border border-[#ffd5d5] bg-[#fff7f7] px-5 py-4 text-[13px] font-semibold text-[#b42318]">
            {errorMessage}
          </div>
        ) : null}

        {!mode ? (
          <section className="grid gap-5 lg:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("new")}
              className="flex min-h-44 flex-col rounded-[24px] border border-black/[0.07] bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#b9c8ff] hover:shadow-md"
            >
              <div className="text-[18px] font-bold text-[#111827]">
                {copy.newChoice}
              </div>
              <p className="mt-3 text-[13px] leading-6 text-[#5a5f7a]">
                {copy.newChoiceDescription}
              </p>
              <span className="mt-6 inline-flex min-h-10 w-full items-center justify-center rounded-full bg-[#3b6ef8] px-4 py-2 text-[12px] font-bold text-white shadow-[0_8px_20px_rgba(59,110,248,0.18)]">
                {copy.continueChoice}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMode("existing")}
              className="flex min-h-44 flex-col rounded-[24px] border border-black/[0.07] bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#b9c8ff] hover:shadow-md"
            >
              <div className="text-[18px] font-bold text-[#111827]">
                {copy.existingChoice}
              </div>
              <p className="mt-3 text-[13px] leading-6 text-[#5a5f7a]">
                {copy.existingChoiceDescription}
              </p>
              <span className="mt-6 inline-flex min-h-10 w-full items-center justify-center rounded-full bg-[#3b6ef8] px-4 py-2 text-[12px] font-bold text-white shadow-[0_8px_20px_rgba(59,110,248,0.18)]">
                {copy.continueChoice}
              </span>
            </button>
          </section>
        ) : null}

        {mode === "new" ? (
          <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <article className="rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7c8099]">
                {copy.photo}
              </div>

              <div className="mt-4 overflow-hidden rounded-[20px] border border-[#dfe4ff] bg-[#eef2ff]">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center text-[54px] text-[#3b6ef8]">
                    ◇
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => void handleImageChange(event)}
                className="hidden"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a] shadow-sm transition hover:bg-gray-50"
                >
                  {imageUrl ? copy.replacePhoto : copy.addPhoto}
                </button>

                {imageUrl ? (
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="rounded-full border border-[#ffd5d5] bg-white px-4 py-2 text-[12px] font-semibold text-[#b42318] transition hover:bg-[#fff7f7]"
                  >
                    {copy.removePhoto}
                  </button>
                ) : null}
              </div>

              <p className="mt-5 text-[12px] leading-5 text-[#7c8099]">
                {copy.profileSwitchNotice}
              </p>
            </article>

            <article className="rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-sm">
              <div className="grid gap-5">
                <label className="grid gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7c8099]">
                    {copy.provider}
                  </span>
                  <select
                    value={selectedProvider?.key ?? ""}
                    onChange={(event) => setProviderKey(event.target.value)}
                    className="min-h-12 rounded-xl border border-[#dfe3f1] bg-white px-4 text-[14px] font-semibold text-[#1a1d2e]"
                  >
                    {providers.map((provider) => (
                      <option key={provider.key} value={provider.key}>
                        {providerKindLabel(provider, copy)} · {provider.displayName}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["product_type", copy.product],
                      ["service_type", copy.service],
                    ] as const
                  ).map(([kind, label]) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => setObjectKind(kind)}
                      className={
                        objectKind === kind
                          ? "rounded-2xl border border-[#3b6ef8] bg-[#eef2ff] p-4 text-left text-[14px] font-bold text-[#315bd0]"
                          : "rounded-2xl border border-[#e4e7f0] bg-white p-4 text-left text-[14px] font-bold text-[#4a4f6a]"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <label className="grid gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7c8099]">
                    {copy.name}
                  </span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={180}
                    className="min-h-12 rounded-xl border border-[#dfe3f1] bg-white px-4 text-[14px] text-[#1a1d2e]"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7c8099]">
                    {copy.description}
                  </span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={4000}
                    rows={5}
                    className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e]"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7c8099]">
                      {copy.ordinaryPrice}
                    </span>
                    <input
                      inputMode="decimal"
                      value={defaultPrice}
                      onChange={(event) => setDefaultPrice(event.target.value)}
                      className="min-h-12 rounded-xl border border-[#dfe3f1] bg-white px-4 text-[14px] text-[#1a1d2e]"
                    />
                  </label>

                  <div className="grid gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7c8099]">
                      {copy.currency}
                    </span>
                    <div className="flex min-h-12 items-center rounded-xl border border-[#dfe3f1] bg-[#f8fafc] px-4 text-[14px] font-semibold text-[#1a1d2e]">
                      {selectedProvider?.currency ?? "—"}
                    </div>
                  </div>
                </div>

                {objectKind === "service_type" ? (
                  <label className="grid gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7c8099]">
                      {copy.duration}
                    </span>
                    <input
                      inputMode="numeric"
                      value={defaultDurationMinutes}
                      onChange={(event) =>
                        setDefaultDurationMinutes(event.target.value)
                      }
                      className="min-h-12 rounded-xl border border-[#dfe3f1] bg-white px-4 text-[14px] text-[#1a1d2e]"
                    />
                    <span className="text-[12px] text-[#7c8099]">
                      {copy.durationHint}
                    </span>
                  </label>
                ) : null}

                <button
                  type="button"
                  onClick={() => void createNewValueObject()}
                  disabled={Boolean(pendingKey) || !selectedProvider}
                  className="min-h-12 rounded-xl bg-[#3b6ef8] px-5 text-[14px] font-bold text-white shadow-[0_10px_22px_rgba(59,110,248,0.22)] transition hover:bg-[#315bd0] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {pendingKey === "create"
                    ? copy.creating
                    : copy.createAndContinue}
                </button>
              </div>
            </article>
          </section>
        ) : null}

        {mode === "existing" ? (
          <section className="grid gap-5">
            <div className="rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-sm">
              <label className="grid gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7c8099]">
                  {copy.search}
                </span>
                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="min-h-12 rounded-xl border border-[#dfe3f1] bg-white px-4 text-[14px] text-[#1a1d2e]"
                />
              </label>
            </div>

            {items.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#c9d5ff] bg-white p-6 text-[14px] text-[#7c8099]">
                {copy.noItems}
              </div>
            ) : groups.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#c9d5ff] bg-white p-6 text-[14px] text-[#7c8099]">
                {copy.noSearchResults}
              </div>
            ) : (
              groups.map(({ provider, items: providerItems }) => (
                <article
                  key={provider.key}
                  className="rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-3 border-b border-black/[0.06] pb-4">
                    <ProviderAvatar
                      imageUrl={provider.imageUrl}
                      name={provider.displayName}
                    />
                    <div>
                      <div className="text-[15px] font-bold text-[#111827]">
                        {provider.displayName}
                      </div>
                      <div className="mt-1 text-[12px] text-[#7c8099]">
                        {providerKindLabel(provider, copy)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    {providerItems.map((item) => {
                      const isSelected = item.id === selectedItem?.id;
                      const isPending = pendingKey === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`rounded-[20px] border p-4 transition ${
                            isSelected
                              ? "border-[#8aa6ff] bg-[#f5f7ff]"
                              : "border-[#e7eaf2] bg-[#fbfcff]"
                          }`}
                        >
                          <div className="flex gap-4">
                            <ProductImage
                              imageUrl={item.imageUrl}
                              label={item.title}
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="text-[15px] font-bold text-[#111827]">
                                  {item.title}
                                </div>
                                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#7c8099]">
                                  {item.status === "active"
                                    ? copy.active
                                    : copy.draft}
                                </span>
                              </div>

                              <div className="mt-2 text-[12px] text-[#7c8099]">
                                {item.objectKind === "product_type"
                                  ? copy.product
                                  : copy.service}
                              </div>

                              <div className="mt-3 text-[14px] font-bold text-[#1a1d2e]">
                                {formatMoney(
                                  item.ordinaryPrice,
                                  item.currency,
                                  locale,
                                )}
                              </div>

                              {item.objectKind === "service_type" &&
                              item.ordinaryDurationMinutes ? (
                                <div className="mt-1 text-[12px] text-[#7c8099]">
                                  {item.ordinaryDurationMinutes} min
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => void continueWithItem(item)}
                            disabled={Boolean(pendingKey)}
                            className="mt-4 min-h-10 w-full rounded-xl bg-[#3b6ef8] px-4 text-[13px] font-bold text-white transition hover:bg-[#315bd0] disabled:cursor-not-allowed disabled:opacity-55"
                          >
                            {isPending
                              ? copy.opening
                              : isSelected
                                ? `${copy.selected} · ${copy.continueWithItem}`
                                : copy.continueWithItem}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}
