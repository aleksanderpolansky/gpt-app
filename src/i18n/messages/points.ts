import { checkDictionaryCompleteness } from "../dictionary-completeness";
import { getMessage } from "../get-message";
import { type LocaleCode } from "../locales";

export const pointsLocaleMarkers = {
  ru: true,
  pl: true,
  en: true,
  es: true,
  uk: true,
  de: true,
  cs: true,
} as const;

export const pointsMessageKeys = [
  "en",
  "points.balance.description",
  "points.balance.eyebrow",
  "points.balance.metadataTitle",
  "points.balance.title",
  "points.page.description",
  "points.page.eyebrow",
  "points.page.metadataDescription",
  "points.page.metadataTitle",
  "points.page.title",
  "points.transactions.backToDashboard",
  "points.transactions.backToWorkspace",
  "points.transactions.businessPrefix",
  "points.transactions.dataSource",
  "points.transactions.dataSourceLabel",
  "points.transactions.description",
  "points.transactions.empty",
  "points.transactions.eyebrow",
  "points.transactions.kindAccrual",
  "points.transactions.kindEarned",
  "points.transactions.kindOperation",
  "points.transactions.kindRedeem",
  "points.transactions.kindSpent",
  "points.transactions.loadError",
  "points.transactions.loading",
  "points.transactions.noDate",
  "points.transactions.noDescription",
  "points.transactions.operationsLabel",
  "points.transactions.organization",
  "points.transactions.pointsUnit",
  "points.transactions.refresh",
  "points.transactions.refreshing",
  "points.transactions.title",
  "points.transactions.unavailableError",
  "points.transactions.visibleAmountLabel"
] as const;

export type PointsMessageKey =
  (typeof pointsMessageKeys)[number];

export const pointsMessages: Record<
  PointsMessageKey,
  Record<LocaleCode, string>
> = {
  "points.page.metadataTitle": {
    "ru": "POINTS | Commercial Core",
    "pl": "POINTS | Commercial Core",
    "en": "POINTS | Commercial Core",
    "es": "POINTS | Commercial Core",
    "uk": "POINTS | Commercial Core",
    "de": "POINTS | Commercial Core",
    "cs": "POINTS | Commercial Core"
  },
  "points.page.metadataDescription": {
    "ru": "Read-only points route with earned points, certificate burn rules and seller money separation.",
    "pl": "Trasa punktow tylko do odczytu: punkty naliczone, zasady spalania certyfikatow i oddzielenie pieniedzy sprzedawcy.",
    "en": "Read-only points route with earned points, certificate burn rules and seller money separation.",
    "es": "Ruta de puntos de solo lectura con puntos obtenidos, reglas de uso en certificados y separacion del dinero del vendedor.",
    "uk": "Read-only points route with earned points, certificate burn rules and seller money separation.",
    "de": "Read-only points route with earned points, certificate burn rules and seller money separation.",
    "cs": "Read-only points route with earned points, certificate burn rules and seller money separation."
  },
  "points.page.eyebrow": {
    "ru": "Commercial core / POINTS",
    "pl": "Commercial core / POINTS",
    "en": "Commercial core / POINTS",
    "es": "Commercial core / POINTS",
    "uk": "Commercial core / POINTS",
    "de": "Commercial core / POINTS",
    "cs": "Commercial core / POINTS"
  },
  "points.page.title": {
    "ru": "POINTS",
    "pl": "POINTS",
    "en": "POINTS",
    "es": "POINTS",
    "uk": "POINTS",
    "de": "POINTS",
    "cs": "POINTS"
  },
  "points.page.description": {
    "ru": "Read-only points wallet showing points earned after seller confirmation, points burned on certificates and boundaries where POINTS are not seller money.",
    "pl": "Portfel POINTS tylko do odczytu: punkty po potwierdzeniu sprzedawcy, punkty wykorzystane na certyfikaty oraz granice, gdzie POINTS nie sa pieniedzmi sprzedawcy.",
    "en": "Read-only points wallet showing points earned after seller confirmation, points burned on certificates and boundaries where POINTS are not seller money.",
    "es": "Monedero POINTS de solo lectura: puntos obtenidos tras la confirmacion del vendedor, puntos usados en certificados y limites donde POINTS no es dinero del vendedor.",
    "uk": "Read-only points wallet showing points earned after seller confirmation, points burned on certificates and boundaries where POINTS are not seller money.",
    "de": "Read-only points wallet showing points earned after seller confirmation, points burned on certificates and boundaries where POINTS are not seller money.",
    "cs": "Read-only points wallet showing points earned after seller confirmation, points burned on certificates and boundaries where POINTS are not seller money."
  },
  "points.transactions.noDate": {
    "ru": "No date",
    "pl": "Brak daty",
    "en": "No date",
    "es": "Sin fecha",
    "uk": "No date",
    "de": "No date",
    "cs": "No date"
  },
  "points.transactions.kindRedeem": {
    "ru": "Redemption",
    "pl": "Wykorzystanie",
    "en": "Redemption",
    "es": "Uso",
    "uk": "Redemption",
    "de": "Redemption",
    "cs": "Redemption"
  },
  "points.transactions.kindAccrual": {
    "ru": "Accrual",
    "pl": "Naliczenie",
    "en": "Accrual",
    "es": "Asignacion",
    "uk": "Accrual",
    "de": "Accrual",
    "cs": "Accrual"
  },
  "points.transactions.kindOperation": {
    "ru": "Operation",
    "pl": "Operacja",
    "en": "Operation",
    "es": "Operacion",
    "uk": "Operation",
    "de": "Operation",
    "cs": "Operation"
  },
  "points.transactions.loadError": {
    "ru": "Could not load points history.",
    "pl": "Nie udalo sie zaladowac historii punktow.",
    "en": "Could not load points history.",
    "es": "No se pudo cargar el historial de puntos.",
    "uk": "Could not load points history.",
    "de": "Could not load points history.",
    "cs": "Could not load points history."
  },
  "points.transactions.unavailableError": {
    "ru": "Points history is temporarily unavailable.",
    "pl": "Historia punktow jest tymczasowo niedostepna.",
    "en": "Points history is temporarily unavailable.",
    "es": "El historial de puntos no esta disponible temporalmente.",
    "uk": "Points history is temporarily unavailable.",
    "de": "Points history is temporarily unavailable.",
    "cs": "Points history is temporarily unavailable."
  },
  "points.transactions.eyebrow": {
    "ru": "POINTS / Transactions",
    "pl": "POINTS / Transakcje",
    "en": "POINTS / Transactions",
    "es": "POINTS / Transacciones",
    "uk": "POINTS / Transactions",
    "de": "POINTS / Transactions",
    "cs": "POINTS / Transactions"
  },
  "points.transactions.title": {
    "ru": "Points accrual and redemption history",
    "pl": "Historia naliczania i wykorzystania punktow",
    "en": "Points accrual and redemption history",
    "es": "Historial de asignacion y uso de puntos",
    "uk": "Points accrual and redemption history",
    "de": "Points accrual and redemption history",
    "cs": "Points accrual and redemption history"
  },
  "points.transactions.description": {
    "ru": "Recent operations from points_transactions: accruals, redemptions, source of the operation, status and balance after the operation.",
    "pl": "Ostatnie operacje z points_transactions: naliczenia, wykorzystania, zrodlo operacji, status i saldo po operacji.",
    "en": "Recent operations from points_transactions: accruals, redemptions, source of the operation, status and balance after the operation.",
    "es": "Operaciones recientes de points_transactions: asignaciones, usos, origen de la operacion, estado y saldo despues de la operacion.",
    "uk": "Recent operations from points_transactions: accruals, redemptions, source of the operation, status and balance after the operation.",
    "de": "Recent operations from points_transactions: accruals, redemptions, source of the operation, status and balance after the operation.",
    "cs": "Recent operations from points_transactions: accruals, redemptions, source of the operation, status and balance after the operation."
  },
  "points.transactions.backToWorkspace": {
    "ru": "Back to workspace",
    "pl": "Wroc do panelu",
    "en": "Back to workspace",
    "es": "Volver al panel",
    "uk": "Back to workspace",
    "de": "Back to workspace",
    "cs": "Back to workspace"
  },
  "points.transactions.refresh": {
    "ru": "Refresh",
    "pl": "Odswiez",
    "en": "Refresh",
    "es": "Actualizar",
    "uk": "Refresh",
    "de": "Refresh",
    "cs": "Refresh"
  },
  "points.transactions.refreshing": {
    "ru": "Refreshing...",
    "pl": "Odswiezanie...",
    "en": "Refreshing...",
    "es": "Actualizando...",
    "uk": "Refreshing...",
    "de": "Refreshing...",
    "cs": "Refreshing..."
  },
  "points.transactions.operationsLabel": {
    "ru": "Operations",
    "pl": "Operacje",
    "en": "Operations",
    "es": "Operaciones",
    "uk": "Operations",
    "de": "Operations",
    "cs": "Operations"
  },
  "points.transactions.visibleAmountLabel": {
    "ru": "Visible amount",
    "pl": "Widoczna suma",
    "en": "Visible amount",
    "es": "Importe visible",
    "uk": "Visible amount",
    "de": "Visible amount",
    "cs": "Visible amount"
  },
  "points.transactions.dataSourceLabel": {
    "ru": "Data source",
    "pl": "Zrodlo danych",
    "en": "Data source",
    "es": "Origen de datos",
    "uk": "Data source",
    "de": "Data source",
    "cs": "Data source"
  },
  "points.transactions.loading": {
    "ru": "Loading points history...",
    "pl": "Ladowanie historii punktow...",
    "en": "Loading points history...",
    "es": "Cargando historial de puntos...",
    "uk": "Loading points history...",
    "de": "Loading points history...",
    "cs": "Loading points history..."
  },
  "points.transactions.empty": {
    "ru": "There are no point accrual or redemption operations yet.",
    "pl": "Nie ma jeszcze operacji naliczenia ani wykorzystania punktow.",
    "en": "There are no point accrual or redemption operations yet.",
    "es": "Todavia no hay operaciones de asignacion o uso de puntos.",
    "uk": "There are no point accrual or redemption operations yet.",
    "de": "There are no point accrual or redemption operations yet.",
    "cs": "There are no point accrual or redemption operations yet."
  },
  "points.transactions.pointsUnit": {
    "ru": "points",
    "pl": "punktow",
    "en": "points",
    "es": "puntos",
    "uk": "points",
    "de": "points",
    "cs": "points"
  },
  "points.transactions.noDescription": {
    "ru": "Operation without description",
    "pl": "Operacja bez opisu",
    "en": "Operation without description",
    "es": "Operacion sin descripcion",
    "uk": "Operation without description",
    "de": "Operation without description",
    "cs": "Operation without description"
  },
  "points.transactions.businessPrefix": {
    "ru": "Business:",
    "pl": "Firma:",
    "en": "Business:",
    "es": "Empresa:",
    "uk": "Business:",
    "de": "Business:",
    "cs": "Business:"
  },
  "points.balance.metadataTitle": {
    "ru": "POINTS | Commercial Core",
    "pl": "POINTS | Commercial Core",
    "en": "POINTS | Commercial Core",
    "es": "POINTS | Commercial Core",
    "uk": "POINTS | Commercial Core",
    "de": "POINTS | Commercial Core",
    "cs": "POINTS | Commercial Core"
  },
  "points.balance.title": {
    "ru": "POINTS",
    "pl": "POINTS",
    "en": "POINTS",
    "es": "POINTS",
    "uk": "POINTS",
    "de": "POINTS",
    "cs": "POINTS"
  },
  "points.balance.eyebrow": {
    "ru": "Commercial core / POINTS",
    "pl": "Commercial core / POINTS",
    "en": "Commercial core / POINTS",
    "es": "Commercial core / POINTS",
    "uk": "Commercial core / POINTS",
    "de": "Commercial core / POINTS",
    "cs": "Commercial core / POINTS"
  },
  "points.balance.description": {
    "ru": "Read-only points wallet showing points earned after seller confirmation, points burned on certificates and boundaries where POINTS are not seller money.",
    "pl": "Portfel POINTS tylko do odczytu: punkty po potwierdzeniu sprzedawcy, punkty wykorzystane na certyfikaty oraz granice, gdzie POINTS nie sa pieniedzmi sprzedawcy.",
    "en": "Read-only points wallet showing points earned after seller confirmation, points burned on certificates and boundaries where POINTS are not seller money.",
    "es": "Monedero POINTS de solo lectura: puntos obtenidos tras la confirmacion del vendedor, puntos usados en certificados y limites donde POINTS no es dinero del vendedor.",
    "uk": "Read-only points wallet showing points earned after seller confirmation, points burned on certificates and boundaries where POINTS are not seller money.",
    "de": "Read-only points wallet showing points earned after seller confirmation, points burned on certificates and boundaries where POINTS are not seller money.",
    "cs": "Read-only points wallet showing points earned after seller confirmation, points burned on certificates and boundaries where POINTS are not seller money."
  },
  "points.transactions.backToDashboard": {
    "ru": "Back to workspace",
    "pl": "Wroc do panelu",
    "en": "Back to workspace",
    "es": "Volver al panel",
    "uk": "Back to workspace",
    "de": "Back to workspace",
    "cs": "Back to workspace"
  },
  "points.transactions.kindEarned": {
    "ru": "Accrual",
    "pl": "Naliczenie",
    "en": "Accrual",
    "es": "Asignacion",
    "uk": "Accrual",
    "de": "Accrual",
    "cs": "Accrual"
  },
  "points.transactions.kindSpent": {
    "ru": "Redemption",
    "pl": "Wykorzystanie",
    "en": "Redemption",
    "es": "Uso",
    "uk": "Redemption",
    "de": "Redemption",
    "cs": "Redemption"
  },
  "points.transactions.organization": {
    "ru": "Business:",
    "pl": "Firma:",
    "en": "Business:",
    "es": "Empresa:",
    "uk": "Business:",
    "de": "Business:",
    "cs": "Business:"
  },
  "points.transactions.dataSource": {
    "ru": "Data source",
    "pl": "Zrodlo danych",
    "en": "Data source",
    "es": "Origen de datos",
    "uk": "Data source",
    "de": "Data source",
    "cs": "Data source"
  },
  "en": {
    "ru": "POINTS",
    "pl": "POINTS",
    "en": "POINTS",
    "es": "POINTS",
    "uk": "POINTS",
    "de": "POINTS",
    "cs": "POINTS"
  }
};

export const pointsMessagesCompleteness =
  checkDictionaryCompleteness(
    "points",
    pointsMessages,
  );

export function getPointsText(
  key: PointsMessageKey,
  locale: unknown,
  params?: Record<string, string | number>,
): string {
  return getMessage(pointsMessages, key, locale, params);
}

export const pointsText = getPointsText;
export const getPointText = getPointsText;
