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
    "ru": "Сохранить",
    "pl": "Zapisz",
    "en": "Save",
    "es": "Guardar",
    "uk": "Зберегти",
    "de": "Speichern",
    "cs": "Uložit"
  },
  "common.cancel": {
    "ru": "Отмена",
    "pl": "Anuluj",
    "en": "Cancel",
    "es": "Cancelar",
    "uk": "Скасувати",
    "de": "Abbrechen",
    "cs": "Zrušit"
  },
  "common.search": {
    "ru": "Поиск",
    "pl": "Szukaj",
    "en": "Search",
    "es": "Buscar",
    "uk": "Пошук",
    "de": "Suchen",
    "cs": "Hledat"
  },
  "common.loading": {
    "ru": "Загрузка...",
    "pl": "Ładowanie...",
    "en": "Loading...",
    "es": "Cargando...",
    "uk": "Завантаження...",
    "de": "Wird geladen...",
    "cs": "Načítání..."
  },
  "common.error": {
    "ru": "Ошибка",
    "pl": "Błąd",
    "en": "Error",
    "es": "Error",
    "uk": "Помилка",
    "de": "Fehler",
    "cs": "Chyba"
  },
  "common.empty": {
    "ru": "Пусто",
    "pl": "Pusto",
    "en": "Empty",
    "es": "Vacío",
    "uk": "Порожньо",
    "de": "Leer",
    "cs": "Prázdné"
  },
  "common.back": {
    "ru": "Назад",
    "pl": "Wstecz",
    "en": "Back",
    "es": "Atrás",
    "uk": "Назад",
    "de": "Zurück",
    "cs": "Zpět"
  },
  "common.next": {
    "ru": "Далее",
    "pl": "Dalej",
    "en": "Next",
    "es": "Siguiente",
    "uk": "Далі",
    "de": "Weiter",
    "cs": "Další"
  },
  "common.previous": {
    "ru": "Предыдущий",
    "pl": "Poprzedni",
    "en": "Previous",
    "es": "Anterior",
    "uk": "Попередній",
    "de": "Vorherige",
    "cs": "Předchozí"
  },
  "common.confirm": {
    "ru": "Подтвердить",
    "pl": "Potwierdź",
    "en": "Confirm",
    "es": "Confirmar",
    "uk": "Підтвердити",
    "de": "Bestätigen",
    "cs": "Potvrdit"
  },
  "common.close": {
    "ru": "Закрыть",
    "pl": "Zamknij",
    "en": "Close",
    "es": "Cerrar",
    "uk": "Закрити",
    "de": "Schließen",
    "cs": "Zavřít"
  },
  "common.reset": {
    "ru": "Сбросить",
    "pl": "Resetuj",
    "en": "Reset",
    "es": "Restablecer",
    "uk": "Скинути",
    "de": "Zurücksetzen",
    "cs": "Resetovat"
  },
  "common.apply": {
    "ru": "Применить",
    "pl": "Zastosuj",
    "en": "Apply",
    "es": "Aplicar",
    "uk": "Застосувати",
    "de": "Anwenden",
    "cs": "Použít"
  },
  "common.select": {
    "ru": "Выбрать",
    "pl": "Wybierz",
    "en": "Select",
    "es": "Seleccionar",
    "uk": "Вибрати",
    "de": "Auswählen",
    "cs": "Vybrat"
  },
  "common.all": {
    "ru": "Все",
    "pl": "Wszystkie",
    "en": "All",
    "es": "Todo",
    "uk": "Усі",
    "de": "Alle",
    "cs": "Vše"
  },
  "common.none": {
    "ru": "Нет",
    "pl": "Brak",
    "en": "None",
    "es": "Ninguno",
    "uk": "Немає",
    "de": "Keine",
    "cs": "Žádné"
  },
  "common.yes": {
    "ru": "Да",
    "pl": "Tak",
    "en": "Yes",
    "es": "Sí",
    "uk": "Так",
    "de": "Ja",
    "cs": "Ano"
  },
  "common.no": {
    "ru": "Нет",
    "pl": "Nie",
    "en": "No",
    "es": "No",
    "uk": "Ні",
    "de": "Nein",
    "cs": "Ne"
  },
  "common.edit": {
    "ru": "Редактировать",
    "pl": "Edytuj",
    "en": "Edit",
    "es": "Editar",
    "uk": "Редагувати",
    "de": "Bearbeiten",
    "cs": "Upravit"
  },
  "common.delete": {
    "ru": "Удалить",
    "pl": "Usuń",
    "en": "Delete",
    "es": "Eliminar",
    "uk": "Видалити",
    "de": "Löschen",
    "cs": "Smazat"
  },
  "common.create": {
    "ru": "Создать",
    "pl": "Utwórz",
    "en": "Create",
    "es": "Crear",
    "uk": "Створити",
    "de": "Erstellen",
    "cs": "Vytvořit"
  },
  "common.update": {
    "ru": "Обновить",
    "pl": "Zaktualizuj",
    "en": "Update",
    "es": "Actualizar",
    "uk": "Оновити",
    "de": "Aktualisieren",
    "cs": "Aktualizovat"
  },
  "common.submit": {
    "ru": "Отправить",
    "pl": "Wyślij",
    "en": "Submit",
    "es": "Enviar",
    "uk": "Надіслати",
    "de": "Absenden",
    "cs": "Odeslat"
  },
  "common.send": {
    "ru": "Отправить",
    "pl": "Wyślij",
    "en": "Send",
    "es": "Enviar",
    "uk": "Надіслати",
    "de": "Senden",
    "cs": "Poslat"
  },
  "common.retry": {
    "ru": "Повторить",
    "pl": "Spróbuj ponownie",
    "en": "Retry",
    "es": "Reintentar",
    "uk": "Повторити",
    "de": "Erneut versuchen",
    "cs": "Zkusit znovu"
  },
  "common.refresh": {
    "ru": "Обновить",
    "pl": "Odśwież",
    "en": "Refresh",
    "es": "Actualizar",
    "uk": "Оновити",
    "de": "Aktualisieren",
    "cs": "Obnovit"
  },
  "common.open": {
    "ru": "Открыть",
    "pl": "Otwórz",
    "en": "Open",
    "es": "Abrir",
    "uk": "Відкрити",
    "de": "Öffnen",
    "cs": "Otevřít"
  },
  "common.view": {
    "ru": "Посмотреть",
    "pl": "Zobacz",
    "en": "View",
    "es": "Ver",
    "uk": "Переглянути",
    "de": "Ansehen",
    "cs": "Zobrazit"
  },
  "common.details": {
    "ru": "Детали",
    "pl": "Szczegóły",
    "en": "Details",
    "es": "Detalles",
    "uk": "Деталі",
    "de": "Details",
    "cs": "Podrobnosti"
  },
  "common.settings": {
    "ru": "Настройки",
    "pl": "Ustawienia",
    "en": "Settings",
    "es": "Configuración",
    "uk": "Налаштування",
    "de": "Einstellungen",
    "cs": "Nastavení"
  },
  "common.status": {
    "ru": "Статус",
    "pl": "Status",
    "en": "Status",
    "es": "Estado",
    "uk": "Статус",
    "de": "Status",
    "cs": "Stav"
  },
  "common.active": {
    "ru": "Активно",
    "pl": "Aktywne",
    "en": "Active",
    "es": "Activo",
    "uk": "Активно",
    "de": "Aktiv",
    "cs": "Aktivní"
  },
  "common.inactive": {
    "ru": "Неактивно",
    "pl": "Nieaktywne",
    "en": "Inactive",
    "es": "Inactivo",
    "uk": "Неактивно",
    "de": "Inaktiv",
    "cs": "Neaktivní"
  },
  "common.draft": {
    "ru": "Черновик",
    "pl": "Szkic",
    "en": "Draft",
    "es": "Borrador",
    "uk": "Чернетка",
    "de": "Entwurf",
    "cs": "Koncept"
  },
  "common.archived": {
    "ru": "Архив",
    "pl": "Archiwum",
    "en": "Archived",
    "es": "Archivado",
    "uk": "Архів",
    "de": "Archiviert",
    "cs": "Archivováno"
  },
  "common.published": {
    "ru": "Опубликовано",
    "pl": "Opublikowane",
    "en": "Published",
    "es": "Publicado",
    "uk": "Опубліковано",
    "de": "Veröffentlicht",
    "cs": "Publikováno"
  },
  "common.unpublished": {
    "ru": "Не опубликовано",
    "pl": "Nieopublikowane",
    "en": "Unpublished",
    "es": "No publicado",
    "uk": "Не опубліковано",
    "de": "Nicht veröffentlicht",
    "cs": "Nepublikováno"
  },
  "common.verified": {
    "ru": "Проверено",
    "pl": "Zweryfikowane",
    "en": "Verified",
    "es": "Verificado",
    "uk": "Перевірено",
    "de": "Verifiziert",
    "cs": "Ověřeno"
  },
  "common.pending": {
    "ru": "На проверке",
    "pl": "W trakcie weryfikacji",
    "en": "Pending",
    "es": "Pendiente",
    "uk": "На перевірці",
    "de": "Ausstehend",
    "cs": "Čeká na kontrolu"
  },
  "common.rejected": {
    "ru": "Отклонено",
    "pl": "Odrzucone",
    "en": "Rejected",
    "es": "Rechazado",
    "uk": "Відхилено",
    "de": "Abgelehnt",
    "cs": "Zamítnuto"
  },
  "common.unknown": {
    "ru": "Неизвестно",
    "pl": "Nieznane",
    "en": "Unknown",
    "es": "Desconocido",
    "uk": "Невідомо",
    "de": "Unbekannt",
    "cs": "Neznámé"
  },
  "common.required": {
    "ru": "Обязательно",
    "pl": "Wymagane",
    "en": "Required",
    "es": "Obligatorio",
    "uk": "Обов’язково",
    "de": "Erforderlich",
    "cs": "Povinné"
  },
  "common.optional": {
    "ru": "Необязательно",
    "pl": "Opcjonalne",
    "en": "Optional",
    "es": "Opcional",
    "uk": "Необов’язково",
    "de": "Optional",
    "cs": "Volitelné"
  },
  "common.name": {
    "ru": "Название",
    "pl": "Nazwa",
    "en": "Name",
    "es": "Nombre",
    "uk": "Назва",
    "de": "Name",
    "cs": "Název"
  },
  "common.title": {
    "ru": "Заголовок",
    "pl": "Tytuł",
    "en": "Title",
    "es": "Título",
    "uk": "Заголовок",
    "de": "Titel",
    "cs": "Nadpis"
  },
  "common.description": {
    "ru": "Описание",
    "pl": "Opis",
    "en": "Description",
    "es": "Descripción",
    "uk": "Опис",
    "de": "Beschreibung",
    "cs": "Popis"
  },
  "common.category": {
    "ru": "Категория",
    "pl": "Kategoria",
    "en": "Category",
    "es": "Categoría",
    "uk": "Категорія",
    "de": "Kategorie",
    "cs": "Kategorie"
  },
  "common.location": {
    "ru": "Локация",
    "pl": "Lokalizacja",
    "en": "Location",
    "es": "Ubicación",
    "uk": "Локація",
    "de": "Standort",
    "cs": "Lokalita"
  },
  "common.city": {
    "ru": "Город",
    "pl": "Miasto",
    "en": "City",
    "es": "Ciudad",
    "uk": "Місто",
    "de": "Stadt",
    "cs": "Město"
  },
  "common.district": {
    "ru": "Район",
    "pl": "Dzielnica",
    "en": "District",
    "es": "Distrito",
    "uk": "Район",
    "de": "Bezirk",
    "cs": "Čtvrť"
  },
  "common.country": {
    "ru": "Страна",
    "pl": "Kraj",
    "en": "Country",
    "es": "País",
    "uk": "Країна",
    "de": "Land",
    "cs": "Země"
  },
  "common.address": {
    "ru": "Адрес",
    "pl": "Adres",
    "en": "Address",
    "es": "Dirección",
    "uk": "Адреса",
    "de": "Adresse",
    "cs": "Adresa"
  },
  "common.currency": {
    "ru": "Валюта",
    "pl": "Waluta",
    "en": "Currency",
    "es": "Moneda",
    "uk": "Валюта",
    "de": "Währung",
    "cs": "Měna"
  },
  "common.price": {
    "ru": "Цена",
    "pl": "Cena",
    "en": "Price",
    "es": "Precio",
    "uk": "Ціна",
    "de": "Preis",
    "cs": "Cena"
  },
  "common.amount": {
    "ru": "Сумма",
    "pl": "Kwota",
    "en": "Amount",
    "es": "Importe",
    "uk": "Сума",
    "de": "Betrag",
    "cs": "Částka"
  },
  "common.date": {
    "ru": "Дата",
    "pl": "Data",
    "en": "Date",
    "es": "Fecha",
    "uk": "Дата",
    "de": "Datum",
    "cs": "Datum"
  },
  "common.time": {
    "ru": "Время",
    "pl": "Czas",
    "en": "Time",
    "es": "Hora",
    "uk": "Час",
    "de": "Zeit",
    "cs": "Čas"
  },
  "common.duration": {
    "ru": "Длительность",
    "pl": "Czas trwania",
    "en": "Duration",
    "es": "Duración",
    "uk": "Тривалість",
    "de": "Dauer",
    "cs": "Doba trvání"
  },
  "common.minutes": {
    "ru": "мин.",
    "pl": "min",
    "en": "min",
    "es": "min",
    "uk": "хв",
    "de": "Min.",
    "cs": "min"
  },
  "common.hours": {
    "ru": "ч.",
    "pl": "godz.",
    "en": "h",
    "es": "h",
    "uk": "год",
    "de": "Std.",
    "cs": "h"
  },
  "common.actions": {
    "ru": "Действия",
    "pl": "Działania",
    "en": "Actions",
    "es": "Acciones",
    "uk": "Дії",
    "de": "Aktionen",
    "cs": "Akce"
  },
  "common.filters": {
    "ru": "Фильтры",
    "pl": "Filtry",
    "en": "Filters",
    "es": "Filtros",
    "uk": "Фільтри",
    "de": "Filter",
    "cs": "Filtry"
  },
  "common.sort": {
    "ru": "Сортировка",
    "pl": "Sortowanie",
    "en": "Sort",
    "es": "Ordenar",
    "uk": "Сортування",
    "de": "Sortieren",
    "cs": "Řazení"
  },
  "common.clearFilters": {
    "ru": "Очистить фильтры",
    "pl": "Wyczyść filtry",
    "en": "Clear filters",
    "es": "Borrar filtros",
    "uk": "Очистити фільтри",
    "de": "Filter löschen",
    "cs": "Vymazat filtry"
  },
  "common.searchPlaceholder": {
    "ru": "Поиск...",
    "pl": "Szukaj...",
    "en": "Search...",
    "es": "Buscar...",
    "uk": "Пошук...",
    "de": "Suchen...",
    "cs": "Hledat..."
  },
  "common.loadingData": {
    "ru": "Загружаю данные...",
    "pl": "Ładuję dane...",
    "en": "Loading data...",
    "es": "Cargando datos...",
    "uk": "Завантажую дані...",
    "de": "Daten werden geladen...",
    "cs": "Načítám data..."
  },
  "common.errorLoadingData": {
    "ru": "Не удалось загрузить данные.",
    "pl": "Nie udało się załadować danych.",
    "en": "Failed to load data.",
    "es": "No se pudieron cargar los datos.",
    "uk": "Не вдалося завантажити дані.",
    "de": "Daten konnten nicht geladen werden.",
    "cs": "Data se nepodařilo načíst."
  },
  "common.noResults": {
    "ru": "Ничего не найдено.",
    "pl": "Nic nie znaleziono.",
    "en": "No results found.",
    "es": "No se encontraron resultados.",
    "uk": "Нічого не знайдено.",
    "de": "Keine Ergebnisse gefunden.",
    "cs": "Nebyly nalezeny žádné výsledky."
  },
  "common.notAvailable": {
    "ru": "Недоступно",
    "pl": "Niedostępne",
    "en": "Not available",
    "es": "No disponible",
    "uk": "Недоступно",
    "de": "Nicht verfügbar",
    "cs": "Nedostupné"
  },
  "common.notSpecified": {
    "ru": "Не указано",
    "pl": "Nie podano",
    "en": "Not specified",
    "es": "No especificado",
    "uk": "Не вказано",
    "de": "Nicht angegeben",
    "cs": "Neuvedeno"
  },
  "common.showMore": {
    "ru": "Показать больше",
    "pl": "Pokaż więcej",
    "en": "Show more",
    "es": "Mostrar más",
    "uk": "Показати більше",
    "de": "Mehr anzeigen",
    "cs": "Zobrazit více"
  },
  "common.showLess": {
    "ru": "Показать меньше",
    "pl": "Pokaż mniej",
    "en": "Show less",
    "es": "Mostrar menos",
    "uk": "Показати менше",
    "de": "Weniger anzeigen",
    "cs": "Zobrazit méně"
  },
  "common.language": {
    "ru": "Язык",
    "pl": "Język",
    "en": "Language",
    "es": "Idioma",
    "uk": "Мова",
    "de": "Sprache",
    "cs": "Jazyk"
  },
  "common.interfaceLanguage": {
    "ru": "Язык интерфейса",
    "pl": "Język interfejsu",
    "en": "Interface language",
    "es": "Idioma de la interfaz",
    "uk": "Мова інтерфейсу",
    "de": "Sprache der Oberfläche",
    "cs": "Jazyk rozhraní"
  },
  "common.useCurrentLocation": {
    "ru": "Использовать моё местоположение",
    "pl": "Użyj mojej lokalizacji",
    "en": "Use my location",
    "es": "Usar mi ubicación",
    "uk": "Використати моє місцезнаходження",
    "de": "Meinen Standort verwenden",
    "cs": "Použít mou polohu"
  },
  "common.continue": {
    "ru": "Продолжить",
    "pl": "Kontynuuj",
    "en": "Continue",
    "es": "Continuar",
    "uk": "Продовжити",
    "de": "Fortfahren",
    "cs": "Pokračovat"
  },
  "common.finish": {
    "ru": "Завершить",
    "pl": "Zakończ",
    "en": "Finish",
    "es": "Finalizar",
    "uk": "Завершити",
    "de": "Fertigstellen",
    "cs": "Dokončit"
  },
  "common.copy": {
    "ru": "Копировать",
    "pl": "Kopiuj",
    "en": "Copy",
    "es": "Copiar",
    "uk": "Копіювати",
    "de": "Kopieren",
    "cs": "Kopírovat"
  },
  "common.copied": {
    "ru": "Скопировано",
    "pl": "Skopiowano",
    "en": "Copied",
    "es": "Copiado",
    "uk": "Скопійовано",
    "de": "Kopiert",
    "cs": "Zkopírováno"
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

