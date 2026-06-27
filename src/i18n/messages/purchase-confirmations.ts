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
  "purchaseConfirmations.shell.publicPurchasesDescription",
  "purchaseConfirmations.entry.invalidAmount",
  "purchaseConfirmations.entry.submittedMessage",
  "purchaseConfirmations.entry.title",
  "purchaseConfirmations.entry.description",
  "purchaseConfirmations.entry.minimumThresholdPrefix",
  "purchaseConfirmations.entry.thresholdMissing",
  "purchaseConfirmations.entry.amountPlaceholder",
  "purchaseConfirmations.entry.buyerComment",
  "purchaseConfirmations.entry.commentPlaceholder",
  "purchaseConfirmations.entry.receiptUrl",
  "purchaseConfirmations.entry.submitting",
  "purchaseConfirmations.entry.submit",
  "purchaseConfirmations.entry.scopeNote",
  "purchaseConfirmations.entry.viewMyRequests"
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
    "ru": "—",
    "pl": "—",
    "en": "—",
    "es": "—",
    "uk": "—",
    "de": "—",
    "cs": "—"
  },
  "purchaseConfirmations.common.loading": {
    "ru": "Загрузка...",
    "pl": "Ładowanie...",
    "en": "Loading...",
    "es": "Cargando...",
    "uk": "Завантаження...",
    "de": "Wird geladen...",
    "cs": "Načítání..."
  },
  "purchaseConfirmations.common.error": {
    "ru": "Ошибка",
    "pl": "Błąd",
    "en": "Error",
    "es": "Error",
    "uk": "Помилка",
    "de": "Fehler",
    "cs": "Chyba"
  },
  "purchaseConfirmations.common.retry": {
    "ru": "Повторить",
    "pl": "Spróbuj ponownie",
    "en": "Retry",
    "es": "Reintentar",
    "uk": "Повторити",
    "de": "Erneut versuchen",
    "cs": "Zkusit znovu"
  },
  "purchaseConfirmations.common.refresh": {
    "ru": "Обновить",
    "pl": "Odśwież",
    "en": "Refresh",
    "es": "Actualizar",
    "uk": "Оновити",
    "de": "Aktualisieren",
    "cs": "Obnovit"
  },
  "purchaseConfirmations.common.status": {
    "ru": "Статус",
    "pl": "Status",
    "en": "Status",
    "es": "Estado",
    "uk": "Статус",
    "de": "Status",
    "cs": "Stav"
  },
  "purchaseConfirmations.common.amount": {
    "ru": "Сумма покупки",
    "pl": "Kwota zakupu",
    "en": "Purchase amount",
    "es": "Importe de la compra",
    "uk": "Сума покупки",
    "de": "Kaufbetrag",
    "cs": "Částka nákupu"
  },
  "purchaseConfirmations.common.currency": {
    "ru": "Валюта",
    "pl": "Waluta",
    "en": "Currency",
    "es": "Moneda",
    "uk": "Валюта",
    "de": "Währung",
    "cs": "Měna"
  },
  "purchaseConfirmations.common.buyer": {
    "ru": "Покупатель",
    "pl": "Kupujący",
    "en": "Buyer",
    "es": "Comprador",
    "uk": "Покупець",
    "de": "Käufer",
    "cs": "Kupující"
  },
  "purchaseConfirmations.common.seller": {
    "ru": "Продавец",
    "pl": "Sprzedawca",
    "en": "Seller",
    "es": "Vendedor",
    "uk": "Продавець",
    "de": "Verkäufer",
    "cs": "Prodejce"
  },
  "purchaseConfirmations.common.organization": {
    "ru": "Предприятие",
    "pl": "Firma",
    "en": "Business",
    "es": "Empresa",
    "uk": "Підприємство",
    "de": "Unternehmen",
    "cs": "Podnik"
  },
  "purchaseConfirmations.common.comment": {
    "ru": "Комментарий",
    "pl": "Komentarz",
    "en": "Comment",
    "es": "Comentario",
    "uk": "Коментар",
    "de": "Kommentar",
    "cs": "Komentář"
  },
  "purchaseConfirmations.common.createdAt": {
    "ru": "Создано",
    "pl": "Utworzono",
    "en": "Created",
    "es": "Creado",
    "uk": "Створено",
    "de": "Erstellt",
    "cs": "Vytvořeno"
  },
  "purchaseConfirmations.common.confirmedAt": {
    "ru": "Подтверждено",
    "pl": "Potwierdzono",
    "en": "Confirmed",
    "es": "Confirmado",
    "uk": "Підтверджено",
    "de": "Bestätigt",
    "cs": "Potvrzeno"
  },
  "purchaseConfirmations.common.rejectedAt": {
    "ru": "Отклонено",
    "pl": "Odrzucono",
    "en": "Rejected",
    "es": "Rechazado",
    "uk": "Відхилено",
    "de": "Abgelehnt",
    "cs": "Odmítnuto"
  },
  "purchaseConfirmations.common.pointsAwarded": {
    "ru": "Начислено POINTS",
    "pl": "Przyznane POINTS",
    "en": "POINTS awarded",
    "es": "POINTS concedidos",
    "uk": "Нараховано POINTS",
    "de": "Gutgeschriebene POINTS",
    "cs": "Připsané POINTS"
  },
  "purchaseConfirmations.common.auditLog": {
    "ru": "Журнал событий",
    "pl": "Dziennik zdarzeń",
    "en": "Event log",
    "es": "Registro de eventos",
    "uk": "Журнал подій",
    "de": "Ereignisprotokoll",
    "cs": "Protokol událostí"
  },
  "purchaseConfirmations.common.back": {
    "ru": "Назад",
    "pl": "Wstecz",
    "en": "Back",
    "es": "Volver",
    "uk": "Назад",
    "de": "Zurück",
    "cs": "Zpět"
  },
  "purchaseConfirmations.common.closeFilter": {
    "ru": "Сбросить фильтр",
    "pl": "Wyczyść filtr",
    "en": "Clear filter",
    "es": "Borrar filtro",
    "uk": "Скинути фільтр",
    "de": "Filter löschen",
    "cs": "Vymazat filtr"
  },
  "purchaseConfirmations.status.requested": {
    "ru": "Ожидает решения",
    "pl": "Oczekuje na decyzję",
    "en": "Awaiting decision",
    "es": "Pendiente de decisión",
    "uk": "Очікує рішення",
    "de": "Wartet auf Entscheidung",
    "cs": "Čeká na rozhodnutí"
  },
  "purchaseConfirmations.status.confirmed": {
    "ru": "Покупка подтверждена",
    "pl": "Zakup potwierdzony",
    "en": "Purchase confirmed",
    "es": "Compra confirmada",
    "uk": "Покупку підтверджено",
    "de": "Kauf bestätigt",
    "cs": "Nákup potvrzen"
  },
  "purchaseConfirmations.status.rejected": {
    "ru": "Покупка отклонена",
    "pl": "Zakup odrzucony",
    "en": "Purchase rejected",
    "es": "Compra rechazada",
    "uk": "Покупку відхилено",
    "de": "Kauf abgelehnt",
    "cs": "Nákup odmítnut"
  },
  "purchaseConfirmations.status.cancelled": {
    "ru": "Заявка отменена",
    "pl": "Zgłoszenie anulowane",
    "en": "Request cancelled",
    "es": "Solicitud cancelada",
    "uk": "Заявку скасовано",
    "de": "Anfrage storniert",
    "cs": "Žádost zrušena"
  },
  "purchaseConfirmations.role.buyer": {
    "ru": "Покупатель",
    "pl": "Kupujący",
    "en": "Buyer",
    "es": "Comprador",
    "uk": "Покупець",
    "de": "Käufer",
    "cs": "Kupující"
  },
  "purchaseConfirmations.role.seller": {
    "ru": "Продавец предприятия",
    "pl": "Sprzedawca firmy",
    "en": "Business seller",
    "es": "Vendedor de la empresa",
    "uk": "Продавець підприємства",
    "de": "Unternehmensverkäufer",
    "cs": "Prodejce podniku"
  },
  "purchaseConfirmations.event.created": {
    "ru": "Заявка создана",
    "pl": "Zgłoszenie utworzone",
    "en": "Request created",
    "es": "Solicitud creada",
    "uk": "Заявку створено",
    "de": "Anfrage erstellt",
    "cs": "Žádost vytvořena"
  },
  "purchaseConfirmations.event.confirmed": {
    "ru": "Покупка подтверждена",
    "pl": "Zakup potwierdzony",
    "en": "Purchase confirmed",
    "es": "Compra confirmada",
    "uk": "Покупку підтверджено",
    "de": "Kauf bestätigt",
    "cs": "Nákup potvrzen"
  },
  "purchaseConfirmations.event.rejected": {
    "ru": "Покупка отклонена",
    "pl": "Zakup odrzucony",
    "en": "Purchase rejected",
    "es": "Compra rechazada",
    "uk": "Покупку відхилено",
    "de": "Kauf abgelehnt",
    "cs": "Nákup odmítnut"
  },
  "purchaseConfirmations.event.correctedToConfirmed": {
    "ru": "Исправление: отклонённая заявка подтверждена",
    "pl": "Korekta: odrzucone zgłoszenie potwierdzono",
    "en": "Correction: rejected request confirmed",
    "es": "Corrección: solicitud rechazada confirmada",
    "uk": "Виправлення: відхилену заявку підтверджено",
    "de": "Korrektur: abgelehnte Anfrage bestätigt",
    "cs": "Oprava: odmítnutá žádost potvrzena"
  },
  "purchaseConfirmations.event.cancelled": {
    "ru": "Заявка отменена",
    "pl": "Zgłoszenie anulowane",
    "en": "Request cancelled",
    "es": "Solicitud cancelada",
    "uk": "Заявку скасовано",
    "de": "Anfrage storniert",
    "cs": "Žádost zrušena"
  },
  "purchaseConfirmations.event.unknown": {
    "ru": "Событие",
    "pl": "Zdarzenie",
    "en": "Event",
    "es": "Evento",
    "uk": "Подія",
    "de": "Ereignis",
    "cs": "Událost"
  },
  "purchaseConfirmations.seller.title": {
    "ru": "Подтверждение покупок",
    "pl": "Potwierdzanie zakupów",
    "en": "Purchase confirmations",
    "es": "Confirmaciones de compra",
    "uk": "Підтвердження покупок",
    "de": "Kaufbestätigungen",
    "cs": "Potvrzení nákupů"
  },
  "purchaseConfirmations.seller.description": {
    "ru": "Здесь продавец проверяет заявки покупателей и подтверждает только реальные покупки. После подтверждения система может начислить POINTS.",
    "pl": "Tutaj sprzedawca sprawdza zgłoszenia kupujących i potwierdza tylko realne zakupy. Po potwierdzeniu system może naliczyć POINTS.",
    "en": "Here the seller reviews buyer requests and confirms only real purchases. After confirmation the system may award POINTS.",
    "es": "Aquí el vendedor revisa las solicitudes de los compradores y confirma solo compras reales. Tras la confirmación el sistema puede conceder POINTS.",
    "uk": "Тут продавець перевіряє заявки покупців і підтверджує лише реальні покупки. Після підтвердження система може нарахувати POINTS.",
    "de": "Hier prüft der Verkäufer Käuferanfragen und bestätigt nur echte Käufe. Nach der Bestätigung kann das System POINTS gutschreiben.",
    "cs": "Zde prodejce kontroluje žádosti kupujících a potvrzuje jen skutečné nákupy. Po potvrzení může systém připsat POINTS."
  },
  "purchaseConfirmations.seller.kicker": {
    "ru": "Панель продавца",
    "pl": "Panel sprzedawcy",
    "en": "Seller panel",
    "es": "Panel del vendedor",
    "uk": "Панель продавця",
    "de": "Verkäuferbereich",
    "cs": "Panel prodejce"
  },
  "purchaseConfirmations.seller.pendingCard": {
    "ru": "Ожидают решения",
    "pl": "Oczekują decyzji",
    "en": "Awaiting decision",
    "es": "Pendientes de decisión",
    "uk": "Очікують рішення",
    "de": "Warten auf Entscheidung",
    "cs": "Čekají na rozhodnutí"
  },
  "purchaseConfirmations.seller.confirmedCard": {
    "ru": "Подтверждено",
    "pl": "Potwierdzone",
    "en": "Confirmed",
    "es": "Confirmadas",
    "uk": "Підтверджено",
    "de": "Bestätigt",
    "cs": "Potvrzeno"
  },
  "purchaseConfirmations.seller.pointsCard": {
    "ru": "Начислено POINTS",
    "pl": "Przyznane POINTS",
    "en": "POINTS awarded",
    "es": "POINTS concedidos",
    "uk": "Нараховано POINTS",
    "de": "Gutgeschriebene POINTS",
    "cs": "Připsané POINTS"
  },
  "purchaseConfirmations.seller.filterTitle": {
    "ru": "Фильтр по предприятию",
    "pl": "Filtr według firmy",
    "en": "Filter by business",
    "es": "Filtrar por empresa",
    "uk": "Фільтр за підприємством",
    "de": "Nach Unternehmen filtern",
    "cs": "Filtrovat podle podniku"
  },
  "purchaseConfirmations.seller.filterDescription": {
    "ru": "Показаны заявки выбранного предприятия.",
    "pl": "Pokazano zgłoszenia wybranej firmy.",
    "en": "Requests for the selected business are shown.",
    "es": "Se muestran las solicitudes de la empresa seleccionada.",
    "uk": "Показано заявки вибраного підприємства.",
    "de": "Anfragen des ausgewählten Unternehmens werden angezeigt.",
    "cs": "Zobrazují se žádosti vybraného podniku."
  },
  "purchaseConfirmations.seller.allOrganizations": {
    "ru": "Все предприятия",
    "pl": "Wszystkie firmy",
    "en": "All businesses",
    "es": "Todas las empresas",
    "uk": "Усі підприємства",
    "de": "Alle Unternehmen",
    "cs": "Všechny podniky"
  },
  "purchaseConfirmations.seller.confirmAction": {
    "ru": "Подтвердить покупку",
    "pl": "Potwierdź zakup",
    "en": "Confirm purchase",
    "es": "Confirmar compra",
    "uk": "Підтвердити покупку",
    "de": "Kauf bestätigen",
    "cs": "Potvrdit nákup"
  },
  "purchaseConfirmations.seller.rejectAction": {
    "ru": "Отклонить заявку",
    "pl": "Odrzuć zgłoszenie",
    "en": "Reject request",
    "es": "Rechazar solicitud",
    "uk": "Відхилити заявку",
    "de": "Anfrage ablehnen",
    "cs": "Odmítnout žádost"
  },
  "purchaseConfirmations.seller.processing": {
    "ru": "Обработка...",
    "pl": "Przetwarzanie...",
    "en": "Processing...",
    "es": "Procesando...",
    "uk": "Обробка...",
    "de": "Wird verarbeitet...",
    "cs": "Zpracování..."
  },
  "purchaseConfirmations.seller.commentPlaceholder": {
    "ru": "Комментарий продавца, если нужен",
    "pl": "Komentarz sprzedawcy, jeśli potrzebny",
    "en": "Seller comment, if needed",
    "es": "Comentario del vendedor, si hace falta",
    "uk": "Коментар продавця, якщо потрібен",
    "de": "Verkäuferkommentar, falls nötig",
    "cs": "Komentář prodejce, pokud je potřeba"
  },
  "purchaseConfirmations.seller.confirmedMessage": {
    "ru": "Покупка подтверждена. Если эта заявка ранее была отклонена по ошибке, исправление сохранено в журнале событий.",
    "pl": "Zakup potwierdzony. Jeśli to zgłoszenie wcześniej odrzucono przez pomyłkę, korekta została zapisana w dzienniku zdarzeń.",
    "en": "Purchase confirmed. If this request was previously rejected by mistake, the correction was saved in the event log.",
    "es": "Compra confirmada. Si esta solicitud se rechazó antes por error, la corrección se guardó en el registro de eventos.",
    "uk": "Покупку підтверджено. Якщо цю заявку раніше помилково відхилили, виправлення збережено в журналі подій.",
    "de": "Kauf bestätigt. Wenn diese Anfrage zuvor versehentlich abgelehnt wurde, wurde die Korrektur im Ereignisprotokoll gespeichert.",
    "cs": "Nákup potvrzen. Pokud byla tato žádost dříve omylem odmítnuta, oprava byla uložena do protokolu událostí."
  },
  "purchaseConfirmations.seller.rejectedMessage": {
    "ru": "Покупка отклонена. Решение сохранено в журнале событий.",
    "pl": "Zakup odrzucony. Decyzja została zapisana w dzienniku zdarzeń.",
    "en": "Purchase rejected. The decision was saved in the event log.",
    "es": "Compra rechazada. La decisión se guardó en el registro de eventos.",
    "uk": "Покупку відхилено. Рішення збережено в журналі подій.",
    "de": "Kauf abgelehnt. Die Entscheidung wurde im Ereignisprotokoll gespeichert.",
    "cs": "Nákup odmítnut. Rozhodnutí bylo uloženo do protokolu událostí."
  },
  "purchaseConfirmations.seller.loadError": {
    "ru": "Не удалось загрузить заявки на подтверждение покупок",
    "pl": "Nie udało się załadować zgłoszeń do potwierdzenia zakupów",
    "en": "Cannot load purchase confirmations",
    "es": "No se pueden cargar las confirmaciones de compra",
    "uk": "Не вдалося завантажити заявки на підтвердження покупок",
    "de": "Kaufbestätigungen können nicht geladen werden",
    "cs": "Nelze načíst potvrzení nákupů"
  },
  "purchaseConfirmations.seller.actionError": {
    "ru": "Не удалось выполнить действие с заявкой",
    "pl": "Nie udało się wykonać działania na zgłoszeniu",
    "en": "Cannot process purchase confirmation",
    "es": "No se puede procesar la confirmación de compra",
    "uk": "Не вдалося виконати дію із заявкою",
    "de": "Kaufbestätigung kann nicht verarbeitet werden",
    "cs": "Nelze zpracovat potvrzení nákupu"
  },
  "purchaseConfirmations.seller.emptyTitle": {
    "ru": "Заявок пока нет",
    "pl": "Nie ma jeszcze zgłoszeń",
    "en": "No requests yet",
    "es": "Todavía no hay solicitudes",
    "uk": "Заявок поки немає",
    "de": "Noch keine Anfragen",
    "cs": "Zatím žádné žádosti"
  },
  "purchaseConfirmations.seller.emptyDescription": {
    "ru": "Когда покупатели зарегистрируют внешнюю покупку, заявки появятся здесь.",
    "pl": "Gdy kupujący zarejestrują zakup zewnętrzny, zgłoszenia pojawią się tutaj.",
    "en": "When buyers register an external purchase, requests will appear here.",
    "es": "Cuando los compradores registren una compra externa, las solicitudes aparecerán aquí.",
    "uk": "Коли покупці зареєструють зовнішню покупку, заявки з’являться тут.",
    "de": "Wenn Käufer einen externen Kauf registrieren, erscheinen die Anfragen hier.",
    "cs": "Když kupující zaregistrují externí nákup, žádosti se zobrazí zde."
  },
  "purchaseConfirmations.seller.viewAudit": {
    "ru": "Открыть журнал",
    "pl": "Otwórz dziennik",
    "en": "Open log",
    "es": "Abrir registro",
    "uk": "Відкрити журнал",
    "de": "Protokoll öffnen",
    "cs": "Otevřít protokol"
  },
  "purchaseConfirmations.buyer.title": {
    "ru": "Мои подтверждения покупок",
    "pl": "Moje potwierdzenia zakupów",
    "en": "My purchase confirmations",
    "es": "Mis confirmaciones de compra",
    "uk": "Мої підтвердження покупок",
    "de": "Meine Kaufbestätigungen",
    "cs": "Moje potvrzení nákupů"
  },
  "purchaseConfirmations.buyer.description": {
    "ru": "Здесь показаны ваши заявки на подтверждение внешних покупок, статус проверки продавцом и влияние на POINTS.",
    "pl": "Tutaj widać Twoje zgłoszenia zewnętrznych zakupów, status weryfikacji przez sprzedawcę i wpływ na POINTS.",
    "en": "Your external purchase requests, seller review status and POINTS impact are shown here.",
    "es": "Aquí se muestran tus solicitudes de compras externas, el estado de revisión del vendedor y el impacto en POINTS.",
    "uk": "Тут показано ваші заявки на підтвердження зовнішніх покупок, статус перевірки продавцем і вплив на POINTS.",
    "de": "Hier werden Ihre externen Kaufanfragen, der Prüfstatus des Verkäufers und die Auswirkungen auf POINTS angezeigt.",
    "cs": "Zde se zobrazují vaše žádosti o potvrzení externích nákupů, stav kontroly prodejcem a dopad na POINTS."
  },
  "purchaseConfirmations.buyer.emptyTitle": {
    "ru": "Покупки пока не зарегистрированы",
    "pl": "Nie zarejestrowano jeszcze zakupów",
    "en": "No purchases registered yet",
    "es": "Aún no hay compras registradas",
    "uk": "Покупки ще не зареєстровано",
    "de": "Noch keine Käufe registriert",
    "cs": "Zatím nejsou registrovány žádné nákupy"
  },
  "purchaseConfirmations.buyer.emptyDescription": {
    "ru": "Откройте публичную карточку предприятия и зарегистрируйте покупку, если flow доступен.",
    "pl": "Otwórz publiczną kartę firmy i zarejestruj zakup, jeśli ten flow jest dostępny.",
    "en": "Open a public business card and register a purchase if the flow is available.",
    "es": "Abre la ficha pública de una empresa y registra una compra si el flujo está disponible.",
    "uk": "Відкрийте публічну картку підприємства й зареєструйте покупку, якщо flow доступний.",
    "de": "Öffnen Sie eine öffentliche Unternehmenskarte und registrieren Sie einen Kauf, wenn der Ablauf verfügbar ist.",
    "cs": "Otevřete veřejnou kartu podniku a zaregistrujte nákup, pokud je tento flow dostupný."
  },
  "purchaseConfirmations.buyer.viewAudit": {
    "ru": "История заявки",
    "pl": "Historia zgłoszenia",
    "en": "Request history",
    "es": "Historial de la solicitud",
    "uk": "Історія заявки",
    "de": "Anfrageverlauf",
    "cs": "Historie žádosti"
  },
  "purchaseConfirmations.history.title": {
    "ru": "Публичная история покупок",
    "pl": "Publiczna historia zakupów",
    "en": "Public purchase history",
    "es": "Historial público de compras",
    "uk": "Публічна історія покупок",
    "de": "Öffentliche Kaufhistorie",
    "cs": "Veřejná historie nákupů"
  },
  "purchaseConfirmations.history.description": {
    "ru": "Показываются подтверждённые покупки с маскированными именами покупателей и открытыми названиями предприятий.",
    "pl": "Widoczne są potwierdzone zakupy z zamaskowanymi nazwami kupujących i publicznymi nazwami firm.",
    "en": "Confirmed purchases are shown with masked buyer names and public business names.",
    "es": "Se muestran compras confirmadas con nombres de compradores enmascarados y nombres públicos de empresas.",
    "uk": "Показано підтверджені покупки з маскованими іменами покупців і відкритими назвами підприємств.",
    "de": "Bestätigte Käufe werden mit maskierten Käufernamen und öffentlichen Unternehmensnamen angezeigt.",
    "cs": "Potvrzené nákupy se zobrazují s maskovanými jmény kupujících a veřejnými názvy podniků."
  },
  "purchaseConfirmations.history.confirmedPurchases": {
    "ru": "Подтверждённые покупки",
    "pl": "Potwierdzone zakupy",
    "en": "Confirmed purchases",
    "es": "Compras confirmadas",
    "uk": "Підтверджені покупки",
    "de": "Bestätigte Käufe",
    "cs": "Potvrzené nákupy"
  },
  "purchaseConfirmations.history.emptyTitle": {
    "ru": "Подтверждённых покупок пока нет",
    "pl": "Nie ma jeszcze potwierdzonych zakupów",
    "en": "No confirmed purchases yet",
    "es": "Aún no hay compras confirmadas",
    "uk": "Підтверджених покупок поки немає",
    "de": "Noch keine bestätigten Käufe",
    "cs": "Zatím žádné potvrzené nákupy"
  },
  "purchaseConfirmations.history.emptyDescription": {
    "ru": "После подтверждения продавцом покупки появятся в публичной истории.",
    "pl": "Po potwierdzeniu przez sprzedawcę zakupy pojawią się w publicznej historii.",
    "en": "After seller confirmation, purchases will appear in the public history.",
    "es": "Tras la confirmación del vendedor, las compras aparecerán en el historial público.",
    "uk": "Після підтвердження продавцем покупки з’являться в публічній історії.",
    "de": "Nach der Bestätigung durch den Verkäufer erscheinen Käufe in der öffentlichen Historie.",
    "cs": "Po potvrzení prodejcem se nákupy zobrazí ve veřejné historii."
  },
  "purchaseConfirmations.history.publicCode": {
    "ru": "Публичный код",
    "pl": "Kod publiczny",
    "en": "Public code",
    "es": "Código público",
    "uk": "Публічний код",
    "de": "Öffentlicher Code",
    "cs": "Veřejný kód"
  },
  "purchaseConfirmations.history.buyerMaskedName": {
    "ru": "Покупатель",
    "pl": "Kupujący",
    "en": "Buyer",
    "es": "Comprador",
    "uk": "Покупець",
    "de": "Käufer",
    "cs": "Kupující"
  },
  "purchaseConfirmations.history.purchaseLabel": {
    "ru": "Покупка",
    "pl": "Zakup",
    "en": "Purchase",
    "es": "Compra",
    "uk": "Покупка",
    "de": "Kauf",
    "cs": "Nákup"
  },
  "purchaseConfirmations.history.purchaseDate": {
    "ru": "Дата покупки",
    "pl": "Data zakupu",
    "en": "Purchase date",
    "es": "Fecha de compra",
    "uk": "Дата покупки",
    "de": "Kaufdatum",
    "cs": "Datum nákupu"
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
    "ru": "История заявки на покупку",
    "pl": "Historia zgłoszenia zakupu",
    "en": "Purchase request history",
    "es": "Historial de la solicitud de compra",
    "uk": "Історія заявки на покупку",
    "de": "Historie der Kaufanfrage",
    "cs": "Historie žádosti o nákup"
  },
  "purchaseConfirmations.events.description": {
    "ru": "Показаны события заявки: создание, подтверждение, отклонение и исправления.",
    "pl": "Pokazano zdarzenia zgłoszenia: utworzenie, potwierdzenie, odrzucenie i korekty.",
    "en": "Request events are shown: creation, confirmation, rejection and corrections.",
    "es": "Se muestran los eventos de la solicitud: creación, confirmación, rechazo y correcciones.",
    "uk": "Показано події заявки: створення, підтвердження, відхилення й виправлення.",
    "de": "Anfrageereignisse werden angezeigt: Erstellung, Bestätigung, Ablehnung und Korrekturen.",
    "cs": "Zobrazují se události žádosti: vytvoření, potvrzení, odmítnutí a opravy."
  },
  "purchaseConfirmations.events.accessRole": {
    "ru": "Роль доступа",
    "pl": "Rola dostępu",
    "en": "Access role",
    "es": "Rol de acceso",
    "uk": "Роль доступу",
    "de": "Zugriffsrolle",
    "cs": "Role přístupu"
  },
  "purchaseConfirmations.events.timeline": {
    "ru": "Лента событий",
    "pl": "Oś zdarzeń",
    "en": "Event timeline",
    "es": "Cronología de eventos",
    "uk": "Стрічка подій",
    "de": "Ereignisverlauf",
    "cs": "Časová osa událostí"
  },
  "purchaseConfirmations.events.emptyTitle": {
    "ru": "Событий пока нет",
    "pl": "Nie ma jeszcze zdarzeń",
    "en": "No events yet",
    "es": "Aún no hay eventos",
    "uk": "Подій поки немає",
    "de": "Noch keine Ereignisse",
    "cs": "Zatím žádné události"
  },
  "purchaseConfirmations.events.emptyDescription": {
    "ru": "Когда статус заявки изменится, события появятся здесь.",
    "pl": "Gdy status zgłoszenia się zmieni, zdarzenia pojawią się tutaj.",
    "en": "When the request status changes, events will appear here.",
    "es": "Cuando cambie el estado de la solicitud, los eventos aparecerán aquí.",
    "uk": "Коли статус заявки зміниться, події з’являться тут.",
    "de": "Wenn sich der Status der Anfrage ändert, erscheinen Ereignisse hier.",
    "cs": "Když se stav žádosti změní, události se zobrazí zde."
  },
  "purchaseConfirmations.events.backToSeller": {
    "ru": "Назад к заявкам продавца",
    "pl": "Wróć do zgłoszeń sprzedawcy",
    "en": "Back to seller requests",
    "es": "Volver a solicitudes del vendedor",
    "uk": "Назад до заявок продавця",
    "de": "Zurück zu Verkäuferanfragen",
    "cs": "Zpět k žádostem prodejce"
  },
  "purchaseConfirmations.events.backToBuyer": {
    "ru": "Назад к моим заявкам",
    "pl": "Wróć do moich zgłoszeń",
    "en": "Back to my requests",
    "es": "Volver a mis solicitudes",
    "uk": "Назад до моїх заявок",
    "de": "Zurück zu meinen Anfragen",
    "cs": "Zpět k mým žádostem"
  },
  "purchaseConfirmations.events.statusBefore": {
    "ru": "Статус до",
    "pl": "Status przed",
    "en": "Status before",
    "es": "Estado anterior",
    "uk": "Статус до",
    "de": "Status vorher",
    "cs": "Stav před"
  },
  "purchaseConfirmations.events.statusAfter": {
    "ru": "Статус после",
    "pl": "Status po",
    "en": "Status after",
    "es": "Estado posterior",
    "uk": "Статус після",
    "de": "Status danach",
    "cs": "Stav po"
  },
  "purchaseConfirmations.events.sellerComment": {
    "ru": "Комментарий продавца",
    "pl": "Komentarz sprzedawcy",
    "en": "Seller comment",
    "es": "Comentario del vendedor",
    "uk": "Коментар продавця",
    "de": "Verkäuferkommentar",
    "cs": "Komentář prodejce"
  },
  "purchaseConfirmations.shell.buyerTitle": {
    "ru": "Подтверждения покупок",
    "pl": "Potwierdzenia zakupów",
    "en": "Purchase confirmations",
    "es": "Confirmaciones de compra",
    "uk": "Підтвердження покупок",
    "de": "Kaufbestätigungen",
    "cs": "Potvrzení nákupů"
  },
  "purchaseConfirmations.shell.buyerDescription": {
    "ru": "Маршрут покупателя для внешнего доказательства покупки, статуса проверки продавцом и предварительного влияния на POINTS.",
    "pl": "Trasa kupującego dla zewnętrznego dowodu zakupu, statusu weryfikacji sprzedawcy i podglądu wpływu na POINTS.",
    "en": "Buyer route for external purchase proof, seller review status and POINTS impact preview.",
    "es": "Ruta del comprador para prueba externa de compra, estado de revisión del vendedor y vista previa del impacto en POINTS.",
    "uk": "Маршрут покупця для зовнішнього доказу покупки, статусу перевірки продавцем і попереднього впливу на POINTS.",
    "de": "Käuferroute für externen Kaufnachweis, Verkäuferprüfung und Vorschau der Auswirkungen auf POINTS.",
    "cs": "Trasa kupujícího pro externí důkaz nákupu, stav kontroly prodejcem a náhled dopadu na POINTS."
  },
  "purchaseConfirmations.shell.sellerTitle": {
    "ru": "Заявки продавца",
    "pl": "Zgłoszenia sprzedawcy",
    "en": "Seller confirmations",
    "es": "Confirmaciones del vendedor",
    "uk": "Заявки продавця",
    "de": "Verkäuferbestätigungen",
    "cs": "Potvrzení prodejce"
  },
  "purchaseConfirmations.shell.sellerDescription": {
    "ru": "Очередь продавца для ожидающих, отклонённых и подтверждённых внешних покупок.",
    "pl": "Kolejka sprzedawcy dla oczekujących, odrzuconych i potwierdzonych zakupów zewnętrznych.",
    "en": "Seller queue for pending, rejected and confirmed external purchase requests.",
    "es": "Cola del vendedor para solicitudes de compras externas pendientes, rechazadas y confirmadas.",
    "uk": "Черга продавця для очікуваних, відхилених і підтверджених зовнішніх покупок.",
    "de": "Verkäuferwarteschlange für ausstehende, abgelehnte und bestätigte externe Kaufanfragen.",
    "cs": "Fronta prodejce pro čekající, odmítnuté a potvrzené externí nákupy."
  },
  "purchaseConfirmations.shell.publicPurchasesTitle": {
    "ru": "Публичные покупки",
    "pl": "Publiczne zakupy",
    "en": "Public purchases",
    "es": "Compras públicas",
    "uk": "Публічні покупки",
    "de": "Öffentliche Käufe",
    "cs": "Veřejné nákupy"
  },
  "purchaseConfirmations.shell.publicPurchasesDescription": {
    "ru": "Публичная история подтверждённых внешних покупок с маскированными покупателями.",
    "pl": "Publiczna historia potwierdzonych zakupów zewnętrznych z zamaskowanymi kupującymi.",
    "en": "Public history of confirmed external purchases with masked buyers.",
    "es": "Historial público de compras externas confirmadas con compradores enmascarados.",
    "uk": "Публічна історія підтверджених зовнішніх покупок із маскованими покупцями.",
    "de": "Öffentliche Historie bestätigter externer Käufe mit maskierten Käufern.",
    "cs": "Veřejná historie potvrzených externích nákupů s maskovanými kupujícími."
  },
  "purchaseConfirmations.entry.invalidAmount": {
    "ru": "Введите положительную сумму покупки.",
    "pl": "Wpisz dodatnią kwotę zakupu.",
    "en": "Enter a positive purchase amount.",
    "es": "Introduce un importe de compra positivo.",
    "uk": "Введіть додатну суму покупки.",
    "de": "Geben Sie einen positiven Kaufbetrag ein.",
    "cs": "Zadejte kladnou částku nákupu."
  },
  "purchaseConfirmations.entry.submittedMessage": {
    "ru": "Заявка на подтверждение покупки создана. Продавец сможет подтвердить или отклонить её.",
    "pl": "Zgłoszenie potwierdzenia zakupu zostało utworzone. Sprzedawca będzie mógł je potwierdzić albo odrzucić.",
    "en": "The purchase confirmation request has been created. The seller can confirm or reject it.",
    "es": "La solicitud de confirmación de compra se ha creado. El vendedor puede confirmarla o rechazarla.",
    "uk": "Заявку на підтвердження покупки створено. Продавець зможе підтвердити або відхилити її.",
    "de": "Die Kaufbestätigungsanfrage wurde erstellt. Der Verkäufer kann sie bestätigen oder ablehnen.",
    "cs": "Žádost o potvrzení nákupu byla vytvořena. Prodejce ji může potvrdit nebo odmítnout."
  },
  "purchaseConfirmations.entry.title": {
    "ru": "Зарегистрировать покупку",
    "pl": "Zarejestruj zakup",
    "en": "Register purchase",
    "es": "Registrar compra",
    "uk": "Зареєструвати покупку",
    "de": "Kauf registrieren",
    "cs": "Registrovat nákup"
  },
  "purchaseConfirmations.entry.description": {
    "ru": "Если покупка была совершена вне платформы, клиент может отправить заявку на подтверждение. Продавец проверит покупку, а после подтверждения система начислит POINTS как бонусные единицы программы лояльности.",
    "pl": "Jeśli zakup został dokonany poza platformą, klient może wysłać zgłoszenie do potwierdzenia. Sprzedawca sprawdzi zakup, a po potwierdzeniu system naliczy POINTS jako jednostki bonusowe programu lojalnościowego.",
    "en": "If the purchase was completed outside the platform, the client can send a confirmation request. The seller reviews the purchase, and after confirmation the system awards POINTS as loyalty bonus units.",
    "es": "Si la compra se realizó fuera de la plataforma, el cliente puede enviar una solicitud de confirmación. El vendedor revisa la compra y, tras confirmarla, el sistema concede POINTS como unidades de bonificación del programa de fidelidad.",
    "uk": "Якщо покупку здійснено поза платформою, клієнт може надіслати заявку на підтвердження. Продавець перевірить покупку, а після підтвердження система нарахує POINTS як бонусні одиниці програми лояльності.",
    "de": "Wenn der Kauf außerhalb der Plattform abgeschlossen wurde, kann der Kunde eine Bestätigungsanfrage senden. Der Verkäufer prüft den Kauf und nach der Bestätigung vergibt das System POINTS als Bonuseinheiten des Treueprogramms.",
    "cs": "Pokud byl nákup dokončen mimo platformu, klient může odeslat žádost o potvrzení. Prodejce nákup zkontroluje a po potvrzení systém připíše POINTS jako bonusové jednotky věrnostního programu."
  },
  "purchaseConfirmations.entry.minimumThresholdPrefix": {
    "ru": "Минимальная сумма для начисления 10 POINTS:",
    "pl": "Minimalna kwota do naliczenia 10 POINTS:",
    "en": "Minimum amount for awarding 10 POINTS:",
    "es": "Importe mínimo para conceder 10 POINTS:",
    "uk": "Мінімальна сума для нарахування 10 POINTS:",
    "de": "Mindestbetrag für die Gutschrift von 10 POINTS:",
    "cs": "Minimální částka pro připsání 10 POINTS:"
  },
  "purchaseConfirmations.entry.thresholdMissing": {
    "ru": "Минимальный порог начисления POINTS пока не определён: проверьте страну и валюту предприятия.",
    "pl": "Minimalny próg naliczania POINTS nie jest jeszcze określony: sprawdź kraj i walutę firmy.",
    "en": "The minimum POINTS threshold is not defined yet: check the business country and currency.",
    "es": "El umbral mínimo para conceder POINTS aún no está definido: comprueba el país y la moneda de la empresa.",
    "uk": "Мінімальний поріг нарахування POINTS ще не визначено: перевірте країну й валюту підприємства.",
    "de": "Der Mindestschwellenwert für POINTS ist noch nicht festgelegt: prüfen Sie Land und Währung des Unternehmens.",
    "cs": "Minimální práh pro připsání POINTS zatím není určen: zkontrolujte zemi a měnu podniku."
  },
  "purchaseConfirmations.entry.amountPlaceholder": {
    "ru": "Например: 95",
    "pl": "Na przykład: 95",
    "en": "Example: 95",
    "es": "Por ejemplo: 95",
    "uk": "Наприклад: 95",
    "de": "Zum Beispiel: 95",
    "cs": "Například: 95"
  },
  "purchaseConfirmations.entry.buyerComment": {
    "ru": "Комментарий покупателя",
    "pl": "Komentarz kupującego",
    "en": "Buyer comment",
    "es": "Comentario del comprador",
    "uk": "Коментар покупця",
    "de": "Käuferkommentar",
    "cs": "Komentář kupujícího"
  },
  "purchaseConfirmations.entry.commentPlaceholder": {
    "ru": "Например: покупка сертификата, услуга, номер заказа или ссылка на чек.",
    "pl": "Na przykład: zakup certyfikatu, usługa, numer zamówienia albo link do paragonu.",
    "en": "Example: certificate purchase, service, order number or receipt link.",
    "es": "Por ejemplo: compra de certificado, servicio, número de pedido o enlace al recibo.",
    "uk": "Наприклад: покупка сертифіката, послуга, номер замовлення або посилання на чек.",
    "de": "Zum Beispiel: Zertifikatskauf, Dienstleistung, Bestellnummer oder Link zum Beleg.",
    "cs": "Například: nákup certifikátu, služba, číslo objednávky nebo odkaz na účtenku."
  },
  "purchaseConfirmations.entry.receiptUrl": {
    "ru": "Ссылка на чек или подтверждение",
    "pl": "Link do paragonu albo potwierdzenia",
    "en": "Receipt or confirmation link",
    "es": "Enlace al recibo o confirmación",
    "uk": "Посилання на чек або підтвердження",
    "de": "Link zum Beleg oder zur Bestätigung",
    "cs": "Odkaz na účtenku nebo potvrzení"
  },
  "purchaseConfirmations.entry.submitting": {
    "ru": "Отправляю заявку...",
    "pl": "Wysyłam zgłoszenie...",
    "en": "Sending request...",
    "es": "Enviando solicitud...",
    "uk": "Надсилаю заявку...",
    "de": "Anfrage wird gesendet...",
    "cs": "Odesílám žádost..."
  },
  "purchaseConfirmations.entry.submit": {
    "ru": "Зарегистрировать покупку",
    "pl": "Zarejestruj zakup",
    "en": "Register purchase",
    "es": "Registrar compra",
    "uk": "Зареєструвати покупку",
    "de": "Kauf registrieren",
    "cs": "Registrovat nákup"
  },
  "purchaseConfirmations.entry.scopeNote": {
    "ru": "Панель продавца доступна только владельцу предприятия. Покупатели видят только публичную историю подтверждённых покупок и личную страницу своих заявок.",
    "pl": "Panel sprzedawcy jest dostępny tylko dla właściciela firmy. Kupujący widzą tylko publiczną historię potwierdzonych zakupów oraz własną stronę zgłoszeń.",
    "en": "The seller panel is available only to the business owner. Buyers see only the public history of confirmed purchases and their personal request page.",
    "es": "El panel del vendedor está disponible solo para el propietario de la empresa. Los compradores solo ven el historial público de compras confirmadas y su página personal de solicitudes.",
    "uk": "Панель продавця доступна лише власнику підприємства. Покупці бачать тільки публічну історію підтверджених покупок і власну сторінку заявок.",
    "de": "Das Verkäuferpanel ist nur für den Unternehmensinhaber verfügbar. Käufer sehen nur die öffentliche Historie bestätigter Käufe und ihre persönliche Anfrageseite.",
    "cs": "Panel prodejce je dostupný pouze vlastníkovi podniku. Kupující vidí jen veřejnou historii potvrzených nákupů a svou osobní stránku žádostí."
  },
  "purchaseConfirmations.entry.viewMyRequests": {
    "ru": "Посмотреть мои заявки",
    "pl": "Zobacz moje zgłoszenia",
    "en": "View my requests",
    "es": "Ver mis solicitudes",
    "uk": "Переглянути мої заявки",
    "de": "Meine Anfragen anzeigen",
    "cs": "Zobrazit moje žádosti"
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
