import { formatLocalizedPoints } from "@/components/figma-dashboard/certificate-value-format";
import { type LocaleCode } from "@/i18n";

export type GiftCertificateCatalogCopy = {
  readonly catalogEyebrow: string;
  readonly catalogTitle: string;
  readonly catalogSubtitle: string;
  readonly availableCount: string;
  readonly noAvailable: string;
  readonly details: string;
  readonly provider: string;
  readonly reputation: string;
  readonly pointsPrice: string;
  readonly moneyRemainder: string;
  readonly validity: string;
  readonly product: string;
  readonly service: string;
  readonly published: string;
  readonly detailEyebrow: string;
  readonly detailTitle: string;
  readonly backToCatalog: string;
  readonly status: string;
  readonly available: string;
  readonly active: string;
  readonly redeemed: string;
  readonly expired: string;
  readonly annulled: string;
  readonly delivery: string;
  readonly productPickup: string;
  readonly productDelivery: string;
  readonly serviceOffline: string;
  readonly serviceOnline: string;
  readonly ordinaryPrice: string;
  readonly coveredByPoints: string;
  readonly conditions: string;
  readonly noConditions: string;
  readonly activeProfile: string;
  readonly orderButton: string;
  readonly ordering: string;
  readonly orderConfirm: string;
  readonly orderSuccess: string;
  readonly ownCertificate: string;
  readonly signInToOrder: string;
  readonly unavailableToOrder: string;
  readonly pointsBurnNotice: string;
  readonly moneyOutsideNotice: string;
  readonly noRefundNotice: string;
  readonly publicCode: string;
  readonly qrTitle: string;
  readonly qrInstruction: string;
  readonly qrUnavailable: string;
  readonly orderedAt: string;
  readonly ownerDetails: string;
  readonly errorGeneric: string;
  readonly errorInsufficientPoints: string;
  readonly errorOwnCertificate: string;
  readonly errorAlreadyActive: string;
  readonly errorNoWallet: string;
  readonly errorExpired: string;
  readonly errorNotAvailable: string;
  readonly errorProfile: string;
  readonly errorConfiguration: string;
};

export const GIFT_CERTIFICATE_CATALOG_COPY: Record<
  LocaleCode,
  GiftCertificateCatalogCopy
> = {
  en: {
    catalogEyebrow: "ARCTor gift certificates",
    catalogTitle: "Available gift certificates",
    catalogSubtitle:
      "Available planned activities created with the gift-certificate template. Certificates are sorted by provider reputation.",
    availableCount: "Available",
    noAvailable: "There are no available gift certificates yet.",
    details: "Details and order",
    provider: "Provider",
    reputation: "Reputation",
    pointsPrice: "Certificate price",
    moneyRemainder: "Money remainder",
    validity: "Validity",
    product: "Product",
    service: "Service",
    published: "Available since",
    detailEyebrow: "Available gift certificate",
    detailTitle: "Certificate details",
    backToCatalog: "Back to certificates",
    status: "Status",
    available: "Available to order",
    active: "Ordered",
    redeemed: "Redeemed",
    expired: "Expired",
    annulled: "Annulled",
    delivery: "Provision",
    productPickup: "Product pickup",
    productDelivery: "Product delivery",
    serviceOffline: "Service offline",
    serviceOnline: "Service online",
    ordinaryPrice: "Ordinary price",
    coveredByPoints: "Covered by points",
    conditions: "Conditions and comments",
    noConditions: "No additional conditions.",
    activeProfile: "Order for active profile",
    orderButton: "Order certificate",
    ordering: "Ordering…",
    orderConfirm:
      "Points will be destroyed immediately. The provider will receive reputation but no points. Continue?",
    orderSuccess: "The certificate has been ordered.",
    ownCertificate: "This certificate is provided by your account and cannot be ordered by you.",
    signInToOrder: "Sign in and select a personal profile or avatar to order.",
    unavailableToOrder: "This certificate can no longer be ordered.",
    pointsBurnNotice:
      "Points are destroyed immediately when the certificate is ordered.",
    moneyOutsideNotice:
      "Any money remainder is paid outside ARCTor. ARCTor does not accept or confirm the payment.",
    noRefundNotice:
      "Unused certificates expire without a points refund.",
    publicCode: "Public code",
    qrTitle: "Permanent one-time QR",
    qrInstruction:
      "Show this QR to the provider. Scanning will be connected to immediate redemption in the next controlled step.",
    qrUnavailable:
      "QR cannot be reconstructed because the server signing secret is not configured.",
    orderedAt: "Ordered",
    ownerDetails: "Open provider view",
    errorGeneric: "The certificate could not be ordered.",
    errorInsufficientPoints: "There are not enough available points.",
    errorOwnCertificate: "You cannot order your own certificate.",
    errorAlreadyActive:
      "You already have an active certificate from this provider.",
    errorNoWallet: "An active points wallet was not found.",
    errorExpired: "The certificate validity period has ended.",
    errorNotAvailable: "The certificate is no longer available.",
    errorProfile: "Select a personal profile or avatar.",
    errorConfiguration:
      "Ordering is temporarily unavailable because QR signing is not configured.",
  },
  pl: {
    catalogEyebrow: "Bony podarunkowe ARCTor",
    catalogTitle: "Dostępne bony podarunkowe",
    catalogSubtitle:
      "Dostępne planowane aktywności utworzone według szablonu bonu podarunkowego. Domyślne sortowanie według reputacji dostawcy.",
    availableCount: "Dostępne",
    noAvailable: "Nie ma jeszcze dostępnych bonów podarunkowych.",
    details: "Szczegóły i zamówienie",
    provider: "Dostawca",
    reputation: "Reputacja",
    pointsPrice: "Cena bonu",
    moneyRemainder: "Pozostała kwota pieniężna",
    validity: "Ważność",
    product: "Produkt",
    service: "Usługa",
    published: "Dostępny od",
    detailEyebrow: "Dostępny bon podarunkowy",
    detailTitle: "Szczegóły bonu",
    backToCatalog: "Wróć do bonów",
    status: "Status",
    available: "Dostępny do zamówienia",
    active: "Zamówiony",
    redeemed: "Zrealizowany",
    expired: "Wygasły",
    annulled: "Unieważniony",
    delivery: "Sposób realizacji",
    productPickup: "Odbiór produktu",
    productDelivery: "Dostawa produktu",
    serviceOffline: "Usługa stacjonarna",
    serviceOnline: "Usługa online",
    ordinaryPrice: "Zwykła cena",
    coveredByPoints: "Pokrycie punktami",
    conditions: "Warunki i komentarze",
    noConditions: "Brak dodatkowych warunków.",
    activeProfile: "Zamówienie dla aktywnego profilu",
    orderButton: "Zamów bon",
    ordering: "Zamawianie…",
    orderConfirm:
      "Punkty zostaną natychmiast wykorzystane. Dostawca otrzyma reputację, ale nie otrzyma punktów. Kontynuować?",
    orderSuccess: "Bon został zamówiony.",
    ownCertificate: "Ten bon jest udostępniany przez Twoje konto i nie możesz go zamówić.",
    signInToOrder: "Zaloguj się i wybierz profil osobisty lub awatar.",
    unavailableToOrder: "Tego bonu nie można już zamówić.",
    pointsBurnNotice: "Punkty są wykorzystywane natychmiast po zamówieniu bonu.",
    moneyOutsideNotice:
      "Pozostała kwota jest płacona poza ARCTor. ARCTor nie przyjmuje ani nie potwierdza płatności.",
    noRefundNotice: "Niewykorzystany bon wygasa bez zwrotu punktów.",
    publicCode: "Kod publiczny",
    qrTitle: "Stały jednorazowy QR",
    qrInstruction:
      "Pokaż QR dostawcy. Skanowanie zostanie połączone z natychmiastową realizacją w następnym kontrolowanym kroku.",
    qrUnavailable:
      "Nie można odtworzyć QR, ponieważ serwerowy klucz podpisu nie jest skonfigurowany.",
    orderedAt: "Zamówiono",
    ownerDetails: "Otwórz widok dostawcy",
    errorGeneric: "Nie udało się zamówić bonu.",
    errorInsufficientPoints: "Brak wystarczającej liczby dostępnych punktów.",
    errorOwnCertificate: "Nie możesz zamówić własnego bonu.",
    errorAlreadyActive: "Masz już aktywny bon tego dostawcy.",
    errorNoWallet: "Nie znaleziono aktywnego portfela punktów.",
    errorExpired: "Okres ważności bonu już minął.",
    errorNotAvailable: "Bon nie jest już dostępny.",
    errorProfile: "Wybierz profil osobisty lub awatar.",
    errorConfiguration:
      "Zamawianie jest chwilowo niedostępne, ponieważ podpis QR nie jest skonfigurowany.",
  },
  ru: {
    catalogEyebrow: "Подарочные сертификаты ARCTor",
    catalogTitle: "Доступные подарочные сертификаты",
    catalogSubtitle:
      "Доступные для заказа плановые активности типа «Подарочный сертификат». По умолчанию сертификаты отсортированы по репутации предоставляющего.",
    availableCount: "Доступно",
    noAvailable: "Доступных подарочных сертификатов пока нет.",
    details: "Подробнее и заказать",
    provider: "Предоставляющий",
    reputation: "Репутация",
    pointsPrice: "Стоимость сертификата",
    moneyRemainder: "Денежный остаток",
    validity: "Срок действия",
    product: "Товар",
    service: "Услуга",
    published: "Доступен с",
    detailEyebrow: "Доступный подарочный сертификат",
    detailTitle: "Подробнее о сертификате",
    backToCatalog: "Назад к сертификатам",
    status: "Состояние",
    available: "Доступен для заказа",
    active: "Заказан",
    redeemed: "Использован",
    expired: "Истёк",
    annulled: "Аннулирован",
    delivery: "Способ предоставления",
    productPickup: "Самовывоз товара",
    productDelivery: "Доставка товара",
    serviceOffline: "Услуга офлайн",
    serviceOnline: "Услуга онлайн",
    ordinaryPrice: "Обычная стоимость",
    coveredByPoints: "Покрывается пунктами",
    conditions: "Условия и комментарии",
    noConditions: "Дополнительные условия не указаны.",
    activeProfile: "Заказ для активного профиля",
    orderButton: "Заказать сертификат",
    ordering: "Оформление заказа…",
    orderConfirm:
      "Пункты будут использованы сразу. Предоставляющий получит репутацию, но не получит пункты. Продолжить?",
    orderSuccess: "Сертификат заказан.",
    ownCertificate: "Этот сертификат предоставляется вашей учётной записью, поэтому вы не можете его заказать.",
    signInToOrder: "Войдите и выберите личный профиль или аватар для заказа.",
    unavailableToOrder: "Этот сертификат больше нельзя заказать.",
    pointsBurnNotice: "Пункты используются сразу при заказе сертификата.",
    moneyOutsideNotice:
      "Денежный остаток оплачивается вне ARCTor. ARCTor не принимает и не подтверждает денежную оплату.",
    noRefundNotice:
      "Неиспользованный сертификат истекает без возврата пунктов.",
    publicCode: "Публичный код",
    qrTitle: "Постоянный одноразовый QR",
    qrInstruction:
      "Покажите QR предоставляющему. Сканирование будет связано с немедленным использованием сертификата следующим контролируемым шагом.",
    qrUnavailable:
      "QR невозможно восстановить: серверный секрет подписи ещё не настроен.",
    orderedAt: "Заказан",
    ownerDetails: "Открыть представление предоставляющего",
    errorGeneric: "Не удалось заказать сертификат.",
    errorInsufficientPoints: "Недостаточно доступных пунктов.",
    errorOwnCertificate: "Нельзя заказать собственный сертификат.",
    errorAlreadyActive:
      "У вас уже есть активный сертификат этого предоставляющего.",
    errorNoWallet: "Активный кошелёк пунктов не найден.",
    errorExpired: "Срок действия сертификата уже закончился.",
    errorNotAvailable: "Сертификат больше не доступен.",
    errorProfile: "Выберите личный профиль или аватар.",
    errorConfiguration:
      "Заказ временно недоступен: подпись QR ещё не настроена.",
  },
  uk: {
    catalogEyebrow: "Подарункові сертифікати ARCTor",
    catalogTitle: "Доступні подарункові сертифікати",
    catalogSubtitle:
      "Доступні для замовлення планові активності типу «Подарунковий сертифікат». Типове сортування — за репутацією надавача.",
    availableCount: "Доступно",
    noAvailable: "Доступних подарункових сертифікатів поки немає.",
    details: "Докладніше й замовити",
    provider: "Надавач",
    reputation: "Репутація",
    pointsPrice: "Вартість сертифіката",
    moneyRemainder: "Грошовий залишок",
    validity: "Строк дії",
    product: "Товар",
    service: "Послуга",
    published: "Доступний з",
    detailEyebrow: "Доступний подарунковий сертифікат",
    detailTitle: "Докладніше про сертифікат",
    backToCatalog: "Назад до сертифікатів",
    status: "Стан",
    available: "Доступний для замовлення",
    active: "Замовлений",
    redeemed: "Використаний",
    expired: "Строк минув",
    annulled: "Анульований",
    delivery: "Спосіб надання",
    productPickup: "Самовивіз товару",
    productDelivery: "Доставка товару",
    serviceOffline: "Послуга офлайн",
    serviceOnline: "Послуга онлайн",
    ordinaryPrice: "Звичайна вартість",
    coveredByPoints: "Покривається пунктами",
    conditions: "Умови й коментарі",
    noConditions: "Додаткові умови не вказані.",
    activeProfile: "Замовлення для активного профілю",
    orderButton: "Замовити сертифікат",
    ordering: "Оформлення замовлення…",
    orderConfirm:
      "Пункти буде використано одразу. Надавач отримає репутацію, але не отримає пункти. Продовжити?",
    orderSuccess: "Сертифікат замовлено.",
    ownCertificate: "Цей сертифікат надає ваш обліковий запис, тому ви не можете його замовити.",
    signInToOrder: "Увійдіть і виберіть особистий профіль або аватар.",
    unavailableToOrder: "Цей сертифікат більше не можна замовити.",
    pointsBurnNotice: "Пункти використовуються одразу під час замовлення.",
    moneyOutsideNotice:
      "Грошовий залишок сплачується поза ARCTor. ARCTor не приймає і не підтверджує оплату.",
    noRefundNotice:
      "Невикористаний сертифікат спливає без повернення пунктів.",
    publicCode: "Публічний код",
    qrTitle: "Постійний одноразовий QR",
    qrInstruction:
      "Покажіть QR надавачу. Сканування буде пов’язане з негайним використанням наступним контрольованим кроком.",
    qrUnavailable:
      "QR неможливо відновити: серверний секрет підпису ще не налаштовано.",
    orderedAt: "Замовлено",
    ownerDetails: "Відкрити представлення надавача",
    errorGeneric: "Не вдалося замовити сертифікат.",
    errorInsufficientPoints: "Недостатньо доступних пунктів.",
    errorOwnCertificate: "Не можна замовити власний сертифікат.",
    errorAlreadyActive: "У вас уже є активний сертифікат цього надавача.",
    errorNoWallet: "Активний гаманець пунктів не знайдено.",
    errorExpired: "Строк дії сертифіката вже завершився.",
    errorNotAvailable: "Сертифікат більше не доступний.",
    errorProfile: "Виберіть особистий профіль або аватар.",
    errorConfiguration:
      "Замовлення тимчасово недоступне: підпис QR ще не налаштовано.",
  },
  de: {
    catalogEyebrow: "ARCTor-Geschenkgutscheine",
    catalogTitle: "Verfügbare Geschenkgutscheine",
    catalogSubtitle:
      "Verfügbare geplante Aktivitäten der Gutscheinvorlage. Standardsortierung nach Reputation des Anbieters.",
    availableCount: "Verfügbar",
    noAvailable: "Es gibt noch keine verfügbaren Geschenkgutscheine.",
    details: "Details und Bestellung",
    provider: "Anbieter",
    reputation: "Reputation",
    pointsPrice: "Gutscheinpreis",
    moneyRemainder: "Geldrest",
    validity: "Gültigkeit",
    product: "Produkt",
    service: "Dienstleistung",
    published: "Verfügbar seit",
    detailEyebrow: "Verfügbarer Geschenkgutschein",
    detailTitle: "Gutscheindetails",
    backToCatalog: "Zurück zu den Gutscheinen",
    status: "Status",
    available: "Zur Bestellung verfügbar",
    active: "Bestellt",
    redeemed: "Eingelöst",
    expired: "Abgelaufen",
    annulled: "Annulliert",
    delivery: "Bereitstellung",
    productPickup: "Produktabholung",
    productDelivery: "Produktlieferung",
    serviceOffline: "Dienstleistung vor Ort",
    serviceOnline: "Online-Dienstleistung",
    ordinaryPrice: "Normalpreis",
    coveredByPoints: "Durch Punkte gedeckt",
    conditions: "Bedingungen und Kommentare",
    noConditions: "Keine zusätzlichen Bedingungen.",
    activeProfile: "Bestellung für aktives Profil",
    orderButton: "Gutschein bestellen",
    ordering: "Bestellung…",
    orderConfirm:
      "Punkte werden sofort verwendet. Der Anbieter erhält Reputation, aber keine Punkte. Fortfahren?",
    orderSuccess: "Der Gutschein wurde bestellt.",
    ownCertificate: "Dieser Gutschein wird von Ihrem Konto angeboten und kann von Ihnen nicht bestellt werden.",
    signInToOrder: "Melden Sie sich an und wählen Sie ein persönliches Profil oder einen Avatar.",
    unavailableToOrder: "Dieser Gutschein kann nicht mehr bestellt werden.",
    pointsBurnNotice: "Punkte werden bei der Bestellung sofort verwendet.",
    moneyOutsideNotice:
      "Ein Geldrest wird außerhalb von ARCTor bezahlt. ARCTor nimmt die Zahlung nicht an und bestätigt sie nicht.",
    noRefundNotice:
      "Nicht verwendete Gutscheine verfallen ohne Rückerstattung der Punkte.",
    publicCode: "Öffentlicher Code",
    qrTitle: "Permanenter einmaliger QR",
    qrInstruction:
      "Zeigen Sie den QR dem Anbieter. Das Scannen wird im nächsten kontrollierten Schritt mit der sofortigen Einlösung verbunden.",
    qrUnavailable:
      "Der QR kann nicht rekonstruiert werden, weil das Signiergeheimnis nicht konfiguriert ist.",
    orderedAt: "Bestellt",
    ownerDetails: "Anbieteransicht öffnen",
    errorGeneric: "Der Gutschein konnte nicht bestellt werden.",
    errorInsufficientPoints: "Nicht genügend verfügbare Punkte.",
    errorOwnCertificate: "Der eigene Gutschein kann nicht bestellt werden.",
    errorAlreadyActive:
      "Sie haben bereits einen aktiven Gutschein dieses Anbieters.",
    errorNoWallet: "Kein aktives Punkte-Wallet gefunden.",
    errorExpired: "Die Gültigkeit des Gutscheins ist beendet.",
    errorNotAvailable: "Der Gutschein ist nicht mehr verfügbar.",
    errorProfile: "Wählen Sie ein persönliches Profil oder einen Avatar.",
    errorConfiguration:
      "Bestellungen sind vorübergehend nicht verfügbar, da die QR-Signatur nicht konfiguriert ist.",
  },
  es: {
    catalogEyebrow: "Certificados regalo ARCTor",
    catalogTitle: "Certificados regalo disponibles",
    catalogSubtitle:
      "Actividades planificadas disponibles con la plantilla de certificado regalo. Orden predeterminado por reputación del proveedor.",
    availableCount: "Disponibles",
    noAvailable: "Todavía no hay certificados regalo disponibles.",
    details: "Detalles y pedido",
    provider: "Proveedor",
    reputation: "Reputación",
    pointsPrice: "Precio del certificado",
    moneyRemainder: "Resto en dinero",
    validity: "Validez",
    product: "Producto",
    service: "Servicio",
    published: "Disponible desde",
    detailEyebrow: "Certificado regalo disponible",
    detailTitle: "Detalles del certificado",
    backToCatalog: "Volver a certificados",
    status: "Estado",
    available: "Disponible para solicitar",
    active: "Pedido",
    redeemed: "Canjeado",
    expired: "Caducado",
    annulled: "Anulado",
    delivery: "Forma de prestación",
    productPickup: "Recogida del producto",
    productDelivery: "Entrega del producto",
    serviceOffline: "Servicio presencial",
    serviceOnline: "Servicio en línea",
    ordinaryPrice: "Precio normal",
    coveredByPoints: "Cubierto con puntos",
    conditions: "Condiciones y comentarios",
    noConditions: "No hay condiciones adicionales.",
    activeProfile: "Pedido para el perfil activo",
    orderButton: "Pedir certificado",
    ordering: "Procesando…",
    orderConfirm:
      "Los puntos se utilizarán de inmediato. El proveedor recibirá reputación, pero no puntos. ¿Continuar?",
    orderSuccess: "El certificado ha sido pedido.",
    ownCertificate: "Este certificado lo ofrece tu cuenta y no puedes pedirlo.",
    signInToOrder: "Inicia sesión y elige un perfil personal o avatar.",
    unavailableToOrder: "Este certificado ya no se puede pedir.",
    pointsBurnNotice:
      "Los puntos se utilizan inmediatamente al pedir el certificado.",
    moneyOutsideNotice:
      "El resto en dinero se paga fuera de ARCTor. ARCTor no acepta ni confirma el pago.",
    noRefundNotice:
      "Los certificados no utilizados caducan sin devolución de puntos.",
    publicCode: "Código público",
    qrTitle: "QR permanente de un solo uso",
    qrInstruction:
      "Muestra el QR al proveedor. El escaneo se conectará con el canje inmediato en el siguiente paso controlado.",
    qrUnavailable:
      "No se puede reconstruir el QR porque el secreto de firma no está configurado.",
    orderedAt: "Pedido",
    ownerDetails: "Abrir vista del proveedor",
    errorGeneric: "No se pudo pedir el certificado.",
    errorInsufficientPoints: "No hay suficientes puntos disponibles.",
    errorOwnCertificate: "No puedes pedir tu propio certificado.",
    errorAlreadyActive:
      "Ya tienes un certificado activo de este proveedor.",
    errorNoWallet: "No se encontró una cartera de puntos activa.",
    errorExpired: "El período de validez ha terminado.",
    errorNotAvailable: "El certificado ya no está disponible.",
    errorProfile: "Elige un perfil personal o avatar.",
    errorConfiguration:
      "El pedido no está disponible temporalmente porque la firma QR no está configurada.",
  },
  cs: {
    catalogEyebrow: "Dárkové certifikáty ARCTor",
    catalogTitle: "Dostupné dárkové certifikáty",
    catalogSubtitle:
      "Dostupné plánované aktivity šablony dárkového certifikátu. Výchozí řazení podle reputace poskytovatele.",
    availableCount: "Dostupné",
    noAvailable: "Zatím nejsou dostupné žádné dárkové certifikáty.",
    details: "Podrobnosti a objednání",
    provider: "Poskytovatel",
    reputation: "Reputace",
    pointsPrice: "Cena certifikátu",
    moneyRemainder: "Peněžní zbytek",
    validity: "Platnost",
    product: "Produkt",
    service: "Služba",
    published: "Dostupný od",
    detailEyebrow: "Dostupný dárkový certifikát",
    detailTitle: "Podrobnosti certifikátu",
    backToCatalog: "Zpět k certifikátům",
    status: "Stav",
    available: "Dostupný k objednání",
    active: "Objednaný",
    redeemed: "Uplatněný",
    expired: "Platnost skončila",
    annulled: "Anulovaný",
    delivery: "Způsob poskytnutí",
    productPickup: "Vyzvednutí produktu",
    productDelivery: "Doručení produktu",
    serviceOffline: "Služba osobně",
    serviceOnline: "Online služba",
    ordinaryPrice: "Běžná cena",
    coveredByPoints: "Pokryto body",
    conditions: "Podmínky a komentáře",
    noConditions: "Žádné další podmínky.",
    activeProfile: "Objednávka pro aktivní profil",
    orderButton: "Objednat certifikát",
    ordering: "Objednávání…",
    orderConfirm:
      "Body budou okamžitě použity. Poskytovatel získá reputaci, ale žádné body. Pokračovat?",
    orderSuccess: "Certifikát byl objednán.",
    ownCertificate: "Tento certifikát nabízí váš účet a nemůžete si jej objednat.",
    signInToOrder: "Přihlaste se a vyberte osobní profil nebo avatar.",
    unavailableToOrder: "Tento certifikát již nelze objednat.",
    pointsBurnNotice:
      "Body jsou při objednání certifikátu okamžitě použity.",
    moneyOutsideNotice:
      "Peněžní zbytek se platí mimo ARCTor. ARCTor platbu nepřijímá ani nepotvrzuje.",
    noRefundNotice:
      "Nevyužité certifikáty vyprší bez vrácení bodů.",
    publicCode: "Veřejný kód",
    qrTitle: "Trvalý jednorázový QR",
    qrInstruction:
      "Ukažte QR poskytovateli. Skenování bude v dalším kontrolovaném kroku spojeno s okamžitým uplatněním.",
    qrUnavailable:
      "QR nelze obnovit, protože není nakonfigurováno podpisové tajemství.",
    orderedAt: "Objednáno",
    ownerDetails: "Otevřít pohled poskytovatele",
    errorGeneric: "Certifikát se nepodařilo objednat.",
    errorInsufficientPoints: "Není dostatek dostupných bodů.",
    errorOwnCertificate: "Vlastní certifikát nelze objednat.",
    errorAlreadyActive:
      "Již máte aktivní certifikát tohoto poskytovatele.",
    errorNoWallet: "Aktivní peněženka bodů nebyla nalezena.",
    errorExpired: "Platnost certifikátu skončila.",
    errorNotAvailable: "Certifikát již není dostupný.",
    errorProfile: "Vyberte osobní profil nebo avatar.",
    errorConfiguration:
      "Objednávka je dočasně nedostupná, protože podpis QR není nakonfigurován.",
  },
};

export const LOCALE_TAGS: Record<LocaleCode, string> = {
  en: "en-US",
  pl: "pl-PL",
  ru: "ru-RU",
  uk: "uk-UA",
  de: "de-DE",
  es: "es-ES",
  cs: "cs-CZ",
};

export function normalizeGiftCertificateLocale(
  value: string | string[] | undefined,
): LocaleCode {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (
    candidate === "pl" ||
    candidate === "ru" ||
    candidate === "uk" ||
    candidate === "de" ||
    candidate === "es" ||
    candidate === "cs"
  ) {
    return candidate;
  }

  return "en";
}

export function buildGiftCertificateLocaleHref(
  pathname: string,
  locale: LocaleCode,
): string {
  return locale === "en"
    ? pathname
    : `${pathname}?locale=${encodeURIComponent(locale)}`;
}

export function formatGiftCertificateMoney(
  value: number,
  currency: string,
  locale: LocaleCode,
): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(value);
}

export function formatGiftCertificatePoints(
  value: number,
  locale: LocaleCode,
): string {
  return formatLocalizedPoints(value, locale);
}

export function formatGiftCertificateDate(
  value: string,
  locale: LocaleCode,
): string {
  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(date);
}

export function formatGiftCertificateDateTime(
  value: string,
  locale: LocaleCode,
): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

export function getGiftCertificateDeliveryLabel(
  deliveryMode: string,
  copy: GiftCertificateCatalogCopy,
): string {
  if (deliveryMode === "product_pickup") {
    return copy.productPickup;
  }

  if (deliveryMode === "product_delivery") {
    return copy.productDelivery;
  }

  if (deliveryMode === "service_offline") {
    return copy.serviceOffline;
  }

  if (deliveryMode === "service_online") {
    return copy.serviceOnline;
  }

  return deliveryMode;
}

export function getGiftCertificateStatusLabel(
  lifecycleStatus: string,
  copy: GiftCertificateCatalogCopy,
): string {
  if (lifecycleStatus === "available") {
    return copy.available;
  }

  if (lifecycleStatus === "active") {
    return copy.active;
  }

  if (lifecycleStatus === "redeemed") {
    return copy.redeemed;
  }

  if (lifecycleStatus === "expired") {
    return copy.expired;
  }

  if (lifecycleStatus === "annulled") {
    return copy.annulled;
  }

  return lifecycleStatus;
}
