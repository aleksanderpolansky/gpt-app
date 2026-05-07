"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type GeoArea = {
  id: string;
  parentId: string | null;
  areaType: string;
  countryCode: string | null;
  name: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  sortOrder: number;
  status: string;
  source?: string;
  isOwnSuggestion?: boolean;
};

type GeoAreasResponse = {
  ok?: boolean;
  areas?: GeoArea[];
  count?: number;
  error?: string;
};

type GeoSuggestionResponse = {
  ok?: boolean;
  alreadyExists?: boolean;
  message?: string;
  error?: string;
  geoArea?: {
    id: string;
    parent_id: string | null;
    area_type: string;
    country_code: string | null;
    name: string;
    slug: string;
    latitude?: number | null;
    longitude?: number | null;
    sort_order?: number;
    status: string;
    source: string;
  };
};

type CreateOrganizationResponse = {
  ok?: boolean;
  error?: string;
  organization?: {
    id: string;
    organization_name: string;
    organization_type: string;
    description?: string | null;
  };
  organizationActor?: {
    id: string;
    display_name: string;
    actor_type: string;
  };
  businessSpace?: {
    id: string;
    title: string;
    space_type: string;
  };
};

function mapSuggestionToGeoArea(
  geoArea: GeoSuggestionResponse["geoArea"]
): GeoArea | null {
  if (!geoArea) {
    return null;
  }

  return {
    id: geoArea.id,
    parentId: geoArea.parent_id,
    areaType: geoArea.area_type,
    countryCode: geoArea.country_code,
    name: geoArea.name,
    slug: geoArea.slug,
    latitude: geoArea.latitude ?? null,
    longitude: geoArea.longitude ?? null,
    sortOrder: geoArea.sort_order ?? 1000,
    status: geoArea.status,
    source: geoArea.source,
    isOwnSuggestion:
      geoArea.source === "user_suggestion" &&
      (geoArea.status === "suggested" || geoArea.status === "needs_review"),
  };
}

function mergeGeoAreas(currentAreas: GeoArea[], nextArea: GeoArea) {
  const withoutDuplicate = currentAreas.filter((area) => area.id !== nextArea.id);

  return [...withoutDuplicate, nextArea].sort((firstArea, secondArea) => {
    if (firstArea.sortOrder !== secondArea.sortOrder) {
      return firstArea.sortOrder - secondArea.sortOrder;
    }

    return firstArea.name.localeCompare(secondArea.name);
  });
}

function getAreaOptionLabel(area: GeoArea) {
  if (area.isOwnSuggestion) {
    return `${area.name} — добавлено вами, ожидает проверки`;
  }

  if (area.status !== "approved") {
    return `${area.name} — ${area.status}`;
  }

  return area.name;
}

function normalizeCountryCodeInput(value: string) {
  return value.trim().toUpperCase();
}

export default function NewOrganizationPage() {
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState("private_business");
  const [description, setDescription] = useState("");

  const [countries, setCountries] = useState<GeoArea[]>([]);
  const [cities, setCities] = useState<GeoArea[]>([]);
  const [districts, setDistricts] = useState<GeoArea[]>([]);

  const [countryGeoAreaId, setCountryGeoAreaId] = useState("");
  const [cityGeoAreaId, setCityGeoAreaId] = useState("");
  const [districtGeoAreaId, setDistrictGeoAreaId] = useState("");

  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);

  const [geoErrorMessage, setGeoErrorMessage] = useState<string | null>(null);

  const [isSuggestCountryOpen, setIsSuggestCountryOpen] = useState(false);
  const [suggestedCountryName, setSuggestedCountryName] = useState("");
  const [suggestedCountryCode, setSuggestedCountryCode] = useState("");
  const [suggestedCountryNotes, setSuggestedCountryNotes] = useState("");
  const [isSubmittingCountrySuggestion, setIsSubmittingCountrySuggestion] =
    useState(false);
  const [countrySuggestionMessage, setCountrySuggestionMessage] = useState<
    string | null
  >(null);
  const [countrySuggestionError, setCountrySuggestionError] = useState<
    string | null
  >(null);

  const [isSuggestCityOpen, setIsSuggestCityOpen] = useState(false);
  const [suggestedCityName, setSuggestedCityName] = useState("");
  const [suggestedCityNotes, setSuggestedCityNotes] = useState("");
  const [isSubmittingCitySuggestion, setIsSubmittingCitySuggestion] =
    useState(false);
  const [citySuggestionMessage, setCitySuggestionMessage] = useState<
    string | null
  >(null);
  const [citySuggestionError, setCitySuggestionError] = useState<string | null>(
    null
  );

  const [isSuggestDistrictOpen, setIsSuggestDistrictOpen] = useState(false);
  const [suggestedDistrictName, setSuggestedDistrictName] = useState("");
  const [suggestedDistrictNotes, setSuggestedDistrictNotes] = useState("");
  const [isSubmittingDistrictSuggestion, setIsSubmittingDistrictSuggestion] =
    useState(false);
  const [districtSuggestionMessage, setDistrictSuggestionMessage] = useState<
    string | null
  >(null);
  const [districtSuggestionError, setDistrictSuggestionError] = useState<
    string | null
  >(null);

  const [result, setResult] = useState<CreateOrganizationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [debugMessage, setDebugMessage] = useState("Кнопка ещё не нажималась.");

  const selectedCountry = countries.find(
    (country) => country.id === countryGeoAreaId
  );
  const selectedCountryCode = selectedCountry?.countryCode ?? "";

  const selectedCity = cities.find((city) => city.id === cityGeoAreaId);
  const selectedDistrict = districts.find(
    (district) => district.id === districtGeoAreaId
  );

  async function loadGeoAreas(url: string) {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    const data = (await response.json()) as GeoAreasResponse;

    if (!response.ok || !data.ok) {
      throw new Error(data.error ?? "Cannot load geo areas");
    }

    return data.areas ?? [];
  }

  useEffect(() => {
    let isMounted = true;

    async function loadCountries() {
      setIsLoadingCountries(true);
      setGeoErrorMessage(null);

      try {
        const loadedCountries = await loadGeoAreas(
          "/api/geo/areas?areaType=country&includeOwnSuggestions=true"
        );

        if (!isMounted) {
          return;
        }

        setCountries(loadedCountries);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setGeoErrorMessage(
          error instanceof Error
            ? error.message
            : "Unknown countries loading error"
        );
      } finally {
        if (isMounted) {
          setIsLoadingCountries(false);
        }
      }
    }

    loadCountries();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadCities() {
      setCities([]);
      setDistricts([]);
      setCityGeoAreaId("");
      setDistrictGeoAreaId("");

      setCitySuggestionMessage(null);
      setCitySuggestionError(null);
      setIsSuggestCityOpen(false);
      setSuggestedCityName("");
      setSuggestedCityNotes("");

      setDistrictSuggestionMessage(null);
      setDistrictSuggestionError(null);
      setIsSuggestDistrictOpen(false);
      setSuggestedDistrictName("");
      setSuggestedDistrictNotes("");

      if (!selectedCountryCode) {
        setIsLoadingCities(false);
        return;
      }

      setIsLoadingCities(true);
      setGeoErrorMessage(null);

      try {
        const loadedCities = await loadGeoAreas(
          `/api/geo/areas?areaType=city&countryCode=${encodeURIComponent(
            selectedCountryCode
          )}&includeOwnSuggestions=true`
        );

        if (!isMounted) {
          return;
        }

        setCities(loadedCities);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setGeoErrorMessage(
          error instanceof Error
            ? error.message
            : "Unknown cities loading error"
        );
      } finally {
        if (isMounted) {
          setIsLoadingCities(false);
        }
      }
    }

    loadCities();

    return () => {
      isMounted = false;
    };
  }, [selectedCountryCode]);

  useEffect(() => {
    let isMounted = true;

    async function loadDistricts() {
      setDistricts([]);
      setDistrictGeoAreaId("");

      setDistrictSuggestionMessage(null);
      setDistrictSuggestionError(null);
      setIsSuggestDistrictOpen(false);
      setSuggestedDistrictName("");
      setSuggestedDistrictNotes("");

      if (!cityGeoAreaId) {
        setIsLoadingDistricts(false);
        return;
      }

      setIsLoadingDistricts(true);
      setGeoErrorMessage(null);

      try {
        const loadedDistricts = await loadGeoAreas(
          `/api/geo/areas?areaType=district&parentId=${encodeURIComponent(
            cityGeoAreaId
          )}&includeOwnSuggestions=true`
        );

        if (!isMounted) {
          return;
        }

        setDistricts(loadedDistricts);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setGeoErrorMessage(
          error instanceof Error
            ? error.message
            : "Unknown districts loading error"
        );
      } finally {
        if (isMounted) {
          setIsLoadingDistricts(false);
        }
      }
    }

    loadDistricts();

    return () => {
      isMounted = false;
    };
  }, [cityGeoAreaId]);

  async function handleSuggestCountry() {
    setCountrySuggestionMessage(null);
    setCountrySuggestionError(null);

    const normalizedCountryCode = normalizeCountryCodeInput(suggestedCountryCode);

    if (suggestedCountryName.trim().length < 2) {
      setCountrySuggestionError(
        "Название страны должно содержать минимум 2 символа."
      );
      return;
    }

    if (!/^[A-Z]{2}$/.test(normalizedCountryCode)) {
      setCountrySuggestionError(
        "Код страны должен состоять из 2 латинских букв, например ES, DE, PL."
      );
      return;
    }

    setIsSubmittingCountrySuggestion(true);

    try {
      const response = await fetch("/api/geo/suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          areaType: "country",
          countryCode: normalizedCountryCode,
          name: suggestedCountryName,
          parentId: null,
          notes: suggestedCountryNotes || null,
        }),
      });

      const data = (await response.json()) as GeoSuggestionResponse;

      if (!response.ok || !data.ok) {
        setCountrySuggestionError(data.error ?? "Не удалось добавить страну.");
        return;
      }

      const nextCountry = mapSuggestionToGeoArea(data.geoArea);

      if (nextCountry) {
        setCountries((currentCountries) =>
          mergeGeoAreas(currentCountries, nextCountry)
        );
        setCountryGeoAreaId(nextCountry.id);
      }

      setCountrySuggestionMessage(
        data.alreadyExists
          ? data.message ??
              "Такая страна уже есть в справочнике или уже была предложена ранее."
          : `Страна “${
              data.geoArea?.name ?? suggestedCountryName
            }” добавлена и уже доступна вам для выбора. Теперь город нужно добавлять внутри этой страны.`
      );

      setSuggestedCountryName("");
      setSuggestedCountryCode("");
      setSuggestedCountryNotes("");
      setIsSuggestCountryOpen(false);
    } catch (error) {
      setCountrySuggestionError(
        error instanceof Error
          ? error.message
          : "Unknown country suggestion error"
      );
    } finally {
      setIsSubmittingCountrySuggestion(false);
    }
  }

  async function handleSuggestCity() {
    setCitySuggestionMessage(null);
    setCitySuggestionError(null);

    if (!selectedCountryCode) {
      setCitySuggestionError("Сначала выберите страну.");
      return;
    }

    if (suggestedCityName.trim().length < 2) {
      setCitySuggestionError("Название города должно содержать минимум 2 символа.");
      return;
    }

    setIsSubmittingCitySuggestion(true);

    try {
      const response = await fetch("/api/geo/suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          areaType: "city",
          countryCode: selectedCountryCode,
          name: suggestedCityName,
          parentId: countryGeoAreaId || null,
          notes: suggestedCityNotes || null,
        }),
      });

      const data = (await response.json()) as GeoSuggestionResponse;

      if (!response.ok || !data.ok) {
        setCitySuggestionError(data.error ?? "Не удалось добавить город.");
        return;
      }

      const nextCity = mapSuggestionToGeoArea(data.geoArea);

      if (nextCity) {
        setCities((currentCities) => mergeGeoAreas(currentCities, nextCity));
        setCityGeoAreaId(nextCity.id);
      }

      setCitySuggestionMessage(
        data.alreadyExists
          ? data.message ??
              "Такой город уже есть в справочнике или уже был предложен ранее."
          : `Город “${
              data.geoArea?.name ?? suggestedCityName
            }” добавлен в страну ${
              selectedCountry?.name ?? selectedCountryCode
            } и уже доступен вам для выбора. Позже он будет проверен администратором.`
      );

      setSuggestedCityName("");
      setSuggestedCityNotes("");
      setIsSuggestCityOpen(false);
    } catch (error) {
      setCitySuggestionError(
        error instanceof Error ? error.message : "Unknown city suggestion error"
      );
    } finally {
      setIsSubmittingCitySuggestion(false);
    }
  }

  async function handleSuggestDistrict() {
    setDistrictSuggestionMessage(null);
    setDistrictSuggestionError(null);

    if (!selectedCountryCode) {
      setDistrictSuggestionError("Сначала выберите страну.");
      return;
    }

    if (!cityGeoAreaId || !selectedCity) {
      setDistrictSuggestionError("Сначала выберите город.");
      return;
    }

    if (suggestedDistrictName.trim().length < 2) {
      setDistrictSuggestionError(
        "Название района должно содержать минимум 2 символа."
      );
      return;
    }

    setIsSubmittingDistrictSuggestion(true);

    try {
      const response = await fetch("/api/geo/suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          areaType: "district",
          countryCode: selectedCountryCode,
          name: suggestedDistrictName,
          parentId: cityGeoAreaId,
          notes: suggestedDistrictNotes || null,
        }),
      });

      const data = (await response.json()) as GeoSuggestionResponse;

      if (!response.ok || !data.ok) {
        setDistrictSuggestionError(data.error ?? "Не удалось добавить район.");
        return;
      }

      const nextDistrict = mapSuggestionToGeoArea(data.geoArea);

      if (nextDistrict) {
        setDistricts((currentDistricts) =>
          mergeGeoAreas(currentDistricts, nextDistrict)
        );
        setDistrictGeoAreaId(nextDistrict.id);
      }

      setDistrictSuggestionMessage(
        data.alreadyExists
          ? data.message ??
              "Такой район уже есть в справочнике или уже был предложен ранее."
          : `Район “${
              data.geoArea?.name ?? suggestedDistrictName
            }” добавлен к городу ${
              selectedCity.name
            } и уже доступен вам для выбора. Позже он будет проверен администратором.`
      );

      setSuggestedDistrictName("");
      setSuggestedDistrictNotes("");
      setIsSuggestDistrictOpen(false);
    } catch (error) {
      setDistrictSuggestionError(
        error instanceof Error
          ? error.message
          : "Unknown district suggestion error"
      );
    } finally {
      setIsSubmittingDistrictSuggestion(false);
    }
  }

  async function handleCreateOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setDebugMessage("Кнопка нажата. Отправляю запрос...");
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationName,
          organizationType,
          description,
          countryCode: selectedCountryCode || null,
          countryGeoAreaId: countryGeoAreaId || null,
          cityGeoAreaId: cityGeoAreaId || null,
          city: selectedCity?.name ?? null,
          districtGeoAreaId: districtGeoAreaId || null,
          district: selectedDistrict?.name ?? null,
        }),
      });

      const data = await response.json();
      setResult(data);

      if (!response.ok || !data.ok) {
        setDebugMessage("Ошибка при создании организации.");
        return;
      }

      setDebugMessage("Организация успешно создана.");

      setOrganizationName("");
      setDescription("");
      setOrganizationType("private_business");
      setCountryGeoAreaId("");
      setCityGeoAreaId("");
      setDistrictGeoAreaId("");
      setCities([]);
      setDistricts([]);

      setCountrySuggestionMessage(null);
      setCountrySuggestionError(null);
      setIsSuggestCountryOpen(false);
      setSuggestedCountryName("");
      setSuggestedCountryCode("");
      setSuggestedCountryNotes("");

      setCitySuggestionMessage(null);
      setCitySuggestionError(null);
      setIsSuggestCityOpen(false);
      setSuggestedCityName("");
      setSuggestedCityNotes("");

      setDistrictSuggestionMessage(null);
      setDistrictSuggestionError(null);
      setIsSuggestDistrictOpen(false);
      setSuggestedDistrictName("");
      setSuggestedDistrictNotes("");
    } catch (error) {
      setDebugMessage("Ошибка JavaScript при отправке формы.");
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        color: "#111111",
        padding: "40px 16px",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "640px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            marginBottom: "32px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "32px",
              lineHeight: "1.2",
              fontWeight: 700,
              margin: "0 0 20px",
            }}
          >
            Создать организацию
          </h1>

          <nav
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "24px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontSize: "16px",
              }}
            >
              На главную
            </Link>

            <Link
              href="/organizations"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontSize: "16px",
              }}
            >
              Мои организации
            </Link>
          </nav>
        </header>

        <form
          onSubmit={handleCreateOrganization}
          style={{
            border: "1px solid #dddddd",
            borderRadius: "12px",
            padding: "20px",
            background: "#f9fafb",
            display: "grid",
            gap: "16px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Название организации
            </label>

            <input
              type="text"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Например: Massage Studio Test"
              style={{
                width: "100%",
                border: "1px solid #cccccc",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "16px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Тип организации
            </label>

            <select
              value={organizationType}
              onChange={(event) => setOrganizationType(event.target.value)}
              style={{
                width: "100%",
                border: "1px solid #cccccc",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "16px",
                boxSizing: "border-box",
              }}
            >
              <option value="private_business">Private business</option>
              <option value="employer">Employer</option>
              <option value="supplier_company">Supplier company</option>
              <option value="customer_company">Customer company</option>
              <option value="school">School</option>
              <option value="community">Community</option>
              <option value="nonprofit">Nonprofit</option>
            </select>
          </div>

          <section
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "14px",
              background: "#ffffff",
              display: "grid",
              gap: "14px",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "18px",
                  margin: "0 0 6px",
                }}
              >
                Локация организации
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#666666",
                  fontSize: "14px",
                  lineHeight: "1.5",
                }}
              >
                Сначала выберите страну. Город добавляется только внутри
                выбранной страны, а район — только внутри выбранного города.
                Если страны нет, добавьте её сначала, например Spain / ES.
              </p>
            </div>

            {geoErrorMessage ? (
              <div
                style={{
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  padding: "10px",
                  background: "#fff1f2",
                  color: "#991b1b",
                  fontSize: "14px",
                  lineHeight: "1.4",
                }}
              >
                {geoErrorMessage}
              </div>
            ) : null}

            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                Страна
              </label>

              <select
                value={countryGeoAreaId}
                onChange={(event) => {
                  setCountryGeoAreaId(event.target.value);
                }}
                disabled={isLoadingCountries}
                style={{
                  width: "100%",
                  border: "1px solid #cccccc",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                  background: isLoadingCountries ? "#f3f4f6" : "#ffffff",
                }}
              >
                <option value="">
                  {isLoadingCountries ? "Загружаю страны..." : "Выберите страну"}
                </option>

                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {getAreaOptionLabel(country)}
                    {country.countryCode ? ` / ${country.countryCode}` : ""}
                  </option>
                ))}
              </select>

              <div style={{ marginTop: "10px", display: "grid", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsSuggestCountryOpen((currentValue) => !currentValue);
                    setCountrySuggestionMessage(null);
                    setCountrySuggestionError(null);
                  }}
                  style={{
                    border: "1px solid #2563eb",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    background: "#eff6ff",
                    color: "#1e3a8a",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {isSuggestCountryOpen
                    ? "Скрыть форму добавления страны"
                    : "Не нашли страну? Добавить новую страну"}
                </button>

                {countrySuggestionMessage ? (
                  <div
                    style={{
                      border: "1px solid #bbf7d0",
                      borderRadius: "8px",
                      padding: "10px",
                      background: "#f0fdf4",
                      color: "#166534",
                      fontSize: "14px",
                      lineHeight: "1.4",
                    }}
                  >
                    {countrySuggestionMessage}
                  </div>
                ) : null}

                {countrySuggestionError ? (
                  <div
                    style={{
                      border: "1px solid #fecaca",
                      borderRadius: "8px",
                      padding: "10px",
                      background: "#fff1f2",
                      color: "#991b1b",
                      fontSize: "14px",
                      lineHeight: "1.4",
                    }}
                  >
                    {countrySuggestionError}
                  </div>
                ) : null}

                {isSuggestCountryOpen ? (
                  <div
                    style={{
                      border: "1px solid #bfdbfe",
                      borderRadius: "10px",
                      padding: "12px",
                      background: "#f8fbff",
                      display: "grid",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        color: "#1e3a8a",
                        fontSize: "14px",
                        lineHeight: "1.4",
                      }}
                    >
                      Страна будет сразу доступна вам для выбора. Для остальных
                      пользователей она станет публичной после проверки.
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontWeight: 700,
                          marginBottom: "6px",
                        }}
                      >
                        Название страны
                      </label>

                      <input
                        type="text"
                        value={suggestedCountryName}
                        onChange={(event) =>
                          setSuggestedCountryName(event.target.value)
                        }
                        placeholder="Например: Spain, Germany, Ukraine"
                        style={{
                          width: "100%",
                          border: "1px solid #cccccc",
                          borderRadius: "8px",
                          padding: "10px",
                          fontSize: "15px",
                          boxSizing: "border-box",
                          background: "#ffffff",
                        }}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontWeight: 700,
                          marginBottom: "6px",
                        }}
                      >
                        Код страны ISO 3166-1 alpha-2
                      </label>

                      <input
                        type="text"
                        value={suggestedCountryCode}
                        onChange={(event) =>
                          setSuggestedCountryCode(
                            normalizeCountryCodeInput(event.target.value)
                          )
                        }
                        placeholder="Например: ES, DE, UA"
                        maxLength={2}
                        style={{
                          width: "100%",
                          border: "1px solid #cccccc",
                          borderRadius: "8px",
                          padding: "10px",
                          fontSize: "15px",
                          boxSizing: "border-box",
                          background: "#ffffff",
                          textTransform: "uppercase",
                        }}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontWeight: 700,
                          marginBottom: "6px",
                        }}
                      >
                        Комментарий для проверки
                      </label>

                      <textarea
                        value={suggestedCountryNotes}
                        onChange={(event) =>
                          setSuggestedCountryNotes(event.target.value)
                        }
                        placeholder="Можно указать, почему нужно добавить эту страну."
                        style={{
                          width: "100%",
                          minHeight: "72px",
                          border: "1px solid #cccccc",
                          borderRadius: "8px",
                          padding: "10px",
                          fontSize: "15px",
                          boxSizing: "border-box",
                          resize: "vertical",
                          background: "#ffffff",
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      disabled={
                        isSubmittingCountrySuggestion ||
                        suggestedCountryName.trim().length < 2 ||
                        !/^[A-Z]{2}$/.test(
                          normalizeCountryCodeInput(suggestedCountryCode)
                        )
                      }
                      onClick={() => {
                        handleSuggestCountry();
                      }}
                      style={{
                        border: "none",
                        borderRadius: "8px",
                        padding: "11px 14px",
                        background:
                          isSubmittingCountrySuggestion ||
                          suggestedCountryName.trim().length < 2 ||
                          !/^[A-Z]{2}$/.test(
                            normalizeCountryCodeInput(suggestedCountryCode)
                          )
                            ? "#9ca3af"
                            : "#2563eb",
                        color: "#ffffff",
                        fontWeight: 800,
                        cursor:
                          isSubmittingCountrySuggestion ||
                          suggestedCountryName.trim().length < 2 ||
                          !/^[A-Z]{2}$/.test(
                            normalizeCountryCodeInput(suggestedCountryCode)
                          )
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {isSubmittingCountrySuggestion
                        ? "Добавляю..."
                        : "Добавить страну"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                Город
              </label>

              <select
                value={cityGeoAreaId}
                onChange={(event) => {
                  setCityGeoAreaId(event.target.value);
                }}
                disabled={!selectedCountryCode || isLoadingCities}
                style={{
                  width: "100%",
                  border: "1px solid #cccccc",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                  background:
                    !selectedCountryCode || isLoadingCities
                      ? "#f3f4f6"
                      : "#ffffff",
                  color: !selectedCountryCode ? "#9ca3af" : "#111111",
                  cursor: !selectedCountryCode ? "not-allowed" : "default",
                }}
              >
                <option value="">
                  {!selectedCountryCode
                    ? "Сначала выберите страну"
                    : isLoadingCities
                      ? "Загружаю города..."
                      : "Выберите город"}
                </option>

                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {getAreaOptionLabel(city)}
                  </option>
                ))}
              </select>

              {selectedCountryCode ? (
                <div style={{ marginTop: "10px", display: "grid", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSuggestCityOpen((currentValue) => !currentValue);
                      setCitySuggestionMessage(null);
                      setCitySuggestionError(null);
                    }}
                    style={{
                      border: "1px solid #2563eb",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      background: "#eff6ff",
                      color: "#1e3a8a",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {isSuggestCityOpen
                      ? "Скрыть форму добавления города"
                      : "Не нашли город? Добавить новый город"}
                  </button>

                  {citySuggestionMessage ? (
                    <div
                      style={{
                        border: "1px solid #bbf7d0",
                        borderRadius: "8px",
                        padding: "10px",
                        background: "#f0fdf4",
                        color: "#166534",
                        fontSize: "14px",
                        lineHeight: "1.4",
                      }}
                    >
                      {citySuggestionMessage}
                    </div>
                  ) : null}

                  {citySuggestionError ? (
                    <div
                      style={{
                        border: "1px solid #fecaca",
                        borderRadius: "8px",
                        padding: "10px",
                        background: "#fff1f2",
                        color: "#991b1b",
                        fontSize: "14px",
                        lineHeight: "1.4",
                      }}
                    >
                      {citySuggestionError}
                    </div>
                  ) : null}

                  {isSuggestCityOpen ? (
                    <div
                      style={{
                        border: "1px solid #bfdbfe",
                        borderRadius: "10px",
                        padding: "12px",
                        background: "#f8fbff",
                        display: "grid",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          color: "#1e3a8a",
                          fontSize: "14px",
                          lineHeight: "1.4",
                        }}
                      >
                        Город будет добавлен именно в страну:{" "}
                        <strong>
                          {selectedCountry?.name ?? selectedCountryCode}
                        </strong>
                        . Если это другой город, сначала выберите правильную
                        страну.
                      </div>

                      <div>
                        <label
                          style={{
                            display: "block",
                            fontWeight: 700,
                            marginBottom: "6px",
                          }}
                        >
                          Название города
                        </label>

                        <input
                          type="text"
                          value={suggestedCityName}
                          onChange={(event) =>
                            setSuggestedCityName(event.target.value)
                          }
                          placeholder="Например: Valencia, Berlin, Wrocław"
                          style={{
                            width: "100%",
                            border: "1px solid #cccccc",
                            borderRadius: "8px",
                            padding: "10px",
                            fontSize: "15px",
                            boxSizing: "border-box",
                            background: "#ffffff",
                          }}
                        />
                      </div>

                      <div>
                        <label
                          style={{
                            display: "block",
                            fontWeight: 700,
                            marginBottom: "6px",
                          }}
                        >
                          Комментарий для проверки
                        </label>

                        <textarea
                          value={suggestedCityNotes}
                          onChange={(event) =>
                            setSuggestedCityNotes(event.target.value)
                          }
                          placeholder="Можно указать, почему нужно добавить этот город."
                          style={{
                            width: "100%",
                            minHeight: "72px",
                            border: "1px solid #cccccc",
                            borderRadius: "8px",
                            padding: "10px",
                            fontSize: "15px",
                            boxSizing: "border-box",
                            resize: "vertical",
                            background: "#ffffff",
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        disabled={
                          isSubmittingCitySuggestion ||
                          !selectedCountryCode ||
                          suggestedCityName.trim().length < 2
                        }
                        onClick={() => {
                          handleSuggestCity();
                        }}
                        style={{
                          border: "none",
                          borderRadius: "8px",
                          padding: "11px 14px",
                          background:
                            isSubmittingCitySuggestion ||
                            !selectedCountryCode ||
                            suggestedCityName.trim().length < 2
                              ? "#9ca3af"
                              : "#2563eb",
                          color: "#ffffff",
                          fontWeight: 800,
                          cursor:
                            isSubmittingCitySuggestion ||
                            !selectedCountryCode ||
                            suggestedCityName.trim().length < 2
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        {isSubmittingCitySuggestion
                          ? "Добавляю..."
                          : "Добавить город"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {selectedCountryCode && !isLoadingCities && cities.length === 0 ? (
                <p
                  style={{
                    margin: "8px 0 0",
                    color: "#92400e",
                    fontSize: "14px",
                    lineHeight: "1.4",
                  }}
                >
                  Для выбранной страны пока нет доступных городов. Можно
                  добавить новый город.
                </p>
              ) : null}
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                Район
              </label>

              <select
                value={districtGeoAreaId}
                onChange={(event) => {
                  setDistrictGeoAreaId(event.target.value);
                }}
                disabled={!cityGeoAreaId || isLoadingDistricts}
                style={{
                  width: "100%",
                  border: "1px solid #cccccc",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                  background:
                    !cityGeoAreaId || isLoadingDistricts ? "#f3f4f6" : "#ffffff",
                  color: !cityGeoAreaId ? "#9ca3af" : "#111111",
                  cursor: !cityGeoAreaId ? "not-allowed" : "default",
                }}
              >
                <option value="">
                  {!cityGeoAreaId
                    ? "Сначала выберите город"
                    : isLoadingDistricts
                      ? "Загружаю районы..."
                      : "Район не выбран"}
                </option>

                {districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {getAreaOptionLabel(district)}
                  </option>
                ))}
              </select>

              {cityGeoAreaId ? (
                <div style={{ marginTop: "10px", display: "grid", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSuggestDistrictOpen(
                        (currentValue) => !currentValue
                      );
                      setDistrictSuggestionMessage(null);
                      setDistrictSuggestionError(null);
                    }}
                    style={{
                      border: "1px solid #2563eb",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      background: "#eff6ff",
                      color: "#1e3a8a",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {isSuggestDistrictOpen
                      ? "Скрыть форму добавления района"
                      : "Не нашли район? Добавить новый район"}
                  </button>

                  {districtSuggestionMessage ? (
                    <div
                      style={{
                        border: "1px solid #bbf7d0",
                        borderRadius: "8px",
                        padding: "10px",
                        background: "#f0fdf4",
                        color: "#166534",
                        fontSize: "14px",
                        lineHeight: "1.4",
                      }}
                    >
                      {districtSuggestionMessage}
                    </div>
                  ) : null}

                  {districtSuggestionError ? (
                    <div
                      style={{
                        border: "1px solid #fecaca",
                        borderRadius: "8px",
                        padding: "10px",
                        background: "#fff1f2",
                        color: "#991b1b",
                        fontSize: "14px",
                        lineHeight: "1.4",
                      }}
                    >
                      {districtSuggestionError}
                    </div>
                  ) : null}

                  {isSuggestDistrictOpen ? (
                    <div
                      style={{
                        border: "1px solid #bfdbfe",
                        borderRadius: "10px",
                        padding: "12px",
                        background: "#f8fbff",
                        display: "grid",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          color: "#1e3a8a",
                          fontSize: "14px",
                          lineHeight: "1.4",
                        }}
                      >
                        Район будет добавлен только в город:{" "}
                        <strong>{selectedCity?.name ?? "город не выбран"}</strong>.
                      </div>

                      <div>
                        <label
                          style={{
                            display: "block",
                            fontWeight: 700,
                            marginBottom: "6px",
                          }}
                        >
                          Название района
                        </label>

                        <input
                          type="text"
                          value={suggestedDistrictName}
                          onChange={(event) =>
                            setSuggestedDistrictName(event.target.value)
                          }
                          placeholder="Например: Centrum, Mitte, Ruzafa"
                          style={{
                            width: "100%",
                            border: "1px solid #cccccc",
                            borderRadius: "8px",
                            padding: "10px",
                            fontSize: "15px",
                            boxSizing: "border-box",
                            background: "#ffffff",
                          }}
                        />
                      </div>

                      <div>
                        <label
                          style={{
                            display: "block",
                            fontWeight: 700,
                            marginBottom: "6px",
                          }}
                        >
                          Комментарий для проверки
                        </label>

                        <textarea
                          value={suggestedDistrictNotes}
                          onChange={(event) =>
                            setSuggestedDistrictNotes(event.target.value)
                          }
                          placeholder="Можно указать, почему нужно добавить этот район."
                          style={{
                            width: "100%",
                            minHeight: "72px",
                            border: "1px solid #cccccc",
                            borderRadius: "8px",
                            padding: "10px",
                            fontSize: "15px",
                            boxSizing: "border-box",
                            resize: "vertical",
                            background: "#ffffff",
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        disabled={
                          isSubmittingDistrictSuggestion ||
                          !selectedCountryCode ||
                          !cityGeoAreaId ||
                          suggestedDistrictName.trim().length < 2
                        }
                        onClick={() => {
                          handleSuggestDistrict();
                        }}
                        style={{
                          border: "none",
                          borderRadius: "8px",
                          padding: "11px 14px",
                          background:
                            isSubmittingDistrictSuggestion ||
                            !selectedCountryCode ||
                            !cityGeoAreaId ||
                            suggestedDistrictName.trim().length < 2
                              ? "#9ca3af"
                              : "#2563eb",
                          color: "#ffffff",
                          fontWeight: 800,
                          cursor:
                            isSubmittingDistrictSuggestion ||
                            !selectedCountryCode ||
                            !cityGeoAreaId ||
                            suggestedDistrictName.trim().length < 2
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        {isSubmittingDistrictSuggestion
                          ? "Добавляю..."
                          : "Добавить район"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {cityGeoAreaId && !isLoadingDistricts && districts.length === 0 ? (
                <p
                  style={{
                    margin: "8px 0 0",
                    color: "#92400e",
                    fontSize: "14px",
                    lineHeight: "1.4",
                  }}
                >
                  Для выбранного города пока нет доступных районов. Можно
                  добавить новый район.
                </p>
              ) : null}
            </div>
          </section>

          <div>
            <label
              style={{
                display: "block",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Описание
            </label>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Кратко опиши организацию"
              style={{
                width: "100%",
                minHeight: "112px",
                border: "1px solid #cccccc",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "16px",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || organizationName.trim().length === 0}
            style={{
              width: "100%",
              border: "none",
              borderRadius: "8px",
              padding: "14px 18px",
              background:
                isLoading || organizationName.trim().length === 0
                  ? "#9ca3af"
                  : "#111827",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 700,
              cursor:
                isLoading || organizationName.trim().length === 0
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {isLoading ? "Создаю..." : "Создать организацию"}
          </button>
        </form>

        <div
          style={{
            marginTop: "16px",
            border: "1px solid #bfdbfe",
            borderRadius: "10px",
            padding: "14px",
            background: "#eff6ff",
          }}
        >
          <p style={{ fontWeight: 700, margin: "0 0 6px" }}>Debug:</p>
          <p style={{ margin: 0 }}>{debugMessage}</p>
          <p
            style={{
              margin: "8px 0 0",
              color: "#1e3a8a",
              fontSize: "14px",
              lineHeight: "1.4",
            }}
          >
            Выбрано: страна{" "}
            <strong>{selectedCountry?.name ?? "не выбрана"}</strong>, город{" "}
            <strong>{selectedCity?.name ?? "не выбран"}</strong>, район{" "}
            <strong>{selectedDistrict?.name ?? "не выбран"}</strong>.
          </p>
        </div>

        {result && (
          <div
            style={{
              marginTop: "24px",
              border: "1px solid #fde68a",
              borderRadius: "10px",
              padding: "16px",
              background: "#fffbeb",
            }}
          >
            <p style={{ fontWeight: 700, margin: "0 0 10px" }}>Результат:</p>

            {result.ok ? (
              <div style={{ display: "grid", gap: "8px" }}>
                <p style={{ margin: 0 }}>Организация создана успешно.</p>

                <p style={{ margin: 0 }}>
                  <strong>Organization:</strong>{" "}
                  {result.organization?.organization_name}
                </p>

                <p style={{ margin: 0 }}>
                  <strong>Actor:</strong>{" "}
                  {result.organizationActor?.display_name} (
                  {result.organizationActor?.actor_type})
                </p>

                <p style={{ margin: 0 }}>
                  <strong>Space:</strong> {result.businessSpace?.title}
                </p>

                <div style={{ paddingTop: "8px" }}>
                  <Link
                    href="/organizations"
                    style={{
                      color: "#2563eb",
                      textDecoration: "underline",
                    }}
                  >
                    Перейти к списку организаций
                  </Link>
                </div>
              </div>
            ) : (
              <p style={{ color: "#dc2626", margin: 0 }}>
                {result.error || "Unknown error"}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}