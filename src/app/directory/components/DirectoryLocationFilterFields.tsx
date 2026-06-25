"use client";

import { useMemo, useState } from "react";

import {
  getDirectoryListMessage,
  type DirectoryListMessageKey,
} from "@/i18n/messages/directory-list";
import type { LocaleCode } from "@/i18n";

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
  locale: LocaleCode;
};

function getMessage(locale: LocaleCode, key: DirectoryListMessageKey) {
  return getDirectoryListMessage(key, locale);
}

export default function DirectoryLocationFilterFields({
  cities,
  districts,
  countries,
  selectedCity,
  selectedDistrict,
  selectedCountryCode,
  locale,
}: DirectoryLocationFilterFieldsProps) {
  const [city, setCity] = useState(selectedCity);
  const [district, setDistrict] = useState(selectedDistrict);
  const [countryCode, setCountryCode] = useState(selectedCountryCode);

  const t = (key: DirectoryListMessageKey) => getMessage(locale, key);

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
      <label className="grid gap-2 text-[13px] font-semibold text-[#111827]">
        {t("directoryList.filters.city")}
        <select
          name="city"
          value={city}
          onChange={(event) => {
            const nextCity = event.target.value;
            setCity(nextCity);
            setDistrict("");
          }}
          className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8]"
        >
          <option value="">{t("directoryList.filter.allCities")}</option>

          {city &&
          !visibleCities.some((cityOption) => cityOption.city === city) ? (
            <option value={city}>
              {city} / {t("directoryList.filters.temporaryUrlFilter")}
            </option>
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

      <label className="grid gap-2 text-[13px] font-semibold text-[#111827]">
        {t("directoryList.filters.district")}
        <select
          name="district"
          value={district}
          disabled={isDistrictSelectDisabled}
          onChange={(event) => setDistrict(event.target.value)}
          className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] disabled:bg-[#f3f4f6] disabled:text-[#9ca3af]"
        >
          <option value="">
            {isDistrictSelectDisabled
              ? t("directoryList.filter.selectCityFirst")
              : t("directoryList.filter.allDistricts")}
          </option>

          {district &&
          !visibleDistricts.some(
            (districtOption) => districtOption.district === district,
          ) ? (
            <option value={district}>
              {district} / {t("directoryList.filters.temporaryUrlFilter")}
            </option>
          ) : null}

          {visibleDistricts.map((districtOption) => (
            <option
              key={`${districtOption.countryCode}-${districtOption.city}-${districtOption.district}`}
              value={districtOption.district}
            >
              {districtOption.label}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2 text-[13px] font-semibold text-[#111827]">
        {t("directoryList.filters.country")}
        <select
          name="countryCode"
          value={countryCode}
          onChange={(event) => {
            const nextCountryCode = event.target.value;
            setCountryCode(nextCountryCode);

            if (
              nextCountryCode &&
              city &&
              !cities.some(
                (cityOption) =>
                  cityOption.city === city &&
                  cityOption.countryCode === nextCountryCode,
              )
            ) {
              setCity("");
              setDistrict("");
            }
          }}
          className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8]"
        >
          <option value="">{t("directoryList.filter.allCountries")}</option>

          {countryCode &&
          !countries.some(
            (countryOption) => countryOption.countryCode === countryCode,
          ) ? (
            <option value={countryCode}>
              {countryCode} / {t("directoryList.filters.temporaryUrlFilter")}
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
