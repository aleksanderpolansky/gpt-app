"use client";

import { useMemo, useState } from "react";

type DirectoryFilterCity = {
  city: string;
  countryCode: string;
  label: string;
};

type DirectoryFilterDistrict = {
  city: string;
  district: string;
  countryCode: string;
  label: string;
};

type DirectoryFilterCountry = {
  countryCode: string;
  label: string;
};

type DirectoryLocationFilterFieldsProps = {
  cities: DirectoryFilterCity[];
  districts: DirectoryFilterDistrict[];
  countries: DirectoryFilterCountry[];
  selectedCity: string;
  selectedDistrict: string;
  selectedCountryCode: string;
};

const fieldStyle = {
  border: "1px solid #cccccc",
  borderRadius: "8px",
  padding: "11px 12px",
  fontSize: "15px",
  fontWeight: 400,
  background: "#ffffff",
};

export default function DirectoryLocationFilterFields({
  cities,
  districts,
  countries,
  selectedCity,
  selectedDistrict,
  selectedCountryCode,
}: DirectoryLocationFilterFieldsProps) {
  const [city, setCity] = useState(selectedCity);
  const [district, setDistrict] = useState(selectedDistrict);
  const [countryCode, setCountryCode] = useState(selectedCountryCode);

  const visibleCities = useMemo(() => {
    if (!countryCode) {
      return cities;
    }

    return cities.filter((cityOption) => cityOption.countryCode === countryCode);
  }, [cities, countryCode]);

  const visibleDistricts = useMemo(() => {
    if (!city) {
      return [];
    }

    return districts.filter((districtOption) => {
      if (districtOption.city !== city) {
        return false;
      }

      if (countryCode && districtOption.countryCode !== countryCode) {
        return false;
      }

      return true;
    });
  }, [districts, city, countryCode]);

  const isDistrictSelectDisabled = !city;

  return (
    <>
      <label style={{ display: "grid", gap: "7px", fontWeight: 700 }}>
        Город
        <select
          name="city"
          value={city}
          onChange={(event) => {
            setCity(event.target.value);
            setDistrict("");
          }}
          style={fieldStyle}
        >
          <option value="">Все города</option>

          {city &&
          !visibleCities.some((cityOption) => cityOption.city === city) ? (
            <option value={city}>{city} / временный URL-фильтр</option>
          ) : null}

          {visibleCities.map((cityOption) => (
            <option
              key={`${cityOption.countryCode}-${cityOption.city}`}
              value={cityOption.city}
            >
              {cityOption.label}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "grid", gap: "7px", fontWeight: 700 }}>
        Район
        <select
          name="district"
          value={district}
          disabled={isDistrictSelectDisabled}
          onChange={(event) => {
            setDistrict(event.target.value);
          }}
          style={{
            ...fieldStyle,
            background: isDistrictSelectDisabled ? "#f3f4f6" : "#ffffff",
            color: isDistrictSelectDisabled ? "#9ca3af" : "#111111",
            cursor: isDistrictSelectDisabled ? "not-allowed" : "default",
          }}
        >
          <option value="">
            {isDistrictSelectDisabled ? "Сначала выберите город" : "Все районы"}
          </option>

          {!isDistrictSelectDisabled &&
          district &&
          !visibleDistricts.some(
            (districtOption) => districtOption.district === district
          ) ? (
            <option value={district}>{district} / временный URL-фильтр</option>
          ) : null}

          {!isDistrictSelectDisabled
            ? visibleDistricts.map((districtOption) => (
                <option
                  key={`${districtOption.countryCode}-${districtOption.city}-${districtOption.district}`}
                  value={districtOption.district}
                >
                  {districtOption.label}
                </option>
              ))
            : null}
        </select>
      </label>

      <label style={{ display: "grid", gap: "7px", fontWeight: 700 }}>
        Страна
        <select
          name="countryCode"
          value={countryCode}
          onChange={(event) => {
            const nextCountryCode = event.target.value;

            setCountryCode(nextCountryCode);
            setDistrict("");

            if (
              nextCountryCode &&
              city &&
              !cities.some(
                (cityOption) =>
                  cityOption.city === city &&
                  cityOption.countryCode === nextCountryCode
              )
            ) {
              setCity("");
            }
          }}
          style={fieldStyle}
        >
          <option value="">Все страны</option>

          {countryCode &&
          !countries.some(
            (countryOption) => countryOption.countryCode === countryCode
          ) ? (
            <option value={countryCode}>
              {countryCode} / временный URL-фильтр
            </option>
          ) : null}

          {countries.map((countryOption) => (
            <option
              key={countryOption.countryCode}
              value={countryOption.countryCode}
            >
              {countryOption.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}