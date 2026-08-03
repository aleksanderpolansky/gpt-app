import { Navigation } from "lucide-react";

type LocationMapLocale = "en" | "pl" | "uk" | "ru" | "de" | "es" | "cs";

export type OrganizationLocationMapPreviewLocation = {
  streetAddress?: string | null;
  city?: string | null;
  district?: string | null;
  countryCode?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  label?: string | null;
};

type OrganizationLocationMapPreviewProps = {
  readonly location: OrganizationLocationMapPreviewLocation | null;
  readonly organizationName?: string | null;
  readonly locale?: string | null;
  readonly actionLabel?: string;
  readonly distanceLabel?: string;
  readonly className?: string;
  readonly titleLabel?: string;
  readonly fallbackLabel?: string;
};

const MAP_MESSAGES: Record<
  LocationMapLocale,
  {
    title: string;
    fallback: string;
    area: string;
    point: string;
  }
> = {
  en: {
    title: "Business location map",
    fallback: "Enter address to show the map",
    area: "Service area",
    point: "Location point",
  },
  pl: {
    title: "Mapa lokalizacji firmy",
    fallback: "Wpisz adres, aby pokazac mape",
    area: "Obszar obslugi",
    point: "Punkt lokalizacji",
  },
  uk: {
    title: "\u041a\u0430\u0440\u0442\u0430 \u0440\u043e\u0437\u0442\u0430\u0448\u0443\u0432\u0430\u043d\u043d\u044f \u043f\u0456\u0434\u043f\u0440\u0438\u0454\u043c\u0441\u0442\u0432\u0430",
    fallback: "\u0412\u0432\u0435\u0434\u0456\u0442\u044c \u0430\u0434\u0440\u0435\u0441\u0443, \u0449\u043e\u0431 \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u0438 \u043a\u0430\u0440\u0442\u0443",
    area: "\u0417\u043e\u043d\u0430 \u043e\u0431\u0441\u043b\u0443\u0433\u043e\u0432\u0443\u0432\u0430\u043d\u043d\u044f",
    point: "\u0422\u043e\u0447\u043a\u0430 \u0440\u043e\u0437\u0442\u0430\u0448\u0443\u0432\u0430\u043d\u043d\u044f",
  },
  ru: {
    title: "\u041a\u0430\u0440\u0442\u0430 \u0440\u0430\u0441\u043f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u044f \u043f\u0440\u0435\u0434\u043f\u0440\u0438\u044f\u0442\u0438\u044f",
    fallback: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0430\u0434\u0440\u0435\u0441, \u0447\u0442\u043e\u0431\u044b \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u043a\u0430\u0440\u0442\u0443",
    area: "\u0417\u043e\u043d\u0430 \u043e\u0431\u0441\u043b\u0443\u0436\u0438\u0432\u0430\u043d\u0438\u044f",
    point: "\u0422\u043e\u0447\u043a\u0430 \u0440\u0430\u0441\u043f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u044f",
  },
  de: {
    title: "Karte des Unternehmensstandorts",
    fallback: "Adresse eingeben, um die Karte anzuzeigen",
    area: "Servicegebiet",
    point: "Standortpunkt",
  },
  es: {
    title: "Mapa de ubicacion de la empresa",
    fallback: "Introduce la direccion para mostrar el mapa",
    area: "Zona de servicio",
    point: "Punto de ubicacion",
  },
  cs: {
    title: "Mapa polohy podniku",
    fallback: "Zadejte adresu pro zobrazeni mapy",
    area: "Oblast obsluhy",
    point: "Bod polohy",
  },
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function normalizeLocale(locale?: string | null): LocationMapLocale {
  const normalized = (locale ?? "").trim().toLowerCase();

  if (
    normalized === "pl" ||
    normalized === "uk" ||
    normalized === "ru" ||
    normalized === "de" ||
    normalized === "es" ||
    normalized === "cs"
  ) {
    return normalized;
  }

  return "en";
}

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCoordinate(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue =
    typeof value === "number" ? value : Number(String(value).trim());

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return parsedValue;
}

function getMapQueryParts(location: OrganizationLocationMapPreviewLocation | null) {
  if (!location) {
    return [];
  }

  return [
    normalizeText(location.streetAddress),
    normalizeText(location.district),
    normalizeText(location.city),
    normalizeText(location.countryCode),
  ].filter(Boolean);
}

export function buildOrganizationLocationMapQuery(input: {
  readonly location: OrganizationLocationMapPreviewLocation | null;
  readonly organizationName?: string | null;
}) {
  const locationParts = getMapQueryParts(input.location);

  if (locationParts.length > 0) {
    return locationParts.join(", ");
  }

  const latitude = normalizeCoordinate(input.location?.latitude);
  const longitude = normalizeCoordinate(input.location?.longitude);

  if (latitude !== null && longitude !== null) {
    return `${latitude},${longitude}`;
  }

  return normalizeText(input.organizationName);
}

export function buildOrganizationLocationMapsHref(input: {
  readonly location: OrganizationLocationMapPreviewLocation | null;
  readonly organizationName?: string | null;
}) {
  const query = buildOrganizationLocationMapQuery(input);

  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : "https://www.google.com/maps";
}

function buildGoogleMapsEmbedSrc(input: {
  readonly location: OrganizationLocationMapPreviewLocation | null;
  readonly organizationName?: string | null;
}) {
  const query = buildOrganizationLocationMapQuery(input);
  const hasStreetAddress = Boolean(normalizeText(input.location?.streetAddress));
  const zoom = hasStreetAddress ? 16 : 11;

  if (query) {
    return `https://www.google.com/maps?q=${encodeURIComponent(
      query,
    )}&z=${zoom}&output=embed`;
  }

  return null;
}

export default function OrganizationLocationMapPreview({
  location,
  organizationName,
  locale,
  actionLabel,
  distanceLabel,
  className,
  titleLabel,
  fallbackLabel,
}: OrganizationLocationMapPreviewProps) {
  const mapLocale = normalizeLocale(locale);
  const messages = MAP_MESSAGES[mapLocale];
  const iframeSrc = buildGoogleMapsEmbedSrc({ location, organizationName });
  const mapsHref = buildOrganizationLocationMapsHref({
    location,
    organizationName,
  });
return (
    <div
      className={cx(
        "group relative h-full min-h-0 flex-1 basis-0 overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#dbeafe] shadow-[0_2px_8px_rgba(15,23,42,0.08)]",
        className,
      )}
    >
      {iframeSrc ? (
        <iframe
          key={iframeSrc}
          title={titleLabel ?? messages.title}
          src={iframeSrc}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#dbeafe] via-[#e0f2fe] to-[#dcfce7] px-5 text-center text-[12px] font-semibold text-[#64748b]">
          {fallbackLabel ?? messages.fallback}
        </div>
      )}
{distanceLabel ? (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-white/80 bg-white/92 px-3 py-1.5 text-[11px] font-semibold text-[#1a1d2e] shadow-sm backdrop-blur">
          {distanceLabel}
        </div>
      ) : null}

      <a
        href={mapsHref}
        target="_blank"
        rel="noreferrer"
        aria-label={actionLabel ?? titleLabel ?? messages.title}
        title={actionLabel ?? titleLabel ?? messages.title}
        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/90 bg-white/95 text-[#2563eb] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40"
      >
        <Navigation size={16} />
      </a>
    </div>
  );
}