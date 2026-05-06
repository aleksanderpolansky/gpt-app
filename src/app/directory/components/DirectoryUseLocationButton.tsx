"use client";

import { useState } from "react";

type GeolocationStatus = "idle" | "loading" | "success" | "error";

type DirectoryUseLocationButtonProps = {
  currentSearchParams: {
    q: string;
    category: string;
    city: string;
    district: string;
    countryCode: string;
    action: string;
  };
};

function buildDirectoryUrlWithLocation(
  currentSearchParams: DirectoryUseLocationButtonProps["currentSearchParams"],
  latitude: number,
  longitude: number
) {
  const searchParams = new URLSearchParams();

  if (currentSearchParams.q) {
    searchParams.set("q", currentSearchParams.q);
  }

  if (currentSearchParams.category) {
    searchParams.set("category", currentSearchParams.category);
  }

  if (currentSearchParams.city) {
    searchParams.set("city", currentSearchParams.city);
  }

  if (currentSearchParams.district) {
    searchParams.set("district", currentSearchParams.district);
  }

  if (currentSearchParams.countryCode) {
    searchParams.set("countryCode", currentSearchParams.countryCode);
  }

  if (currentSearchParams.action && currentSearchParams.action !== "all") {
    searchParams.set("action", currentSearchParams.action);
  }

  searchParams.set("sort", "distance");
  searchParams.set("userLat", latitude.toFixed(6));
  searchParams.set("userLng", longitude.toFixed(6));

  return `/directory?${searchParams.toString()}`;
}

export default function DirectoryUseLocationButton({
  currentSearchParams,
}: DirectoryUseLocationButtonProps) {
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleUseLocation() {
    setErrorMessage(null);

    if (!("geolocation" in navigator)) {
      setStatus("error");
      setErrorMessage(
        "Ваш браузер не поддерживает определение местоположения."
      );
      return;
    }

    setStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const url = buildDirectoryUrlWithLocation(
          currentSearchParams,
          position.coords.latitude,
          position.coords.longitude
        );

        setStatus("success");
        window.location.href = url;
      },
      (error) => {
        setStatus("error");

        if (error.code === error.PERMISSION_DENIED) {
          setErrorMessage(
            "Местоположение не было разрешено. Можно ввести координаты вручную."
          );
          return;
        }

        if (error.code === error.POSITION_UNAVAILABLE) {
          setErrorMessage(
            "Браузер не смог определить местоположение. Можно ввести координаты вручную."
          );
          return;
        }

        if (error.code === error.TIMEOUT) {
          setErrorMessage(
            "Определение местоположения заняло слишком много времени. Попробуйте ещё раз или введите координаты вручную."
          );
          return;
        }

        setErrorMessage(
          "Не удалось определить местоположение. Можно ввести координаты вручную."
        );
      },
      {
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 300000,
      }
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: "8px",
      }}
    >
      <button
        type="button"
        onClick={handleUseLocation}
        disabled={status === "loading"}
        style={{
          border: "1px solid #0f766e",
          borderRadius: "8px",
          padding: "11px 14px",
          background: status === "loading" ? "#99f6e4" : "#0f766e",
          color: "#ffffff",
          fontWeight: 800,
          cursor: status === "loading" ? "wait" : "pointer",
        }}
      >
        {status === "loading"
          ? "Определяем местоположение..."
          : "Использовать моё местоположение"}
      </button>

      <div
        style={{
          color: "#555555",
          fontSize: "13px",
          lineHeight: "1.4",
        }}
      >
        Координаты запрашиваются только после нажатия кнопки. Автоматического
        сбора местоположения при открытии страницы нет.
      </div>

      {errorMessage ? (
        <div
          style={{
            border: "1px solid #fecaca",
            borderRadius: "8px",
            padding: "10px",
            background: "#fff1f2",
            color: "#991b1b",
            fontSize: "13px",
            lineHeight: "1.4",
          }}
        >
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}