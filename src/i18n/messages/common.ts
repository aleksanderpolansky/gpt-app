import { checkDictionaryCompleteness } from "../dictionary-completeness";
import { getMessage, type MessageParams } from "../get-message";
import { type LocaleCode } from "../locales";

export const commonMessageKeys = [
  "common.actions",
  "common.active",
  "common.address",
  "common.all",
  "common.amount",
  "common.apply",
  "common.archived",
  "common.back",
  "common.cancel",
  "common.category",
  "common.city",
  "common.clearFilters",
  "common.close",
  "common.confirm",
  "common.continue",
  "common.copied",
  "common.copy",
  "common.country",
  "common.create",
  "common.currency",
  "common.date",
  "common.delete",
  "common.description",
  "common.details",
  "common.district",
  "common.draft",
  "common.duration",
  "common.edit",
  "common.empty",
  "common.error",
  "common.errorLoadingData",
  "common.filters",
  "common.finish",
  "common.hours",
  "common.inactive",
  "common.interfaceLanguage",
  "common.language",
  "common.loading",
  "common.loadingData",
  "common.location",
  "common.minutes",
  "common.name",
  "common.next",
  "common.no",
  "common.noResults",
  "common.none",
  "common.notAvailable",
  "common.notSpecified",
  "common.open",
  "common.optional",
  "common.pending",
  "common.previous",
  "common.price",
  "common.published",
  "common.refresh",
  "common.rejected",
  "common.required",
  "common.reset",
  "common.retry",
  "common.save",
  "common.search",
  "common.searchPlaceholder",
  "common.select",
  "common.send",
  "common.settings",
  "common.showLess",
  "common.showMore",
  "common.sort",
  "common.status",
  "common.submit",
  "common.time",
  "common.title",
  "common.unknown",
  "common.unpublished",
  "common.update",
  "common.useCurrentLocation",
  "common.verified",
  "common.view",
  "common.yes",
] as const;

export type CommonMessageKey = (typeof commonMessageKeys)[number];

export const commonMessages: Record<CommonMessageKey, Record<LocaleCode, string>> = {
  "common.save": {
    "ru": "Ð¡Ð¾Ñ…Ñ€Ð°Ð½Ð¸Ñ‚ÑŒ",
    "pl": "Zapisz",
    "en": "Save",
    "es": "Guardar",
    "uk": "Ð—Ð±ÐµÑ€ÐµÐ³Ñ‚Ð¸",
    "de": "Speichern",
    "cs": "UloÅ¾it"
  },
  "common.cancel": {
    "ru": "ÐžÑ‚Ð¼ÐµÐ½Ð°",
    "pl": "Anuluj",
    "en": "Cancel",
    "es": "Cancelar",
    "uk": "Ð¡ÐºÐ°ÑÑƒÐ²Ð°Ñ‚Ð¸",
    "de": "Abbrechen",
    "cs": "ZruÅ¡it"
  },
  "common.search": {
    "ru": "ÐŸÐ¾Ð¸ÑÐº",
    "pl": "Szukaj",
    "en": "Search",
    "es": "Buscar",
    "uk": "ÐŸÐ¾ÑˆÑƒÐº",
    "de": "Suchen",
    "cs": "Hledat"
  },
  "common.loading": {
    "ru": "Ð—Ð°Ð³Ñ€ÑƒÐ·ÐºÐ°...",
    "pl": "Åadowanie...",
    "en": "Loading...",
    "es": "Cargando...",
    "uk": "Ð—Ð°Ð²Ð°Ð½Ñ‚Ð°Ð¶ÐµÐ½Ð½Ñ...",
    "de": "Wird geladen...",
    "cs": "NaÄÃ­tÃ¡nÃ­..."
  },
  "common.error": {
    "ru": "ÐžÑˆÐ¸Ð±ÐºÐ°",
    "pl": "BÅ‚Ä…d",
    "en": "Error",
    "es": "Error",
    "uk": "ÐŸÐ¾Ð¼Ð¸Ð»ÐºÐ°",
    "de": "Fehler",
    "cs": "Chyba"
  },
  "common.empty": {
    "ru": "ÐŸÑƒÑÑ‚Ð¾",
    "pl": "Pusto",
    "en": "Empty",
    "es": "VacÃ­o",
    "uk": "ÐŸÐ¾Ñ€Ð¾Ð¶Ð½ÑŒÐ¾",
    "de": "Leer",
    "cs": "PrÃ¡zdnÃ©"
  },
  "common.back": {
    "ru": "ÐÐ°Ð·Ð°Ð´",
    "pl": "Wstecz",
    "en": "Back",
    "es": "AtrÃ¡s",
    "uk": "ÐÐ°Ð·Ð°Ð´",
    "de": "ZurÃ¼ck",
    "cs": "ZpÄ›t"
  },
  "common.next": {
    "ru": "Ð”Ð°Ð»ÐµÐµ",
    "pl": "Dalej",
    "en": "Next",
    "es": "Siguiente",
    "uk": "Ð”Ð°Ð»Ñ–",
    "de": "Weiter",
    "cs": "DalÅ¡Ã­"
  },
  "common.previous": {
    "ru": "ÐŸÑ€ÐµÐ´Ñ‹Ð´ÑƒÑ‰Ð¸Ð¹",
    "pl": "Poprzedni",
    "en": "Previous",
    "es": "Anterior",
    "uk": "ÐŸÐ¾Ð¿ÐµÑ€ÐµÐ´Ð½Ñ–Ð¹",
    "de": "Vorherige",
    "cs": "PÅ™edchozÃ­"
  },
  "common.confirm": {
    "ru": "ÐŸÐ¾Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¸Ñ‚ÑŒ",
    "pl": "PotwierdÅº",
    "en": "Confirm",
    "es": "Confirmar",
    "uk": "ÐŸÑ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¸Ñ‚Ð¸",
    "de": "BestÃ¤tigen",
    "cs": "Potvrdit"
  },
  "common.close": {
    "ru": "Ð—Ð°ÐºÑ€Ñ‹Ñ‚ÑŒ",
    "pl": "Zamknij",
    "en": "Close",
    "es": "Cerrar",
    "uk": "Ð—Ð°ÐºÑ€Ð¸Ñ‚Ð¸",
    "de": "SchlieÃŸen",
    "cs": "ZavÅ™Ã­t"
  },
  "common.reset": {
    "ru": "Ð¡Ð±Ñ€Ð¾ÑÐ¸Ñ‚ÑŒ",
    "pl": "Resetuj",
    "en": "Reset",
    "es": "Restablecer",
    "uk": "Ð¡ÐºÐ¸Ð½ÑƒÑ‚Ð¸",
    "de": "ZurÃ¼cksetzen",
    "cs": "Resetovat"
  },
  "common.apply": {
    "ru": "ÐŸÑ€Ð¸Ð¼ÐµÐ½Ð¸Ñ‚ÑŒ",
    "pl": "Zastosuj",
    "en": "Apply",
    "es": "Aplicar",
    "uk": "Ð—Ð°ÑÑ‚Ð¾ÑÑƒÐ²Ð°Ñ‚Ð¸",
    "de": "Anwenden",
    "cs": "PouÅ¾Ã­t"
  },
  "common.select": {
    "ru": "Ð’Ñ‹Ð±Ñ€Ð°Ñ‚ÑŒ",
    "pl": "Wybierz",
    "en": "Select",
    "es": "Seleccionar",
    "uk": "Ð’Ð¸Ð±Ñ€Ð°Ñ‚Ð¸",
    "de": "AuswÃ¤hlen",
    "cs": "Vybrat"
  },
  "common.all": {
    "ru": "Ð’ÑÐµ",
    "pl": "Wszystkie",
    "en": "All",
    "es": "Todo",
    "uk": "Ð£ÑÑ–",
    "de": "Alle",
    "cs": "VÅ¡e"
  },
  "common.none": {
    "ru": "ÐÐµÑ‚",
    "pl": "Brak",
    "en": "None",
    "es": "Ninguno",
    "uk": "ÐÐµÐ¼Ð°Ñ”",
    "de": "Keine",
    "cs": "Å½Ã¡dnÃ©"
  },
  "common.yes": {
    "ru": "Ð”Ð°",
    "pl": "Tak",
    "en": "Yes",
    "es": "SÃ­",
    "uk": "Ð¢Ð°Ðº",
    "de": "Ja",
    "cs": "Ano"
  },
  "common.no": {
    "ru": "ÐÐµÑ‚",
    "pl": "Nie",
    "en": "No",
    "es": "No",
    "uk": "ÐÑ–",
    "de": "Nein",
    "cs": "Ne"
  },
  "common.edit": {
    "ru": "Ð ÐµÐ´Ð°ÐºÑ‚Ð¸Ñ€Ð¾Ð²Ð°Ñ‚ÑŒ",
    "pl": "Edytuj",
    "en": "Edit",
    "es": "Editar",
    "uk": "Ð ÐµÐ´Ð°Ð³ÑƒÐ²Ð°Ñ‚Ð¸",
    "de": "Bearbeiten",
    "cs": "Upravit"
  },
  "common.delete": {
    "ru": "Ð£Ð´Ð°Ð»Ð¸Ñ‚ÑŒ",
    "pl": "UsuÅ„",
    "en": "Delete",
    "es": "Eliminar",
    "uk": "Ð’Ð¸Ð´Ð°Ð»Ð¸Ñ‚Ð¸",
    "de": "LÃ¶schen",
    "cs": "Smazat"
  },
  "common.create": {
    "ru": "Ð¡Ð¾Ð·Ð´Ð°Ñ‚ÑŒ",
    "pl": "UtwÃ³rz",
    "en": "Create",
    "es": "Crear",
    "uk": "Ð¡Ñ‚Ð²Ð¾Ñ€Ð¸Ñ‚Ð¸",
    "de": "Erstellen",
    "cs": "VytvoÅ™it"
  },
  "common.update": {
    "ru": "ÐžÐ±Ð½Ð¾Ð²Ð¸Ñ‚ÑŒ",
    "pl": "Zaktualizuj",
    "en": "Update",
    "es": "Actualizar",
    "uk": "ÐžÐ½Ð¾Ð²Ð¸Ñ‚Ð¸",
    "de": "Aktualisieren",
    "cs": "Aktualizovat"
  },
  "common.submit": {
    "ru": "ÐžÑ‚Ð¿Ñ€Ð°Ð²Ð¸Ñ‚ÑŒ",
    "pl": "WyÅ›lij",
    "en": "Submit",
    "es": "Enviar",
    "uk": "ÐÐ°Ð´Ñ–ÑÐ»Ð°Ñ‚Ð¸",
    "de": "Absenden",
    "cs": "Odeslat"
  },
  "common.send": {
    "ru": "ÐžÑ‚Ð¿Ñ€Ð°Ð²Ð¸Ñ‚ÑŒ",
    "pl": "WyÅ›lij",
    "en": "Send",
    "es": "Enviar",
    "uk": "ÐÐ°Ð´Ñ–ÑÐ»Ð°Ñ‚Ð¸",
    "de": "Senden",
    "cs": "Poslat"
  },
  "common.retry": {
    "ru": "ÐŸÐ¾Ð²Ñ‚Ð¾Ñ€Ð¸Ñ‚ÑŒ",
    "pl": "SprÃ³buj ponownie",
    "en": "Retry",
    "es": "Reintentar",
    "uk": "ÐŸÐ¾Ð²Ñ‚Ð¾Ñ€Ð¸Ñ‚Ð¸",
    "de": "Erneut versuchen",
    "cs": "Zkusit znovu"
  },
  "common.refresh": {
    "ru": "ÐžÐ±Ð½Ð¾Ð²Ð¸Ñ‚ÑŒ",
    "pl": "OdÅ›wieÅ¼",
    "en": "Refresh",
    "es": "Actualizar",
    "uk": "ÐžÐ½Ð¾Ð²Ð¸Ñ‚Ð¸",
    "de": "Aktualisieren",
    "cs": "Obnovit"
  },
  "common.open": {
    "ru": "ÐžÑ‚ÐºÑ€Ñ‹Ñ‚ÑŒ",
    "pl": "OtwÃ³rz",
    "en": "Open",
    "es": "Abrir",
    "uk": "Ð’Ñ–Ð´ÐºÑ€Ð¸Ñ‚Ð¸",
    "de": "Ã–ffnen",
    "cs": "OtevÅ™Ã­t"
  },
  "common.view": {
    "ru": "ÐŸÐ¾ÑÐ¼Ð¾Ñ‚Ñ€ÐµÑ‚ÑŒ",
    "pl": "Zobacz",
    "en": "View",
    "es": "Ver",
    "uk": "ÐŸÐµÑ€ÐµÐ³Ð»ÑÐ½ÑƒÑ‚Ð¸",
    "de": "Ansehen",
    "cs": "Zobrazit"
  },
  "common.details": {
    "ru": "Ð”ÐµÑ‚Ð°Ð»Ð¸",
    "pl": "SzczegÃ³Å‚y",
    "en": "Details",
    "es": "Detalles",
    "uk": "Ð”ÐµÑ‚Ð°Ð»Ñ–",
    "de": "Details",
    "cs": "Podrobnosti"
  },
  "common.settings": {
    "ru": "ÐÐ°ÑÑ‚Ñ€Ð¾Ð¹ÐºÐ¸",
    "pl": "Ustawienia",
    "en": "Settings",
    "es": "ConfiguraciÃ³n",
    "uk": "ÐÐ°Ð»Ð°ÑˆÑ‚ÑƒÐ²Ð°Ð½Ð½Ñ",
    "de": "Einstellungen",
    "cs": "NastavenÃ­"
  },
  "common.status": {
    "ru": "Ð¡Ñ‚Ð°Ñ‚ÑƒÑ",
    "pl": "Status",
    "en": "Status",
    "es": "Estado",
    "uk": "Ð¡Ñ‚Ð°Ñ‚ÑƒÑ",
    "de": "Status",
    "cs": "Stav"
  },
  "common.active": {
    "ru": "ÐÐºÑ‚Ð¸Ð²Ð½Ð¾",
    "pl": "Aktywne",
    "en": "Active",
    "es": "Activo",
    "uk": "ÐÐºÑ‚Ð¸Ð²Ð½Ð¾",
    "de": "Aktiv",
    "cs": "AktivnÃ­"
  },
  "common.inactive": {
    "ru": "ÐÐµÐ°ÐºÑ‚Ð¸Ð²Ð½Ð¾",
    "pl": "Nieaktywne",
    "en": "Inactive",
    "es": "Inactivo",
    "uk": "ÐÐµÐ°ÐºÑ‚Ð¸Ð²Ð½Ð¾",
    "de": "Inaktiv",
    "cs": "NeaktivnÃ­"
  },
  "common.draft": {
    "ru": "Ð§ÐµÑ€Ð½Ð¾Ð²Ð¸Ðº",
    "pl": "Szkic",
    "en": "Draft",
    "es": "Borrador",
    "uk": "Ð§ÐµÑ€Ð½ÐµÑ‚ÐºÐ°",
    "de": "Entwurf",
    "cs": "Koncept"
  },
  "common.archived": {
    "ru": "ÐÑ€Ñ…Ð¸Ð²",
    "pl": "Archiwum",
    "en": "Archived",
    "es": "Archivado",
    "uk": "ÐÑ€Ñ…Ñ–Ð²",
    "de": "Archiviert",
    "cs": "ArchivovÃ¡no"
  },
  "common.published": {
    "ru": "ÐžÐ¿ÑƒÐ±Ð»Ð¸ÐºÐ¾Ð²Ð°Ð½Ð¾",
    "pl": "Opublikowane",
    "en": "Published",
    "es": "Publicado",
    "uk": "ÐžÐ¿ÑƒÐ±Ð»Ñ–ÐºÐ¾Ð²Ð°Ð½Ð¾",
    "de": "VerÃ¶ffentlicht",
    "cs": "PublikovÃ¡no"
  },
  "common.unpublished": {
    "ru": "ÐÐµ Ð¾Ð¿ÑƒÐ±Ð»Ð¸ÐºÐ¾Ð²Ð°Ð½Ð¾",
    "pl": "Nieopublikowane",
    "en": "Unpublished",
    "es": "No publicado",
    "uk": "ÐÐµ Ð¾Ð¿ÑƒÐ±Ð»Ñ–ÐºÐ¾Ð²Ð°Ð½Ð¾",
    "de": "Nicht verÃ¶ffentlicht",
    "cs": "NepublikovÃ¡no"
  },
  "common.verified": {
    "ru": "ÐŸÑ€Ð¾Ð²ÐµÑ€ÐµÐ½Ð¾",
    "pl": "Zweryfikowane",
    "en": "Verified",
    "es": "Verificado",
    "uk": "ÐŸÐµÑ€ÐµÐ²Ñ–Ñ€ÐµÐ½Ð¾",
    "de": "Verifiziert",
    "cs": "OvÄ›Å™eno"
  },
  "common.pending": {
    "ru": "ÐÐ° Ð¿Ñ€Ð¾Ð²ÐµÑ€ÐºÐµ",
    "pl": "W trakcie weryfikacji",
    "en": "Pending",
    "es": "Pendiente",
    "uk": "ÐÐ° Ð¿ÐµÑ€ÐµÐ²Ñ–Ñ€Ñ†Ñ–",
    "de": "Ausstehend",
    "cs": "ÄŒekÃ¡ na kontrolu"
  },
  "common.rejected": {
    "ru": "ÐžÑ‚ÐºÐ»Ð¾Ð½ÐµÐ½Ð¾",
    "pl": "Odrzucone",
    "en": "Rejected",
    "es": "Rechazado",
    "uk": "Ð’Ñ–Ð´Ñ…Ð¸Ð»ÐµÐ½Ð¾",
    "de": "Abgelehnt",
    "cs": "ZamÃ­tnuto"
  },
  "common.unknown": {
    "ru": "ÐÐµÐ¸Ð·Ð²ÐµÑÑ‚Ð½Ð¾",
    "pl": "Nieznane",
    "en": "Unknown",
    "es": "Desconocido",
    "uk": "ÐÐµÐ²Ñ–Ð´Ð¾Ð¼Ð¾",
    "de": "Unbekannt",
    "cs": "NeznÃ¡mÃ©"
  },
  "common.required": {
    "ru": "ÐžÐ±ÑÐ·Ð°Ñ‚ÐµÐ»ÑŒÐ½Ð¾",
    "pl": "Wymagane",
    "en": "Required",
    "es": "Obligatorio",
    "uk": "ÐžÐ±Ð¾Ð²â€™ÑÐ·ÐºÐ¾Ð²Ð¾",
    "de": "Erforderlich",
    "cs": "PovinnÃ©"
  },
  "common.optional": {
    "ru": "ÐÐµÐ¾Ð±ÑÐ·Ð°Ñ‚ÐµÐ»ÑŒÐ½Ð¾",
    "pl": "Opcjonalne",
    "en": "Optional",
    "es": "Opcional",
    "uk": "ÐÐµÐ¾Ð±Ð¾Ð²â€™ÑÐ·ÐºÐ¾Ð²Ð¾",
    "de": "Optional",
    "cs": "VolitelnÃ©"
  },
  "common.name": {
    "ru": "ÐÐ°Ð·Ð²Ð°Ð½Ð¸Ðµ",
    "pl": "Nazwa",
    "en": "Name",
    "es": "Nombre",
    "uk": "ÐÐ°Ð·Ð²Ð°",
    "de": "Name",
    "cs": "NÃ¡zev"
  },
  "common.title": {
    "ru": "Ð—Ð°Ð³Ð¾Ð»Ð¾Ð²Ð¾Ðº",
    "pl": "TytuÅ‚",
    "en": "Title",
    "es": "TÃ­tulo",
    "uk": "Ð—Ð°Ð³Ð¾Ð»Ð¾Ð²Ð¾Ðº",
    "de": "Titel",
    "cs": "Nadpis"
  },
  "common.description": {
    "ru": "ÐžÐ¿Ð¸ÑÐ°Ð½Ð¸Ðµ",
    "pl": "Opis",
    "en": "Description",
    "es": "DescripciÃ³n",
    "uk": "ÐžÐ¿Ð¸Ñ",
    "de": "Beschreibung",
    "cs": "Popis"
  },
  "common.category": {
    "ru": "ÐšÐ°Ñ‚ÐµÐ³Ð¾Ñ€Ð¸Ñ",
    "pl": "Kategoria",
    "en": "Category",
    "es": "CategorÃ­a",
    "uk": "ÐšÐ°Ñ‚ÐµÐ³Ð¾Ñ€Ñ–Ñ",
    "de": "Kategorie",
    "cs": "Kategorie"
  },
  "common.location": {
    "ru": "Ð›Ð¾ÐºÐ°Ñ†Ð¸Ñ",
    "pl": "Lokalizacja",
    "en": "Location",
    "es": "UbicaciÃ³n",
    "uk": "Ð›Ð¾ÐºÐ°Ñ†Ñ–Ñ",
    "de": "Standort",
    "cs": "Lokalita"
  },
  "common.city": {
    "ru": "Ð“Ð¾Ñ€Ð¾Ð´",
    "pl": "Miasto",
    "en": "City",
    "es": "Ciudad",
    "uk": "ÐœÑ–ÑÑ‚Ð¾",
    "de": "Stadt",
    "cs": "MÄ›sto"
  },
  "common.district": {
    "ru": "Ð Ð°Ð¹Ð¾Ð½",
    "pl": "Dzielnica",
    "en": "District",
    "es": "Distrito",
    "uk": "Ð Ð°Ð¹Ð¾Ð½",
    "de": "Bezirk",
    "cs": "ÄŒtvrÅ¥"
  },
  "common.country": {
    "ru": "Ð¡Ñ‚Ñ€Ð°Ð½Ð°",
    "pl": "Kraj",
    "en": "Country",
    "es": "PaÃ­s",
    "uk": "ÐšÑ€Ð°Ñ—Ð½Ð°",
    "de": "Land",
    "cs": "ZemÄ›"
  },
  "common.address": {
    "ru": "ÐÐ´Ñ€ÐµÑ",
    "pl": "Adres",
    "en": "Address",
    "es": "DirecciÃ³n",
    "uk": "ÐÐ´Ñ€ÐµÑÐ°",
    "de": "Adresse",
    "cs": "Adresa"
  },
  "common.currency": {
    "ru": "Ð’Ð°Ð»ÑŽÑ‚Ð°",
    "pl": "Waluta",
    "en": "Currency",
    "es": "Moneda",
    "uk": "Ð’Ð°Ð»ÑŽÑ‚Ð°",
    "de": "WÃ¤hrung",
    "cs": "MÄ›na"
  },
  "common.price": {
    "ru": "Ð¦ÐµÐ½Ð°",
    "pl": "Cena",
    "en": "Price",
    "es": "Precio",
    "uk": "Ð¦Ñ–Ð½Ð°",
    "de": "Preis",
    "cs": "Cena"
  },
  "common.amount": {
    "ru": "Ð¡ÑƒÐ¼Ð¼Ð°",
    "pl": "Kwota",
    "en": "Amount",
    "es": "Importe",
    "uk": "Ð¡ÑƒÐ¼Ð°",
    "de": "Betrag",
    "cs": "ÄŒÃ¡stka"
  },
  "common.date": {
    "ru": "Ð”Ð°Ñ‚Ð°",
    "pl": "Data",
    "en": "Date",
    "es": "Fecha",
    "uk": "Ð”Ð°Ñ‚Ð°",
    "de": "Datum",
    "cs": "Datum"
  },
  "common.time": {
    "ru": "Ð’Ñ€ÐµÐ¼Ñ",
    "pl": "Czas",
    "en": "Time",
    "es": "Hora",
    "uk": "Ð§Ð°Ñ",
    "de": "Zeit",
    "cs": "ÄŒas"
  },
  "common.duration": {
    "ru": "Ð”Ð»Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ð¾ÑÑ‚ÑŒ",
    "pl": "Czas trwania",
    "en": "Duration",
    "es": "DuraciÃ³n",
    "uk": "Ð¢Ñ€Ð¸Ð²Ð°Ð»Ñ–ÑÑ‚ÑŒ",
    "de": "Dauer",
    "cs": "Doba trvÃ¡nÃ­"
  },
  "common.minutes": {
    "ru": "Ð¼Ð¸Ð½.",
    "pl": "min",
    "en": "min",
    "es": "min",
    "uk": "Ñ…Ð²",
    "de": "Min.",
    "cs": "min"
  },
  "common.hours": {
    "ru": "Ñ‡.",
    "pl": "godz.",
    "en": "h",
    "es": "h",
    "uk": "Ð³Ð¾Ð´",
    "de": "Std.",
    "cs": "h"
  },
  "common.actions": {
    "ru": "Ð”ÐµÐ¹ÑÑ‚Ð²Ð¸Ñ",
    "pl": "DziaÅ‚ania",
    "en": "Actions",
    "es": "Acciones",
    "uk": "Ð”Ñ–Ñ—",
    "de": "Aktionen",
    "cs": "Akce"
  },
  "common.filters": {
    "ru": "Ð¤Ð¸Ð»ÑŒÑ‚Ñ€Ñ‹",
    "pl": "Filtry",
    "en": "Filters",
    "es": "Filtros",
    "uk": "Ð¤Ñ–Ð»ÑŒÑ‚Ñ€Ð¸",
    "de": "Filter",
    "cs": "Filtry"
  },
  "common.sort": {
    "ru": "Ð¡Ð¾Ñ€Ñ‚Ð¸Ñ€Ð¾Ð²ÐºÐ°",
    "pl": "Sortowanie",
    "en": "Sort",
    "es": "Ordenar",
    "uk": "Ð¡Ð¾Ñ€Ñ‚ÑƒÐ²Ð°Ð½Ð½Ñ",
    "de": "Sortieren",
    "cs": "Å˜azenÃ­"
  },
  "common.clearFilters": {
    "ru": "ÐžÑ‡Ð¸ÑÑ‚Ð¸Ñ‚ÑŒ Ñ„Ð¸Ð»ÑŒÑ‚Ñ€Ñ‹",
    "pl": "WyczyÅ›Ä‡ filtry",
    "en": "Clear filters",
    "es": "Borrar filtros",
    "uk": "ÐžÑ‡Ð¸ÑÑ‚Ð¸Ñ‚Ð¸ Ñ„Ñ–Ð»ÑŒÑ‚Ñ€Ð¸",
    "de": "Filter lÃ¶schen",
    "cs": "Vymazat filtry"
  },
  "common.searchPlaceholder": {
    "ru": "ÐŸÐ¾Ð¸ÑÐº...",
    "pl": "Szukaj...",
    "en": "Search...",
    "es": "Buscar...",
    "uk": "ÐŸÐ¾ÑˆÑƒÐº...",
    "de": "Suchen...",
    "cs": "Hledat..."
  },
  "common.loadingData": {
    "ru": "Ð—Ð°Ð³Ñ€ÑƒÐ¶Ð°ÑŽ Ð´Ð°Ð½Ð½Ñ‹Ðµ...",
    "pl": "ÅadujÄ™ dane...",
    "en": "Loading data...",
    "es": "Cargando datos...",
    "uk": "Ð—Ð°Ð²Ð°Ð½Ñ‚Ð°Ð¶ÑƒÑŽ Ð´Ð°Ð½Ñ–...",
    "de": "Daten werden geladen...",
    "cs": "NaÄÃ­tÃ¡m data..."
  },
  "common.errorLoadingData": {
    "ru": "ÐÐµ ÑƒÐ´Ð°Ð»Ð¾ÑÑŒ Ð·Ð°Ð³Ñ€ÑƒÐ·Ð¸Ñ‚ÑŒ Ð´Ð°Ð½Ð½Ñ‹Ðµ.",
    "pl": "Nie udaÅ‚o siÄ™ zaÅ‚adowaÄ‡ danych.",
    "en": "Failed to load data.",
    "es": "No se pudieron cargar los datos.",
    "uk": "ÐÐµ Ð²Ð´Ð°Ð»Ð¾ÑÑ Ð·Ð°Ð²Ð°Ð½Ñ‚Ð°Ð¶Ð¸Ñ‚Ð¸ Ð´Ð°Ð½Ñ–.",
    "de": "Daten konnten nicht geladen werden.",
    "cs": "Data se nepodaÅ™ilo naÄÃ­st."
  },
  "common.noResults": {
    "ru": "ÐÐ¸Ñ‡ÐµÐ³Ð¾ Ð½Ðµ Ð½Ð°Ð¹Ð´ÐµÐ½Ð¾.",
    "pl": "Nic nie znaleziono.",
    "en": "No results found.",
    "es": "No se encontraron resultados.",
    "uk": "ÐÑ–Ñ‡Ð¾Ð³Ð¾ Ð½Ðµ Ð·Ð½Ð°Ð¹Ð´ÐµÐ½Ð¾.",
    "de": "Keine Ergebnisse gefunden.",
    "cs": "Nebyly nalezeny Å¾Ã¡dnÃ© vÃ½sledky."
  },
  "common.notAvailable": {
    "ru": "ÐÐµÐ´Ð¾ÑÑ‚ÑƒÐ¿Ð½Ð¾",
    "pl": "NiedostÄ™pne",
    "en": "Not available",
    "es": "No disponible",
    "uk": "ÐÐµÐ´Ð¾ÑÑ‚ÑƒÐ¿Ð½Ð¾",
    "de": "Nicht verfÃ¼gbar",
    "cs": "NedostupnÃ©"
  },
  "common.notSpecified": {
    "ru": "ÐÐµ ÑƒÐºÐ°Ð·Ð°Ð½Ð¾",
    "pl": "Nie podano",
    "en": "Not specified",
    "es": "No especificado",
    "uk": "ÐÐµ Ð²ÐºÐ°Ð·Ð°Ð½Ð¾",
    "de": "Nicht angegeben",
    "cs": "Neuvedeno"
  },
  "common.showMore": {
    "ru": "ÐŸÐ¾ÐºÐ°Ð·Ð°Ñ‚ÑŒ Ð±Ð¾Ð»ÑŒÑˆÐµ",
    "pl": "PokaÅ¼ wiÄ™cej",
    "en": "Show more",
    "es": "Mostrar mÃ¡s",
    "uk": "ÐŸÐ¾ÐºÐ°Ð·Ð°Ñ‚Ð¸ Ð±Ñ–Ð»ÑŒÑˆÐµ",
    "de": "Mehr anzeigen",
    "cs": "Zobrazit vÃ­ce"
  },
  "common.showLess": {
    "ru": "ÐŸÐ¾ÐºÐ°Ð·Ð°Ñ‚ÑŒ Ð¼ÐµÐ½ÑŒÑˆÐµ",
    "pl": "PokaÅ¼ mniej",
    "en": "Show less",
    "es": "Mostrar menos",
    "uk": "ÐŸÐ¾ÐºÐ°Ð·Ð°Ñ‚Ð¸ Ð¼ÐµÐ½ÑˆÐµ",
    "de": "Weniger anzeigen",
    "cs": "Zobrazit mÃ©nÄ›"
  },
  "common.language": {
    "ru": "Ð¯Ð·Ñ‹Ðº",
    "pl": "JÄ™zyk",
    "en": "Language",
    "es": "Idioma",
    "uk": "ÐœÐ¾Ð²Ð°",
    "de": "Sprache",
    "cs": "Jazyk"
  },
  "common.interfaceLanguage": {
    "ru": "Ð¯Ð·Ñ‹Ðº Ð¸Ð½Ñ‚ÐµÑ€Ñ„ÐµÐ¹ÑÐ°",
    "pl": "JÄ™zyk interfejsu",
    "en": "Interface language",
    "es": "Idioma de la interfaz",
    "uk": "ÐœÐ¾Ð²Ð° Ñ–Ð½Ñ‚ÐµÑ€Ñ„ÐµÐ¹ÑÑƒ",
    "de": "Sprache der OberflÃ¤che",
    "cs": "Jazyk rozhranÃ­"
  },
  "common.useCurrentLocation": {
    "ru": "Ð˜ÑÐ¿Ð¾Ð»ÑŒÐ·Ð¾Ð²Ð°Ñ‚ÑŒ Ð¼Ð¾Ñ‘ Ð¼ÐµÑÑ‚Ð¾Ð¿Ð¾Ð»Ð¾Ð¶ÐµÐ½Ð¸Ðµ",
    "pl": "UÅ¼yj mojej lokalizacji",
    "en": "Use my location",
    "es": "Usar mi ubicaciÃ³n",
    "uk": "Ð’Ð¸ÐºÐ¾Ñ€Ð¸ÑÑ‚Ð°Ñ‚Ð¸ Ð¼Ð¾Ñ” Ð¼Ñ–ÑÑ†ÐµÐ·Ð½Ð°Ñ…Ð¾Ð´Ð¶ÐµÐ½Ð½Ñ",
    "de": "Meinen Standort verwenden",
    "cs": "PouÅ¾Ã­t mou polohu"
  },
  "common.continue": {
    "ru": "ÐŸÑ€Ð¾Ð´Ð¾Ð»Ð¶Ð¸Ñ‚ÑŒ",
    "pl": "Kontynuuj",
    "en": "Continue",
    "es": "Continuar",
    "uk": "ÐŸÑ€Ð¾Ð´Ð¾Ð²Ð¶Ð¸Ñ‚Ð¸",
    "de": "Fortfahren",
    "cs": "PokraÄovat"
  },
  "common.finish": {
    "ru": "Ð—Ð°Ð²ÐµÑ€ÑˆÐ¸Ñ‚ÑŒ",
    "pl": "ZakoÅ„cz",
    "en": "Finish",
    "es": "Finalizar",
    "uk": "Ð—Ð°Ð²ÐµÑ€ÑˆÐ¸Ñ‚Ð¸",
    "de": "Fertigstellen",
    "cs": "DokonÄit"
  },
  "common.copy": {
    "ru": "ÐšÐ¾Ð¿Ð¸Ñ€Ð¾Ð²Ð°Ñ‚ÑŒ",
    "pl": "Kopiuj",
    "en": "Copy",
    "es": "Copiar",
    "uk": "ÐšÐ¾Ð¿Ñ–ÑŽÐ²Ð°Ñ‚Ð¸",
    "de": "Kopieren",
    "cs": "KopÃ­rovat"
  },
  "common.copied": {
    "ru": "Ð¡ÐºÐ¾Ð¿Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð¾",
    "pl": "Skopiowano",
    "en": "Copied",
    "es": "Copiado",
    "uk": "Ð¡ÐºÐ¾Ð¿Ñ–Ð¹Ð¾Ð²Ð°Ð½Ð¾",
    "de": "Kopiert",
    "cs": "ZkopÃ­rovÃ¡no"
  }
};

export const commonMessagesCompleteness = checkDictionaryCompleteness(
  "common",
  commonMessages,
);

export function getCommonMessage(
  key: CommonMessageKey,
  locale: unknown,
  params?: MessageParams,
): string {
  return getMessage(commonMessages, key, locale, params);
}

