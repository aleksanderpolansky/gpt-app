"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";

import type { LocaleCode } from "@/i18n";

export type CertificateMapMarker = {
  readonly activityEventId: string;
  readonly title: string;
  readonly providerDisplayName: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly city: string | null;
  readonly district: string | null;
  readonly countryCode: string | null;
  readonly pointsPrice: number;
  readonly moneyRemainder: number;
  readonly providerCurrency: string;
};

type GeoPoint = {
  readonly latitude: number;
  readonly longitude: number;
};

type Scope = "nearby" | "city" | "world";

const COPY: Record<
  LocaleCode,
  {
    nearby: string;
    city: string;
    world: string;
    showNearby: string;
    locationHint: string;
    locationDenied: string;
    noCertificates: string;
    available: string;
    open: string;
    points: string;
  }
> = {
  ru: {
    nearby: "Сертификаты рядом с вами",
    city: "Сертификаты в вашем городе и рядом",
    world: "Доступные сертификаты на карте",
    showNearby: "Показать рядом",
    locationHint:
      "Точная геопозиция используется только в браузере для выбора масштаба карты и не сохраняется.",
    locationDenied:
      "Доступ к геопозиции не предоставлен — показана общая карта доступных сертификатов.",
    noCertificates: "Пока нет доступных сертификатов с публичной географией.",
    available: "Доступно",
    open: "Открыть сертификат",
    points: "пунктов",
  },
  pl: {
    nearby: "Certyfikaty w pobliżu",
    city: "Certyfikaty w Twoim mieście i okolicy",
    world: "Dostępne certyfikaty na mapie",
    showNearby: "Pokaż w pobliżu",
    locationHint:
      "Dokładna lokalizacja jest używana wyłącznie w przeglądarce do ustawienia mapy i nie jest zapisywana.",
    locationDenied:
      "Brak dostępu do lokalizacji — pokazano ogólną mapę dostępnych certyfikatów.",
    noCertificates: "Brak dostępnych certyfikatów z publiczną lokalizacją.",
    available: "Dostępne",
    open: "Otwórz certyfikat",
    points: "punktów",
  },
  en: {
    nearby: "Certificates near you",
    city: "Certificates in your city and nearby",
    world: "Available certificates on the map",
    showNearby: "Show nearby",
    locationHint:
      "Precise location is used only in your browser to choose the map scope and is not stored.",
    locationDenied:
      "Location access is not available — showing the global certificate map.",
    noCertificates: "No available certificates with public location yet.",
    available: "Available",
    open: "Open certificate",
    points: "points",
  },
  uk: {
    nearby: "Сертифікати поруч із вами",
    city: "Сертифікати у вашому місті та поруч",
    world: "Доступні сертифікати на карті",
    showNearby: "Показати поруч",
    locationHint:
      "Точна геопозиція використовується лише у браузері для вибору масштабу карти й не зберігається.",
    locationDenied:
      "Доступ до геопозиції не надано — показано загальну карту доступних сертифікатів.",
    noCertificates: "Поки немає доступних сертифікатів із публічною географією.",
    available: "Доступно",
    open: "Відкрити сертифікат",
    points: "пунктів",
  },
  de: {
    nearby: "Zertifikate in Ihrer Nähe",
    city: "Zertifikate in Ihrer Stadt und Umgebung",
    world: "Verfügbare Zertifikate auf der Karte",
    showNearby: "In der Nähe anzeigen",
    locationHint:
      "Der genaue Standort wird nur im Browser zur Kartenauswahl verwendet und nicht gespeichert.",
    locationDenied:
      "Kein Standortzugriff — die allgemeine Zertifikatskarte wird angezeigt.",
    noCertificates: "Noch keine verfügbaren Zertifikate mit öffentlichem Standort.",
    available: "Verfügbar",
    open: "Zertifikat öffnen",
    points: "Punkte",
  },
  es: {
    nearby: "Certificados cerca de ti",
    city: "Certificados en tu ciudad y alrededores",
    world: "Certificados disponibles en el mapa",
    showNearby: "Mostrar cerca",
    locationHint:
      "La ubicación precisa solo se usa en el navegador para ajustar el mapa y no se guarda.",
    locationDenied:
      "No hay acceso a la ubicación — se muestra el mapa general de certificados.",
    noCertificates: "Aún no hay certificados disponibles con ubicación pública.",
    available: "Disponible",
    open: "Abrir certificado",
    points: "puntos",
  },
  cs: {
    nearby: "Certifikáty ve vašem okolí",
    city: "Certifikáty ve vašem městě a okolí",
    world: "Dostupné certifikáty na mapě",
    showNearby: "Zobrazit poblíž",
    locationHint:
      "Přesná poloha se používá pouze v prohlížeči pro nastavení mapy a neukládá se.",
    locationDenied:
      "Poloha není dostupná — zobrazena je obecná mapa certifikátů.",
    noCertificates: "Zatím nejsou dostupné certifikáty s veřejnou polohou.",
    available: "Dostupné",
    open: "Otevřít certifikát",
    points: "bodů",
  },
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const earthRadiusKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function selectScope(
  markers: readonly CertificateMapMarker[],
  userLocation: GeoPoint | null,
): { readonly scope: Scope; readonly markers: CertificateMapMarker[] } {
  if (!userLocation) return { scope: "world", markers: [...markers] };

  const withDistance = markers.map((marker) => ({
    marker,
    distance: distanceKm(userLocation, marker),
  }));

  const nearby = withDistance.filter((row) => row.distance <= 8).map((row) => row.marker);
  if (nearby.length > 0) return { scope: "nearby", markers: nearby };

  const city = withDistance.filter((row) => row.distance <= 35).map((row) => row.marker);
  if (city.length > 0) return { scope: "city", markers: city };

  return { scope: "world", markers: [...markers] };
}

export function DashboardCertificateMap({
  markers,
  locale,
}: {
  readonly markers: readonly CertificateMapMarker[];
  readonly locale: LocaleCode;
}) {
  const ui = COPY[locale];
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [permission, setPermission] = useState<
    "unknown" | "granted" | "prompt" | "denied" | "unsupported"
  >("unknown");

  const selected = useMemo(
    () => selectScope(markers, userLocation),
    [markers, userLocation],
  );

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setPermission("unsupported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setPermission("granted");
      },
      (error) => {
        setPermission(error.code === error.PERMISSION_DENIED ? "denied" : "prompt");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function readPermission() {
      if (!("permissions" in navigator)) {
        if (!cancelled) setPermission("prompt");
        return;
      }

      try {
        const status = await navigator.permissions.query({ name: "geolocation" });
        if (cancelled) return;

        setPermission(status.state);
        if (status.state === "granted") requestLocation();
      } catch {
        if (!cancelled) setPermission("prompt");
      }
    }

    void readPermission();
    return () => {
      cancelled = true;
    };
  }, [requestLocation]);

  useEffect(() => {
    let disposed = false;

    async function renderMap() {
      if (!containerRef.current) return;
      const L = await import("leaflet");
      if (disposed || !containerRef.current) return;

      if (!mapRef.current) {
        const map = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: true,
          scrollWheelZoom: false,
        }).setView([20, 0], 2);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        mapRef.current = map;
        layerRef.current = L.layerGroup().addTo(map);
      }

      const map = mapRef.current;
      const layer = layerRef.current;
      if (!map || !layer) return;

      layer.clearLayers();
      const boundsPoints: Array<[number, number]> = [];

      for (const marker of selected.markers) {
        const giftIcon = L.divIcon({
          className: "",
          html:
            '<div style="width:34px;height:34px;border-radius:12px;background:#fff;border:2px solid #3b6ef8;box-shadow:0 4px 12px rgba(15,23,42,.18);display:flex;align-items:center;justify-content:center;font-size:18px;">🎁</div>',
          iconSize: [34, 34],
          iconAnchor: [17, 34],
          popupAnchor: [0, -32],
        });

        const href = `/certificates/${encodeURIComponent(
          marker.activityEventId,
        )}?locale=${encodeURIComponent(locale)}`;

        const money =
          marker.moneyRemainder > 0
            ? `${marker.moneyRemainder.toFixed(2)} ${escapeHtml(
                marker.providerCurrency,
              )} + `
            : "";

        const popup = `
          <div style="min-width:210px;font-family:inherit">
            <div style="font-size:13px;font-weight:700;color:#1a1d2e;margin-bottom:5px">
              ${escapeHtml(marker.title)}
            </div>
            <div style="font-size:11px;color:#7c8099;margin-bottom:8px">
              ${escapeHtml(marker.providerDisplayName)}
            </div>
            <div style="font-size:12px;font-weight:700;color:#3b6ef8;margin-bottom:9px">
              ${money}${marker.pointsPrice} ${escapeHtml(ui.points)}
            </div>
            <a href="${href}" style="font-size:11px;font-weight:700;color:#3b6ef8;text-decoration:none">
              ${escapeHtml(ui.open)} →
            </a>
          </div>
        `;

        L.marker([marker.latitude, marker.longitude], { icon: giftIcon })
          .bindPopup(popup)
          .addTo(layer);

        boundsPoints.push([marker.latitude, marker.longitude]);
      }

      if (userLocation) {
        L.circleMarker([userLocation.latitude, userLocation.longitude], {
          radius: 7,
          color: "#2563eb",
          weight: 3,
          fillColor: "#ffffff",
          fillOpacity: 1,
        }).addTo(layer);

        if (selected.scope !== "world") {
          boundsPoints.push([userLocation.latitude, userLocation.longitude]);
        }
      }

      if (boundsPoints.length === 0) {
        map.setView([20, 0], 2);
      } else if (boundsPoints.length === 1) {
        map.setView(
          boundsPoints[0],
          selected.scope === "nearby"
            ? 13
            : selected.scope === "city"
              ? 11
              : 5,
        );
      } else {
        map.fitBounds(L.latLngBounds(boundsPoints), {
          padding: [28, 28],
          maxZoom:
            selected.scope === "nearby"
              ? 14
              : selected.scope === "city"
                ? 12
                : 6,
        });
      }

      window.setTimeout(() => map.invalidateSize(), 0);
    }

    void renderMap();
    return () => {
      disposed = true;
    };
  }, [locale, selected, ui.open, ui.points, userLocation]);

  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    },
    [],
  );

  const scopeLabel =
    selected.scope === "nearby"
      ? ui.nearby
      : selected.scope === "city"
        ? ui.city
        : ui.world;

  if (markers.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed border-[#dfe3f1] bg-[#fbfcff] px-5 text-center text-[12px] font-medium text-[#7c8099]">
        {ui.noCertificates}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[12px] font-semibold text-[#1a1d2e]">
            {scopeLabel}
          </div>
          <div className="mt-0.5 text-[10px] text-[#9ca3b8]">
            {ui.available}: {selected.markers.length}
          </div>
        </div>

        {permission !== "granted" ? (
          <button
            type="button"
            onClick={requestLocation}
            className="rounded-lg border border-[#3b6ef8]/30 bg-white px-3 py-1.5 text-[11px] font-semibold text-[#3b6ef8] hover:bg-[#eef2ff]"
          >
            {ui.showNearby}
          </button>
        ) : null}
      </div>

      <div
        ref={containerRef}
        className="h-[320px] w-full overflow-hidden rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#eef2ff]"
      />

      <div className="text-[9px] leading-4 text-[#9ca3b8]">
        {permission === "denied" || permission === "unsupported"
          ? ui.locationDenied
          : ui.locationHint}
      </div>
    </div>
  );
}