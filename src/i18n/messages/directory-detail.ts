export type DirectoryDetailLocale = "ru" | "pl" | "en" | "es" | "uk" | "de" | "cs";

export type DirectoryDetailMessages = {
  numberLocale: string;
  common: {
    yes: string;
    no: string;
    available: string;
    none: string;
  };
  certificateAvailability: {
    unavailable: string;
    unlimited: string;
    available: (remaining: number, maxTotal: number) => string;
    limitCheckFailed: (maxTotal: number) => string;
  };
  offerTypes: {
    bookableService: string;
    service: string;
    product: string;
    bundle: string;
    consultation: string;
    reward: string;
  };
  organizationTypes: {
    privateBusiness: string;
    company: string;
    nonProfit: string;
    publicInstitution: string;
  };
  verification: {
    verified: string;
    pending: string;
    rejected: string;
    unverified: string;
  };
  location: {
    notSpecified: string;
  };
  booking: {
    notRequired: string;
    required: string;
    requiredWithDuration: (minutes: number) => string;
    needed: string;
    notNeeded: string;
    durationShort: (minutes: number) => string;
    durationNotSpecified: string;
  };
  certificatePayment: {
    unavailable: string;
    available: string;
  };
  fallbacks: {
    descriptionMissing: string;
    categoryAi: string;
  };
  navigation: {
    backToDirectory: string;
    backToDirectoryWithArrow: string;
    viewOffers: string;
    registerPurchase: string;
  };
  error: {
    kicker: string;
    title: string;
  };
  hero: {
    kicker: string;
    safetyNote: string;
    enterpriseLabel: string;
    verificationLabel: string;
    currencyLabel: string;
    offersLabel: string;
    certificateLabel: string;
    typeLabel: string;
    locationLabel: string;
    publicFlowLabel: string;
    publicFlowValue: string;
  };
  points: {
    kicker: string;
    title: string;
    description: string;
  };
  offers: {
    kicker: string;
    title: string;
    description: string;
    count: (count: number) => string;
    empty: string;
    certificateAvailable: string;
    priceLabel: string;
    regularPriceLabel: string;
    bookingLabel: string;
    certificateLabel: string;
    certificatePaymentLabel: string;
    certificateTermsMissing: string;
    quickActions: string;
    detailsAction: string;
    orderCertificateAction: string;
  };
};

export const directoryDetailMessages: Record<DirectoryDetailLocale, DirectoryDetailMessages> = {
  ru: {
    numberLocale: "ru-RU",
    common: {
      yes: "Да",
      no: "Нет",
      available: "доступен",
      none: "нет",
    },
    certificateAvailability: {
      unavailable: "Сертификат недоступен",
      unlimited: "Количество сертификатов не ограничено",
      available: (remaining, maxTotal) =>
        "Доступно сертификатов: " + remaining + " из " + maxTotal,
      limitCheckFailed: (maxTotal) =>
        "Лимит сертификатов: " + maxTotal + "; остаток не удалось проверить",
    },
    offerTypes: {
      bookableService: "Услуга с записью",
      service: "Услуга",
      product: "Товар",
      bundle: "Пакет",
      consultation: "Консультация",
      reward: "Сертификат / reward",
    },
    organizationTypes: {
      privateBusiness: "Частный бизнес",
      company: "Компания",
      nonProfit: "Некоммерческая организация",
      publicInstitution: "Публичная организация",
    },
    verification: {
      verified: "Проверено",
      pending: "На проверке",
      rejected: "Отклонено",
      unverified: "Без верификации",
    },
    location: {
      notSpecified: "Локация не указана",
    },
    booking: {
      notRequired: "Без обязательной записи",
      required: "Требуется запись",
      requiredWithDuration: (minutes) => "Требуется запись · " + minutes + " мин.",
      needed: "Нужна",
      notNeeded: "Не нужна",
      durationShort: (minutes) => minutes + " мин.",
      durationNotSpecified: "длительность не указана",
    },
    certificatePayment: {
      unavailable: "Недоступен",
      available: "Сертификат доступен",
    },
    fallbacks: {
      descriptionMissing: "Описание пока не добавлено.",
      categoryAi: "Категория будет уточнена AI",
    },
    navigation: {
      backToDirectory: "Назад в каталог",
      backToDirectoryWithArrow: "← Назад в каталог",
      viewOffers: "Посмотреть предложения",
      registerPurchase: "Зарегистрировать покупку",
    },
    error: {
      kicker: "Ошибка каталога",
      title: "Ошибка загрузки карточки",
    },
    hero: {
      kicker: "Публичная карточка предприятия",
      safetyNote:
        "На публичной карточке показывается безопасная информация: предприятие, публичные предложения, сертификаты и форма регистрации внешней покупки. Точный адрес не раскрывается, если он скрыт или указан приблизительно.",
      enterpriseLabel: "Предприятие",
      verificationLabel: "Проверка",
      currencyLabel: "Валюта",
      offersLabel: "Предложений",
      certificateLabel: "Сертификат",
      typeLabel: "Тип",
      locationLabel: "Локация",
      publicFlowLabel: "Публичный flow",
      publicFlowValue: "Предложение → Сертификат",
    },
    points: {
      kicker: "Граница POINTS / деньги",
      title: "Сертификаты и POINTS",
      description:
        "POINTS — это бонусные единицы программы лояльности, а не деньги, валюта или средство платежа. Если сертификат показывает схему вроде “2.33 POINTS + 50 PLN”, это означает смешанную оплату: часть стоимости покрывается POINTS, остаток оплачивается деньгами.",
    },
    offers: {
      kicker: "Публичные предложения",
      title: "Публичные предложения",
      description:
        "Здесь показываются реальные предложения предприятия: услуга как Value Object, цена, запись и доступность подарочного сертификата.",
      count: (count) => count + " предложений",
      empty: "У этого предприятия пока нет публичных предложений.",
      certificateAvailable: "Сертификат доступен",
      priceLabel: "Цена",
      regularPriceLabel: "Обычная цена",
      bookingLabel: "Запись",
      certificateLabel: "Сертификат",
      certificatePaymentLabel: "Оплата сертификата",
      certificateTermsMissing: "Условия сертификата пока не добавлены.",
      quickActions: "Быстрые действия",
      detailsAction: "Подробное описание",
      orderCertificateAction: "Заказать сертификат",
    },
  },
  pl: {
    numberLocale: "pl-PL",
    common: {
      yes: "Tak",
      no: "Nie",
      available: "dostępny",
      none: "brak",
    },
    certificateAvailability: {
      unavailable: "Certyfikat niedostępny",
      unlimited: "Liczba certyfikatów nie jest ograniczona",
      available: (remaining, maxTotal) =>
        "Dostępne certyfikaty: " + remaining + " z " + maxTotal,
      limitCheckFailed: (maxTotal) =>
        "Limit certyfikatów: " + maxTotal + "; nie udało się sprawdzić pozostałej liczby",
    },
    offerTypes: {
      bookableService: "Usługa z rezerwacją",
      service: "Usługa",
      product: "Produkt",
      bundle: "Pakiet",
      consultation: "Konsultacja",
      reward: "Certyfikat / nagroda",
    },
    organizationTypes: {
      privateBusiness: "Działalność prywatna",
      company: "Firma",
      nonProfit: "Organizacja non-profit",
      publicInstitution: "Instytucja publiczna",
    },
    verification: {
      verified: "Zweryfikowano",
      pending: "W trakcie weryfikacji",
      rejected: "Odrzucono",
      unverified: "Bez weryfikacji",
    },
    location: {
      notSpecified: "Lokalizacja nie została podana",
    },
    booking: {
      notRequired: "Rezerwacja nie jest wymagana",
      required: "Wymagana rezerwacja",
      requiredWithDuration: (minutes) => "Wymagana rezerwacja · " + minutes + " min",
      needed: "Wymagana",
      notNeeded: "Niewymagana",
      durationShort: (minutes) => minutes + " min",
      durationNotSpecified: "czas trwania nie został podany",
    },
    certificatePayment: {
      unavailable: "Niedostępny",
      available: "Certyfikat dostępny",
    },
    fallbacks: {
      descriptionMissing: "Opis nie został jeszcze dodany.",
      categoryAi: "Kategoria zostanie doprecyzowana przez AI",
    },
    navigation: {
      backToDirectory: "Wróć do katalogu",
      backToDirectoryWithArrow: "← Wróć do katalogu",
      viewOffers: "Zobacz oferty",
      registerPurchase: "Zarejestruj zakup",
    },
    error: {
      kicker: "Błąd katalogu",
      title: "Nie udało się załadować profilu",
    },
    hero: {
      kicker: "Publiczny profil firmy",
      safetyNote:
        "Na publicznym profilu wyświetlane są bezpieczne informacje: firma, publiczne oferty, certyfikaty oraz formularz rejestracji zewnętrznego zakupu. Dokładny adres nie jest ujawniany, jeśli jest ukryty albo podany w przybliżeniu.",
      enterpriseLabel: "Firma",
      verificationLabel: "Weryfikacja",
      currencyLabel: "Waluta",
      offersLabel: "Oferty",
      certificateLabel: "Certyfikat",
      typeLabel: "Typ",
      locationLabel: "Lokalizacja",
      publicFlowLabel: "Publiczny przepływ",
      publicFlowValue: "Oferta → Certyfikat",
    },
    points: {
      kicker: "Granica POINTS / pieniądze",
      title: "Certyfikaty i POINTS",
      description:
        "POINTS to jednostki bonusowe programu lojalnościowego, a nie pieniądze, waluta ani środek płatniczy. Jeśli certyfikat pokazuje schemat typu “2.33 POINTS + 50 PLN”, oznacza to płatność mieszaną: część wartości pokrywają POINTS, a reszta jest opłacana pieniędzmi.",
    },
    offers: {
      kicker: "Publiczne oferty",
      title: "Publiczne oferty",
      description:
        "Tutaj wyświetlane są realne oferty firmy: usługa jako Value Object, cena, rezerwacja i dostępność certyfikatu prezentowego.",
      count: (count) => count + " ofert",
      empty: "Ta firma nie ma jeszcze publicznych ofert.",
      certificateAvailable: "Certyfikat dostępny",
      priceLabel: "Cena",
      regularPriceLabel: "Cena regularna",
      bookingLabel: "Rezerwacja",
      certificateLabel: "Certyfikat",
      certificatePaymentLabel: "Płatność za certyfikat",
      certificateTermsMissing: "Warunki certyfikatu nie zostały jeszcze dodane.",
      quickActions: "Szybkie działania",
      detailsAction: "Szczegółowy opis",
      orderCertificateAction: "Zamów certyfikat",
    },
  },
  en: {
    numberLocale: "en-US",
    common: {
      yes: "Yes",
      no: "No",
      available: "available",
      none: "none",
    },
    certificateAvailability: {
      unavailable: "Certificate unavailable",
      unlimited: "The number of certificates is not limited",
      available: (remaining, maxTotal) =>
        "Available certificates: " + remaining + " of " + maxTotal,
      limitCheckFailed: (maxTotal) =>
        "Certificate limit: " + maxTotal + "; remaining availability could not be checked",
    },
    offerTypes: {
      bookableService: "Bookable service",
      service: "Service",
      product: "Product",
      bundle: "Bundle",
      consultation: "Consultation",
      reward: "Certificate / reward",
    },
    organizationTypes: {
      privateBusiness: "Private business",
      company: "Company",
      nonProfit: "Non-profit organization",
      publicInstitution: "Public organization",
    },
    verification: {
      verified: "Verified",
      pending: "Under review",
      rejected: "Rejected",
      unverified: "Not verified",
    },
    location: {
      notSpecified: "Location not specified",
    },
    booking: {
      notRequired: "Booking not required",
      required: "Booking required",
      requiredWithDuration: (minutes) => "Booking required · " + minutes + " min",
      needed: "Required",
      notNeeded: "Not required",
      durationShort: (minutes) => minutes + " min",
      durationNotSpecified: "duration not specified",
    },
    certificatePayment: {
      unavailable: "Unavailable",
      available: "Certificate available",
    },
    fallbacks: {
      descriptionMissing: "Description has not been added yet.",
      categoryAi: "Category will be refined by AI",
    },
    navigation: {
      backToDirectory: "Back to directory",
      backToDirectoryWithArrow: "← Back to directory",
      viewOffers: "View offers",
      registerPurchase: "Register purchase",
    },
    error: {
      kicker: "Directory error",
      title: "Could not load the profile",
    },
    hero: {
      kicker: "Public business profile",
      safetyNote:
        "The public profile shows safe information: the business, public offers, certificates and the external purchase registration form. The exact address is not disclosed if it is hidden or approximate.",
      enterpriseLabel: "Business",
      verificationLabel: "Verification",
      currencyLabel: "Currency",
      offersLabel: "Offers",
      certificateLabel: "Certificate",
      typeLabel: "Type",
      locationLabel: "Location",
      publicFlowLabel: "Public flow",
      publicFlowValue: "Offer → Certificate",
    },
    points: {
      kicker: "POINTS / money boundary",
      title: "Certificates and POINTS",
      description:
        "POINTS are bonus units of the loyalty program, not money, currency or a means of payment. If a certificate shows a scheme such as “2.33 POINTS + 50 PLN”, it means mixed payment: POINTS cover part of the value and the remaining amount is paid with money.",
    },
    offers: {
      kicker: "Public offers",
      title: "Public offers",
      description:
        "This section shows real business offers: the service as a Value Object, price, booking and gift certificate availability.",
      count: (count) => count + " offers",
      empty: "This business does not have public offers yet.",
      certificateAvailable: "Certificate available",
      priceLabel: "Price",
      regularPriceLabel: "Regular price",
      bookingLabel: "Booking",
      certificateLabel: "Certificate",
      certificatePaymentLabel: "Certificate payment",
      certificateTermsMissing: "Certificate terms have not been added yet.",
      quickActions: "Quick actions",
      detailsAction: "Detailed description",
      orderCertificateAction: "Order certificate",
    },
  },
  es: {
    numberLocale: "es-ES",
    common: {
      yes: "Sí",
      no: "No",
      available: "disponible",
      none: "no",
    },
    certificateAvailability: {
      unavailable: "Certificado no disponible",
      unlimited: "La cantidad de certificados no está limitada",
      available: (remaining, maxTotal) =>
        "Certificados disponibles: " + remaining + " de " + maxTotal,
      limitCheckFailed: (maxTotal) =>
        "Límite de certificados: " + maxTotal + "; no se pudo comprobar el saldo restante",
    },
    offerTypes: {
      bookableService: "Servicio con reserva",
      service: "Servicio",
      product: "Producto",
      bundle: "Paquete",
      consultation: "Consulta",
      reward: "Certificado / recompensa",
    },
    organizationTypes: {
      privateBusiness: "Negocio privado",
      company: "Empresa",
      nonProfit: "Organización sin ánimo de lucro",
      publicInstitution: "Organización pública",
    },
    verification: {
      verified: "Verificado",
      pending: "En revisión",
      rejected: "Rechazado",
      unverified: "Sin verificación",
    },
    location: {
      notSpecified: "Ubicación no especificada",
    },
    booking: {
      notRequired: "Reserva no obligatoria",
      required: "Reserva obligatoria",
      requiredWithDuration: (minutes) => "Reserva obligatoria · " + minutes + " min",
      needed: "Necesaria",
      notNeeded: "No necesaria",
      durationShort: (minutes) => minutes + " min",
      durationNotSpecified: "duración no especificada",
    },
    certificatePayment: {
      unavailable: "No disponible",
      available: "Certificado disponible",
    },
    fallbacks: {
      descriptionMissing: "La descripción aún no se ha añadido.",
      categoryAi: "La categoría será precisada por la IA",
    },
    navigation: {
      backToDirectory: "Volver al directorio",
      backToDirectoryWithArrow: "← Volver al directorio",
      viewOffers: "Ver ofertas",
      registerPurchase: "Registrar compra",
    },
    error: {
      kicker: "Error del directorio",
      title: "No se pudo cargar la ficha",
    },
    hero: {
      kicker: "Ficha pública de empresa",
      safetyNote:
        "En la ficha pública se muestra información segura: la empresa, las ofertas públicas, los certificados y el formulario de registro de una compra externa. La dirección exacta no se revela si está oculta o indicada de forma aproximada.",
      enterpriseLabel: "Empresa",
      verificationLabel: "Verificación",
      currencyLabel: "Moneda",
      offersLabel: "Ofertas",
      certificateLabel: "Certificado",
      typeLabel: "Tipo",
      locationLabel: "Ubicación",
      publicFlowLabel: "Flujo público",
      publicFlowValue: "Oferta → Certificado",
    },
    points: {
      kicker: "Límite entre POINTS y dinero",
      title: "Certificados y POINTS",
      description:
        "POINTS son unidades de bonificación del programa de fidelidad, no dinero, moneda ni medio de pago. Si un certificado muestra un esquema como “2.33 POINTS + 50 PLN”, significa un pago mixto: una parte del valor se cubre con POINTS y el resto se paga con dinero.",
    },
    offers: {
      kicker: "Ofertas públicas",
      title: "Ofertas públicas",
      description:
        "Aquí se muestran ofertas reales de la empresa: el servicio como Value Object, precio, reserva y disponibilidad del certificado regalo.",
      count: (count) => count + " ofertas",
      empty: "Esta empresa aún no tiene ofertas públicas.",
      certificateAvailable: "Certificado disponible",
      priceLabel: "Precio",
      regularPriceLabel: "Precio normal",
      bookingLabel: "Reserva",
      certificateLabel: "Certificado",
      certificatePaymentLabel: "Pago del certificado",
      certificateTermsMissing: "Las condiciones del certificado aún no se han añadido.",
      quickActions: "Acciones rápidas",
      detailsAction: "Descripción detallada",
      orderCertificateAction: "Pedir certificado",
    },
  },
  uk: {
    numberLocale: "uk-UA",
    common: {
      yes: "Так",
      no: "Ні",
      available: "доступний",
      none: "немає",
    },
    certificateAvailability: {
      unavailable: "Сертифікат недоступний",
      unlimited: "Кількість сертифікатів не обмежена",
      available: (remaining, maxTotal) =>
        "Доступно сертифікатів: " + remaining + " з " + maxTotal,
      limitCheckFailed: (maxTotal) =>
        "Ліміт сертифікатів: " + maxTotal + "; залишок не вдалося перевірити",
    },
    offerTypes: {
      bookableService: "Послуга із записом",
      service: "Послуга",
      product: "Товар",
      bundle: "Пакет",
      consultation: "Консультація",
      reward: "Сертифікат / винагорода",
    },
    organizationTypes: {
      privateBusiness: "Приватний бізнес",
      company: "Компанія",
      nonProfit: "Некомерційна організація",
      publicInstitution: "Публічна організація",
    },
    verification: {
      verified: "Перевірено",
      pending: "На перевірці",
      rejected: "Відхилено",
      unverified: "Без верифікації",
    },
    location: {
      notSpecified: "Локацію не вказано",
    },
    booking: {
      notRequired: "Обов’язковий запис не потрібен",
      required: "Потрібен запис",
      requiredWithDuration: (minutes) => "Потрібен запис · " + minutes + " хв",
      needed: "Потрібна",
      notNeeded: "Не потрібна",
      durationShort: (minutes) => minutes + " хв",
      durationNotSpecified: "тривалість не вказана",
    },
    certificatePayment: {
      unavailable: "Недоступний",
      available: "Сертифікат доступний",
    },
    fallbacks: {
      descriptionMissing: "Опис ще не додано.",
      categoryAi: "Категорію уточнить AI",
    },
    navigation: {
      backToDirectory: "Назад до каталогу",
      backToDirectoryWithArrow: "← Назад до каталогу",
      viewOffers: "Переглянути пропозиції",
      registerPurchase: "Зареєструвати покупку",
    },
    error: {
      kicker: "Помилка каталогу",
      title: "Не вдалося завантажити картку",
    },
    hero: {
      kicker: "Публічна картка підприємства",
      safetyNote:
        "На публічній картці показується безпечна інформація: підприємство, публічні пропозиції, сертифікати та форма реєстрації зовнішньої покупки. Точна адреса не розкривається, якщо вона прихована або вказана приблизно.",
      enterpriseLabel: "Підприємство",
      verificationLabel: "Перевірка",
      currencyLabel: "Валюта",
      offersLabel: "Пропозицій",
      certificateLabel: "Сертифікат",
      typeLabel: "Тип",
      locationLabel: "Локація",
      publicFlowLabel: "Публічний flow",
      publicFlowValue: "Пропозиція → Сертифікат",
    },
    points: {
      kicker: "Межа POINTS / гроші",
      title: "Сертифікати та POINTS",
      description:
        "POINTS — це бонусні одиниці програми лояльності, а не гроші, валюта чи платіжний засіб. Якщо сертифікат показує схему на кшталт “2.33 POINTS + 50 PLN”, це означає змішану оплату: частину вартості покривають POINTS, решта оплачується грошима.",
    },
    offers: {
      kicker: "Публічні пропозиції",
      title: "Публічні пропозиції",
      description:
        "Тут показуються реальні пропозиції підприємства: послуга як Value Object, ціна, запис і доступність подарункового сертифіката.",
      count: (count) => count + " пропозицій",
      empty: "У цього підприємства поки немає публічних пропозицій.",
      certificateAvailable: "Сертифікат доступний",
      priceLabel: "Ціна",
      regularPriceLabel: "Звичайна ціна",
      bookingLabel: "Запис",
      certificateLabel: "Сертифікат",
      certificatePaymentLabel: "Оплата сертифіката",
      certificateTermsMissing: "Умови сертифіката ще не додано.",
      quickActions: "Швидкі дії",
      detailsAction: "Детальний опис",
      orderCertificateAction: "Замовити сертифікат",
    },
  },
  de: {
    numberLocale: "de-DE",
    common: {
      yes: "Ja",
      no: "Nein",
      available: "verfügbar",
      none: "keine",
    },
    certificateAvailability: {
      unavailable: "Zertifikat nicht verfügbar",
      unlimited: "Die Anzahl der Zertifikate ist nicht begrenzt",
      available: (remaining, maxTotal) =>
        "Verfügbare Zertifikate: " + remaining + " von " + maxTotal,
      limitCheckFailed: (maxTotal) =>
        "Zertifikatslimit: " + maxTotal + "; der Restbestand konnte nicht geprüft werden",
    },
    offerTypes: {
      bookableService: "Buchbare Dienstleistung",
      service: "Dienstleistung",
      product: "Produkt",
      bundle: "Paket",
      consultation: "Beratung",
      reward: "Zertifikat / Prämie",
    },
    organizationTypes: {
      privateBusiness: "Privates Unternehmen",
      company: "Unternehmen",
      nonProfit: "Gemeinnützige Organisation",
      publicInstitution: "Öffentliche Organisation",
    },
    verification: {
      verified: "Verifiziert",
      pending: "In Prüfung",
      rejected: "Abgelehnt",
      unverified: "Nicht verifiziert",
    },
    location: {
      notSpecified: "Standort nicht angegeben",
    },
    booking: {
      notRequired: "Keine Pflichtbuchung",
      required: "Buchung erforderlich",
      requiredWithDuration: (minutes) => "Buchung erforderlich · " + minutes + " Min.",
      needed: "Erforderlich",
      notNeeded: "Nicht erforderlich",
      durationShort: (minutes) => minutes + " Min.",
      durationNotSpecified: "Dauer nicht angegeben",
    },
    certificatePayment: {
      unavailable: "Nicht verfügbar",
      available: "Zertifikat verfügbar",
    },
    fallbacks: {
      descriptionMissing: "Die Beschreibung wurde noch nicht hinzugefügt.",
      categoryAi: "Die Kategorie wird von AI präzisiert",
    },
    navigation: {
      backToDirectory: "Zurück zum Verzeichnis",
      backToDirectoryWithArrow: "← Zurück zum Verzeichnis",
      viewOffers: "Angebote ansehen",
      registerPurchase: "Kauf registrieren",
    },
    error: {
      kicker: "Verzeichnisfehler",
      title: "Profil konnte nicht geladen werden",
    },
    hero: {
      kicker: "Öffentliches Unternehmensprofil",
      safetyNote:
        "Im öffentlichen Profil werden sichere Informationen angezeigt: das Unternehmen, öffentliche Angebote, Zertifikate und das Formular zur Registrierung eines externen Kaufs. Die genaue Adresse wird nicht offengelegt, wenn sie verborgen oder nur ungefähr angegeben ist.",
      enterpriseLabel: "Unternehmen",
      verificationLabel: "Verifizierung",
      currencyLabel: "Währung",
      offersLabel: "Angebote",
      certificateLabel: "Zertifikat",
      typeLabel: "Typ",
      locationLabel: "Standort",
      publicFlowLabel: "Öffentlicher Ablauf",
      publicFlowValue: "Angebot → Zertifikat",
    },
    points: {
      kicker: "Grenze zwischen POINTS und Geld",
      title: "Zertifikate und POINTS",
      description:
        "POINTS sind Bonuseinheiten des Treueprogramms, kein Geld, keine Währung und kein Zahlungsmittel. Wenn ein Zertifikat ein Schema wie “2.33 POINTS + 50 PLN” zeigt, bedeutet das eine gemischte Zahlung: Ein Teil des Werts wird durch POINTS gedeckt, der Rest wird mit Geld bezahlt.",
    },
    offers: {
      kicker: "Öffentliche Angebote",
      title: "Öffentliche Angebote",
      description:
        "Hier werden echte Unternehmensangebote angezeigt: die Dienstleistung als Value Object, Preis, Buchung und Verfügbarkeit eines Geschenkgutscheins.",
      count: (count) => count + " Angebote",
      empty: "Dieses Unternehmen hat noch keine öffentlichen Angebote.",
      certificateAvailable: "Zertifikat verfügbar",
      priceLabel: "Preis",
      regularPriceLabel: "Regulärer Preis",
      bookingLabel: "Buchung",
      certificateLabel: "Zertifikat",
      certificatePaymentLabel: "Zertifikatszahlung",
      certificateTermsMissing: "Die Bedingungen des Zertifikats wurden noch nicht hinzugefügt.",
      quickActions: "Schnellaktionen",
      detailsAction: "Detaillierte Beschreibung",
      orderCertificateAction: "Zertifikat bestellen",
    },
  },
  cs: {
    numberLocale: "cs-CZ",
    common: {
      yes: "Ano",
      no: "Ne",
      available: "dostupný",
      none: "není",
    },
    certificateAvailability: {
      unavailable: "Certifikát není dostupný",
      unlimited: "Počet certifikátů není omezen",
      available: (remaining, maxTotal) =>
        "Dostupné certifikáty: " + remaining + " z " + maxTotal,
      limitCheckFailed: (maxTotal) =>
        "Limit certifikátů: " + maxTotal + "; zbývající počet se nepodařilo ověřit",
    },
    offerTypes: {
      bookableService: "Služba s rezervací",
      service: "Služba",
      product: "Produkt",
      bundle: "Balíček",
      consultation: "Konzultace",
      reward: "Certifikát / odměna",
    },
    organizationTypes: {
      privateBusiness: "Soukromé podnikání",
      company: "Firma",
      nonProfit: "Nezisková organizace",
      publicInstitution: "Veřejná organizace",
    },
    verification: {
      verified: "Ověřeno",
      pending: "Probíhá ověření",
      rejected: "Odmítnuto",
      unverified: "Bez ověření",
    },
    location: {
      notSpecified: "Lokalita není uvedena",
    },
    booking: {
      notRequired: "Rezervace není povinná",
      required: "Rezervace je vyžadována",
      requiredWithDuration: (minutes) => "Rezervace je vyžadována · " + minutes + " min",
      needed: "Vyžadována",
      notNeeded: "Není vyžadována",
      durationShort: (minutes) => minutes + " min",
      durationNotSpecified: "délka není uvedena",
    },
    certificatePayment: {
      unavailable: "Nedostupný",
      available: "Certifikát dostupný",
    },
    fallbacks: {
      descriptionMissing: "Popis zatím nebyl přidán.",
      categoryAi: "Kategorie bude upřesněna pomocí AI",
    },
    navigation: {
      backToDirectory: "Zpět do katalogu",
      backToDirectoryWithArrow: "← Zpět do katalogu",
      viewOffers: "Zobrazit nabídky",
      registerPurchase: "Registrovat nákup",
    },
    error: {
      kicker: "Chyba katalogu",
      title: "Profil se nepodařilo načíst",
    },
    hero: {
      kicker: "Veřejný profil podniku",
      safetyNote:
        "Ve veřejném profilu se zobrazují bezpečné informace: podnik, veřejné nabídky, certifikáty a formulář pro registraci externího nákupu. Přesná adresa se nezobrazuje, pokud je skrytá nebo uvedená pouze přibližně.",
      enterpriseLabel: "Podnik",
      verificationLabel: "Ověření",
      currencyLabel: "Měna",
      offersLabel: "Nabídky",
      certificateLabel: "Certifikát",
      typeLabel: "Typ",
      locationLabel: "Lokalita",
      publicFlowLabel: "Veřejný tok",
      publicFlowValue: "Nabídka → Certifikát",
    },
    points: {
      kicker: "Hranice POINTS / peníze",
      title: "Certifikáty a POINTS",
      description:
        "POINTS jsou bonusové jednotky věrnostního programu, nikoli peníze, měna ani platební prostředek. Pokud certifikát ukazuje schéma jako “2.33 POINTS + 50 PLN”, znamená to smíšenou platbu: část hodnoty pokrývají POINTS a zbytek se platí penězi.",
    },
    offers: {
      kicker: "Veřejné nabídky",
      title: "Veřejné nabídky",
      description:
        "Zde se zobrazují skutečné nabídky podniku: služba jako Value Object, cena, rezervace a dostupnost dárkového certifikátu.",
      count: (count) => count + " nabídek",
      empty: "Tento podnik zatím nemá žádné veřejné nabídky.",
      certificateAvailable: "Certifikát dostupný",
      priceLabel: "Cena",
      regularPriceLabel: "Běžná cena",
      bookingLabel: "Rezervace",
      certificateLabel: "Certifikát",
      certificatePaymentLabel: "Platba certifikátu",
      certificateTermsMissing: "Podmínky certifikátu zatím nebyly přidány.",
      quickActions: "Rychlé akce",
      detailsAction: "Podrobný popis",
      orderCertificateAction: "Objednat certifikát",
    },
  },
};

export function isDirectoryDetailLocale(value: string): value is DirectoryDetailLocale {
  return Object.prototype.hasOwnProperty.call(directoryDetailMessages, value);
}

export function getDirectoryDetailMessages(
  locale: string | null | undefined,
): DirectoryDetailMessages {
  const normalizedLocale = (locale ?? "").trim().toLowerCase();
  const baseLocale = normalizedLocale.split("-")[0];

  if (isDirectoryDetailLocale(baseLocale)) {
    return directoryDetailMessages[baseLocale];
  }

  return directoryDetailMessages.en;
}
