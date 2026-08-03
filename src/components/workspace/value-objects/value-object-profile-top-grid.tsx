"use client";

import Link from "next/link";
import {
  Camera,
  ExternalLink,
  Gauge,
  ImageIcon,
  MapPin,
  RotateCcw,
  Save,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import {
  EntityPageTopCard,
  EntityPageTopGrid,
} from "@/components/entity-pages/entity-page-top-grid";
import OrganizationLocationMapPreview from "@/components/commercial/OrganizationLocationMapPreview";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

export type ValueObjectPublicLocation = {
  readonly label: string | null;
  readonly countryCode: string | null;
  readonly region: string | null;
  readonly city: string | null;
  readonly district: string | null;
  readonly streetAddress: string | null;
  readonly postalCode: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly addressVisibility: string | null;
};

export type ValueObjectOwnerPresentation = {
  readonly displayName: string;
  readonly kindLabel: string;
  readonly imageUrl: string | null;
  readonly href: string | null;
};

export type ValueObjectSummaryItem = {
  readonly label: string;
  readonly value: string;
};

type Copy = {
  object: string;
  location: string;
  owner: string;
  summary: string;
  addPhoto: string;
  replacePhoto: string;
  removePhoto: string;
  photoAlt: string;
  noLocation: string;
  addressLabel: string;
  streetAddress: string;
  city: string;
  district: string;
  region: string;
  postalCode: string;
  countryCode: string;
  latitude: string;
  longitude: string;
  saveMedia: string;
  saving: string;
  saved: string;
  reset: string;
  saveError: string;
  invalidImage: string;
  imageTooLarge: string;
  mapTitle: string;
  mapFallback: string;
  openOwner: string;
  inheritedLocation: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    object: "Object",
    location: "Location",
    owner: "Owner",
    summary: "Main information",
    addPhoto: "Add photo",
    replacePhoto: "Replace photo",
    removePhoto: "Remove photo",
    photoAlt: "Object photo",
    noLocation: "Public location has not been added yet.",
    addressLabel: "Location label",
    streetAddress: "Street address",
    city: "City",
    district: "District",
    region: "Region",
    postalCode: "Postal code",
    countryCode: "Country code",
    latitude: "Latitude",
    longitude: "Longitude",
    saveMedia: "Save photo and location",
    saving: "Saving...",
    saved: "Photo and location saved",
    reset: "Undo photo and location changes",
    saveError: "Could not save photo and location.",
    invalidImage: "Choose a JPG, PNG or WebP image.",
    imageTooLarge: "The image is too large after optimization.",
    mapTitle: "Object location map",
    mapFallback: "Add an address or coordinates to show the map",
    openOwner: "Open owner page",
    inheritedLocation: "The provider location is shown until this object gets its own public location.",
  },
  pl: {
    object: "Obiekt",
    location: "Lokalizacja",
    owner: "Właściciel",
    summary: "Główne informacje",
    addPhoto: "Dodaj zdjęcie",
    replacePhoto: "Zmień zdjęcie",
    removePhoto: "Usuń zdjęcie",
    photoAlt: "Zdjęcie obiektu",
    noLocation: "Nie dodano jeszcze publicznej lokalizacji.",
    addressLabel: "Nazwa lokalizacji",
    streetAddress: "Ulica i numer",
    city: "Miasto",
    district: "Dzielnica",
    region: "Region",
    postalCode: "Kod pocztowy",
    countryCode: "Kod kraju",
    latitude: "Szerokość geograficzna",
    longitude: "Długość geograficzna",
    saveMedia: "Zapisz zdjęcie i lokalizację",
    saving: "Zapisywanie...",
    saved: "Zdjęcie i lokalizacja zapisane",
    reset: "Cofnij zmiany zdjęcia i lokalizacji",
    saveError: "Nie udało się zapisać zdjęcia i lokalizacji.",
    invalidImage: "Wybierz obraz JPG, PNG lub WebP.",
    imageTooLarge: "Obraz jest zbyt duży po optymalizacji.",
    mapTitle: "Mapa lokalizacji obiektu",
    mapFallback: "Dodaj adres lub współrzędne, aby pokazać mapę",
    openOwner: "Otwórz stronę właściciela",
    inheritedLocation: "Do czasu dodania lokalizacji obiektu wyświetlana jest lokalizacja dostawcy.",
  },
  ru: {
    object: "Объект",
    location: "Адрес и карта",
    owner: "Владелец",
    summary: "Основные данные",
    addPhoto: "Добавить фотографию",
    replacePhoto: "Заменить фотографию",
    removePhoto: "Удалить фотографию",
    photoAlt: "Фотография ценного объекта",
    noLocation: "Публичная география объекта пока не добавлена.",
    addressLabel: "Название места",
    streetAddress: "Улица и номер",
    city: "Город",
    district: "Район",
    region: "Регион",
    postalCode: "Почтовый индекс",
    countryCode: "Код страны",
    latitude: "Широта",
    longitude: "Долгота",
    saveMedia: "Сохранить фотографию и адрес",
    saving: "Сохраняем...",
    saved: "Фотография и адрес сохранены",
    reset: "Отменить изменения фотографии и адреса",
    saveError: "Не удалось сохранить фотографию и адрес.",
    invalidImage: "Выберите изображение JPG, PNG или WebP.",
    imageTooLarge: "После оптимизации изображение всё ещё слишком большое.",
    mapTitle: "Карта расположения ценного объекта",
    mapFallback: "Добавьте адрес или координаты, чтобы показать карту",
    openOwner: "Открыть страницу владельца",
    inheritedLocation: "Пока у объекта нет собственной географии, показывается публичная география предоставляющего.",
  },
  uk: {
    object: "Об’єкт",
    location: "Адреса і карта",
    owner: "Власник",
    summary: "Основні дані",
    addPhoto: "Додати фотографію",
    replacePhoto: "Замінити фотографію",
    removePhoto: "Видалити фотографію",
    photoAlt: "Фотографія цінного об’єкта",
    noLocation: "Публічну географію об’єкта ще не додано.",
    addressLabel: "Назва місця",
    streetAddress: "Вулиця і номер",
    city: "Місто",
    district: "Район",
    region: "Регіон",
    postalCode: "Поштовий індекс",
    countryCode: "Код країни",
    latitude: "Широта",
    longitude: "Довгота",
    saveMedia: "Зберегти фотографію й адресу",
    saving: "Зберігаємо...",
    saved: "Фотографію й адресу збережено",
    reset: "Скасувати зміни фотографії й адреси",
    saveError: "Не вдалося зберегти фотографію й адресу.",
    invalidImage: "Оберіть зображення JPG, PNG або WebP.",
    imageTooLarge: "Після оптимізації зображення все ще завелике.",
    mapTitle: "Карта розташування цінного об’єкта",
    mapFallback: "Додайте адресу або координати, щоб показати карту",
    openOwner: "Відкрити сторінку власника",
    inheritedLocation: "Поки об’єкт не має власної географії, показується публічна географія надавача.",
  },
  de: {
    object: "Objekt",
    location: "Adresse und Karte",
    owner: "Eigentümer",
    summary: "Hauptinformationen",
    addPhoto: "Foto hinzufügen",
    replacePhoto: "Foto ersetzen",
    removePhoto: "Foto entfernen",
    photoAlt: "Foto des Wertobjekts",
    noLocation: "Für dieses Objekt wurde noch kein öffentlicher Standort hinterlegt.",
    addressLabel: "Standortbezeichnung",
    streetAddress: "Straße und Hausnummer",
    city: "Stadt",
    district: "Stadtteil",
    region: "Region",
    postalCode: "Postleitzahl",
    countryCode: "Ländercode",
    latitude: "Breitengrad",
    longitude: "Längengrad",
    saveMedia: "Foto und Standort speichern",
    saving: "Speichern...",
    saved: "Foto und Standort gespeichert",
    reset: "Foto- und Standortänderungen zurücksetzen",
    saveError: "Foto und Standort konnten nicht gespeichert werden.",
    invalidImage: "Bitte JPG, PNG oder WebP auswählen.",
    imageTooLarge: "Das Bild ist nach der Optimierung noch zu groß.",
    mapTitle: "Standortkarte des Wertobjekts",
    mapFallback: "Adresse oder Koordinaten hinzufügen, um die Karte anzuzeigen",
    openOwner: "Eigentümerseite öffnen",
    inheritedLocation: "Bis ein eigener Standort gespeichert wird, wird der öffentliche Standort des Anbieters gezeigt.",
  },
  es: {
    object: "Objeto",
    location: "Dirección y mapa",
    owner: "Titular",
    summary: "Información principal",
    addPhoto: "Añadir foto",
    replacePhoto: "Cambiar foto",
    removePhoto: "Eliminar foto",
    photoAlt: "Foto del objeto de valor",
    noLocation: "Todavía no se ha añadido una ubicación pública.",
    addressLabel: "Nombre del lugar",
    streetAddress: "Calle y número",
    city: "Ciudad",
    district: "Distrito",
    region: "Región",
    postalCode: "Código postal",
    countryCode: "Código de país",
    latitude: "Latitud",
    longitude: "Longitud",
    saveMedia: "Guardar foto y ubicación",
    saving: "Guardando...",
    saved: "Foto y ubicación guardadas",
    reset: "Deshacer cambios de foto y ubicación",
    saveError: "No se pudieron guardar la foto y la ubicación.",
    invalidImage: "Elige una imagen JPG, PNG o WebP.",
    imageTooLarge: "La imagen sigue siendo demasiado grande después de optimizarla.",
    mapTitle: "Mapa de ubicación del objeto de valor",
    mapFallback: "Añade una dirección o coordenadas para mostrar el mapa",
    openOwner: "Abrir página del titular",
    inheritedLocation: "Hasta que el objeto tenga ubicación propia, se muestra la ubicación pública del proveedor.",
  },
  cs: {
    object: "Objekt",
    location: "Adresa a mapa",
    owner: "Vlastník",
    summary: "Hlavní údaje",
    addPhoto: "Přidat fotografii",
    replacePhoto: "Změnit fotografii",
    removePhoto: "Odstranit fotografii",
    photoAlt: "Fotografie hodnotového objektu",
    noLocation: "Veřejná poloha zatím nebyla přidána.",
    addressLabel: "Název místa",
    streetAddress: "Ulice a číslo",
    city: "Město",
    district: "Čtvrť",
    region: "Region",
    postalCode: "PSČ",
    countryCode: "Kód země",
    latitude: "Zeměpisná šířka",
    longitude: "Zeměpisná délka",
    saveMedia: "Uložit fotografii a polohu",
    saving: "Ukládání...",
    saved: "Fotografie a poloha uloženy",
    reset: "Vrátit změny fotografie a polohy",
    saveError: "Fotografii a polohu se nepodařilo uložit.",
    invalidImage: "Vyberte obrázek JPG, PNG nebo WebP.",
    imageTooLarge: "Obrázek je i po optimalizaci příliš velký.",
    mapTitle: "Mapa polohy hodnotového objektu",
    mapFallback: "Přidejte adresu nebo souřadnice pro zobrazení mapy",
    openOwner: "Otevřít stránku vlastníka",
    inheritedLocation: "Dokud objekt nemá vlastní polohu, zobrazuje se veřejná poloha poskytovatele.",
  },
};

type EditableLocation = {
  label: string;
  countryCode: string;
  region: string;
  city: string;
  district: string;
  streetAddress: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  addressVisibility: string;
};

const MAX_SOURCE_FILE_BYTES = 10 * 1024 * 1024;
const MAX_DATA_URL_LENGTH = 1_450_000;
const MAX_IMAGE_DIMENSION = 1200;

function toEditableLocation(location: ValueObjectPublicLocation): EditableLocation {
  return {
    label: location.label ?? "",
    countryCode: location.countryCode ?? "",
    region: location.region ?? "",
    city: location.city ?? "",
    district: location.district ?? "",
    streetAddress: location.streetAddress ?? "",
    postalCode: location.postalCode ?? "",
    latitude: location.latitude === null ? "" : String(location.latitude),
    longitude: location.longitude === null ? "" : String(location.longitude),
    addressVisibility: location.addressVisibility ?? "public",
  };
}

function parseOptionalCoordinate(value: string): number | null | undefined {
  const normalized = value.trim().replace(",", ".");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getAddressLine(location: EditableLocation) {
  return [
    location.streetAddress.trim(),
    location.district.trim(),
    location.city.trim(),
    location.region.trim(),
    location.countryCode.trim().toUpperCase(),
  ]
    .filter(Boolean)
    .join(", ");
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("IMAGE_DECODE_FAILED"));
    image.src = dataUrl;
  });
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

function inputClassName() {
  return "w-full rounded-lg border border-[#dfe3f1] bg-white px-3 py-2 text-[12px] text-[#1a1d2e] outline-none transition focus:border-[#8aa6ff] focus:ring-2 focus:ring-[#dfe6ff]";
}

function normalizeLocale(locale: string): LocaleCode {
  return locale === "pl" ||
    locale === "ru" ||
    locale === "uk" ||
    locale === "de" ||
    locale === "es" ||
    locale === "cs"
    ? locale
    : "en";
}

export function ValueObjectProfileTopGrid({
  valueObjectId,
  locale: rawLocale,
  editMode,
  canEdit,
  title,
  objectKindLabel,
  imageUrl: initialImageUrl,
  location: initialLocation,
  locationIsInherited,
  owner,
  summaryItems,
}: {
  readonly valueObjectId: string;
  readonly locale: string;
  readonly editMode: boolean;
  readonly canEdit: boolean;
  readonly title: string;
  readonly objectKindLabel: string;
  readonly imageUrl: string | null;
  readonly location: ValueObjectPublicLocation;
  readonly locationIsInherited: boolean;
  readonly owner: ValueObjectOwnerPresentation;
  readonly summaryItems: readonly ValueObjectSummaryItem[];
}) {
  const locale = normalizeLocale(rawLocale);
  const copy = COPY[locale];
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initialEditableLocation = useMemo(
    () => toEditableLocation(initialLocation),
    [initialLocation],
  );
  const [savedImageUrl, setSavedImageUrl] = useState(initialImageUrl ?? "");
  const [imageUrl, setImageUrl] = useState(initialImageUrl ?? "");
  const [savedLocation, setSavedLocation] = useState(initialEditableLocation);
  const [location, setLocation] = useState(initialEditableLocation);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const hasChanges = useMemo(
    () =>
      imageUrl !== savedImageUrl ||
      JSON.stringify(location) !== JSON.stringify(savedLocation),
    [imageUrl, location, savedImageUrl, savedLocation],
  );

  const parsedLatitude = parseOptionalCoordinate(location.latitude);
  const parsedLongitude = parseOptionalCoordinate(location.longitude);
  const coordinatePairIsComplete =
    (parsedLatitude === null && parsedLongitude === null) ||
    (typeof parsedLatitude === "number" &&
      typeof parsedLongitude === "number");
  const coordinatesAreValid =
    parsedLatitude !== undefined &&
    parsedLongitude !== undefined &&
    coordinatePairIsComplete &&
    (parsedLatitude === null || (parsedLatitude >= -90 && parsedLatitude <= 90)) &&
    (parsedLongitude === null ||
      (parsedLongitude >= -180 && parsedLongitude <= 180));

  const mapLocation = {
    label: location.label || null,
    countryCode: location.countryCode || null,
    region: location.region || null,
    city: location.city || null,
    district: location.district || null,
    streetAddress: location.streetAddress || null,
    postalCode: location.postalCode || null,
    latitude: parsedLatitude === undefined ? null : parsedLatitude,
    longitude: parsedLongitude === undefined ? null : parsedLongitude,
  };

  function setLocationField(key: keyof EditableLocation, value: string) {
    setLocation((current) => ({ ...current, [key]: value }));
    setSaveState("idle");
    setErrorMessage("");
  }

  function resetChanges() {
    setImageUrl(savedImageUrl);
    setLocation(savedLocation);
    setSaveState("idle");
    setErrorMessage("");
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > MAX_SOURCE_FILE_BYTES
    ) {
      setErrorMessage(copy.invalidImage);
      setSaveState("error");
      return;
    }

    try {
      const optimized = await optimizeImage(file);
      setImageUrl(optimized);
      setSaveState("idle");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message === "IMAGE_TOO_LARGE"
          ? copy.imageTooLarge
          : copy.invalidImage,
      );
      setSaveState("error");
    }
  }

  async function saveMediaAndLocation() {
    if (!hasChanges || !coordinatesAreValid || saveState === "saving") {
      return;
    }

    setSaveState("saving");
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/value-objects/${encodeURIComponent(valueObjectId)}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            publicProfile: {
              imageUrl: imageUrl || null,
              location: {
                label: location.label.trim() || null,
                countryCode: location.countryCode.trim().toUpperCase() || null,
                region: location.region.trim() || null,
                city: location.city.trim() || null,
                district: location.district.trim() || null,
                streetAddress: location.streetAddress.trim() || null,
                postalCode: location.postalCode.trim() || null,
                latitude: parsedLatitude,
                longitude: parsedLongitude,
                addressVisibility: location.addressVisibility || "public",
              },
            },
          }),
        },
      );

      const payload = (await response.json().catch(() => ({}))) as {
        readonly ok?: boolean;
        readonly error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? `HTTP ${response.status}`);
      }

      setSavedImageUrl(imageUrl);
      setSavedLocation(location);
      setSaveState("saved");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `${copy.saveError} ${error.message}`
          : copy.saveError,
      );
      setSaveState("error");
    }
  }

  const addressLine = getAddressLine(location);
  const editable = editMode && canEdit;

  return (
    <div className="grid gap-3">
      {editable ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {saveState === "saved" ? (
            <span className="rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-1.5 text-[12px] font-semibold text-[#16a34a]">
              {copy.saved}
            </span>
          ) : null}
          {errorMessage ? (
            <span className="max-w-[520px] rounded-full border border-[#fecaca] bg-[#fff1f2] px-3 py-1.5 text-[12px] font-semibold text-[#b42318]">
              {errorMessage}
            </span>
          ) : null}
          <button
            type="button"
            onClick={resetChanges}
            disabled={!hasChanges || saveState === "saving"}
            title={copy.reset}
            aria-label={copy.reset}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white text-[#7c8099] shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={15} />
          </button>
          <button
            type="button"
            onClick={saveMediaAndLocation}
            disabled={
              !hasChanges || !coordinatesAreValid || saveState === "saving"
            }
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 text-[13px] font-bold text-[#16a34a] shadow-sm transition hover:bg-[#e8fbea] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Save size={14} />
            {saveState === "saving" ? copy.saving : copy.saveMedia}
          </button>
        </div>
      ) : null}

      <EntityPageTopGrid>
        <EntityPageTopCard label={copy.object} icon={ImageIcon} accent="#3b6ef8">
          <div className="flex h-full min-h-0 flex-col gap-3">
            <button
              type="button"
              onClick={() => editable && fileInputRef.current?.click()}
              disabled={!editable}
              className="group relative mx-auto aspect-square w-full max-w-[250px] overflow-hidden rounded-2xl border border-[#dfe4ff] bg-[#eef2ff] text-[#3b6ef8] disabled:cursor-default"
              aria-label={editable ? copy.replacePhoto : copy.photoAlt}
              title={editable ? copy.replacePhoto : copy.photoAlt}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={copy.photoAlt}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageIcon size={54} strokeWidth={1.5} />
                </div>
              )}
              {editable ? (
                <span className="pointer-events-none absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-[#3b6ef8] shadow-[0_8px_20px_rgba(59,110,248,0.22)] transition group-hover:scale-105">
                  <Camera size={18} />
                </span>
              ) : null}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
            <div>
              <div className="text-[15px] font-bold text-[#111827]">{title}</div>
              <div className="mt-1 text-[12px] text-[#9ca3b8]">
                {objectKindLabel}
              </div>
            </div>
            {editable ? (
              <div className="mt-auto flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-[#dfe4ff] bg-[#eef2ff] px-3 py-2 text-[12px] font-semibold text-[#3b6ef8]"
                >
                  {imageUrl ? copy.replacePhoto : copy.addPhoto}
                </button>
                {imageUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl("");
                      setSaveState("idle");
                    }}
                    className="rounded-lg border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-[12px] font-semibold text-[#b42318]"
                  >
                    {copy.removePhoto}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </EntityPageTopCard>

        <EntityPageTopCard label={copy.location} icon={MapPin} accent="#f97316">
          {editable ? (
            <div className="grid gap-2">
              <input
                value={location.label}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setLocationField("label", event.target.value)
                }
                placeholder={copy.addressLabel}
                className={inputClassName()}
              />
              <input
                value={location.streetAddress}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setLocationField("streetAddress", event.target.value)
                }
                placeholder={copy.streetAddress}
                className={inputClassName()}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={location.city}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setLocationField("city", event.target.value)
                  }
                  placeholder={copy.city}
                  className={inputClassName()}
                />
                <input
                  value={location.district}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setLocationField("district", event.target.value)
                  }
                  placeholder={copy.district}
                  className={inputClassName()}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  value={location.region}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setLocationField("region", event.target.value)
                  }
                  placeholder={copy.region}
                  className={inputClassName()}
                />
                <input
                  value={location.postalCode}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setLocationField("postalCode", event.target.value)
                  }
                  placeholder={copy.postalCode}
                  className={inputClassName()}
                />
                <input
                  value={location.countryCode}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setLocationField("countryCode", event.target.value)
                  }
                  placeholder={copy.countryCode}
                  maxLength={2}
                  className={inputClassName()}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={location.latitude}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setLocationField("latitude", event.target.value)
                  }
                  placeholder={copy.latitude}
                  inputMode="decimal"
                  className={inputClassName()}
                />
                <input
                  value={location.longitude}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setLocationField("longitude", event.target.value)
                  }
                  placeholder={copy.longitude}
                  inputMode="decimal"
                  className={inputClassName()}
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="text-[15px] font-bold leading-5 text-[#111827]">
                {addressLine || location.label || copy.noLocation}
              </div>
              {locationIsInherited ? (
                <p className="mt-2 text-[11px] leading-4 text-[#7c8099]">
                  {copy.inheritedLocation}
                </p>
              ) : null}
            </div>
          )}

          <OrganizationLocationMapPreview
            location={mapLocation}
            organizationName={title}
            locale={locale}
            titleLabel={copy.mapTitle}
            fallbackLabel={copy.mapFallback}
            className={editable ? "min-h-[170px]" : "min-h-[260px]"}
          />
        </EntityPageTopCard>

        <EntityPageTopCard label={copy.owner} icon={UserRound} accent="#8b5cf6">
          <div className="flex h-full flex-col">
            <div className="mx-auto aspect-square w-full max-w-[250px] overflow-hidden rounded-2xl border border-[#eee7ff] bg-[#f7f1ff]">
              {owner.imageUrl ? (
                <img
                  src={owner.imageUrl}
                  alt={owner.displayName}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[#8b5cf6]">
                  <UserRound size={54} strokeWidth={1.5} />
                </div>
              )}
            </div>
            <div className="mt-3">
              {owner.href ? (
                <Link
                  href={owner.href}
                  className="inline-flex items-center gap-1 text-[15px] font-bold text-[#3b6ef8] hover:underline"
                >
                  {owner.displayName}
                  <ExternalLink size={13} />
                </Link>
              ) : (
                <div className="text-[15px] font-bold text-[#111827]">
                  {owner.displayName}
                </div>
              )}
              <div className="mt-1 text-[12px] text-[#9ca3b8]">
                {owner.kindLabel}
              </div>
            </div>
            {owner.href ? (
              <Link
                href={owner.href}
                className="mt-auto inline-flex w-fit items-center gap-1 rounded-lg border border-[#e6dcff] bg-[#f7f1ff] px-3 py-2 text-[12px] font-semibold text-[#8b5cf6]"
              >
                {copy.openOwner}
                <ExternalLink size={12} />
              </Link>
            ) : null}
          </div>
        </EntityPageTopCard>

        <EntityPageTopCard label={copy.summary} icon={Gauge} accent="#22c55e">
          <div className="grid gap-2">
            {summaryItems.map((item) => (
              <div
                key={`${item.label}:${item.value}`}
                className="rounded-xl border border-[#edf0f7] bg-[#f8fafc] px-3 py-3"
              >
                <div className="text-[10px] font-medium uppercase tracking-wide text-[#7c8099]">
                  {item.label}
                </div>
                <div className="mt-1 break-words text-[14px] font-semibold text-[#111827]">
                  {item.value || "—"}
                </div>
              </div>
            ))}
          </div>
        </EntityPageTopCard>
      </EntityPageTopGrid>
    </div>
  );
}
