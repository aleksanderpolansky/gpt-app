"use client";

import { Check, LoaderCircle, MapPin, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type OrganizationAddressSelection = {
  provider: "GOOGLE_PLACES_NEW";
  placeId: string;
  formattedAddress: string;
  countryCode: string;
  countryName: string | null;
  city: string | null;
  district: string | null;
  postalCode: string | null;
  streetAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  issuedAt: string;
  expiresAt: string;
  addressSelectionToken: string;
};

type AddressSuggestion = {
  placeId: string;
  text: string;
  mainText: string | null;
  secondaryText: string | null;
};

type LocaleCode = "en" | "pl" | "uk" | "ru" | "de" | "es" | "cs";

type AddressMessages = {
  label: string;
  placeholder: string;
  hint: string;
  searching: string;
  resolving: string;
  noResults: string;
  manualFallback: string;
  rateLimited: string;
  manualNotice: string;
  selected: string;
  error: string;
};

const ADDRESS_MESSAGES: Record<LocaleCode, AddressMessages> = {
  en: {
    label: "Enterprise address",
    placeholder: "Start typing and select an address",
    hint: "The country, city and coordinates will be filled from the selected address.",
    searching: "Searching addresses...",
    resolving: "Reading the selected address...",
    noResults: "No matching addresses found.",
    manualFallback: "Address search is unavailable. Enter the country and city manually.",
    rateLimited: "The address-search limit has been reached. Enter the country and city manually or try again later.",
    manualNotice: "This address was not selected from suggestions. Check the country before saving.",
    selected: "Address selected",
    error: "The address could not be loaded.",
  },
  pl: {
    label: "Adres firmy",
    placeholder: "Zacznij pisać i wybierz adres",
    hint: "Kraj, miasto i współrzędne zostaną uzupełnione z wybranego adresu.",
    searching: "Wyszukiwanie adresów...",
    resolving: "Odczytywanie wybranego adresu...",
    noResults: "Nie znaleziono pasujących adresów.",
    manualFallback: "Wyszukiwanie adresu jest niedostępne. Wpisz kraj i miasto ręcznie.",
    rateLimited: "Limit wyszukiwania adresów został osiągnięty. Wpisz kraj i miasto ręcznie albo spróbuj później.",
    manualNotice: "Adres nie został wybrany z podpowiedzi. Sprawdź kraj przed zapisaniem.",
    selected: "Wybrano adres",
    error: "Nie udało się wczytać adresu.",
  },
  uk: {
    label: "Адреса підприємства",
    placeholder: "Почніть вводити та виберіть адресу",
    hint: "Країна, місто й координати заповняться з вибраної адреси.",
    searching: "Пошук адрес...",
    resolving: "Читаю вибрану адресу...",
    noResults: "Відповідних адрес не знайдено.",
    manualFallback: "Пошук адреси недоступний. Вкажіть країну й місто вручну.",
    rateLimited: "Ліміт пошуку адрес вичерпано. Вкажіть країну й місто вручну або спробуйте пізніше.",
    manualNotice: "Адресу не вибрано з підказок. Перевірте країну перед збереженням.",
    selected: "Адресу вибрано",
    error: "Не вдалося завантажити адресу.",
  },
  ru: {
    label: "Адрес предприятия",
    placeholder: "Начните вводить и выберите адрес",
    hint: "Страна, город и координаты заполнятся из выбранного адреса.",
    searching: "Ищу адреса...",
    resolving: "Читаю выбранный адрес...",
    noResults: "Подходящие адреса не найдены.",
    manualFallback: "Поиск адреса недоступен. Укажите страну и город вручную.",
    rateLimited: "Лимит поиска адресов исчерпан. Укажите страну и город вручную или повторите позже.",
    manualNotice: "Адрес не выбран из подсказок. Проверьте страну перед сохранением.",
    selected: "Адрес выбран",
    error: "Не удалось загрузить адрес.",
  },
  de: {
    label: "Unternehmensadresse",
    placeholder: "Adresse eingeben und auswählen",
    hint: "Land, Stadt und Koordinaten werden aus der gewählten Adresse übernommen.",
    searching: "Adressen werden gesucht...",
    resolving: "Ausgewählte Adresse wird gelesen...",
    noResults: "Keine passenden Adressen gefunden.",
    manualFallback: "Die Adresssuche ist nicht verfügbar. Land und Stadt manuell eingeben.",
    rateLimited: "Das Limit für die Adresssuche wurde erreicht. Geben Sie Land und Stadt manuell ein oder versuchen Sie es später erneut.",
    manualNotice: "Die Adresse wurde nicht aus den Vorschlägen gewählt. Prüfen Sie vor dem Speichern das Land.",
    selected: "Adresse ausgewählt",
    error: "Die Adresse konnte nicht geladen werden.",
  },
  es: {
    label: "Dirección de la empresa",
    placeholder: "Empieza a escribir y elige una dirección",
    hint: "El país, la ciudad y las coordenadas se completarán desde la dirección elegida.",
    searching: "Buscando direcciones...",
    resolving: "Leyendo la dirección elegida...",
    noResults: "No se encontraron direcciones coincidentes.",
    manualFallback: "La búsqueda de direcciones no está disponible. Indica país y ciudad manualmente.",
    rateLimited: "Se alcanzó el límite de búsqueda de direcciones. Indica el país y la ciudad manualmente o inténtalo más tarde.",
    manualNotice: "La dirección no se eligió de las sugerencias. Comprueba el país antes de guardar.",
    selected: "Dirección seleccionada",
    error: "No se pudo cargar la dirección.",
  },
  cs: {
    label: "Adresa podniku",
    placeholder: "Začněte psát a vyberte adresu",
    hint: "Z vybrané adresy se doplní země, město a souřadnice.",
    searching: "Vyhledávám adresy...",
    resolving: "Načítám vybranou adresu...",
    noResults: "Nebyly nalezeny odpovídající adresy.",
    manualFallback: "Vyhledávání adres není dostupné. Zadejte zemi a město ručně.",
    rateLimited: "Limit vyhledávání adres byl vyčerpán. Zadejte zemi a město ručně nebo to zkuste později.",
    manualNotice: "Adresa nebyla vybrána z návrhů. Před uložením zkontrolujte zemi.",
    selected: "Adresa vybrána",
    error: "Adresu se nepodařilo načíst.",
  },
};

function normalizeLocale(value: string): LocaleCode {
  if (
    value === "pl" ||
    value === "uk" ||
    value === "ru" ||
    value === "de" ||
    value === "es" ||
    value === "cs"
  ) {
    return value;
  }

  return "en";
}

function createSessionToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replaceAll("-", "");
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export default function OrganizationAddressAutocomplete({
  locale,
  value,
  onChange,
  onSelect,
  countryCodeHint,
  selectedAddress,
}: {
  locale: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (selection: OrganizationAddressSelection) => void;
  countryCodeHint?: string | null;
  selectedAddress?: string | null;
}) {
  const messages = ADDRESS_MESSAGES[normalizeLocale(locale)];
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [resolvingPlaceId, setResolvingPlaceId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [providerUnavailable, setProviderUnavailable] = useState(false);
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const sessionTokenRef = useRef(createSessionToken());

  useEffect(() => {
    const query = value.trim();

    if (
      !isFocused ||
      providerUnavailable ||
      query.length < 3 ||
      query === selectedAddress
    ) {
      setSuggestions([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setHasSearched(false);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/geo/address-autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          signal: controller.signal,
          body: JSON.stringify({
            action: "search",
            input: query,
            sessionToken: sessionTokenRef.current,
            languageCode: locale,
            regionCode: countryCodeHint?.trim().toLowerCase() || null,
          }),
        });
        const payload = (await response.json().catch(() => null)) as
          | {
              ok?: boolean;
              suggestions?: AddressSuggestion[];
              error?: string;
              code?: string;
              retryAfterSeconds?: number;
            }
          | null;

        if (!response.ok || !payload?.ok) {
          if (payload?.code === "ADDRESS_RATE_LIMITED") {
            setProviderUnavailable(true);
            setProviderNotice(messages.rateLimited);
            setSuggestions([]);
            setHasSearched(true);
            return;
          }

          if (
            payload?.code === "GOOGLE_PLACES_NOT_CONFIGURED" ||
            payload?.code === "ADDRESS_RATE_LIMIT_UNAVAILABLE" ||
            payload?.code === "ADDRESS_RATE_LIMIT_INVALID_RESPONSE"
          ) {
            setProviderUnavailable(true);
            setProviderNotice(messages.manualFallback);
            setSuggestions([]);
            setHasSearched(true);
            return;
          }

          throw new Error(payload?.error || messages.error);
        }

        setSuggestions(payload.suggestions ?? []);
        setHasSearched(true);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setSuggestions([]);
        setHasSearched(true);
        setErrorMessage(
          error instanceof Error ? error.message : messages.error,
        );
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    countryCodeHint,
    isFocused,
    locale,
    messages.error,
    messages.manualFallback,
    messages.rateLimited,
    providerUnavailable,
    selectedAddress,
    value,
  ]);

  async function resolveSuggestion(suggestion: AddressSuggestion) {
    setResolvingPlaceId(suggestion.placeId);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/geo/address-autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          action: "resolve",
          placeId: suggestion.placeId,
          sessionToken: sessionTokenRef.current,
          languageCode: locale,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            selection?: Omit<
              OrganizationAddressSelection,
              "addressSelectionToken"
            >;
            addressSelectionToken?: string;
            error?: string;
            code?: string;
            retryAfterSeconds?: number;
          }
        | null;

      if (!response.ok || !payload?.ok) {
        if (payload?.code === "ADDRESS_RATE_LIMITED") {
          setProviderUnavailable(true);
          setProviderNotice(messages.rateLimited);
          setSuggestions([]);
          return;
        }

        if (
          payload?.code === "GOOGLE_PLACES_NOT_CONFIGURED" ||
          payload?.code === "ADDRESS_RATE_LIMIT_UNAVAILABLE" ||
          payload?.code === "ADDRESS_RATE_LIMIT_INVALID_RESPONSE"
        ) {
          setProviderUnavailable(true);
          setProviderNotice(messages.manualFallback);
          setSuggestions([]);
          return;
        }

        throw new Error(payload?.error || messages.error);
      }

      if (!payload.selection || !payload.addressSelectionToken) {
        throw new Error(messages.error);
      }

      const selection: OrganizationAddressSelection = {
        ...payload.selection,
        addressSelectionToken: payload.addressSelectionToken,
      };

      onChange(selection.formattedAddress);
      onSelect(selection);
      setSuggestions([]);
      sessionTokenRef.current = createSessionToken();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : messages.error,
      );
    } finally {
      setResolvingPlaceId(null);
    }
  }

  return (
    <div className="relative grid gap-2">
      <label className="text-[12px] font-semibold text-[#4a4f6a]">
        {messages.label}
      </label>

      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3b8]"
          size={16}
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            window.setTimeout(() => setIsFocused(false), 120);
          }}
          placeholder={messages.placeholder}
          autoComplete="off"
          className="w-full rounded-xl border border-[#dfe3f1] bg-white py-3 pl-10 pr-4 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
        />
      </div>

      <p className="m-0 text-[11px] leading-5 text-[#7c8099]">
        {messages.hint}
      </p>

      {selectedAddress ? (
        <div className="flex items-start gap-2 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-[12px] text-[#166534]">
          <Check className="mt-0.5 shrink-0" size={15} />
          <span>
            <strong>{messages.selected}:</strong> {selectedAddress}
          </span>
        </div>
      ) : null}

      {providerUnavailable ? (
        <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[12px] text-[#92400e]">
          {providerNotice ?? messages.manualFallback}
        </div>
      ) : null}

      {!providerUnavailable && !isFocused && value.trim() && !selectedAddress ? (
        <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[12px] text-[#92400e]">
          {messages.manualNotice}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-xl border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-[12px] text-[#b42318]">
          {errorMessage}
        </div>
      ) : null}

      {isSearching ? (
        <div className="flex items-center gap-2 text-[12px] text-[#5a5f7a]">
          <LoaderCircle className="animate-spin" size={15} />
          {messages.searching}
        </div>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-[#dfe3f1] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.16)]">
          {suggestions.map((suggestion) => {
            const resolving = resolvingPlaceId === suggestion.placeId;

            return (
              <button
                key={suggestion.placeId}
                type="button"
                disabled={Boolean(resolvingPlaceId)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => resolveSuggestion(suggestion)}
                className="flex w-full items-start gap-3 border-b border-[#eef0f6] px-4 py-3 text-left transition last:border-b-0 hover:bg-[#f7f8fc] disabled:cursor-wait"
              >
                {resolving ? (
                  <LoaderCircle className="mt-0.5 animate-spin text-[#3b6ef8]" size={16} />
                ) : (
                  <MapPin className="mt-0.5 text-[#f97316]" size={16} />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-[#1a1d2e]">
                    {suggestion.mainText || suggestion.text}
                  </span>
                  {suggestion.secondaryText ? (
                    <span className="mt-0.5 block truncate text-[11px] text-[#7c8099]">
                      {suggestion.secondaryText}
                    </span>
                  ) : null}
                  {resolving ? (
                    <span className="mt-1 block text-[11px] text-[#3b6ef8]">
                      {messages.resolving}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
          <div className="bg-[#f8f9fd] px-4 py-2 text-right text-[12px] font-medium text-[#5e5e5e]">
            <span translate="no">Google Maps</span>
          </div>
        </div>
      ) : null}

      {hasSearched && !isSearching && value.trim().length >= 3 && suggestions.length === 0 && !errorMessage && !providerUnavailable && value !== selectedAddress ? (
        <div className="text-[11px] text-[#7c8099]">{messages.noResults}</div>
      ) : null}
    </div>
  );
}
