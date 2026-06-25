export type OffersLocale = "ru" | "pl" | "en" | "es" | "uk" | "de" | "cs";

export type OffersMessages = {
  numberLocale: string;
  common: {
    yes: string;
    no: string;
    free: string;
    dash: string;
    notSpecified: string;
    unlimited: string;
    enabled: string;
    disabled: string;
    available: string;
    unavailable: string;
    loading: string;
    error: string;
  };
  navigation: {
    backToEnterprise: string;
    backToOffers: string;
    registerPurchase: string;
    orderCertificate: string;
    openCertificateOrder: string;
    goToOfferList: string;
    goToCertificates: string;
  };
  status: {
    active: string;
    draft: string;
    archived: string;
    inactive: string;
    unknown: string;
  };
  detail: {
    errorTitle: string;
    descriptionFallback: string;
    publicEnterpriseCard: string;
    registerPurchaseAtEnterprise: string;
    offerPrice: string;
    regularPrice: string;
    discount: string;
    lowestPrice30Days: string;
    discountLegalNote: string;
    booking: string;
    duration: string;
    quantityLimit: string;
    validFrom: string;
    validUntil: string;
    offerFlowTitle: string;
    offerFlowDescription: string;
    detailedDescriptionTitle: string;
    detailedDescriptionText: string;
    enterpriseLabel: string;
    offerTypeLabel: string;
    statusLabel: string;
    certificateSectionTitle: string;
    certificateSectionDescription: string;
    certificateAvailabilityLabel: string;
    certificateCostLabel: string;
    certificateValidityLabel: string;
    sellerConfirmationLabel: string;
    cancellableLabel: string;
    transferableLabel: string;
    pointsRefundPolicyLabel: string;
    maxCertificatesLabel: string;
    certificateTermsLabel: string;
    certificateTermsMissing: string;
    goToCertificateOrder: string;
    nextActionsTitle: string;
  };
  availableSlots: {
    title: string;
    loadingOffers: string;
    offerAndDateRequired: string;
    offerLabel: string;
    dateLabel: string;
    showSlots: string;
    loading: string;
    noSlots: string;
    availableSlotsLabel: string;
  };
  newOffer: {
    title: string;
    description: string;
    myEnterprises: string;
    offerList: string;
    stepTwoKicker: string;
    stepTwoTitle: string;
    stepTwoDescription: string;
    fillMassageOffer: string;
    selectedEnterpriseMissing: string;
    selectedEnterpriseLabel: string;
    enterpriseLabel: string;
    noEnterprisesOption: string;
    valueObjectLabel: string;
    noServicesForEnterprise: string;
    chooseService: string;
    addServiceFirst: string;
    offerTitleLabel: string;
    offerTitlePlaceholder: string;
    offerDescriptionLabel: string;
    offerTypeLabel: string;
    priceLabel: string;
    currencyLabel: string;
    durationMinutesLabel: string;
    requiresBookingLabel: string;
    requiresBookingHelp: string;
    bookingModeLabel: string;
    audienceLabel: string;
    certificateSectionTitle: string;
    certificateSectionToggle: string;
    certificateSectionHelp: string;
    certificateAvailableLabel: string;
    certificateTermsLabel: string;
    certificateValidityDaysLabel: string;
    certificateCurrencyLabel: string;
    pointsCoverageLabel: string;
    certificateLimitLabel: string;
    sellerConfirmationLabel: string;
    transferableLabel: string;
    cancellableLabel: string;
    pointsSettingsTitle: string;
    pointsCurrencyLabel: string;
    baseCurrencyLabel: string;
    eurToPlnRateLabel: string;
    rateSourceLabel: string;
    rateDateLabel: string;
    userLimitLabel: string;
    serviceLimitLabel: string;
    refundPolicyLabel: string;
    publicRewardLabel: string;
    createButton: string;
    creatingButton: string;
    bindDataTitle: string;
    previewTitle: string;
    nextTitle: string;
    createdTitle: string;
    createdPriceLabel: string;
    createdCertificateLabel: string;
    createdStatusLabel: string;
    openCertificateFromOffer: string;
    goToOfferList: string;
    goToCertificates: string;
    loadOrganizationsError: string;
    loadValueObjectsError: string;
    unknownLoadError: string;
    createOfferError: string;
    createOfferSuccess: string;
    unknownCreateError: string;
    pointsCoverageWarning: string;
    pointsRateWarning: string;
  };
};

export const offersMessages: Record<OffersLocale, OffersMessages> = {
  ru: {
    numberLocale: "ru-RU",
    common: {
      yes: "Да",
      no: "Нет",
      free: "Бесплатно",
      dash: "—",
      notSpecified: "Не указано",
      unlimited: "Без лимита",
      enabled: "Включён",
      disabled: "Выключен",
      available: "Доступен",
      unavailable: "Недоступен",
      loading: "Загрузка...",
      error: "Ошибка",
    },
    navigation: {
      backToEnterprise: "← Назад к предприятию",
      backToOffers: "Назад к предложениям",
      registerPurchase: "Зарегистрировать покупку у предприятия",
      orderCertificate: "Заказать сертификат",
      openCertificateOrder: "Перейти к заказу сертификата",
      goToOfferList: "Перейти к списку предложений",
      goToCertificates: "Перейти к сертификатам",
    },
    status: {
      active: "Активно",
      draft: "Черновик",
      archived: "Архив",
      inactive: "Неактивно",
      unknown: "Неизвестный статус",
    },
    detail: {
      errorTitle: "Ошибка загрузки предложения",
      descriptionFallback: "Описание пока не добавлено.",
      publicEnterpriseCard: "Публичная карточка предприятия",
      registerPurchaseAtEnterprise: "Зарегистрировать покупку у предприятия",
      offerPrice: "Цена offer",
      regularPrice: "Обычная цена",
      discount: "Скидка",
      lowestPrice30Days: "Самая низкая цена за 30 дней",
      discountLegalNote: "Примечание к скидке",
      booking: "Бронирование",
      duration: "Длительность",
      quantityLimit: "Лимит количества",
      validFrom: "Действует с",
      validUntil: "Действует до",
      offerFlowTitle: "Offer, сертификат и регистрация покупки",
      offerFlowDescription:
        "Эта страница описывает конкретное предложение. Сертификат создаётся по этому offer. Регистрация покупки относится к предприятию в целом: покупатель может купить любой товар или услугу у предприятия, а продавец подтверждает факт покупки.",
      detailedDescriptionTitle: "Подробное описание offer",
      detailedDescriptionText: "Публичная информация о выбранном предложении.",
      enterpriseLabel: "Предприятие",
      offerTypeLabel: "Тип предложения",
      statusLabel: "Статус",
      certificateSectionTitle: "Сертификат по этому offer",
      certificateSectionDescription:
        "Здесь показаны условия сертификата. Оформление сертификата выполняется на отдельной странице заказа.",
      certificateAvailabilityLabel: "Доступность",
      certificateCostLabel: "Стоимость сертификата",
      certificateValidityLabel: "Срок действия",
      sellerConfirmationLabel: "Требуется подтверждение продавца",
      cancellableLabel: "Можно отменить",
      transferableLabel: "Можно передать",
      pointsRefundPolicyLabel: "Политика возврата POINTS",
      maxCertificatesLabel: "Максимум сертификатов",
      certificateTermsLabel: "Условия сертификата",
      certificateTermsMissing: "Условия сертификата пока не добавлены.",
      goToCertificateOrder: "Перейти к заказу сертификата",
      nextActionsTitle: "Что дальше",
    },
    availableSlots: {
      title: "Доступные слоты",
      loadingOffers: "Загрузка предложений...",
      offerAndDateRequired: "Нужно выбрать offer и дату",
      offerLabel: "Offer",
      dateLabel: "Дата",
      showSlots: "Показать доступные слоты",
      loading: "Загрузка...",
      noSlots: "Нет доступных слотов",
      availableSlotsLabel: "Доступные слоты",
    },
    newOffer: {
      title: "Создать предложение предприятия",
      description:
        "Предложение связывает предприятие, услугу как Value Object, цену, условия записи и подарочный сертификат. Здесь создаётся реальное предложение для Szczecin.",
      myEnterprises: "Мои предприятия",
      offerList: "Список предложений",
      stepTwoKicker: "Шаг 2",
      stepTwoTitle: "Предложение на базе услуги",
      stepTwoDescription:
        "Услуга уже создана. Теперь оформляем offer и включаем подарочный сертификат.",
      fillMassageOffer: "Заполнить offer массажа",
      selectedEnterpriseMissing:
        "Предприятие из ссылки не найдено или доступ запрещён. Выберите предприятие вручную.",
      selectedEnterpriseLabel: "Выбранное предприятие",
      enterpriseLabel: "Предприятие",
      noEnterprisesOption: "Нет доступных предприятий",
      valueObjectLabel: "Услуга / основной Value Object",
      noServicesForEnterprise: "Нет услуг для выбранного предприятия",
      chooseService: "Выберите услугу",
      addServiceFirst: "Сначала добавить услугу для этого предприятия",
      offerTitleLabel: "Название предложения",
      offerTitlePlaceholder: "Relaksacyjny masaż łydek w Szczecinie",
      offerDescriptionLabel: "Описание предложения",
      offerTypeLabel: "Тип offer",
      priceLabel: "Цена",
      currencyLabel: "Валюта",
      durationMinutesLabel: "Длительность, мин.",
      requiresBookingLabel: "Требуется согласование времени",
      requiresBookingHelp:
        "Для массажа клиент должен договориться о времени с продавцом.",
      bookingModeLabel: "Режим записи",
      audienceLabel: "Для кого",
      certificateSectionTitle: "Подарочный сертификат",
      certificateSectionToggle: "Включить сертификат на базе этого предложения",
      certificateSectionHelp:
        "Сертификат будет связан с offer и услугой. На этом этапе сертификат оплачивается деньгами; POINTS можно подключить позже.",
      certificateAvailableLabel: "Сертификат доступен",
      certificateTermsLabel: "Условия сертификата",
      certificateValidityDaysLabel: "Срок, дней",
      certificateCurrencyLabel: "Валюта сертификата",
      pointsCoverageLabel: "Покрытие POINTS",
      certificateLimitLabel: "Лимит сертификатов",
      sellerConfirmationLabel: "Продавец подтверждает использование",
      transferableLabel: "Можно передать другому человеку",
      cancellableLabel: "Можно отменить по правилам платформы",
      pointsSettingsTitle: "Дополнительные настройки POINTS и ограничений",
      pointsCurrencyLabel: "Валюта баллов",
      baseCurrencyLabel: "Базовая валюта",
      eurToPlnRateLabel: "Курс 1 EUR к PLN",
      rateSourceLabel: "Источник курса",
      rateDateLabel: "Дата курса",
      userLimitLabel: "Лимит на пользователя",
      serviceLimitLabel: "Лимит количества услуг",
      refundPolicyLabel: "Политика возврата",
      publicRewardLabel: "Публичный reward / сертификат",
      createButton: "Создать предложение",
      creatingButton: "Создаю предложение...",
      bindDataTitle: "Связь данных",
      previewTitle: "Preview сертификата",
      nextTitle: "Что дальше",
      createdTitle: "Предложение создано",
      createdPriceLabel: "Цена",
      createdCertificateLabel: "Сертификат",
      createdStatusLabel: "Статус",
      openCertificateFromOffer: "Открыть сертификат на базе offer",
      goToOfferList: "Перейти к списку предложений",
      goToCertificates: "Перейти к сертификатам",
      loadOrganizationsError: "Не удалось загрузить предприятия.",
      loadValueObjectsError: "Не удалось загрузить услуги.",
      unknownLoadError: "Неизвестная ошибка загрузки данных.",
      createOfferError: "Не удалось создать предложение.",
      createOfferSuccess:
        "Предложение создано. Теперь можно проверить сертификат и каталог.",
      unknownCreateError: "Неизвестная ошибка создания предложения.",
      pointsCoverageWarning:
        "Сумма покрытия POINTS не может быть больше цены предложения.",
      pointsRateWarning:
        "Для расчёта POINTS нужен курс и ценность одного POINT.",
    },
  },
  pl: {
    numberLocale: "pl-PL",
    common: {
      yes: "Tak",
      no: "Nie",
      free: "Bezpłatnie",
      dash: "—",
      notSpecified: "Nie podano",
      unlimited: "Bez limitu",
      enabled: "Włączony",
      disabled: "Wyłączony",
      available: "Dostępny",
      unavailable: "Niedostępny",
      loading: "Ładowanie...",
      error: "Błąd",
    },
    navigation: {
      backToEnterprise: "← Wróć do firmy",
      backToOffers: "Wróć do ofert",
      registerPurchase: "Zarejestruj zakup w firmie",
      orderCertificate: "Zamów certyfikat",
      openCertificateOrder: "Przejdź do zamówienia certyfikatu",
      goToOfferList: "Przejdź do listy ofert",
      goToCertificates: "Przejdź do certyfikatów",
    },
    status: {
      active: "Aktywne",
      draft: "Szkic",
      archived: "Archiwum",
      inactive: "Nieaktywne",
      unknown: "Nieznany status",
    },
    detail: {
      errorTitle: "Nie udało się załadować oferty",
      descriptionFallback: "Opis nie został jeszcze dodany.",
      publicEnterpriseCard: "Publiczny profil firmy",
      registerPurchaseAtEnterprise: "Zarejestruj zakup w firmie",
      offerPrice: "Cena oferty",
      regularPrice: "Cena regularna",
      discount: "Rabat",
      lowestPrice30Days: "Najniższa cena z 30 dni",
      discountLegalNote: "Informacja o rabacie",
      booking: "Rezerwacja",
      duration: "Czas trwania",
      quantityLimit: "Limit liczby",
      validFrom: "Obowiązuje od",
      validUntil: "Obowiązuje do",
      offerFlowTitle: "Oferta, certyfikat i rejestracja zakupu",
      offerFlowDescription:
        "Ta strona opisuje konkretną ofertę. Certyfikat jest tworzony dla tej oferty. Rejestracja zakupu dotyczy firmy jako całości: kupujący może kupić dowolny produkt lub usługę w firmie, a sprzedawca potwierdza fakt zakupu.",
      detailedDescriptionTitle: "Szczegółowy opis oferty",
      detailedDescriptionText: "Publiczna informacja o wybranej ofercie.",
      enterpriseLabel: "Firma",
      offerTypeLabel: "Typ oferty",
      statusLabel: "Status",
      certificateSectionTitle: "Certyfikat dla tej oferty",
      certificateSectionDescription:
        "Tutaj pokazane są warunki certyfikatu. Zamówienie certyfikatu odbywa się na osobnej stronie.",
      certificateAvailabilityLabel: "Dostępność",
      certificateCostLabel: "Koszt certyfikatu",
      certificateValidityLabel: "Termin ważności",
      sellerConfirmationLabel: "Wymagane potwierdzenie sprzedawcy",
      cancellableLabel: "Można anulować",
      transferableLabel: "Można przekazać",
      pointsRefundPolicyLabel: "Polityka zwrotu POINTS",
      maxCertificatesLabel: "Maksymalna liczba certyfikatów",
      certificateTermsLabel: "Warunki certyfikatu",
      certificateTermsMissing: "Warunki certyfikatu nie zostały jeszcze dodane.",
      goToCertificateOrder: "Przejdź do zamówienia certyfikatu",
      nextActionsTitle: "Co dalej",
    },
    availableSlots: {
      title: "Dostępne terminy",
      loadingOffers: "Ładowanie ofert...",
      offerAndDateRequired: "Wybierz ofertę i datę",
      offerLabel: "Oferta",
      dateLabel: "Data",
      showSlots: "Pokaż dostępne terminy",
      loading: "Ładowanie...",
      noSlots: "Brak dostępnych terminów",
      availableSlotsLabel: "Dostępne terminy",
    },
    newOffer: {
      title: "Utwórz ofertę firmy",
      description:
        "Oferta łączy firmę, usługę jako Value Object, cenę, zasady rezerwacji i certyfikat prezentowy. Tutaj powstaje realna oferta dla Szczecina.",
      myEnterprises: "Moje firmy",
      offerList: "Lista ofert",
      stepTwoKicker: "Krok 2",
      stepTwoTitle: "Oferta na bazie usługi",
      stepTwoDescription:
        "Usługa została już utworzona. Teraz tworzymy ofertę i włączamy certyfikat prezentowy.",
      fillMassageOffer: "Wypełnij ofertę masażu",
      selectedEnterpriseMissing:
        "Firma z linku nie została znaleziona albo dostęp jest zabroniony. Wybierz firmę ręcznie.",
      selectedEnterpriseLabel: "Wybrana firma",
      enterpriseLabel: "Firma",
      noEnterprisesOption: "Brak dostępnych firm",
      valueObjectLabel: "Usługa / główny Value Object",
      noServicesForEnterprise: "Brak usług dla wybranej firmy",
      chooseService: "Wybierz usługę",
      addServiceFirst: "Najpierw dodaj usługę dla tej firmy",
      offerTitleLabel: "Nazwa oferty",
      offerTitlePlaceholder: "Relaksacyjny masaż łydek w Szczecinie",
      offerDescriptionLabel: "Opis oferty",
      offerTypeLabel: "Typ oferty",
      priceLabel: "Cena",
      currencyLabel: "Waluta",
      durationMinutesLabel: "Czas trwania, min",
      requiresBookingLabel: "Wymagane ustalenie terminu",
      requiresBookingHelp:
        "W przypadku masażu klient powinien uzgodnić termin ze sprzedawcą.",
      bookingModeLabel: "Tryb rezerwacji",
      audienceLabel: "Dla kogo",
      certificateSectionTitle: "Certyfikat prezentowy",
      certificateSectionToggle: "Włącz certyfikat na podstawie tej oferty",
      certificateSectionHelp:
        "Certyfikat będzie powiązany z ofertą i usługą. Na tym etapie certyfikat jest opłacany pieniędzmi; POINTS można podłączyć później.",
      certificateAvailableLabel: "Certyfikat dostępny",
      certificateTermsLabel: "Warunki certyfikatu",
      certificateValidityDaysLabel: "Termin, dni",
      certificateCurrencyLabel: "Waluta certyfikatu",
      pointsCoverageLabel: "Pokrycie POINTS",
      certificateLimitLabel: "Limit certyfikatów",
      sellerConfirmationLabel: "Sprzedawca potwierdza użycie",
      transferableLabel: "Można przekazać innej osobie",
      cancellableLabel: "Można anulować zgodnie z zasadami platformy",
      pointsSettingsTitle: "Dodatkowe ustawienia POINTS i limitów",
      pointsCurrencyLabel: "Waluta punktów",
      baseCurrencyLabel: "Waluta bazowa",
      eurToPlnRateLabel: "Kurs 1 EUR do PLN",
      rateSourceLabel: "Źródło kursu",
      rateDateLabel: "Data kursu",
      userLimitLabel: "Limit na użytkownika",
      serviceLimitLabel: "Limit liczby usług",
      refundPolicyLabel: "Polityka zwrotu",
      publicRewardLabel: "Publiczny reward / certyfikat",
      createButton: "Utwórz ofertę",
      creatingButton: "Tworzę ofertę...",
      bindDataTitle: "Powiązanie danych",
      previewTitle: "Podgląd certyfikatu",
      nextTitle: "Co dalej",
      createdTitle: "Oferta została utworzona",
      createdPriceLabel: "Cena",
      createdCertificateLabel: "Certyfikat",
      createdStatusLabel: "Status",
      openCertificateFromOffer: "Otwórz certyfikat na podstawie oferty",
      goToOfferList: "Przejdź do listy ofert",
      goToCertificates: "Przejdź do certyfikatów",
      loadOrganizationsError: "Nie udało się załadować firm.",
      loadValueObjectsError: "Nie udało się załadować usług.",
      unknownLoadError: "Nieznany błąd ładowania danych.",
      createOfferError: "Nie udało się utworzyć oferty.",
      createOfferSuccess:
        "Oferta została utworzona. Teraz można sprawdzić certyfikat i katalog.",
      unknownCreateError: "Nieznany błąd tworzenia oferty.",
      pointsCoverageWarning:
        "Kwota pokrywana przez POINTS nie może być większa niż cena oferty.",
      pointsRateWarning:
        "Do obliczenia POINTS potrzebny jest kurs i wartość jednego POINT.",
    },
  },
  en: {
    numberLocale: "en-US",
    common: {
      yes: "Yes",
      no: "No",
      free: "Free",
      dash: "—",
      notSpecified: "Not specified",
      unlimited: "Unlimited",
      enabled: "Enabled",
      disabled: "Disabled",
      available: "Available",
      unavailable: "Unavailable",
      loading: "Loading...",
      error: "Error",
    },
    navigation: {
      backToEnterprise: "← Back to business",
      backToOffers: "Back to offers",
      registerPurchase: "Register a purchase at the business",
      orderCertificate: "Order certificate",
      openCertificateOrder: "Go to certificate order",
      goToOfferList: "Go to offer list",
      goToCertificates: "Go to certificates",
    },
    status: {
      active: "Active",
      draft: "Draft",
      archived: "Archive",
      inactive: "Inactive",
      unknown: "Unknown status",
    },
    detail: {
      errorTitle: "Could not load the offer",
      descriptionFallback: "Description has not been added yet.",
      publicEnterpriseCard: "Public business profile",
      registerPurchaseAtEnterprise: "Register a purchase at the business",
      offerPrice: "Offer price",
      regularPrice: "Regular price",
      discount: "Discount",
      lowestPrice30Days: "Lowest price in 30 days",
      discountLegalNote: "Discount note",
      booking: "Booking",
      duration: "Duration",
      quantityLimit: "Quantity limit",
      validFrom: "Valid from",
      validUntil: "Valid until",
      offerFlowTitle: "Offer, certificate and purchase registration",
      offerFlowDescription:
        "This page describes a specific offer. A certificate is created for this offer. Purchase registration belongs to the business as a whole: the buyer may buy any product or service from the business, and the seller confirms the purchase.",
      detailedDescriptionTitle: "Detailed offer description",
      detailedDescriptionText: "Public information about the selected offer.",
      enterpriseLabel: "Business",
      offerTypeLabel: "Offer type",
      statusLabel: "Status",
      certificateSectionTitle: "Certificate for this offer",
      certificateSectionDescription:
        "This section shows the certificate terms. Certificate ordering is completed on a separate order page.",
      certificateAvailabilityLabel: "Availability",
      certificateCostLabel: "Certificate cost",
      certificateValidityLabel: "Validity period",
      sellerConfirmationLabel: "Seller confirmation required",
      cancellableLabel: "Cancellable",
      transferableLabel: "Transferable",
      pointsRefundPolicyLabel: "POINTS refund policy",
      maxCertificatesLabel: "Maximum certificates",
      certificateTermsLabel: "Certificate terms",
      certificateTermsMissing: "Certificate terms have not been added yet.",
      goToCertificateOrder: "Go to certificate order",
      nextActionsTitle: "What next",
    },
    availableSlots: {
      title: "Available slots",
      loadingOffers: "Loading offers...",
      offerAndDateRequired: "Offer and date are required",
      offerLabel: "Offer",
      dateLabel: "Date",
      showSlots: "Show available slots",
      loading: "Loading...",
      noSlots: "No available slots",
      availableSlotsLabel: "Available slots",
    },
    newOffer: {
      title: "Create business offer",
      description:
        "An offer connects a business, a service as a Value Object, price, booking rules and a gift certificate. This creates a real offer for Szczecin.",
      myEnterprises: "My businesses",
      offerList: "Offer list",
      stepTwoKicker: "Step 2",
      stepTwoTitle: "Offer based on a service",
      stepTwoDescription:
        "The service has already been created. Now we create the offer and enable the gift certificate.",
      fillMassageOffer: "Fill massage offer",
      selectedEnterpriseMissing:
        "The business from the link was not found or access is denied. Choose a business manually.",
      selectedEnterpriseLabel: "Selected business",
      enterpriseLabel: "Business",
      noEnterprisesOption: "No available businesses",
      valueObjectLabel: "Service / main Value Object",
      noServicesForEnterprise: "No services for the selected business",
      chooseService: "Choose a service",
      addServiceFirst: "Add a service for this business first",
      offerTitleLabel: "Offer title",
      offerTitlePlaceholder: "Relaxing calf massage in Szczecin",
      offerDescriptionLabel: "Offer description",
      offerTypeLabel: "Offer type",
      priceLabel: "Price",
      currencyLabel: "Currency",
      durationMinutesLabel: "Duration, min",
      requiresBookingLabel: "Time coordination required",
      requiresBookingHelp:
        "For massage, the client should agree on the time with the seller.",
      bookingModeLabel: "Booking mode",
      audienceLabel: "For whom",
      certificateSectionTitle: "Gift certificate",
      certificateSectionToggle: "Enable certificate based on this offer",
      certificateSectionHelp:
        "The certificate will be connected to the offer and service. At this stage the certificate is paid with money; POINTS can be connected later.",
      certificateAvailableLabel: "Certificate available",
      certificateTermsLabel: "Certificate terms",
      certificateValidityDaysLabel: "Validity, days",
      certificateCurrencyLabel: "Certificate currency",
      pointsCoverageLabel: "POINTS coverage",
      certificateLimitLabel: "Certificate limit",
      sellerConfirmationLabel: "Seller confirms usage",
      transferableLabel: "Can be transferred to another person",
      cancellableLabel: "Can be cancelled according to platform rules",
      pointsSettingsTitle: "Additional POINTS and limits settings",
      pointsCurrencyLabel: "Points currency",
      baseCurrencyLabel: "Base currency",
      eurToPlnRateLabel: "1 EUR to PLN rate",
      rateSourceLabel: "Rate source",
      rateDateLabel: "Rate date",
      userLimitLabel: "User limit",
      serviceLimitLabel: "Service quantity limit",
      refundPolicyLabel: "Refund policy",
      publicRewardLabel: "Public reward / certificate",
      createButton: "Create offer",
      creatingButton: "Creating offer...",
      bindDataTitle: "Data binding",
      previewTitle: "Certificate preview",
      nextTitle: "What next",
      createdTitle: "Offer created",
      createdPriceLabel: "Price",
      createdCertificateLabel: "Certificate",
      createdStatusLabel: "Status",
      openCertificateFromOffer: "Open certificate based on offer",
      goToOfferList: "Go to offer list",
      goToCertificates: "Go to certificates",
      loadOrganizationsError: "Could not load businesses.",
      loadValueObjectsError: "Could not load services.",
      unknownLoadError: "Unknown data loading error.",
      createOfferError: "Could not create offer.",
      createOfferSuccess:
        "Offer created. Now you can check the certificate and directory.",
      unknownCreateError: "Unknown offer creation error.",
      pointsCoverageWarning:
        "POINTS coverage cannot be greater than the offer price.",
      pointsRateWarning:
        "POINTS calculation requires an exchange rate and the value of one POINT.",
    },
  },
  es: {
    numberLocale: "es-ES",
    common: {
      yes: "Sí",
      no: "No",
      free: "Gratis",
      dash: "—",
      notSpecified: "No especificado",
      unlimited: "Sin límite",
      enabled: "Activado",
      disabled: "Desactivado",
      available: "Disponible",
      unavailable: "No disponible",
      loading: "Cargando...",
      error: "Error",
    },
    navigation: {
      backToEnterprise: "← Volver a la empresa",
      backToOffers: "Volver a las ofertas",
      registerPurchase: "Registrar una compra en la empresa",
      orderCertificate: "Pedir certificado",
      openCertificateOrder: "Ir al pedido del certificado",
      goToOfferList: "Ir a la lista de ofertas",
      goToCertificates: "Ir a los certificados",
    },
    status: {
      active: "Activo",
      draft: "Borrador",
      archived: "Archivo",
      inactive: "Inactivo",
      unknown: "Estado desconocido",
    },
    detail: {
      errorTitle: "No se pudo cargar la oferta",
      descriptionFallback: "La descripción aún no se ha añadido.",
      publicEnterpriseCard: "Ficha pública de la empresa",
      registerPurchaseAtEnterprise: "Registrar una compra en la empresa",
      offerPrice: "Precio de la oferta",
      regularPrice: "Precio normal",
      discount: "Descuento",
      lowestPrice30Days: "Precio más bajo de los últimos 30 días",
      discountLegalNote: "Nota sobre el descuento",
      booking: "Reserva",
      duration: "Duración",
      quantityLimit: "Límite de cantidad",
      validFrom: "Válido desde",
      validUntil: "Válido hasta",
      offerFlowTitle: "Oferta, certificado y registro de compra",
      offerFlowDescription:
        "Esta página describe una oferta concreta. El certificado se crea para esta oferta. El registro de compra pertenece a la empresa en general: el comprador puede comprar cualquier producto o servicio de la empresa, y el vendedor confirma la compra.",
      detailedDescriptionTitle: "Descripción detallada de la oferta",
      detailedDescriptionText: "Información pública sobre la oferta seleccionada.",
      enterpriseLabel: "Empresa",
      offerTypeLabel: "Tipo de oferta",
      statusLabel: "Estado",
      certificateSectionTitle: "Certificado para esta oferta",
      certificateSectionDescription:
        "Aquí se muestran las condiciones del certificado. El pedido del certificado se completa en una página separada.",
      certificateAvailabilityLabel: "Disponibilidad",
      certificateCostLabel: "Coste del certificado",
      certificateValidityLabel: "Periodo de validez",
      sellerConfirmationLabel: "Se requiere confirmación del vendedor",
      cancellableLabel: "Cancelable",
      transferableLabel: "Transferible",
      pointsRefundPolicyLabel: "Política de devolución de POINTS",
      maxCertificatesLabel: "Máximo de certificados",
      certificateTermsLabel: "Condiciones del certificado",
      certificateTermsMissing: "Las condiciones del certificado aún no se han añadido.",
      goToCertificateOrder: "Ir al pedido del certificado",
      nextActionsTitle: "Qué sigue",
    },
    availableSlots: {
      title: "Horarios disponibles",
      loadingOffers: "Cargando ofertas...",
      offerAndDateRequired: "Se requiere oferta y fecha",
      offerLabel: "Oferta",
      dateLabel: "Fecha",
      showSlots: "Mostrar horarios disponibles",
      loading: "Cargando...",
      noSlots: "No hay horarios disponibles",
      availableSlotsLabel: "Horarios disponibles",
    },
    newOffer: {
      title: "Crear oferta de empresa",
      description:
        "Una oferta conecta una empresa, un servicio como Value Object, el precio, las reglas de reserva y un certificado regalo. Aquí se crea una oferta real para Szczecin.",
      myEnterprises: "Mis empresas",
      offerList: "Lista de ofertas",
      stepTwoKicker: "Paso 2",
      stepTwoTitle: "Oferta basada en un servicio",
      stepTwoDescription:
        "El servicio ya fue creado. Ahora creamos la oferta y activamos el certificado regalo.",
      fillMassageOffer: "Rellenar oferta de masaje",
      selectedEnterpriseMissing:
        "No se encontró la empresa del enlace o el acceso está denegado. Elige una empresa manualmente.",
      selectedEnterpriseLabel: "Empresa seleccionada",
      enterpriseLabel: "Empresa",
      noEnterprisesOption: "No hay empresas disponibles",
      valueObjectLabel: "Servicio / Value Object principal",
      noServicesForEnterprise: "No hay servicios para la empresa seleccionada",
      chooseService: "Elige un servicio",
      addServiceFirst: "Primero añade un servicio para esta empresa",
      offerTitleLabel: "Nombre de la oferta",
      offerTitlePlaceholder: "Masaje relajante de pantorrillas en Szczecin",
      offerDescriptionLabel: "Descripción de la oferta",
      offerTypeLabel: "Tipo de oferta",
      priceLabel: "Precio",
      currencyLabel: "Moneda",
      durationMinutesLabel: "Duración, min",
      requiresBookingLabel: "Se requiere coordinar la hora",
      requiresBookingHelp:
        "Para el masaje, el cliente debe acordar la hora con el vendedor.",
      bookingModeLabel: "Modo de reserva",
      audienceLabel: "Para quién",
      certificateSectionTitle: "Certificado regalo",
      certificateSectionToggle: "Activar certificado basado en esta oferta",
      certificateSectionHelp:
        "El certificado estará conectado con la oferta y el servicio. En esta etapa el certificado se paga con dinero; POINTS se puede conectar más tarde.",
      certificateAvailableLabel: "Certificado disponible",
      certificateTermsLabel: "Condiciones del certificado",
      certificateValidityDaysLabel: "Validez, días",
      certificateCurrencyLabel: "Moneda del certificado",
      pointsCoverageLabel: "Cobertura POINTS",
      certificateLimitLabel: "Límite de certificados",
      sellerConfirmationLabel: "El vendedor confirma el uso",
      transferableLabel: "Puede transferirse a otra persona",
      cancellableLabel: "Puede cancelarse según las reglas de la plataforma",
      pointsSettingsTitle: "Ajustes adicionales de POINTS y límites",
      pointsCurrencyLabel: "Moneda de puntos",
      baseCurrencyLabel: "Moneda base",
      eurToPlnRateLabel: "Tipo de cambio 1 EUR a PLN",
      rateSourceLabel: "Fuente del tipo de cambio",
      rateDateLabel: "Fecha del tipo de cambio",
      userLimitLabel: "Límite por usuario",
      serviceLimitLabel: "Límite de cantidad de servicios",
      refundPolicyLabel: "Política de devolución",
      publicRewardLabel: "Reward público / certificado",
      createButton: "Crear oferta",
      creatingButton: "Creando oferta...",
      bindDataTitle: "Vinculación de datos",
      previewTitle: "Vista previa del certificado",
      nextTitle: "Qué sigue",
      createdTitle: "Oferta creada",
      createdPriceLabel: "Precio",
      createdCertificateLabel: "Certificado",
      createdStatusLabel: "Estado",
      openCertificateFromOffer: "Abrir certificado basado en la oferta",
      goToOfferList: "Ir a la lista de ofertas",
      goToCertificates: "Ir a los certificados",
      loadOrganizationsError: "No se pudieron cargar las empresas.",
      loadValueObjectsError: "No se pudieron cargar los servicios.",
      unknownLoadError: "Error desconocido al cargar datos.",
      createOfferError: "No se pudo crear la oferta.",
      createOfferSuccess:
        "Oferta creada. Ahora puedes comprobar el certificado y el directorio.",
      unknownCreateError: "Error desconocido al crear la oferta.",
      pointsCoverageWarning:
        "La cobertura POINTS no puede ser mayor que el precio de la oferta.",
      pointsRateWarning:
        "Para calcular POINTS se necesita el tipo de cambio y el valor de un POINT.",
    },
  },
  uk: {
    numberLocale: "uk-UA",
    common: {
      yes: "Так",
      no: "Ні",
      free: "Безкоштовно",
      dash: "—",
      notSpecified: "Не вказано",
      unlimited: "Без ліміту",
      enabled: "Увімкнено",
      disabled: "Вимкнено",
      available: "Доступний",
      unavailable: "Недоступний",
      loading: "Завантаження...",
      error: "Помилка",
    },
    navigation: {
      backToEnterprise: "← Назад до підприємства",
      backToOffers: "Назад до пропозицій",
      registerPurchase: "Зареєструвати покупку у підприємства",
      orderCertificate: "Замовити сертифікат",
      openCertificateOrder: "Перейти до замовлення сертифіката",
      goToOfferList: "Перейти до списку пропозицій",
      goToCertificates: "Перейти до сертифікатів",
    },
    status: {
      active: "Активно",
      draft: "Чернетка",
      archived: "Архів",
      inactive: "Неактивно",
      unknown: "Невідомий статус",
    },
    detail: {
      errorTitle: "Не вдалося завантажити пропозицію",
      descriptionFallback: "Опис ще не додано.",
      publicEnterpriseCard: "Публічна картка підприємства",
      registerPurchaseAtEnterprise: "Зареєструвати покупку у підприємства",
      offerPrice: "Ціна offer",
      regularPrice: "Звичайна ціна",
      discount: "Знижка",
      lowestPrice30Days: "Найнижча ціна за 30 днів",
      discountLegalNote: "Примітка до знижки",
      booking: "Бронювання",
      duration: "Тривалість",
      quantityLimit: "Ліміт кількості",
      validFrom: "Діє з",
      validUntil: "Діє до",
      offerFlowTitle: "Offer, сертифікат і реєстрація покупки",
      offerFlowDescription:
        "Ця сторінка описує конкретну пропозицію. Сертифікат створюється за цим offer. Реєстрація покупки стосується підприємства в цілому: покупець може купити будь-який товар або послугу у підприємства, а продавець підтверджує факт покупки.",
      detailedDescriptionTitle: "Детальний опис offer",
      detailedDescriptionText: "Публічна інформація про вибрану пропозицію.",
      enterpriseLabel: "Підприємство",
      offerTypeLabel: "Тип пропозиції",
      statusLabel: "Статус",
      certificateSectionTitle: "Сертифікат за цим offer",
      certificateSectionDescription:
        "Тут показані умови сертифіката. Оформлення сертифіката виконується на окремій сторінці замовлення.",
      certificateAvailabilityLabel: "Доступність",
      certificateCostLabel: "Вартість сертифіката",
      certificateValidityLabel: "Строк дії",
      sellerConfirmationLabel: "Потрібне підтвердження продавця",
      cancellableLabel: "Можна скасувати",
      transferableLabel: "Можна передати",
      pointsRefundPolicyLabel: "Політика повернення POINTS",
      maxCertificatesLabel: "Максимум сертифікатів",
      certificateTermsLabel: "Умови сертифіката",
      certificateTermsMissing: "Умови сертифіката ще не додано.",
      goToCertificateOrder: "Перейти до замовлення сертифіката",
      nextActionsTitle: "Що далі",
    },
    availableSlots: {
      title: "Доступні слоти",
      loadingOffers: "Завантаження пропозицій...",
      offerAndDateRequired: "Потрібно вибрати offer і дату",
      offerLabel: "Offer",
      dateLabel: "Дата",
      showSlots: "Показати доступні слоти",
      loading: "Завантаження...",
      noSlots: "Немає доступних слотів",
      availableSlotsLabel: "Доступні слоти",
    },
    newOffer: {
      title: "Створити пропозицію підприємства",
      description:
        "Пропозиція пов’язує підприємство, послугу як Value Object, ціну, умови запису та подарунковий сертифікат. Тут створюється реальна пропозиція для Szczecin.",
      myEnterprises: "Мої підприємства",
      offerList: "Список пропозицій",
      stepTwoKicker: "Крок 2",
      stepTwoTitle: "Пропозиція на базі послуги",
      stepTwoDescription:
        "Послуга вже створена. Тепер оформлюємо offer і вмикаємо подарунковий сертифікат.",
      fillMassageOffer: "Заповнити offer масажу",
      selectedEnterpriseMissing:
        "Підприємство з посилання не знайдено або доступ заборонено. Виберіть підприємство вручну.",
      selectedEnterpriseLabel: "Вибране підприємство",
      enterpriseLabel: "Підприємство",
      noEnterprisesOption: "Немає доступних підприємств",
      valueObjectLabel: "Послуга / основний Value Object",
      noServicesForEnterprise: "Немає послуг для вибраного підприємства",
      chooseService: "Виберіть послугу",
      addServiceFirst: "Спочатку додайте послугу для цього підприємства",
      offerTitleLabel: "Назва пропозиції",
      offerTitlePlaceholder: "Розслабляючий масаж литок у Щецині",
      offerDescriptionLabel: "Опис пропозиції",
      offerTypeLabel: "Тип offer",
      priceLabel: "Ціна",
      currencyLabel: "Валюта",
      durationMinutesLabel: "Тривалість, хв",
      requiresBookingLabel: "Потрібне узгодження часу",
      requiresBookingHelp:
        "Для масажу клієнт повинен домовитися про час із продавцем.",
      bookingModeLabel: "Режим запису",
      audienceLabel: "Для кого",
      certificateSectionTitle: "Подарунковий сертифікат",
      certificateSectionToggle: "Увімкнути сертифікат на базі цієї пропозиції",
      certificateSectionHelp:
        "Сертифікат буде пов’язаний з offer і послугою. На цьому етапі сертифікат оплачується грошима; POINTS можна підключити пізніше.",
      certificateAvailableLabel: "Сертифікат доступний",
      certificateTermsLabel: "Умови сертифіката",
      certificateValidityDaysLabel: "Строк, днів",
      certificateCurrencyLabel: "Валюта сертифіката",
      pointsCoverageLabel: "Покриття POINTS",
      certificateLimitLabel: "Ліміт сертифікатів",
      sellerConfirmationLabel: "Продавець підтверджує використання",
      transferableLabel: "Можна передати іншій людині",
      cancellableLabel: "Можна скасувати за правилами платформи",
      pointsSettingsTitle: "Додаткові налаштування POINTS і обмежень",
      pointsCurrencyLabel: "Валюта балів",
      baseCurrencyLabel: "Базова валюта",
      eurToPlnRateLabel: "Курс 1 EUR до PLN",
      rateSourceLabel: "Джерело курсу",
      rateDateLabel: "Дата курсу",
      userLimitLabel: "Ліміт на користувача",
      serviceLimitLabel: "Ліміт кількості послуг",
      refundPolicyLabel: "Політика повернення",
      publicRewardLabel: "Публічний reward / сертифікат",
      createButton: "Створити пропозицію",
      creatingButton: "Створюю пропозицію...",
      bindDataTitle: "Зв’язок даних",
      previewTitle: "Preview сертифіката",
      nextTitle: "Що далі",
      createdTitle: "Пропозицію створено",
      createdPriceLabel: "Ціна",
      createdCertificateLabel: "Сертифікат",
      createdStatusLabel: "Статус",
      openCertificateFromOffer: "Відкрити сертифікат на базі offer",
      goToOfferList: "Перейти до списку пропозицій",
      goToCertificates: "Перейти до сертифікатів",
      loadOrganizationsError: "Не вдалося завантажити підприємства.",
      loadValueObjectsError: "Не вдалося завантажити послуги.",
      unknownLoadError: "Невідома помилка завантаження даних.",
      createOfferError: "Не вдалося створити пропозицію.",
      createOfferSuccess:
        "Пропозицію створено. Тепер можна перевірити сертифікат і каталог.",
      unknownCreateError: "Невідома помилка створення пропозиції.",
      pointsCoverageWarning:
        "Сума покриття POINTS не може бути більшою за ціну пропозиції.",
      pointsRateWarning:
        "Для розрахунку POINTS потрібен курс і цінність одного POINT.",
    },
  },
  de: {
    numberLocale: "de-DE",
    common: {
      yes: "Ja",
      no: "Nein",
      free: "Kostenlos",
      dash: "—",
      notSpecified: "Nicht angegeben",
      unlimited: "Ohne Limit",
      enabled: "Aktiviert",
      disabled: "Deaktiviert",
      available: "Verfügbar",
      unavailable: "Nicht verfügbar",
      loading: "Wird geladen...",
      error: "Fehler",
    },
    navigation: {
      backToEnterprise: "← Zurück zum Unternehmen",
      backToOffers: "Zurück zu den Angeboten",
      registerPurchase: "Kauf beim Unternehmen registrieren",
      orderCertificate: "Zertifikat bestellen",
      openCertificateOrder: "Zur Zertifikatsbestellung",
      goToOfferList: "Zur Angebotsliste",
      goToCertificates: "Zu den Zertifikaten",
    },
    status: {
      active: "Aktiv",
      draft: "Entwurf",
      archived: "Archiv",
      inactive: "Inaktiv",
      unknown: "Unbekannter Status",
    },
    detail: {
      errorTitle: "Angebot konnte nicht geladen werden",
      descriptionFallback: "Beschreibung wurde noch nicht hinzugefügt.",
      publicEnterpriseCard: "Öffentliches Unternehmensprofil",
      registerPurchaseAtEnterprise: "Kauf beim Unternehmen registrieren",
      offerPrice: "Angebotspreis",
      regularPrice: "Regulärer Preis",
      discount: "Rabatt",
      lowestPrice30Days: "Niedrigster Preis der letzten 30 Tage",
      discountLegalNote: "Hinweis zum Rabatt",
      booking: "Buchung",
      duration: "Dauer",
      quantityLimit: "Mengenlimit",
      validFrom: "Gültig ab",
      validUntil: "Gültig bis",
      offerFlowTitle: "Angebot, Zertifikat und Kaufregistrierung",
      offerFlowDescription:
        "Diese Seite beschreibt ein konkretes Angebot. Ein Zertifikat wird für dieses Angebot erstellt. Die Kaufregistrierung bezieht sich auf das Unternehmen insgesamt: Der Käufer kann jedes Produkt oder jede Dienstleistung beim Unternehmen kaufen, und der Verkäufer bestätigt den Kauf.",
      detailedDescriptionTitle: "Detaillierte Angebotsbeschreibung",
      detailedDescriptionText: "Öffentliche Information zum ausgewählten Angebot.",
      enterpriseLabel: "Unternehmen",
      offerTypeLabel: "Angebotstyp",
      statusLabel: "Status",
      certificateSectionTitle: "Zertifikat für dieses Angebot",
      certificateSectionDescription:
        "Hier werden die Bedingungen des Zertifikats angezeigt. Die Zertifikatsbestellung erfolgt auf einer separaten Bestellseite.",
      certificateAvailabilityLabel: "Verfügbarkeit",
      certificateCostLabel: "Zertifikatskosten",
      certificateValidityLabel: "Gültigkeitsdauer",
      sellerConfirmationLabel: "Bestätigung durch Verkäufer erforderlich",
      cancellableLabel: "Stornierbar",
      transferableLabel: "Übertragbar",
      pointsRefundPolicyLabel: "POINTS-Rückerstattungsregel",
      maxCertificatesLabel: "Maximale Zertifikate",
      certificateTermsLabel: "Zertifikatsbedingungen",
      certificateTermsMissing: "Zertifikatsbedingungen wurden noch nicht hinzugefügt.",
      goToCertificateOrder: "Zur Zertifikatsbestellung",
      nextActionsTitle: "Was als Nächstes",
    },
    availableSlots: {
      title: "Verfügbare Termine",
      loadingOffers: "Angebote werden geladen...",
      offerAndDateRequired: "Angebot und Datum sind erforderlich",
      offerLabel: "Angebot",
      dateLabel: "Datum",
      showSlots: "Verfügbare Termine anzeigen",
      loading: "Wird geladen...",
      noSlots: "Keine verfügbaren Termine",
      availableSlotsLabel: "Verfügbare Termine",
    },
    newOffer: {
      title: "Unternehmensangebot erstellen",
      description:
        "Ein Angebot verbindet ein Unternehmen, eine Dienstleistung als Value Object, Preis, Buchungsregeln und ein Geschenkzertifikat. Hier wird ein reales Angebot für Stettin erstellt.",
      myEnterprises: "Meine Unternehmen",
      offerList: "Angebotsliste",
      stepTwoKicker: "Schritt 2",
      stepTwoTitle: "Angebot auf Basis einer Dienstleistung",
      stepTwoDescription:
        "Die Dienstleistung wurde bereits erstellt. Jetzt erstellen wir das Angebot und aktivieren das Geschenkzertifikat.",
      fillMassageOffer: "Massageangebot ausfüllen",
      selectedEnterpriseMissing:
        "Das Unternehmen aus dem Link wurde nicht gefunden oder der Zugriff ist verweigert. Wählen Sie das Unternehmen manuell aus.",
      selectedEnterpriseLabel: "Ausgewähltes Unternehmen",
      enterpriseLabel: "Unternehmen",
      noEnterprisesOption: "Keine verfügbaren Unternehmen",
      valueObjectLabel: "Dienstleistung / Haupt-Value-Object",
      noServicesForEnterprise: "Keine Dienstleistungen für das ausgewählte Unternehmen",
      chooseService: "Dienstleistung auswählen",
      addServiceFirst: "Zuerst eine Dienstleistung für dieses Unternehmen hinzufügen",
      offerTitleLabel: "Angebotstitel",
      offerTitlePlaceholder: "Entspannende Wadenmassage in Stettin",
      offerDescriptionLabel: "Angebotsbeschreibung",
      offerTypeLabel: "Angebotstyp",
      priceLabel: "Preis",
      currencyLabel: "Währung",
      durationMinutesLabel: "Dauer, Min.",
      requiresBookingLabel: "Terminabstimmung erforderlich",
      requiresBookingHelp:
        "Bei einer Massage sollte der Kunde den Termin mit dem Verkäufer abstimmen.",
      bookingModeLabel: "Buchungsmodus",
      audienceLabel: "Für wen",
      certificateSectionTitle: "Geschenkzertifikat",
      certificateSectionToggle: "Zertifikat auf Basis dieses Angebots aktivieren",
      certificateSectionHelp:
        "Das Zertifikat wird mit dem Angebot und der Dienstleistung verbunden. In diesem Schritt wird das Zertifikat mit Geld bezahlt; POINTS können später verbunden werden.",
      certificateAvailableLabel: "Zertifikat verfügbar",
      certificateTermsLabel: "Zertifikatsbedingungen",
      certificateValidityDaysLabel: "Gültigkeit, Tage",
      certificateCurrencyLabel: "Zertifikatswährung",
      pointsCoverageLabel: "POINTS-Abdeckung",
      certificateLimitLabel: "Zertifikatslimit",
      sellerConfirmationLabel: "Verkäufer bestätigt die Nutzung",
      transferableLabel: "Kann an eine andere Person übertragen werden",
      cancellableLabel: "Kann gemäß Plattformregeln storniert werden",
      pointsSettingsTitle: "Zusätzliche POINTS- und Limit-Einstellungen",
      pointsCurrencyLabel: "Punktewährung",
      baseCurrencyLabel: "Basiswährung",
      eurToPlnRateLabel: "Kurs 1 EUR zu PLN",
      rateSourceLabel: "Kursquelle",
      rateDateLabel: "Kursdatum",
      userLimitLabel: "Limit pro Nutzer",
      serviceLimitLabel: "Limit der Dienstleistungsanzahl",
      refundPolicyLabel: "Rückerstattungsregel",
      publicRewardLabel: "Öffentlicher Reward / Zertifikat",
      createButton: "Angebot erstellen",
      creatingButton: "Angebot wird erstellt...",
      bindDataTitle: "Datenverknüpfung",
      previewTitle: "Zertifikatsvorschau",
      nextTitle: "Was als Nächstes",
      createdTitle: "Angebot erstellt",
      createdPriceLabel: "Preis",
      createdCertificateLabel: "Zertifikat",
      createdStatusLabel: "Status",
      openCertificateFromOffer: "Zertifikat auf Basis des Angebots öffnen",
      goToOfferList: "Zur Angebotsliste",
      goToCertificates: "Zu den Zertifikaten",
      loadOrganizationsError: "Unternehmen konnten nicht geladen werden.",
      loadValueObjectsError: "Dienstleistungen konnten nicht geladen werden.",
      unknownLoadError: "Unbekannter Fehler beim Laden der Daten.",
      createOfferError: "Angebot konnte nicht erstellt werden.",
      createOfferSuccess:
        "Angebot erstellt. Jetzt können Zertifikat und Katalog geprüft werden.",
      unknownCreateError: "Unbekannter Fehler beim Erstellen des Angebots.",
      pointsCoverageWarning:
        "Die POINTS-Abdeckung darf nicht höher sein als der Angebotspreis.",
      pointsRateWarning:
        "Für die POINTS-Berechnung werden ein Wechselkurs und der Wert eines POINT benötigt.",
    },
  },
  cs: {
    numberLocale: "cs-CZ",
    common: {
      yes: "Ano",
      no: "Ne",
      free: "Zdarma",
      dash: "—",
      notSpecified: "Neuvedeno",
      unlimited: "Bez limitu",
      enabled: "Zapnuto",
      disabled: "Vypnuto",
      available: "Dostupné",
      unavailable: "Nedostupné",
      loading: "Načítání...",
      error: "Chyba",
    },
    navigation: {
      backToEnterprise: "← Zpět k firmě",
      backToOffers: "Zpět na nabídky",
      registerPurchase: "Registrovat nákup u firmy",
      orderCertificate: "Objednat certifikát",
      openCertificateOrder: "Přejít k objednávce certifikátu",
      goToOfferList: "Přejít na seznam nabídek",
      goToCertificates: "Přejít na certifikáty",
    },
    status: {
      active: "Aktivní",
      draft: "Koncept",
      archived: "Archiv",
      inactive: "Neaktivní",
      unknown: "Neznámý stav",
    },
    detail: {
      errorTitle: "Nabídku se nepodařilo načíst",
      descriptionFallback: "Popis zatím nebyl přidán.",
      publicEnterpriseCard: "Veřejný profil firmy",
      registerPurchaseAtEnterprise: "Registrovat nákup u firmy",
      offerPrice: "Cena nabídky",
      regularPrice: "Běžná cena",
      discount: "Sleva",
      lowestPrice30Days: "Nejnižší cena za 30 dní",
      discountLegalNote: "Poznámka ke slevě",
      booking: "Rezervace",
      duration: "Délka",
      quantityLimit: "Limit množství",
      validFrom: "Platí od",
      validUntil: "Platí do",
      offerFlowTitle: "Nabídka, certifikát a registrace nákupu",
      offerFlowDescription:
        "Tato stránka popisuje konkrétní nabídku. Certifikát se vytváří pro tuto nabídku. Registrace nákupu se vztahuje k firmě jako celku: kupující může u firmy koupit jakýkoli produkt nebo službu a prodejce potvrdí nákup.",
      detailedDescriptionTitle: "Podrobný popis nabídky",
      detailedDescriptionText: "Veřejné informace o vybrané nabídce.",
      enterpriseLabel: "Firma",
      offerTypeLabel: "Typ nabídky",
      statusLabel: "Stav",
      certificateSectionTitle: "Certifikát pro tuto nabídku",
      certificateSectionDescription:
        "Zde jsou zobrazeny podmínky certifikátu. Objednávka certifikátu probíhá na samostatné stránce.",
      certificateAvailabilityLabel: "Dostupnost",
      certificateCostLabel: "Cena certifikátu",
      certificateValidityLabel: "Doba platnosti",
      sellerConfirmationLabel: "Vyžaduje se potvrzení prodejce",
      cancellableLabel: "Lze zrušit",
      transferableLabel: "Lze předat",
      pointsRefundPolicyLabel: "Pravidla vrácení POINTS",
      maxCertificatesLabel: "Maximum certifikátů",
      certificateTermsLabel: "Podmínky certifikátu",
      certificateTermsMissing: "Podmínky certifikátu zatím nebyly přidány.",
      goToCertificateOrder: "Přejít k objednávce certifikátu",
      nextActionsTitle: "Co dál",
    },
    availableSlots: {
      title: "Dostupné termíny",
      loadingOffers: "Načítání nabídek...",
      offerAndDateRequired: "Je nutné vybrat nabídku a datum",
      offerLabel: "Nabídka",
      dateLabel: "Datum",
      showSlots: "Zobrazit dostupné termíny",
      loading: "Načítání...",
      noSlots: "Žádné dostupné termíny",
      availableSlotsLabel: "Dostupné termíny",
    },
    newOffer: {
      title: "Vytvořit firemní nabídku",
      description:
        "Nabídka propojuje firmu, službu jako Value Object, cenu, pravidla rezervace a dárkový certifikát. Zde vzniká reálná nabídka pro Štětín.",
      myEnterprises: "Moje firmy",
      offerList: "Seznam nabídek",
      stepTwoKicker: "Krok 2",
      stepTwoTitle: "Nabídka na základě služby",
      stepTwoDescription:
        "Služba už byla vytvořena. Nyní vytváříme nabídku a zapínáme dárkový certifikát.",
      fillMassageOffer: "Vyplnit nabídku masáže",
      selectedEnterpriseMissing:
        "Firma z odkazu nebyla nalezena nebo je přístup zakázán. Vyberte firmu ručně.",
      selectedEnterpriseLabel: "Vybraná firma",
      enterpriseLabel: "Firma",
      noEnterprisesOption: "Žádné dostupné firmy",
      valueObjectLabel: "Služba / hlavní Value Object",
      noServicesForEnterprise: "Pro vybranou firmu nejsou žádné služby",
      chooseService: "Vyberte službu",
      addServiceFirst: "Nejprve přidejte službu pro tuto firmu",
      offerTitleLabel: "Název nabídky",
      offerTitlePlaceholder: "Relaxační masáž lýtek ve Štětíně",
      offerDescriptionLabel: "Popis nabídky",
      offerTypeLabel: "Typ nabídky",
      priceLabel: "Cena",
      currencyLabel: "Měna",
      durationMinutesLabel: "Délka, min",
      requiresBookingLabel: "Vyžaduje se domluva termínu",
      requiresBookingHelp:
        "U masáže by si klient měl domluvit termín s prodejcem.",
      bookingModeLabel: "Režim rezervace",
      audienceLabel: "Pro koho",
      certificateSectionTitle: "Dárkový certifikát",
      certificateSectionToggle: "Zapnout certifikát na základě této nabídky",
      certificateSectionHelp:
        "Certifikát bude propojen s nabídkou a službou. V této fázi se certifikát platí penězi; POINTS lze připojit později.",
      certificateAvailableLabel: "Certifikát dostupný",
      certificateTermsLabel: "Podmínky certifikátu",
      certificateValidityDaysLabel: "Platnost, dny",
      certificateCurrencyLabel: "Měna certifikátu",
      pointsCoverageLabel: "Pokrytí POINTS",
      certificateLimitLabel: "Limit certifikátů",
      sellerConfirmationLabel: "Prodejce potvrzuje použití",
      transferableLabel: "Lze předat jiné osobě",
      cancellableLabel: "Lze zrušit podle pravidel platformy",
      pointsSettingsTitle: "Další nastavení POINTS a limitů",
      pointsCurrencyLabel: "Měna bodů",
      baseCurrencyLabel: "Základní měna",
      eurToPlnRateLabel: "Kurz 1 EUR na PLN",
      rateSourceLabel: "Zdroj kurzu",
      rateDateLabel: "Datum kurzu",
      userLimitLabel: "Limit na uživatele",
      serviceLimitLabel: "Limit počtu služeb",
      refundPolicyLabel: "Pravidla vrácení",
      publicRewardLabel: "Veřejný reward / certifikát",
      createButton: "Vytvořit nabídku",
      creatingButton: "Vytvářím nabídku...",
      bindDataTitle: "Propojení dat",
      previewTitle: "Náhled certifikátu",
      nextTitle: "Co dál",
      createdTitle: "Nabídka vytvořena",
      createdPriceLabel: "Cena",
      createdCertificateLabel: "Certifikát",
      createdStatusLabel: "Stav",
      openCertificateFromOffer: "Otevřít certifikát na základě nabídky",
      goToOfferList: "Přejít na seznam nabídek",
      goToCertificates: "Přejít na certifikáty",
      loadOrganizationsError: "Firmy se nepodařilo načíst.",
      loadValueObjectsError: "Služby se nepodařilo načíst.",
      unknownLoadError: "Neznámá chyba při načítání dat.",
      createOfferError: "Nabídku se nepodařilo vytvořit.",
      createOfferSuccess:
        "Nabídka byla vytvořena. Nyní lze zkontrolovat certifikát a katalog.",
      unknownCreateError: "Neznámá chyba při vytváření nabídky.",
      pointsCoverageWarning:
        "Pokrytí POINTS nesmí být vyšší než cena nabídky.",
      pointsRateWarning:
        "Pro výpočet POINTS je potřeba kurz a hodnota jednoho POINT.",
    },
  },
};

export function isOffersLocale(value: string): value is OffersLocale {
  return Object.prototype.hasOwnProperty.call(offersMessages, value);
}

export function getOffersMessages(
  locale: string | null | undefined,
): OffersMessages {
  const normalizedLocale = (locale ?? "").trim().toLowerCase();
  const baseLocale = normalizedLocale.split("-")[0];

  if (isOffersLocale(baseLocale)) {
    return offersMessages[baseLocale];
  }

  return offersMessages.en;
}
