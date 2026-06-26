import { checkDictionaryCompleteness } from "../dictionary-completeness";
import { getMessage } from "../get-message";
import { type LocaleCode } from "../locales";

export const purchaseConfirmationMessageKeys = [
  "purchaseConfirmations.common.points",
  "purchaseConfirmations.common.dash",
  "purchaseConfirmations.common.loading",
  "purchaseConfirmations.common.error",
  "purchaseConfirmations.common.retry",
  "purchaseConfirmations.common.refresh",
  "purchaseConfirmations.common.status",
  "purchaseConfirmations.common.amount",
  "purchaseConfirmations.common.currency",
  "purchaseConfirmations.common.buyer",
  "purchaseConfirmations.common.seller",
  "purchaseConfirmations.common.organization",
  "purchaseConfirmations.common.comment",
  "purchaseConfirmations.common.createdAt",
  "purchaseConfirmations.common.confirmedAt",
  "purchaseConfirmations.common.rejectedAt",
  "purchaseConfirmations.common.pointsAwarded",
  "purchaseConfirmations.common.auditLog",
  "purchaseConfirmations.common.back",
  "purchaseConfirmations.common.closeFilter",
  "purchaseConfirmations.status.requested",
  "purchaseConfirmations.status.confirmed",
  "purchaseConfirmations.status.rejected",
  "purchaseConfirmations.status.cancelled",
  "purchaseConfirmations.role.buyer",
  "purchaseConfirmations.role.seller",
  "purchaseConfirmations.event.created",
  "purchaseConfirmations.event.confirmed",
  "purchaseConfirmations.event.rejected",
  "purchaseConfirmations.event.correctedToConfirmed",
  "purchaseConfirmations.event.cancelled",
  "purchaseConfirmations.event.unknown",
  "purchaseConfirmations.seller.title",
  "purchaseConfirmations.seller.description",
  "purchaseConfirmations.seller.kicker",
  "purchaseConfirmations.seller.pendingCard",
  "purchaseConfirmations.seller.confirmedCard",
  "purchaseConfirmations.seller.pointsCard",
  "purchaseConfirmations.seller.filterTitle",
  "purchaseConfirmations.seller.filterDescription",
  "purchaseConfirmations.seller.allOrganizations",
  "purchaseConfirmations.seller.confirmAction",
  "purchaseConfirmations.seller.rejectAction",
  "purchaseConfirmations.seller.processing",
  "purchaseConfirmations.seller.commentPlaceholder",
  "purchaseConfirmations.seller.confirmedMessage",
  "purchaseConfirmations.seller.rejectedMessage",
  "purchaseConfirmations.seller.loadError",
  "purchaseConfirmations.seller.actionError",
  "purchaseConfirmations.seller.emptyTitle",
  "purchaseConfirmations.seller.emptyDescription",
  "purchaseConfirmations.seller.viewAudit",
  "purchaseConfirmations.buyer.title",
  "purchaseConfirmations.buyer.description",
  "purchaseConfirmations.buyer.emptyTitle",
  "purchaseConfirmations.buyer.emptyDescription",
  "purchaseConfirmations.buyer.viewAudit",
  "purchaseConfirmations.history.title",
  "purchaseConfirmations.history.description",
  "purchaseConfirmations.history.confirmedPurchases",
  "purchaseConfirmations.history.emptyTitle",
  "purchaseConfirmations.history.emptyDescription",
  "purchaseConfirmations.history.publicCode",
  "purchaseConfirmations.history.buyerMaskedName",
  "purchaseConfirmations.history.purchaseLabel",
  "purchaseConfirmations.history.purchaseDate",
  "purchaseConfirmations.history.points",
  "purchaseConfirmations.events.title",
  "purchaseConfirmations.events.description",
  "purchaseConfirmations.events.accessRole",
  "purchaseConfirmations.events.timeline",
  "purchaseConfirmations.events.emptyTitle",
  "purchaseConfirmations.events.emptyDescription",
  "purchaseConfirmations.events.backToSeller",
  "purchaseConfirmations.events.backToBuyer",
  "purchaseConfirmations.events.statusBefore",
  "purchaseConfirmations.events.statusAfter",
  "purchaseConfirmations.events.sellerComment",
  "purchaseConfirmations.shell.buyerTitle",
  "purchaseConfirmations.shell.buyerDescription",
  "purchaseConfirmations.shell.sellerTitle",
  "purchaseConfirmations.shell.sellerDescription",
  "purchaseConfirmations.shell.publicPurchasesTitle",
  "purchaseConfirmations.shell.publicPurchasesDescription"
] as const;

export type PurchaseConfirmationMessageKey =
  (typeof purchaseConfirmationMessageKeys)[number];

export const purchaseConfirmationMessages: Record<
  PurchaseConfirmationMessageKey,
  Record<LocaleCode, string>
> = {
  "purchaseConfirmations.common.points": {
    "ru": "POINTS",
    "pl": "POINTS",
    "en": "POINTS",
    "es": "POINTS",
    "uk": "POINTS",
    "de": "POINTS",
    "cs": "POINTS"
  },
  "purchaseConfirmations.common.dash": {
    "ru": "â€”",
    "pl": "â€”",
    "en": "â€”",
    "es": "â€”",
    "uk": "â€”",
    "de": "â€”",
    "cs": "â€”"
  },
  "purchaseConfirmations.common.loading": {
    "ru": "Ð—Ð°Ð³Ñ€ÑƒÐ·ÐºÐ°...",
    "pl": "Åadowanie...",
    "en": "Loading...",
    "es": "Cargando...",
    "uk": "Ð—Ð°Ð²Ð°Ð½Ñ‚Ð°Ð¶ÐµÐ½Ð½Ñ...",
    "de": "Wird geladen...",
    "cs": "NaÄÃ­tÃ¡nÃ­..."
  },
  "purchaseConfirmations.common.error": {
    "ru": "ÐžÑˆÐ¸Ð±ÐºÐ°",
    "pl": "BÅ‚Ä…d",
    "en": "Error",
    "es": "Error",
    "uk": "ÐŸÐ¾Ð¼Ð¸Ð»ÐºÐ°",
    "de": "Fehler",
    "cs": "Chyba"
  },
  "purchaseConfirmations.common.retry": {
    "ru": "ÐŸÐ¾Ð²Ñ‚Ð¾Ñ€Ð¸Ñ‚ÑŒ",
    "pl": "SprÃ³buj ponownie",
    "en": "Retry",
    "es": "Reintentar",
    "uk": "ÐŸÐ¾Ð²Ñ‚Ð¾Ñ€Ð¸Ñ‚Ð¸",
    "de": "Erneut versuchen",
    "cs": "Zkusit znovu"
  },
  "purchaseConfirmations.common.refresh": {
    "ru": "ÐžÐ±Ð½Ð¾Ð²Ð¸Ñ‚ÑŒ",
    "pl": "OdÅ›wieÅ¼",
    "en": "Refresh",
    "es": "Actualizar",
    "uk": "ÐžÐ½Ð¾Ð²Ð¸Ñ‚Ð¸",
    "de": "Aktualisieren",
    "cs": "Obnovit"
  },
  "purchaseConfirmations.common.status": {
    "ru": "Ð¡Ñ‚Ð°Ñ‚ÑƒÑ",
    "pl": "Status",
    "en": "Status",
    "es": "Estado",
    "uk": "Ð¡Ñ‚Ð°Ñ‚ÑƒÑ",
    "de": "Status",
    "cs": "Stav"
  },
  "purchaseConfirmations.common.amount": {
    "ru": "Ð¡ÑƒÐ¼Ð¼Ð° Ð¿Ð¾ÐºÑƒÐ¿ÐºÐ¸",
    "pl": "Kwota zakupu",
    "en": "Purchase amount",
    "es": "Importe de la compra",
    "uk": "Ð¡ÑƒÐ¼Ð° Ð¿Ð¾ÐºÑƒÐ¿ÐºÐ¸",
    "de": "Kaufbetrag",
    "cs": "ÄŒÃ¡stka nÃ¡kupu"
  },
  "purchaseConfirmations.common.currency": {
    "ru": "Ð’Ð°Ð»ÑŽÑ‚Ð°",
    "pl": "Waluta",
    "en": "Currency",
    "es": "Moneda",
    "uk": "Ð’Ð°Ð»ÑŽÑ‚Ð°",
    "de": "WÃ¤hrung",
    "cs": "MÄ›na"
  },
  "purchaseConfirmations.common.buyer": {
    "ru": "ÐŸÐ¾ÐºÑƒÐ¿Ð°Ñ‚ÐµÐ»ÑŒ",
    "pl": "KupujÄ…cy",
    "en": "Buyer",
    "es": "Comprador",
    "uk": "ÐŸÐ¾ÐºÑƒÐ¿ÐµÑ†ÑŒ",
    "de": "KÃ¤ufer",
    "cs": "KupujÃ­cÃ­"
  },
  "purchaseConfirmations.common.seller": {
    "ru": "ÐŸÑ€Ð¾Ð´Ð°Ð²ÐµÑ†",
    "pl": "Sprzedawca",
    "en": "Seller",
    "es": "Vendedor",
    "uk": "ÐŸÑ€Ð¾Ð´Ð°Ð²ÐµÑ†ÑŒ",
    "de": "VerkÃ¤ufer",
    "cs": "Prodejce"
  },
  "purchaseConfirmations.common.organization": {
    "ru": "ÐŸÑ€ÐµÐ´Ð¿Ñ€Ð¸ÑÑ‚Ð¸Ðµ",
    "pl": "Firma",
    "en": "Business",
    "es": "Empresa",
    "uk": "ÐŸÑ–Ð´Ð¿Ñ€Ð¸Ñ”Ð¼ÑÑ‚Ð²Ð¾",
    "de": "Unternehmen",
    "cs": "Podnik"
  },
  "purchaseConfirmations.common.comment": {
    "ru": "ÐšÐ¾Ð¼Ð¼ÐµÐ½Ñ‚Ð°Ñ€Ð¸Ð¹",
    "pl": "Komentarz",
    "en": "Comment",
    "es": "Comentario",
    "uk": "ÐšÐ¾Ð¼ÐµÐ½Ñ‚Ð°Ñ€",
    "de": "Kommentar",
    "cs": "KomentÃ¡Å™"
  },
  "purchaseConfirmations.common.createdAt": {
    "ru": "Ð¡Ð¾Ð·Ð´Ð°Ð½Ð¾",
    "pl": "Utworzono",
    "en": "Created",
    "es": "Creado",
    "uk": "Ð¡Ñ‚Ð²Ð¾Ñ€ÐµÐ½Ð¾",
    "de": "Erstellt",
    "cs": "VytvoÅ™eno"
  },
  "purchaseConfirmations.common.confirmedAt": {
    "ru": "ÐŸÐ¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð¾",
    "pl": "Potwierdzono",
    "en": "Confirmed",
    "es": "Confirmado",
    "uk": "ÐŸÑ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¶ÐµÐ½Ð¾",
    "de": "BestÃ¤tigt",
    "cs": "Potvrzeno"
  },
  "purchaseConfirmations.common.rejectedAt": {
    "ru": "ÐžÑ‚ÐºÐ»Ð¾Ð½ÐµÐ½Ð¾",
    "pl": "Odrzucono",
    "en": "Rejected",
    "es": "Rechazado",
    "uk": "Ð’Ñ–Ð´Ñ…Ð¸Ð»ÐµÐ½Ð¾",
    "de": "Abgelehnt",
    "cs": "OdmÃ­tnuto"
  },
  "purchaseConfirmations.common.pointsAwarded": {
    "ru": "ÐÐ°Ñ‡Ð¸ÑÐ»ÐµÐ½Ð¾ POINTS",
    "pl": "Przyznane POINTS",
    "en": "POINTS awarded",
    "es": "POINTS concedidos",
    "uk": "ÐÐ°Ñ€Ð°Ñ…Ð¾Ð²Ð°Ð½Ð¾ POINTS",
    "de": "Gutgeschriebene POINTS",
    "cs": "PÅ™ipsanÃ© POINTS"
  },
  "purchaseConfirmations.common.auditLog": {
    "ru": "Ð–ÑƒÑ€Ð½Ð°Ð» ÑÐ¾Ð±Ñ‹Ñ‚Ð¸Ð¹",
    "pl": "Dziennik zdarzeÅ„",
    "en": "Event log",
    "es": "Registro de eventos",
    "uk": "Ð–ÑƒÑ€Ð½Ð°Ð» Ð¿Ð¾Ð´Ñ–Ð¹",
    "de": "Ereignisprotokoll",
    "cs": "Protokol udÃ¡lostÃ­"
  },
  "purchaseConfirmations.common.back": {
    "ru": "ÐÐ°Ð·Ð°Ð´",
    "pl": "Wstecz",
    "en": "Back",
    "es": "Volver",
    "uk": "ÐÐ°Ð·Ð°Ð´",
    "de": "ZurÃ¼ck",
    "cs": "ZpÄ›t"
  },
  "purchaseConfirmations.common.closeFilter": {
    "ru": "Ð¡Ð±Ñ€Ð¾ÑÐ¸Ñ‚ÑŒ Ñ„Ð¸Ð»ÑŒÑ‚Ñ€",
    "pl": "WyczyÅ›Ä‡ filtr",
    "en": "Clear filter",
    "es": "Borrar filtro",
    "uk": "Ð¡ÐºÐ¸Ð½ÑƒÑ‚Ð¸ Ñ„Ñ–Ð»ÑŒÑ‚Ñ€",
    "de": "Filter lÃ¶schen",
    "cs": "Vymazat filtr"
  },
  "purchaseConfirmations.status.requested": {
    "ru": "ÐžÐ¶Ð¸Ð´Ð°ÐµÑ‚ Ñ€ÐµÑˆÐµÐ½Ð¸Ñ",
    "pl": "Oczekuje na decyzjÄ™",
    "en": "Awaiting decision",
    "es": "Pendiente de decisiÃ³n",
    "uk": "ÐžÑ‡Ñ–ÐºÑƒÑ” Ñ€Ñ–ÑˆÐµÐ½Ð½Ñ",
    "de": "Wartet auf Entscheidung",
    "cs": "ÄŒekÃ¡ na rozhodnutÃ­"
  },
  "purchaseConfirmations.status.confirmed": {
    "ru": "ÐŸÐ¾ÐºÑƒÐ¿ÐºÐ° Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð°",
    "pl": "Zakup potwierdzony",
    "en": "Purchase confirmed",
    "es": "Compra confirmada",
    "uk": "ÐŸÐ¾ÐºÑƒÐ¿ÐºÑƒ Ð¿Ñ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¶ÐµÐ½Ð¾",
    "de": "Kauf bestÃ¤tigt",
    "cs": "NÃ¡kup potvrzen"
  },
  "purchaseConfirmations.status.rejected": {
    "ru": "ÐŸÐ¾ÐºÑƒÐ¿ÐºÐ° Ð¾Ñ‚ÐºÐ»Ð¾Ð½ÐµÐ½Ð°",
    "pl": "Zakup odrzucony",
    "en": "Purchase rejected",
    "es": "Compra rechazada",
    "uk": "ÐŸÐ¾ÐºÑƒÐ¿ÐºÑƒ Ð²Ñ–Ð´Ñ…Ð¸Ð»ÐµÐ½Ð¾",
    "de": "Kauf abgelehnt",
    "cs": "NÃ¡kup odmÃ­tnut"
  },
  "purchaseConfirmations.status.cancelled": {
    "ru": "Ð—Ð°ÑÐ²ÐºÐ° Ð¾Ñ‚Ð¼ÐµÐ½ÐµÐ½Ð°",
    "pl": "ZgÅ‚oszenie anulowane",
    "en": "Request cancelled",
    "es": "Solicitud cancelada",
    "uk": "Ð—Ð°ÑÐ²ÐºÑƒ ÑÐºÐ°ÑÐ¾Ð²Ð°Ð½Ð¾",
    "de": "Anfrage storniert",
    "cs": "Å½Ã¡dost zruÅ¡ena"
  },
  "purchaseConfirmations.role.buyer": {
    "ru": "ÐŸÐ¾ÐºÑƒÐ¿Ð°Ñ‚ÐµÐ»ÑŒ",
    "pl": "KupujÄ…cy",
    "en": "Buyer",
    "es": "Comprador",
    "uk": "ÐŸÐ¾ÐºÑƒÐ¿ÐµÑ†ÑŒ",
    "de": "KÃ¤ufer",
    "cs": "KupujÃ­cÃ­"
  },
  "purchaseConfirmations.role.seller": {
    "ru": "ÐŸÑ€Ð¾Ð´Ð°Ð²ÐµÑ† Ð¿Ñ€ÐµÐ´Ð¿Ñ€Ð¸ÑÑ‚Ð¸Ñ",
    "pl": "Sprzedawca firmy",
    "en": "Business seller",
    "es": "Vendedor de la empresa",
    "uk": "ÐŸÑ€Ð¾Ð´Ð°Ð²ÐµÑ†ÑŒ Ð¿Ñ–Ð´Ð¿Ñ€Ð¸Ñ”Ð¼ÑÑ‚Ð²Ð°",
    "de": "UnternehmensverkÃ¤ufer",
    "cs": "Prodejce podniku"
  },
  "purchaseConfirmations.event.created": {
    "ru": "Ð—Ð°ÑÐ²ÐºÐ° ÑÐ¾Ð·Ð´Ð°Ð½Ð°",
    "pl": "ZgÅ‚oszenie utworzone",
    "en": "Request created",
    "es": "Solicitud creada",
    "uk": "Ð—Ð°ÑÐ²ÐºÑƒ ÑÑ‚Ð²Ð¾Ñ€ÐµÐ½Ð¾",
    "de": "Anfrage erstellt",
    "cs": "Å½Ã¡dost vytvoÅ™ena"
  },
  "purchaseConfirmations.event.confirmed": {
    "ru": "ÐŸÐ¾ÐºÑƒÐ¿ÐºÐ° Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð°",
    "pl": "Zakup potwierdzony",
    "en": "Purchase confirmed",
    "es": "Compra confirmada",
    "uk": "ÐŸÐ¾ÐºÑƒÐ¿ÐºÑƒ Ð¿Ñ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¶ÐµÐ½Ð¾",
    "de": "Kauf bestÃ¤tigt",
    "cs": "NÃ¡kup potvrzen"
  },
  "purchaseConfirmations.event.rejected": {
    "ru": "ÐŸÐ¾ÐºÑƒÐ¿ÐºÐ° Ð¾Ñ‚ÐºÐ»Ð¾Ð½ÐµÐ½Ð°",
    "pl": "Zakup odrzucony",
    "en": "Purchase rejected",
    "es": "Compra rechazada",
    "uk": "ÐŸÐ¾ÐºÑƒÐ¿ÐºÑƒ Ð²Ñ–Ð´Ñ…Ð¸Ð»ÐµÐ½Ð¾",
    "de": "Kauf abgelehnt",
    "cs": "NÃ¡kup odmÃ­tnut"
  },
  "purchaseConfirmations.event.correctedToConfirmed": {
    "ru": "Ð˜ÑÐ¿Ñ€Ð°Ð²Ð»ÐµÐ½Ð¸Ðµ: Ð¾Ñ‚ÐºÐ»Ð¾Ð½Ñ‘Ð½Ð½Ð°Ñ Ð·Ð°ÑÐ²ÐºÐ° Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð°",
    "pl": "Korekta: odrzucone zgÅ‚oszenie potwierdzono",
    "en": "Correction: rejected request confirmed",
    "es": "CorrecciÃ³n: solicitud rechazada confirmada",
    "uk": "Ð’Ð¸Ð¿Ñ€Ð°Ð²Ð»ÐµÐ½Ð½Ñ: Ð²Ñ–Ð´Ñ…Ð¸Ð»ÐµÐ½Ñƒ Ð·Ð°ÑÐ²ÐºÑƒ Ð¿Ñ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¶ÐµÐ½Ð¾",
    "de": "Korrektur: abgelehnte Anfrage bestÃ¤tigt",
    "cs": "Oprava: odmÃ­tnutÃ¡ Å¾Ã¡dost potvrzena"
  },
  "purchaseConfirmations.event.cancelled": {
    "ru": "Ð—Ð°ÑÐ²ÐºÐ° Ð¾Ñ‚Ð¼ÐµÐ½ÐµÐ½Ð°",
    "pl": "ZgÅ‚oszenie anulowane",
    "en": "Request cancelled",
    "es": "Solicitud cancelada",
    "uk": "Ð—Ð°ÑÐ²ÐºÑƒ ÑÐºÐ°ÑÐ¾Ð²Ð°Ð½Ð¾",
    "de": "Anfrage storniert",
    "cs": "Å½Ã¡dost zruÅ¡ena"
  },
  "purchaseConfirmations.event.unknown": {
    "ru": "Ð¡Ð¾Ð±Ñ‹Ñ‚Ð¸Ðµ",
    "pl": "Zdarzenie",
    "en": "Event",
    "es": "Evento",
    "uk": "ÐŸÐ¾Ð´Ñ–Ñ",
    "de": "Ereignis",
    "cs": "UdÃ¡lost"
  },
  "purchaseConfirmations.seller.title": {
    "ru": "ÐŸÐ¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð¸Ðµ Ð¿Ð¾ÐºÑƒÐ¿Ð¾Ðº",
    "pl": "Potwierdzanie zakupÃ³w",
    "en": "Purchase confirmations",
    "es": "Confirmaciones de compra",
    "uk": "ÐŸÑ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¶ÐµÐ½Ð½Ñ Ð¿Ð¾ÐºÑƒÐ¿Ð¾Ðº",
    "de": "KaufbestÃ¤tigungen",
    "cs": "PotvrzenÃ­ nÃ¡kupÅ¯"
  },
  "purchaseConfirmations.seller.description": {
    "ru": "Ð—Ð´ÐµÑÑŒ Ð¿Ñ€Ð¾Ð´Ð°Ð²ÐµÑ† Ð¿Ñ€Ð¾Ð²ÐµÑ€ÑÐµÑ‚ Ð·Ð°ÑÐ²ÐºÐ¸ Ð¿Ð¾ÐºÑƒÐ¿Ð°Ñ‚ÐµÐ»ÐµÐ¹ Ð¸ Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´Ð°ÐµÑ‚ Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ñ€ÐµÐ°Ð»ÑŒÐ½Ñ‹Ðµ Ð¿Ð¾ÐºÑƒÐ¿ÐºÐ¸. ÐŸÐ¾ÑÐ»Ðµ Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð¸Ñ ÑÐ¸ÑÑ‚ÐµÐ¼Ð° Ð¼Ð¾Ð¶ÐµÑ‚ Ð½Ð°Ñ‡Ð¸ÑÐ»Ð¸Ñ‚ÑŒ POINTS.",
    "pl": "Tutaj sprzedawca sprawdza zgÅ‚oszenia kupujÄ…cych i potwierdza tylko realne zakupy. Po potwierdzeniu system moÅ¼e naliczyÄ‡ POINTS.",
    "en": "Here the seller reviews buyer requests and confirms only real purchases. After confirmation the system may award POINTS.",
    "es": "AquÃ­ el vendedor revisa las solicitudes de los compradores y confirma solo compras reales. Tras la confirmaciÃ³n el sistema puede conceder POINTS.",
    "uk": "Ð¢ÑƒÑ‚ Ð¿Ñ€Ð¾Ð´Ð°Ð²ÐµÑ†ÑŒ Ð¿ÐµÑ€ÐµÐ²Ñ–Ñ€ÑÑ” Ð·Ð°ÑÐ²ÐºÐ¸ Ð¿Ð¾ÐºÑƒÐ¿Ñ†Ñ–Ð² Ñ– Ð¿Ñ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¶ÑƒÑ” Ð»Ð¸ÑˆÐµ Ñ€ÐµÐ°Ð»ÑŒÐ½Ñ– Ð¿Ð¾ÐºÑƒÐ¿ÐºÐ¸. ÐŸÑ–ÑÐ»Ñ Ð¿Ñ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¶ÐµÐ½Ð½Ñ ÑÐ¸ÑÑ‚ÐµÐ¼Ð° Ð¼Ð¾Ð¶Ðµ Ð½Ð°Ñ€Ð°Ñ…ÑƒÐ²Ð°Ñ‚Ð¸ POINTS.",
    "de": "Hier prÃ¼ft der VerkÃ¤ufer KÃ¤uferanfragen und bestÃ¤tigt nur echte KÃ¤ufe. Nach der BestÃ¤tigung kann das System POINTS gutschreiben.",
    "cs": "Zde prodejce kontroluje Å¾Ã¡dosti kupujÃ­cÃ­ch a potvrzuje jen skuteÄnÃ© nÃ¡kupy. Po potvrzenÃ­ mÅ¯Å¾e systÃ©m pÅ™ipsat POINTS."
  },
  "purchaseConfirmations.seller.kicker": {
    "ru": "ÐŸÐ°Ð½ÐµÐ»ÑŒ Ð¿Ñ€Ð¾Ð´Ð°Ð²Ñ†Ð°",
    "pl": "Panel sprzedawcy",
    "en": "Seller panel",
    "es": "Panel del vendedor",
    "uk": "ÐŸÐ°Ð½ÐµÐ»ÑŒ Ð¿Ñ€Ð¾Ð´Ð°Ð²Ñ†Ñ",
    "de": "VerkÃ¤uferbereich",
    "cs": "Panel prodejce"
  },
  "purchaseConfirmations.seller.pendingCard": {
    "ru": "ÐžÐ¶Ð¸Ð´Ð°ÑŽÑ‚ Ñ€ÐµÑˆÐµÐ½Ð¸Ñ",
    "pl": "OczekujÄ… decyzji",
    "en": "Awaiting decision",
    "es": "Pendientes de decisiÃ³n",
    "uk": "ÐžÑ‡Ñ–ÐºÑƒÑŽÑ‚ÑŒ Ñ€Ñ–ÑˆÐµÐ½Ð½Ñ",
    "de": "Warten auf Entscheidung",
    "cs": "ÄŒekajÃ­ na rozhodnutÃ­"
  },
  "purchaseConfirmations.seller.confirmedCard": {
    "ru": "ÐŸÐ¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð¾",
    "pl": "Potwierdzone",
    "en": "Confirmed",
    "es": "Confirmadas",
    "uk": "ÐŸÑ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¶ÐµÐ½Ð¾",
    "de": "BestÃ¤tigt",
    "cs": "Potvrzeno"
  },
  "purchaseConfirmations.seller.pointsCard": {
    "ru": "ÐÐ°Ñ‡Ð¸ÑÐ»ÐµÐ½Ð¾ POINTS",
    "pl": "Przyznane POINTS",
    "en": "POINTS awarded",
    "es": "POINTS concedidos",
    "uk": "ÐÐ°Ñ€Ð°Ñ…Ð¾Ð²Ð°Ð½Ð¾ POINTS",
    "de": "Gutgeschriebene POINTS",
    "cs": "PÅ™ipsanÃ© POINTS"
  },
  "purchaseConfirmations.seller.filterTitle": {
    "ru": "Ð¤Ð¸Ð»ÑŒÑ‚Ñ€ Ð¿Ð¾ Ð¿Ñ€ÐµÐ´Ð¿Ñ€Ð¸ÑÑ‚Ð¸ÑŽ",
    "pl": "Filtr wedÅ‚ug firmy",
    "en": "Filter by business",
    "es": "Filtrar por empresa",
    "uk": "Ð¤Ñ–Ð»ÑŒÑ‚Ñ€ Ð·Ð° Ð¿Ñ–Ð´Ð¿Ñ€Ð¸Ñ”Ð¼ÑÑ‚Ð²Ð¾Ð¼",
    "de": "Nach Unternehmen filtern",
    "cs": "Filtrovat podle podniku"
  },
  "purchaseConfirmations.seller.filterDescription": {
    "ru": "ÐŸÐ¾ÐºÐ°Ð·Ð°Ð½Ñ‹ Ð·Ð°ÑÐ²ÐºÐ¸ Ð²Ñ‹Ð±Ñ€Ð°Ð½Ð½Ð¾Ð³Ð¾ Ð¿Ñ€ÐµÐ´Ð¿Ñ€Ð¸ÑÑ‚Ð¸Ñ.",
    "pl": "Pokazano zgÅ‚oszenia wybranej firmy.",
    "en": "Requests for the selected business are shown.",
    "es": "Se muestran las solicitudes de la empresa seleccionada.",
    "uk": "ÐŸÐ¾ÐºÐ°Ð·Ð°Ð½Ð¾ Ð·Ð°ÑÐ²ÐºÐ¸ Ð²Ð¸Ð±Ñ€Ð°Ð½Ð¾Ð³Ð¾ Ð¿Ñ–Ð´Ð¿Ñ€Ð¸Ñ”Ð¼ÑÑ‚Ð²Ð°.",
    "de": "Anfragen des ausgewÃ¤hlten Unternehmens werden angezeigt.",
    "cs": "ZobrazujÃ­ se Å¾Ã¡dosti vybranÃ©ho podniku."
  },
  "purchaseConfirmations.seller.allOrganizations": {
    "ru": "Ð’ÑÐµ Ð¿Ñ€ÐµÐ´Ð¿Ñ€Ð¸ÑÑ‚Ð¸Ñ",
    "pl": "Wszystkie firmy",
    "en": "All businesses",
    "es": "Todas las empresas",
    "uk": "Ð£ÑÑ– Ð¿Ñ–Ð´Ð¿Ñ€Ð¸Ñ”Ð¼ÑÑ‚Ð²Ð°",
    "de": "Alle Unternehmen",
    "cs": "VÅ¡echny podniky"
  },
  "purchaseConfirmations.seller.confirmAction": {
    "ru": "ÐŸÐ¾Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¸Ñ‚ÑŒ Ð¿Ð¾ÐºÑƒÐ¿ÐºÑƒ",
    "pl": "PotwierdÅº zakup",
    "en": "Confirm purchase",
    "es": "Confirmar compra",
    "uk": "ÐŸÑ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¸Ñ‚Ð¸ Ð¿Ð¾ÐºÑƒÐ¿ÐºÑƒ",
    "de": "Kauf bestÃ¤tigen",
    "cs": "Potvrdit nÃ¡kup"
  },
  "purchaseConfirmations.seller.rejectAction": {
    "ru": "ÐžÑ‚ÐºÐ»Ð¾Ð½Ð¸Ñ‚ÑŒ Ð·Ð°ÑÐ²ÐºÑƒ",
    "pl": "OdrzuÄ‡ zgÅ‚oszenie",
    "en": "Reject request",
    "es": "Rechazar solicitud",
    "uk": "Ð’Ñ–Ð´Ñ…Ð¸Ð»Ð¸Ñ‚Ð¸ Ð·Ð°ÑÐ²ÐºÑƒ",
    "de": "Anfrage ablehnen",
    "cs": "OdmÃ­tnout Å¾Ã¡dost"
  },
  "purchaseConfirmations.seller.processing": {
    "ru": "ÐžÐ±Ñ€Ð°Ð±Ð¾Ñ‚ÐºÐ°...",
    "pl": "Przetwarzanie...",
    "en": "Processing...",
    "es": "Procesando...",
    "uk": "ÐžÐ±Ñ€Ð¾Ð±ÐºÐ°...",
    "de": "Wird verarbeitet...",
    "cs": "ZpracovÃ¡nÃ­..."
  },
  "purchaseConfirmations.seller.commentPlaceholder": {
    "ru": "ÐšÐ¾Ð¼Ð¼ÐµÐ½Ñ‚Ð°Ñ€Ð¸Ð¹ Ð¿Ñ€Ð¾Ð´Ð°Ð²Ñ†Ð°, ÐµÑÐ»Ð¸ Ð½ÑƒÐ¶ÐµÐ½",
    "pl": "Komentarz sprzedawcy, jeÅ›li potrzebny",
    "en": "Seller comment, if needed",
    "es": "Comentario del vendedor, si hace falta",
    "uk": "ÐšÐ¾Ð¼ÐµÐ½Ñ‚Ð°Ñ€ Ð¿Ñ€Ð¾Ð´Ð°Ð²Ñ†Ñ, ÑÐºÑ‰Ð¾ Ð¿Ð¾Ñ‚Ñ€Ñ–Ð±ÐµÐ½",
    "de": "VerkÃ¤uferkommentar, falls nÃ¶tig",
    "cs": "KomentÃ¡Å™ prodejce, pokud je potÅ™eba"
  },
  "purchaseConfirmations.seller.confirmedMessage": {
    "ru": "ÐŸÐ¾ÐºÑƒÐ¿ÐºÐ° Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð°. Ð•ÑÐ»Ð¸ ÑÑ‚Ð° Ð·Ð°ÑÐ²ÐºÐ° Ñ€Ð°Ð½ÐµÐµ Ð±Ñ‹Ð»Ð° Ð¾Ñ‚ÐºÐ»Ð¾Ð½ÐµÐ½Ð° Ð¿Ð¾ Ð¾ÑˆÐ¸Ð±ÐºÐµ, Ð¸ÑÐ¿Ñ€Ð°Ð²Ð»ÐµÐ½Ð¸Ðµ ÑÐ¾Ñ…Ñ€Ð°Ð½ÐµÐ½Ð¾ Ð² Ð¶ÑƒÑ€Ð½Ð°Ð»Ðµ ÑÐ¾Ð±Ñ‹Ñ‚Ð¸Ð¹.",
    "pl": "Zakup potwierdzony. JeÅ›li to zgÅ‚oszenie wczeÅ›niej odrzucono przez pomyÅ‚kÄ™, korekta zostaÅ‚a zapisana w dzienniku zdarzeÅ„.",
    "en": "Purchase confirmed. If this request was previously rejected by mistake, the correction was saved in the event log.",
    "es": "Compra confirmada. Si esta solicitud se rechazÃ³ antes por error, la correcciÃ³n se guardÃ³ en el registro de eventos.",
    "uk": "ÐŸÐ¾ÐºÑƒÐ¿ÐºÑƒ Ð¿Ñ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¶ÐµÐ½Ð¾. Ð¯ÐºÑ‰Ð¾ Ñ†ÑŽ Ð·Ð°ÑÐ²ÐºÑƒ Ñ€Ð°Ð½Ñ–ÑˆÐµ Ð¿Ð¾Ð¼Ð¸Ð»ÐºÐ¾Ð²Ð¾ Ð²Ñ–Ð´Ñ…Ð¸Ð»Ð¸Ð»Ð¸, Ð²Ð¸Ð¿Ñ€Ð°Ð²Ð»ÐµÐ½Ð½Ñ Ð·Ð±ÐµÑ€ÐµÐ¶ÐµÐ½Ð¾ Ð² Ð¶ÑƒÑ€Ð½Ð°Ð»Ñ– Ð¿Ð¾Ð´Ñ–Ð¹.",
    "de": "Kauf bestÃ¤tigt. Wenn diese Anfrage zuvor versehentlich abgelehnt wurde, wurde die Korrektur im Ereignisprotokoll gespeichert.",
    "cs": "NÃ¡kup potvrzen. Pokud byla tato Å¾Ã¡dost dÅ™Ã­ve omylem odmÃ­tnuta, oprava byla uloÅ¾ena do protokolu udÃ¡lostÃ­."
  },
  "purchaseConfirmations.seller.rejectedMessage": {
    "ru": "ÐŸÐ¾ÐºÑƒÐ¿ÐºÐ° Ð¾Ñ‚ÐºÐ»Ð¾Ð½ÐµÐ½Ð°. Ð ÐµÑˆÐµÐ½Ð¸Ðµ ÑÐ¾Ñ…Ñ€Ð°Ð½ÐµÐ½Ð¾ Ð² Ð¶ÑƒÑ€Ð½Ð°Ð»Ðµ ÑÐ¾Ð±Ñ‹Ñ‚Ð¸Ð¹.",
    "pl": "Zakup odrzucony. Decyzja zostaÅ‚a zapisana w dzienniku zdarzeÅ„.",
    "en": "Purchase rejected. The decision was saved in the event log.",
    "es": "Compra rechazada. La decisiÃ³n se guardÃ³ en el registro de eventos.",
    "uk": "ÐŸÐ¾ÐºÑƒÐ¿ÐºÑƒ Ð²Ñ–Ð´Ñ…Ð¸Ð»ÐµÐ½Ð¾. Ð Ñ–ÑˆÐµÐ½Ð½Ñ Ð·Ð±ÐµÑ€ÐµÐ¶ÐµÐ½Ð¾ Ð² Ð¶ÑƒÑ€Ð½Ð°Ð»Ñ– Ð¿Ð¾Ð´Ñ–Ð¹.",
    "de": "Kauf abgelehnt. Die Entscheidung wurde im Ereignisprotokoll gespeichert.",
    "cs": "NÃ¡kup odmÃ­tnut. RozhodnutÃ­ bylo uloÅ¾eno do protokolu udÃ¡lostÃ­."
  },
  "purchaseConfirmations.seller.loadError": {
    "ru": "ÐÐµ ÑƒÐ´Ð°Ð»Ð¾ÑÑŒ Ð·Ð°Ð³Ñ€ÑƒÐ·Ð¸Ñ‚ÑŒ Ð·Ð°ÑÐ²ÐºÐ¸ Ð½Ð° Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð¸Ðµ Ð¿Ð¾ÐºÑƒÐ¿Ð¾Ðº",
    "pl": "Nie udaÅ‚o siÄ™ zaÅ‚adowaÄ‡ zgÅ‚oszeÅ„ do potwierdzenia zakupÃ³w",
    "en": "Cannot load purchase confirmations",
    "es": "No se pueden cargar las confirmaciones de compra",
    "uk": "ÐÐµ Ð²Ð´Ð°Ð»Ð¾ÑÑ Ð·Ð°Ð²Ð°Ð½Ñ‚Ð°Ð¶Ð¸Ñ‚Ð¸ Ð·Ð°ÑÐ²ÐºÐ¸ Ð½Ð° Ð¿Ñ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¶ÐµÐ½Ð½Ñ Ð¿Ð¾ÐºÑƒÐ¿Ð¾Ðº",
    "de": "KaufbestÃ¤tigungen kÃ¶nnen nicht geladen werden",
    "cs": "Nelze naÄÃ­st potvrzenÃ­ nÃ¡kupÅ¯"
  },
  "purchaseConfirmations.seller.actionError": {
    "ru": "ÐÐµ ÑƒÐ´Ð°Ð»Ð¾ÑÑŒ Ð²Ñ‹Ð¿Ð¾Ð»Ð½Ð¸Ñ‚ÑŒ Ð´ÐµÐ¹ÑÑ‚Ð²Ð¸Ðµ Ñ Ð·Ð°ÑÐ²ÐºÐ¾Ð¹",
    "pl": "Nie udaÅ‚o siÄ™ wykonaÄ‡ dziaÅ‚ania na zgÅ‚oszeniu",
    "en": "Cannot process purchase confirmation",
    "es": "No se puede procesar la confirmaciÃ³n de compra",
    "uk": "ÐÐµ Ð²Ð´Ð°Ð»Ð¾ÑÑ Ð²Ð¸ÐºÐ¾Ð½Ð°Ñ‚Ð¸ Ð´Ñ–ÑŽ Ñ–Ð· Ð·Ð°ÑÐ²ÐºÐ¾ÑŽ",
    "de": "KaufbestÃ¤tigung kann nicht verarbeitet werden",
    "cs": "Nelze zpracovat potvrzenÃ­ nÃ¡kupu"
  },
  "purchaseConfirmations.seller.emptyTitle": {
    "ru": "Ð—Ð°ÑÐ²Ð¾Ðº Ð¿Ð¾ÐºÐ° Ð½ÐµÑ‚",
    "pl": "Nie ma jeszcze zgÅ‚oszeÅ„",
    "en": "No requests yet",
    "es": "TodavÃ­a no hay solicitudes",
    "uk": "Ð—Ð°ÑÐ²Ð¾Ðº Ð¿Ð¾ÐºÐ¸ Ð½ÐµÐ¼Ð°Ñ”",
    "de": "Noch keine Anfragen",
    "cs": "ZatÃ­m Å¾Ã¡dnÃ© Å¾Ã¡dosti"
  },
  "purchaseConfirmations.seller.emptyDescription": {
    "ru": "ÐšÐ¾Ð³Ð´Ð° Ð¿Ð¾ÐºÑƒÐ¿Ð°Ñ‚ÐµÐ»Ð¸ Ð·Ð°Ñ€ÐµÐ³Ð¸ÑÑ‚Ñ€Ð¸Ñ€ÑƒÑŽÑ‚ Ð²Ð½ÐµÑˆÐ½ÑŽÑŽ Ð¿Ð¾ÐºÑƒÐ¿ÐºÑƒ, Ð·Ð°ÑÐ²ÐºÐ¸ Ð¿Ð¾ÑÐ²ÑÑ‚ÑÑ Ð·Ð´ÐµÑÑŒ.",
    "pl": "Gdy kupujÄ…cy zarejestrujÄ… zakup zewnÄ™trzny, zgÅ‚oszenia pojawiÄ… siÄ™ tutaj.",
    "en": "When buyers register an external purchase, requests will appear here.",
    "es": "Cuando los compradores registren una compra externa, las solicitudes aparecerÃ¡n aquÃ­.",
    "uk": "ÐšÐ¾Ð»Ð¸ Ð¿Ð¾ÐºÑƒÐ¿Ñ†Ñ– Ð·Ð°Ñ€ÐµÑ”ÑÑ‚Ñ€ÑƒÑŽÑ‚ÑŒ Ð·Ð¾Ð²Ð½Ñ–ÑˆÐ½ÑŽ Ð¿Ð¾ÐºÑƒÐ¿ÐºÑƒ, Ð·Ð°ÑÐ²ÐºÐ¸ Ð·â€™ÑÐ²Ð»ÑÑ‚ÑŒÑÑ Ñ‚ÑƒÑ‚.",
    "de": "Wenn KÃ¤ufer einen externen Kauf registrieren, erscheinen die Anfragen hier.",
    "cs": "KdyÅ¾ kupujÃ­cÃ­ zaregistrujÃ­ externÃ­ nÃ¡kup, Å¾Ã¡dosti se zobrazÃ­ zde."
  },
  "purchaseConfirmations.seller.viewAudit": {
    "ru": "ÐžÑ‚ÐºÑ€Ñ‹Ñ‚ÑŒ Ð¶ÑƒÑ€Ð½Ð°Ð»",
    "pl": "OtwÃ³rz dziennik",
    "en": "Open log",
    "es": "Abrir registro",
    "uk": "Ð’Ñ–Ð´ÐºÑ€Ð¸Ñ‚Ð¸ Ð¶ÑƒÑ€Ð½Ð°Ð»",
    "de": "Protokoll Ã¶ffnen",
    "cs": "OtevÅ™Ã­t protokol"
  },
  "purchaseConfirmations.buyer.title": {
    "ru": "ÐœÐ¾Ð¸ Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð¸Ñ Ð¿Ð¾ÐºÑƒÐ¿Ð¾Ðº",
    "pl": "Moje potwierdzenia zakupÃ³w",
    "en": "My purchase confirmations",
    "es": "Mis confirmaciones de compra",
    "uk": "ÐœÐ¾Ñ— Ð¿Ñ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¶ÐµÐ½Ð½Ñ Ð¿Ð¾ÐºÑƒÐ¿Ð¾Ðº",
    "de": "Meine KaufbestÃ¤tigungen",
    "cs": "Moje potvrzenÃ­ nÃ¡kupÅ¯"
  },
  "purchaseConfirmations.buyer.description": {
    "ru": "Ð—Ð´ÐµÑÑŒ Ð¿Ð¾ÐºÐ°Ð·Ð°Ð½Ñ‹ Ð²Ð°ÑˆÐ¸ Ð·Ð°ÑÐ²ÐºÐ¸ Ð½Ð° Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð¸Ðµ Ð²Ð½ÐµÑˆÐ½Ð¸Ñ… Ð¿Ð¾ÐºÑƒÐ¿Ð¾Ðº, ÑÑ‚Ð°Ñ‚ÑƒÑ Ð¿Ñ€Ð¾Ð²ÐµÑ€ÐºÐ¸ Ð¿Ñ€Ð¾Ð´Ð°Ð²Ñ†Ð¾Ð¼ Ð¸ Ð²Ð»Ð¸ÑÐ½Ð¸Ðµ Ð½Ð° POINTS.",
    "pl": "Tutaj widaÄ‡ Twoje zgÅ‚oszenia zewnÄ™trznych zakupÃ³w, status weryfikacji przez sprzedawcÄ™ i wpÅ‚yw na POINTS.",
    "en": "Your external purchase requests, seller review status and POINTS impact are shown here.",
    "es": "AquÃ­ se muestran tus solicitudes de compras externas, el estado de revisiÃ³n del vendedor y el impacto en POINTS.",
    "uk": "Ð¢ÑƒÑ‚ Ð¿Ð¾ÐºÐ°Ð·Ð°Ð½Ð¾ Ð²Ð°ÑˆÑ– Ð·Ð°ÑÐ²ÐºÐ¸ Ð½Ð° Ð¿Ñ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¶ÐµÐ½Ð½Ñ Ð·Ð¾Ð²Ð½Ñ–ÑˆÐ½Ñ–Ñ… Ð¿Ð¾ÐºÑƒÐ¿Ð¾Ðº, ÑÑ‚Ð°Ñ‚ÑƒÑ Ð¿ÐµÑ€ÐµÐ²Ñ–Ñ€ÐºÐ¸ Ð¿Ñ€Ð¾Ð´Ð°Ð²Ñ†ÐµÐ¼ Ñ– Ð²Ð¿Ð»Ð¸Ð² Ð½Ð° POINTS.",
    "de": "Hier werden Ihre externen Kaufanfragen, der PrÃ¼fstatus des VerkÃ¤ufers und die Auswirkungen auf POINTS angezeigt.",
    "cs": "Zde se zobrazujÃ­ vaÅ¡e Å¾Ã¡dosti o potvrzenÃ­ externÃ­ch nÃ¡kupÅ¯, stav kontroly prodejcem a dopad na POINTS."
  },
  "purchaseConfirmations.buyer.emptyTitle": {
    "ru": "ÐŸÐ¾ÐºÑƒÐ¿ÐºÐ¸ Ð¿Ð¾ÐºÐ° Ð½Ðµ Ð·Ð°Ñ€ÐµÐ³Ð¸ÑÑ‚Ñ€Ð¸Ñ€Ð¾Ð²Ð°Ð½Ñ‹",
    "pl": "Nie zarejestrowano jeszcze zakupÃ³w",
    "en": "No purchases registered yet",
    "es": "AÃºn no hay compras registradas",
    "uk": "ÐŸÐ¾ÐºÑƒÐ¿ÐºÐ¸ Ñ‰Ðµ Ð½Ðµ Ð·Ð°Ñ€ÐµÑ”ÑÑ‚Ñ€Ð¾Ð²Ð°Ð½Ð¾",
    "de": "Noch keine KÃ¤ufe registriert",
    "cs": "ZatÃ­m nejsou registrovÃ¡ny Å¾Ã¡dnÃ© nÃ¡kupy"
  },
  "purchaseConfirmations.buyer.emptyDescription": {
    "ru": "ÐžÑ‚ÐºÑ€Ð¾Ð¹Ñ‚Ðµ Ð¿ÑƒÐ±Ð»Ð¸Ñ‡Ð½ÑƒÑŽ ÐºÐ°Ñ€Ñ‚Ð¾Ñ‡ÐºÑƒ Ð¿Ñ€ÐµÐ´Ð¿Ñ€Ð¸ÑÑ‚Ð¸Ñ Ð¸ Ð·Ð°Ñ€ÐµÐ³Ð¸ÑÑ‚Ñ€Ð¸Ñ€ÑƒÐ¹Ñ‚Ðµ Ð¿Ð¾ÐºÑƒÐ¿ÐºÑƒ, ÐµÑÐ»Ð¸ flow Ð´Ð¾ÑÑ‚ÑƒÐ¿ÐµÐ½.",
    "pl": "OtwÃ³rz publicznÄ… kartÄ™ firmy i zarejestruj zakup, jeÅ›li ten flow jest dostÄ™pny.",
    "en": "Open a public business card and register a purchase if the flow is available.",
    "es": "Abre la ficha pÃºblica de una empresa y registra una compra si el flujo estÃ¡ disponible.",
    "uk": "Ð’Ñ–Ð´ÐºÑ€Ð¸Ð¹Ñ‚Ðµ Ð¿ÑƒÐ±Ð»Ñ–Ñ‡Ð½Ñƒ ÐºÐ°Ñ€Ñ‚ÐºÑƒ Ð¿Ñ–Ð´Ð¿Ñ€Ð¸Ñ”Ð¼ÑÑ‚Ð²Ð° Ð¹ Ð·Ð°Ñ€ÐµÑ”ÑÑ‚Ñ€ÑƒÐ¹Ñ‚Ðµ Ð¿Ð¾ÐºÑƒÐ¿ÐºÑƒ, ÑÐºÑ‰Ð¾ flow Ð´Ð¾ÑÑ‚ÑƒÐ¿Ð½Ð¸Ð¹.",
    "de": "Ã–ffnen Sie eine Ã¶ffentliche Unternehmenskarte und registrieren Sie einen Kauf, wenn der Ablauf verfÃ¼gbar ist.",
    "cs": "OtevÅ™ete veÅ™ejnou kartu podniku a zaregistrujte nÃ¡kup, pokud je tento flow dostupnÃ½."
  },
  "purchaseConfirmations.buyer.viewAudit": {
    "ru": "Ð˜ÑÑ‚Ð¾Ñ€Ð¸Ñ Ð·Ð°ÑÐ²ÐºÐ¸",
    "pl": "Historia zgÅ‚oszenia",
    "en": "Request history",
    "es": "Historial de la solicitud",
    "uk": "Ð†ÑÑ‚Ð¾Ñ€Ñ–Ñ Ð·Ð°ÑÐ²ÐºÐ¸",
    "de": "Anfrageverlauf",
    "cs": "Historie Å¾Ã¡dosti"
  },
  "purchaseConfirmations.history.title": {
    "ru": "ÐŸÑƒÐ±Ð»Ð¸Ñ‡Ð½Ð°Ñ Ð¸ÑÑ‚Ð¾Ñ€Ð¸Ñ Ð¿Ð¾ÐºÑƒÐ¿Ð¾Ðº",
    "pl": "Publiczna historia zakupÃ³w",
    "en": "Public purchase history",
    "es": "Historial pÃºblico de compras",
    "uk": "ÐŸÑƒÐ±Ð»Ñ–Ñ‡Ð½Ð° Ñ–ÑÑ‚Ð¾Ñ€Ñ–Ñ Ð¿Ð¾ÐºÑƒÐ¿Ð¾Ðº",
    "de": "Ã–ffentliche Kaufhistorie",
    "cs": "VeÅ™ejnÃ¡ historie nÃ¡kupÅ¯"
  },
  "purchaseConfirmations.history.description": {
    "ru": "ÐŸÐ¾ÐºÐ°Ð·Ñ‹Ð²Ð°ÑŽÑ‚ÑÑ Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´Ñ‘Ð½Ð½Ñ‹Ðµ Ð¿Ð¾ÐºÑƒÐ¿ÐºÐ¸ Ñ Ð¼Ð°ÑÐºÐ¸Ñ€Ð¾Ð²Ð°Ð½Ð½Ñ‹Ð¼Ð¸ Ð¸Ð¼ÐµÐ½Ð°Ð¼Ð¸ Ð¿Ð¾ÐºÑƒÐ¿Ð°Ñ‚ÐµÐ»ÐµÐ¹ Ð¸ Ð¾Ñ‚ÐºÑ€Ñ‹Ñ‚Ñ‹Ð¼Ð¸ Ð½Ð°Ð·Ð²Ð°Ð½Ð¸ÑÐ¼Ð¸ Ð¿Ñ€ÐµÐ´Ð¿Ñ€Ð¸ÑÑ‚Ð¸Ð¹.",
    "pl": "Widoczne sÄ… potwierdzone zakupy z zamaskowanymi nazwami kupujÄ…cych i publicznymi nazwami firm.",
    "en": "Confirmed purchases are shown with masked buyer names and public business names.",
    "es": "Se muestran compras confirmadas con nombres de compradores enmascarados y nombres pÃºblicos de empresas.",
    "uk": "ÐŸÐ¾ÐºÐ°Ð·Ð°Ð½Ð¾ Ð¿Ñ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¶ÐµÐ½Ñ– Ð¿Ð¾ÐºÑƒÐ¿ÐºÐ¸ Ð· Ð¼Ð°ÑÐºÐ¾Ð²Ð°Ð½Ð¸Ð¼Ð¸ Ñ–Ð¼ÐµÐ½Ð°Ð¼Ð¸ Ð¿Ð¾ÐºÑƒÐ¿Ñ†Ñ–Ð² Ñ– Ð²Ñ–Ð´ÐºÑ€Ð¸Ñ‚Ð¸Ð¼Ð¸ Ð½Ð°Ð·Ð²Ð°Ð¼Ð¸ Ð¿Ñ–Ð´Ð¿Ñ€Ð¸Ñ”Ð¼ÑÑ‚Ð².",
    "de": "BestÃ¤tigte KÃ¤ufe werden mit maskierten KÃ¤ufernamen und Ã¶ffentlichen Unternehmensnamen angezeigt.",
    "cs": "PotvrzenÃ© nÃ¡kupy se zobrazujÃ­ s maskovanÃ½mi jmÃ©ny kupujÃ­cÃ­ch a veÅ™ejnÃ½mi nÃ¡zvy podnikÅ¯."
  },
  "purchaseConfirmations.history.confirmedPurchases": {
    "ru": "ÐŸÐ¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´Ñ‘Ð½Ð½Ñ‹Ðµ Ð¿Ð¾ÐºÑƒÐ¿ÐºÐ¸",
    "pl": "Potwierdzone zakupy",
    "en": "Confirmed purchases",
    "es": "Compras confirmadas",
    "uk": "ÐŸÑ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¶ÐµÐ½Ñ– Ð¿Ð¾ÐºÑƒÐ¿ÐºÐ¸",
    "de": "BestÃ¤tigte KÃ¤ufe",
    "cs": "PotvrzenÃ© nÃ¡kupy"
  },
  "purchaseConfirmations.history.emptyTitle": {
    "ru": "ÐŸÐ¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´Ñ‘Ð½Ð½Ñ‹Ñ… Ð¿Ð¾ÐºÑƒÐ¿Ð¾Ðº Ð¿Ð¾ÐºÐ° Ð½ÐµÑ‚",
    "pl": "Nie ma jeszcze potwierdzonych zakupÃ³w",
    "en": "No confirmed purchases yet",
    "es": "AÃºn no hay compras confirmadas",
    "uk": "ÐŸÑ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¶ÐµÐ½Ð¸Ñ… Ð¿Ð¾ÐºÑƒÐ¿Ð¾Ðº Ð¿Ð¾ÐºÐ¸ Ð½ÐµÐ¼Ð°Ñ”",
    "de": "Noch keine bestÃ¤tigten KÃ¤ufe",
    "cs": "ZatÃ­m Å¾Ã¡dnÃ© potvrzenÃ© nÃ¡kupy"
  },
  "purchaseConfirmations.history.emptyDescription": {
    "ru": "ÐŸÐ¾ÑÐ»Ðµ Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð¸Ñ Ð¿Ñ€Ð¾Ð´Ð°Ð²Ñ†Ð¾Ð¼ Ð¿Ð¾ÐºÑƒÐ¿ÐºÐ¸ Ð¿Ð¾ÑÐ²ÑÑ‚ÑÑ Ð² Ð¿ÑƒÐ±Ð»Ð¸Ñ‡Ð½Ð¾Ð¹ Ð¸ÑÑ‚Ð¾Ñ€Ð¸Ð¸.",
    "pl": "Po potwierdzeniu przez sprzedawcÄ™ zakupy pojawiÄ… siÄ™ w publicznej historii.",
    "en": "After seller confirmation, purchases will appear in the public history.",
    "es": "Tras la confirmaciÃ³n del vendedor, las compras aparecerÃ¡n en el historial pÃºblico.",
    "uk": "ÐŸÑ–ÑÐ»Ñ Ð¿Ñ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¶ÐµÐ½Ð½Ñ Ð¿Ñ€Ð¾Ð´Ð°Ð²Ñ†ÐµÐ¼ Ð¿Ð¾ÐºÑƒÐ¿ÐºÐ¸ Ð·â€™ÑÐ²Ð»ÑÑ‚ÑŒÑÑ Ð² Ð¿ÑƒÐ±Ð»Ñ–Ñ‡Ð½Ñ–Ð¹ Ñ–ÑÑ‚Ð¾Ñ€Ñ–Ñ—.",
    "de": "Nach der BestÃ¤tigung durch den VerkÃ¤ufer erscheinen KÃ¤ufe in der Ã¶ffentlichen Historie.",
    "cs": "Po potvrzenÃ­ prodejcem se nÃ¡kupy zobrazÃ­ ve veÅ™ejnÃ© historii."
  },
  "purchaseConfirmations.history.publicCode": {
    "ru": "ÐŸÑƒÐ±Ð»Ð¸Ñ‡Ð½Ñ‹Ð¹ ÐºÐ¾Ð´",
    "pl": "Kod publiczny",
    "en": "Public code",
    "es": "CÃ³digo pÃºblico",
    "uk": "ÐŸÑƒÐ±Ð»Ñ–Ñ‡Ð½Ð¸Ð¹ ÐºÐ¾Ð´",
    "de": "Ã–ffentlicher Code",
    "cs": "VeÅ™ejnÃ½ kÃ³d"
  },
  "purchaseConfirmations.history.buyerMaskedName": {
    "ru": "ÐŸÐ¾ÐºÑƒÐ¿Ð°Ñ‚ÐµÐ»ÑŒ",
    "pl": "KupujÄ…cy",
    "en": "Buyer",
    "es": "Comprador",
    "uk": "ÐŸÐ¾ÐºÑƒÐ¿ÐµÑ†ÑŒ",
    "de": "KÃ¤ufer",
    "cs": "KupujÃ­cÃ­"
  },
  "purchaseConfirmations.history.purchaseLabel": {
    "ru": "ÐŸÐ¾ÐºÑƒÐ¿ÐºÐ°",
    "pl": "Zakup",
    "en": "Purchase",
    "es": "Compra",
    "uk": "ÐŸÐ¾ÐºÑƒÐ¿ÐºÐ°",
    "de": "Kauf",
    "cs": "NÃ¡kup"
  },
  "purchaseConfirmations.history.purchaseDate": {
    "ru": "Ð”Ð°Ñ‚Ð° Ð¿Ð¾ÐºÑƒÐ¿ÐºÐ¸",
    "pl": "Data zakupu",
    "en": "Purchase date",
    "es": "Fecha de compra",
    "uk": "Ð”Ð°Ñ‚Ð° Ð¿Ð¾ÐºÑƒÐ¿ÐºÐ¸",
    "de": "Kaufdatum",
    "cs": "Datum nÃ¡kupu"
  },
  "purchaseConfirmations.history.points": {
    "ru": "POINTS",
    "pl": "POINTS",
    "en": "POINTS",
    "es": "POINTS",
    "uk": "POINTS",
    "de": "POINTS",
    "cs": "POINTS"
  },
  "purchaseConfirmations.events.title": {
    "ru": "Ð˜ÑÑ‚Ð¾Ñ€Ð¸Ñ Ð·Ð°ÑÐ²ÐºÐ¸ Ð½Ð° Ð¿Ð¾ÐºÑƒÐ¿ÐºÑƒ",
    "pl": "Historia zgÅ‚oszenia zakupu",
    "en": "Purchase request history",
    "es": "Historial de la solicitud de compra",
    "uk": "Ð†ÑÑ‚Ð¾Ñ€Ñ–Ñ Ð·Ð°ÑÐ²ÐºÐ¸ Ð½Ð° Ð¿Ð¾ÐºÑƒÐ¿ÐºÑƒ",
    "de": "Historie der Kaufanfrage",
    "cs": "Historie Å¾Ã¡dosti o nÃ¡kup"
  },
  "purchaseConfirmations.events.description": {
    "ru": "ÐŸÐ¾ÐºÐ°Ð·Ð°Ð½Ñ‹ ÑÐ¾Ð±Ñ‹Ñ‚Ð¸Ñ Ð·Ð°ÑÐ²ÐºÐ¸: ÑÐ¾Ð·Ð´Ð°Ð½Ð¸Ðµ, Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð¸Ðµ, Ð¾Ñ‚ÐºÐ»Ð¾Ð½ÐµÐ½Ð¸Ðµ Ð¸ Ð¸ÑÐ¿Ñ€Ð°Ð²Ð»ÐµÐ½Ð¸Ñ.",
    "pl": "Pokazano zdarzenia zgÅ‚oszenia: utworzenie, potwierdzenie, odrzucenie i korekty.",
    "en": "Request events are shown: creation, confirmation, rejection and corrections.",
    "es": "Se muestran los eventos de la solicitud: creaciÃ³n, confirmaciÃ³n, rechazo y correcciones.",
    "uk": "ÐŸÐ¾ÐºÐ°Ð·Ð°Ð½Ð¾ Ð¿Ð¾Ð´Ñ–Ñ— Ð·Ð°ÑÐ²ÐºÐ¸: ÑÑ‚Ð²Ð¾Ñ€ÐµÐ½Ð½Ñ, Ð¿Ñ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¶ÐµÐ½Ð½Ñ, Ð²Ñ–Ð´Ñ…Ð¸Ð»ÐµÐ½Ð½Ñ Ð¹ Ð²Ð¸Ð¿Ñ€Ð°Ð²Ð»ÐµÐ½Ð½Ñ.",
    "de": "Anfrageereignisse werden angezeigt: Erstellung, BestÃ¤tigung, Ablehnung und Korrekturen.",
    "cs": "ZobrazujÃ­ se udÃ¡losti Å¾Ã¡dosti: vytvoÅ™enÃ­, potvrzenÃ­, odmÃ­tnutÃ­ a opravy."
  },
  "purchaseConfirmations.events.accessRole": {
    "ru": "Ð Ð¾Ð»ÑŒ Ð´Ð¾ÑÑ‚ÑƒÐ¿Ð°",
    "pl": "Rola dostÄ™pu",
    "en": "Access role",
    "es": "Rol de acceso",
    "uk": "Ð Ð¾Ð»ÑŒ Ð´Ð¾ÑÑ‚ÑƒÐ¿Ñƒ",
    "de": "Zugriffsrolle",
    "cs": "Role pÅ™Ã­stupu"
  },
  "purchaseConfirmations.events.timeline": {
    "ru": "Ð›ÐµÐ½Ñ‚Ð° ÑÐ¾Ð±Ñ‹Ñ‚Ð¸Ð¹",
    "pl": "OÅ› zdarzeÅ„",
    "en": "Event timeline",
    "es": "CronologÃ­a de eventos",
    "uk": "Ð¡Ñ‚Ñ€Ñ–Ñ‡ÐºÐ° Ð¿Ð¾Ð´Ñ–Ð¹",
    "de": "Ereignisverlauf",
    "cs": "ÄŒasovÃ¡ osa udÃ¡lostÃ­"
  },
  "purchaseConfirmations.events.emptyTitle": {
    "ru": "Ð¡Ð¾Ð±Ñ‹Ñ‚Ð¸Ð¹ Ð¿Ð¾ÐºÐ° Ð½ÐµÑ‚",
    "pl": "Nie ma jeszcze zdarzeÅ„",
    "en": "No events yet",
    "es": "AÃºn no hay eventos",
    "uk": "ÐŸÐ¾Ð´Ñ–Ð¹ Ð¿Ð¾ÐºÐ¸ Ð½ÐµÐ¼Ð°Ñ”",
    "de": "Noch keine Ereignisse",
    "cs": "ZatÃ­m Å¾Ã¡dnÃ© udÃ¡losti"
  },
  "purchaseConfirmations.events.emptyDescription": {
    "ru": "ÐšÐ¾Ð³Ð´Ð° ÑÑ‚Ð°Ñ‚ÑƒÑ Ð·Ð°ÑÐ²ÐºÐ¸ Ð¸Ð·Ð¼ÐµÐ½Ð¸Ñ‚ÑÑ, ÑÐ¾Ð±Ñ‹Ñ‚Ð¸Ñ Ð¿Ð¾ÑÐ²ÑÑ‚ÑÑ Ð·Ð´ÐµÑÑŒ.",
    "pl": "Gdy status zgÅ‚oszenia siÄ™ zmieni, zdarzenia pojawiÄ… siÄ™ tutaj.",
    "en": "When the request status changes, events will appear here.",
    "es": "Cuando cambie el estado de la solicitud, los eventos aparecerÃ¡n aquÃ­.",
    "uk": "ÐšÐ¾Ð»Ð¸ ÑÑ‚Ð°Ñ‚ÑƒÑ Ð·Ð°ÑÐ²ÐºÐ¸ Ð·Ð¼Ñ–Ð½Ð¸Ñ‚ÑŒÑÑ, Ð¿Ð¾Ð´Ñ–Ñ— Ð·â€™ÑÐ²Ð»ÑÑ‚ÑŒÑÑ Ñ‚ÑƒÑ‚.",
    "de": "Wenn sich der Status der Anfrage Ã¤ndert, erscheinen Ereignisse hier.",
    "cs": "KdyÅ¾ se stav Å¾Ã¡dosti zmÄ›nÃ­, udÃ¡losti se zobrazÃ­ zde."
  },
  "purchaseConfirmations.events.backToSeller": {
    "ru": "ÐÐ°Ð·Ð°Ð´ Ðº Ð·Ð°ÑÐ²ÐºÐ°Ð¼ Ð¿Ñ€Ð¾Ð´Ð°Ð²Ñ†Ð°",
    "pl": "WrÃ³Ä‡ do zgÅ‚oszeÅ„ sprzedawcy",
    "en": "Back to seller requests",
    "es": "Volver a solicitudes del vendedor",
    "uk": "ÐÐ°Ð·Ð°Ð´ Ð´Ð¾ Ð·Ð°ÑÐ²Ð¾Ðº Ð¿Ñ€Ð¾Ð´Ð°Ð²Ñ†Ñ",
    "de": "ZurÃ¼ck zu VerkÃ¤uferanfragen",
    "cs": "ZpÄ›t k Å¾Ã¡dostem prodejce"
  },
  "purchaseConfirmations.events.backToBuyer": {
    "ru": "ÐÐ°Ð·Ð°Ð´ Ðº Ð¼Ð¾Ð¸Ð¼ Ð·Ð°ÑÐ²ÐºÐ°Ð¼",
    "pl": "WrÃ³Ä‡ do moich zgÅ‚oszeÅ„",
    "en": "Back to my requests",
    "es": "Volver a mis solicitudes",
    "uk": "ÐÐ°Ð·Ð°Ð´ Ð´Ð¾ Ð¼Ð¾Ñ—Ñ… Ð·Ð°ÑÐ²Ð¾Ðº",
    "de": "ZurÃ¼ck zu meinen Anfragen",
    "cs": "ZpÄ›t k mÃ½m Å¾Ã¡dostem"
  },
  "purchaseConfirmations.events.statusBefore": {
    "ru": "Ð¡Ñ‚Ð°Ñ‚ÑƒÑ Ð´Ð¾",
    "pl": "Status przed",
    "en": "Status before",
    "es": "Estado anterior",
    "uk": "Ð¡Ñ‚Ð°Ñ‚ÑƒÑ Ð´Ð¾",
    "de": "Status vorher",
    "cs": "Stav pÅ™ed"
  },
  "purchaseConfirmations.events.statusAfter": {
    "ru": "Ð¡Ñ‚Ð°Ñ‚ÑƒÑ Ð¿Ð¾ÑÐ»Ðµ",
    "pl": "Status po",
    "en": "Status after",
    "es": "Estado posterior",
    "uk": "Ð¡Ñ‚Ð°Ñ‚ÑƒÑ Ð¿Ñ–ÑÐ»Ñ",
    "de": "Status danach",
    "cs": "Stav po"
  },
  "purchaseConfirmations.events.sellerComment": {
    "ru": "ÐšÐ¾Ð¼Ð¼ÐµÐ½Ñ‚Ð°Ñ€Ð¸Ð¹ Ð¿Ñ€Ð¾Ð´Ð°Ð²Ñ†Ð°",
    "pl": "Komentarz sprzedawcy",
    "en": "Seller comment",
    "es": "Comentario del vendedor",
    "uk": "ÐšÐ¾Ð¼ÐµÐ½Ñ‚Ð°Ñ€ Ð¿Ñ€Ð¾Ð´Ð°Ð²Ñ†Ñ",
    "de": "VerkÃ¤uferkommentar",
    "cs": "KomentÃ¡Å™ prodejce"
  },
  "purchaseConfirmations.shell.buyerTitle": {
    "ru": "ÐŸÐ¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð¸Ñ Ð¿Ð¾ÐºÑƒÐ¿Ð¾Ðº",
    "pl": "Potwierdzenia zakupÃ³w",
    "en": "Purchase confirmations",
    "es": "Confirmaciones de compra",
    "uk": "ÐŸÑ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¶ÐµÐ½Ð½Ñ Ð¿Ð¾ÐºÑƒÐ¿Ð¾Ðº",
    "de": "KaufbestÃ¤tigungen",
    "cs": "PotvrzenÃ­ nÃ¡kupÅ¯"
  },
  "purchaseConfirmations.shell.buyerDescription": {
    "ru": "ÐœÐ°Ñ€ÑˆÑ€ÑƒÑ‚ Ð¿Ð¾ÐºÑƒÐ¿Ð°Ñ‚ÐµÐ»Ñ Ð´Ð»Ñ Ð²Ð½ÐµÑˆÐ½ÐµÐ³Ð¾ Ð´Ð¾ÐºÐ°Ð·Ð°Ñ‚ÐµÐ»ÑŒÑÑ‚Ð²Ð° Ð¿Ð¾ÐºÑƒÐ¿ÐºÐ¸, ÑÑ‚Ð°Ñ‚ÑƒÑÐ° Ð¿Ñ€Ð¾Ð²ÐµÑ€ÐºÐ¸ Ð¿Ñ€Ð¾Ð´Ð°Ð²Ñ†Ð¾Ð¼ Ð¸ Ð¿Ñ€ÐµÐ´Ð²Ð°Ñ€Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ð¾Ð³Ð¾ Ð²Ð»Ð¸ÑÐ½Ð¸Ñ Ð½Ð° POINTS.",
    "pl": "Trasa kupujÄ…cego dla zewnÄ™trznego dowodu zakupu, statusu weryfikacji sprzedawcy i podglÄ…du wpÅ‚ywu na POINTS.",
    "en": "Buyer route for external purchase proof, seller review status and POINTS impact preview.",
    "es": "Ruta del comprador para prueba externa de compra, estado de revisiÃ³n del vendedor y vista previa del impacto en POINTS.",
    "uk": "ÐœÐ°Ñ€ÑˆÑ€ÑƒÑ‚ Ð¿Ð¾ÐºÑƒÐ¿Ñ†Ñ Ð´Ð»Ñ Ð·Ð¾Ð²Ð½Ñ–ÑˆÐ½ÑŒÐ¾Ð³Ð¾ Ð´Ð¾ÐºÐ°Ð·Ñƒ Ð¿Ð¾ÐºÑƒÐ¿ÐºÐ¸, ÑÑ‚Ð°Ñ‚ÑƒÑÑƒ Ð¿ÐµÑ€ÐµÐ²Ñ–Ñ€ÐºÐ¸ Ð¿Ñ€Ð¾Ð´Ð°Ð²Ñ†ÐµÐ¼ Ñ– Ð¿Ð¾Ð¿ÐµÑ€ÐµÐ´Ð½ÑŒÐ¾Ð³Ð¾ Ð²Ð¿Ð»Ð¸Ð²Ñƒ Ð½Ð° POINTS.",
    "de": "KÃ¤uferroute fÃ¼r externen Kaufnachweis, VerkÃ¤uferprÃ¼fung und Vorschau der Auswirkungen auf POINTS.",
    "cs": "Trasa kupujÃ­cÃ­ho pro externÃ­ dÅ¯kaz nÃ¡kupu, stav kontroly prodejcem a nÃ¡hled dopadu na POINTS."
  },
  "purchaseConfirmations.shell.sellerTitle": {
    "ru": "Ð—Ð°ÑÐ²ÐºÐ¸ Ð¿Ñ€Ð¾Ð´Ð°Ð²Ñ†Ð°",
    "pl": "ZgÅ‚oszenia sprzedawcy",
    "en": "Seller confirmations",
    "es": "Confirmaciones del vendedor",
    "uk": "Ð—Ð°ÑÐ²ÐºÐ¸ Ð¿Ñ€Ð¾Ð´Ð°Ð²Ñ†Ñ",
    "de": "VerkÃ¤uferbestÃ¤tigungen",
    "cs": "PotvrzenÃ­ prodejce"
  },
  "purchaseConfirmations.shell.sellerDescription": {
    "ru": "ÐžÑ‡ÐµÑ€ÐµÐ´ÑŒ Ð¿Ñ€Ð¾Ð´Ð°Ð²Ñ†Ð° Ð´Ð»Ñ Ð¾Ð¶Ð¸Ð´Ð°ÑŽÑ‰Ð¸Ñ…, Ð¾Ñ‚ÐºÐ»Ð¾Ð½Ñ‘Ð½Ð½Ñ‹Ñ… Ð¸ Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´Ñ‘Ð½Ð½Ñ‹Ñ… Ð²Ð½ÐµÑˆÐ½Ð¸Ñ… Ð¿Ð¾ÐºÑƒÐ¿Ð¾Ðº.",
    "pl": "Kolejka sprzedawcy dla oczekujÄ…cych, odrzuconych i potwierdzonych zakupÃ³w zewnÄ™trznych.",
    "en": "Seller queue for pending, rejected and confirmed external purchase requests.",
    "es": "Cola del vendedor para solicitudes de compras externas pendientes, rechazadas y confirmadas.",
    "uk": "Ð§ÐµÑ€Ð³Ð° Ð¿Ñ€Ð¾Ð´Ð°Ð²Ñ†Ñ Ð´Ð»Ñ Ð¾Ñ‡Ñ–ÐºÑƒÐ²Ð°Ð½Ð¸Ñ…, Ð²Ñ–Ð´Ñ…Ð¸Ð»ÐµÐ½Ð¸Ñ… Ñ– Ð¿Ñ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¶ÐµÐ½Ð¸Ñ… Ð·Ð¾Ð²Ð½Ñ–ÑˆÐ½Ñ–Ñ… Ð¿Ð¾ÐºÑƒÐ¿Ð¾Ðº.",
    "de": "VerkÃ¤uferwarteschlange fÃ¼r ausstehende, abgelehnte und bestÃ¤tigte externe Kaufanfragen.",
    "cs": "Fronta prodejce pro ÄekajÃ­cÃ­, odmÃ­tnutÃ© a potvrzenÃ© externÃ­ nÃ¡kupy."
  },
  "purchaseConfirmations.shell.publicPurchasesTitle": {
    "ru": "ÐŸÑƒÐ±Ð»Ð¸Ñ‡Ð½Ñ‹Ðµ Ð¿Ð¾ÐºÑƒÐ¿ÐºÐ¸",
    "pl": "Publiczne zakupy",
    "en": "Public purchases",
    "es": "Compras pÃºblicas",
    "uk": "ÐŸÑƒÐ±Ð»Ñ–Ñ‡Ð½Ñ– Ð¿Ð¾ÐºÑƒÐ¿ÐºÐ¸",
    "de": "Ã–ffentliche KÃ¤ufe",
    "cs": "VeÅ™ejnÃ© nÃ¡kupy"
  },
  "purchaseConfirmations.shell.publicPurchasesDescription": {
    "ru": "ÐŸÑƒÐ±Ð»Ð¸Ñ‡Ð½Ð°Ñ Ð¸ÑÑ‚Ð¾Ñ€Ð¸Ñ Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´Ñ‘Ð½Ð½Ñ‹Ñ… Ð²Ð½ÐµÑˆÐ½Ð¸Ñ… Ð¿Ð¾ÐºÑƒÐ¿Ð¾Ðº Ñ Ð¼Ð°ÑÐºÐ¸Ñ€Ð¾Ð²Ð°Ð½Ð½Ñ‹Ð¼Ð¸ Ð¿Ð¾ÐºÑƒÐ¿Ð°Ñ‚ÐµÐ»ÑÐ¼Ð¸.",
    "pl": "Publiczna historia potwierdzonych zakupÃ³w zewnÄ™trznych z zamaskowanymi kupujÄ…cymi.",
    "en": "Public history of confirmed external purchases with masked buyers.",
    "es": "Historial pÃºblico de compras externas confirmadas con compradores enmascarados.",
    "uk": "ÐŸÑƒÐ±Ð»Ñ–Ñ‡Ð½Ð° Ñ–ÑÑ‚Ð¾Ñ€Ñ–Ñ Ð¿Ñ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¶ÐµÐ½Ð¸Ñ… Ð·Ð¾Ð²Ð½Ñ–ÑˆÐ½Ñ–Ñ… Ð¿Ð¾ÐºÑƒÐ¿Ð¾Ðº Ñ–Ð· Ð¼Ð°ÑÐºÐ¾Ð²Ð°Ð½Ð¸Ð¼Ð¸ Ð¿Ð¾ÐºÑƒÐ¿Ñ†ÑÐ¼Ð¸.",
    "de": "Ã–ffentliche Historie bestÃ¤tigter externer KÃ¤ufe mit maskierten KÃ¤ufern.",
    "cs": "VeÅ™ejnÃ¡ historie potvrzenÃ½ch externÃ­ch nÃ¡kupÅ¯ s maskovanÃ½mi kupujÃ­cÃ­mi."
  }
};

export const purchaseConfirmationMessagesCompleteness =
  checkDictionaryCompleteness(
    "purchase-confirmations",
    purchaseConfirmationMessages,
  );

export function getPurchaseConfirmationText(
  key: PurchaseConfirmationMessageKey,
  locale: unknown,
  params?: Record<string, string | number>,
): string {
  return getMessage(purchaseConfirmationMessages, key, locale, params);
}
// Compatibility export for Phase 20C final audit gate.
export const checkPurchaseConfirmationDictionaryCompleteness =
  purchaseConfirmationMessagesCompleteness;
