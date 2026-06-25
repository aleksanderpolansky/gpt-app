"use client";

import { useState } from "react";

import {
  getDirectoryListMessage,
  type DirectoryListMessageKey,
} from "@/i18n/messages/directory-list";
import type { LocaleCode } from "@/i18n";

type GeolocationStatus = "idle" | "loading" | "success" | "error";

type DirectoryUseLocationButtonProps = {
  locale: LocaleCode;
  currentSearchParams: {
    q?: string;
    category?: string;
    action?: string;
    sort?: string;
    city?: string;
    district?: string;
    countryCode?: string;
    userLat?: string;
    userLng?: string;
    locale?: string;
    lang?: string;
  };
};

function getMessage(locale: LocaleCode, key: DirectoryListMessageKey) {
  return getDirectoryListMessage(key, locale);
}

function buildDirectoryUrlWithLocation(
  currentSearchParams: DirectoryUseLocationButtonProps["currentSearchParams"],
  latitude: number,
  longitude: number,
) {
  const url = new URL(window.location.href);
  const searchParams = url.searchParams;

  const preservedEntries = {
    q: currentSearchParams.q,
    category: currentSearchParams.category,
    action: currentSearchParams.action,
    sort: currentSearchParams.sort,
    city: currentSearchParams.city,
    district: currentSearchParams.district,
    countryCode: currentSearchParams.countryCode,
    locale: currentSearchParams.locale,
    lang: currentSearchParams.lang,
  };

  for (const [key, value] of Object.entries(preservedEntries)) {
    if (value) {
      searchParams.set(key, value);
    } else {
      searchParams.delete(key);
    }
  }

  searchParams.set("userLat", latitude.toFixed(6));
  searchParams.set("userLng", longitude.toFixed(6));
  searchParams.set("sort", "distance");

  url.search = searchParams.toString();

  return url.toString();
}

export default function DirectoryUseLocationButton({
  currentSearchParams,
  locale,
}: DirectoryUseLocationButtonProps) {
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const t = (key: DirectoryListMessageKey) => getMessage(locale, key);

  function handleUseLocation() {
    if (typeof window === "undefined") {
      return;
    }

    if (!("geolocation" in navigator)) {
      setStatus("error");
      return;
    }

    setStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const url = buildDirectoryUrlWithLocation(
          currentSearchParams,
          position.coords.latitude,
          position.coords.longitude,
        );

        setStatus("success");
        window.location.href = url;
      },
      () => {
        setStatus("error");
      },
      {
        enableHighAccuracy: false,
        maximumAge: 300000,
        timeout: 10000,
      },
    );
  }

  const buttonLabel =
    status === "loading"
      ? t("directoryList.filters.locationLoading")
      : status === "success"
        ? t("directoryList.filters.locationSuccess")
        : status === "error"
          ? t("directoryList.filters.locationError")
          : t("directoryList.filters.useMyLocation");

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={handleUseLocation}
        disabled={status === "loading"}
        className="rounded-xl bg-[#25796f] px-4 py-3 text-[14px] font-bold text-white transition hover:bg-[#1f6a62] disabled:cursor-wait disabled:opacity-75"
      >
        {buttonLabel}
      </button>

      <p className="text-[12px] leading-5 text-[#4b5563]">
        {t("directoryList.filters.locationConsentNote")}
      </p>
    </div>
  );
}
