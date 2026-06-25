export type SystemLabelsLocale = "ru" | "pl" | "en" | "es" | "uk" | "de" | "cs";

export type SystemLabelsMessages = {
  offerTypes: {
    bookableService: string;
    service: string;
    product: string;
    bundle: string;
    consultation: string;
    reward: string;
    unknown: string;
  };
  organizationTypes: {
    privateBusiness: string;
    company: string;
    nonProfit: string;
    publicInstitution: string;
    unknown: string;
  };
  verificationStatuses: {
    verified: string;
    pending: string;
    rejected: string;
    unverified: string;
  };
  certificateStatuses: {
    active: string;
    requested: string;
    issued: string;
    redeemed: string;
    cancelled: string;
    expired: string;
    rejected: string;
    unknown: string;
  };
  certificateAvailability: {
    unavailable: string;
    unlimited: string;
    available: (remaining: number, maxTotal: number) => string;
    limitCheckFailed: (maxTotal: number) => string;
  };
  certificatePaymentModes: {
    unavailable: string;
    available: string;
    pointsOnly: string;
    moneyOnly: string;
    mixed: string;
    unknown: string;
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
  purchaseConfirmationStatuses: {
    pending: string;
    confirmed: string;
    rejected: string;
    cancelled: string;
    unknown: string;
  };
  pointsStatuses: {
    reserved: string;
    released: string;
    captured: string;
    cancelled: string;
    failed: string;
    unknown: string;
  };
};

export const systemLabelsMessages: Record<SystemLabelsLocale, SystemLabelsMessages> = {
  ru: {
    offerTypes: {
      bookableService: "Услуга с записью",
      service: "Услуга",
      product: "Товар",
      bundle: "Пакет",
      consultation: "Консультация",
      reward: "Сертификат / reward",
      unknown: "Неизвестный тип предложения",
    },
    organizationTypes: {
      privateBusiness: "Частный бизнес",
      company: "Компания",
      nonProfit: "Некоммерческая организация",
      publicInstitution: "Публичная организация",
      unknown: "Неизвестный тип организации",
    },
    verificationStatuses: {
      verified: "Проверено",
      pending: "На проверке",
      rejected: "Отклонено",
      unverified: "Без верификации",
    },
    certificateStatuses: {
      active: "Активен",
      requested: "Запрошен",
      issued: "Создан",
      redeemed: "Использован",
      cancelled: "Отменён",
      expired: "Истёк",
      rejected: "Отклонён",
      unknown: "Неизвестный статус",
    },
    certificateAvailability: {
      unavailable: "Сертификат недоступен",
      unlimited: "Количество сертификатов не ограничено",
      available: (remaining, maxTotal) =>
        "Доступно сертификатов: " + remaining + " из " + maxTotal,
      limitCheckFailed: (maxTotal) =>
        "Лимит сертификатов: " + maxTotal + "; остаток не удалось проверить",
    },
    certificatePaymentModes: {
      unavailable: "Недоступен",
      available: "Сертификат доступен",
      pointsOnly: "Только POINTS",
      moneyOnly: "Только деньги",
      mixed: "POINTS + деньги",
      unknown: "Неизвестный режим оплаты",
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
    purchaseConfirmationStatuses: {
      pending: "Ожидает подтверждения",
      confirmed: "Подтверждено",
      rejected: "Отклонено",
      cancelled: "Отменено",
      unknown: "Неизвестный статус",
    },
    pointsStatuses: {
      reserved: "Зарезервированы",
      released: "Освобождены",
      captured: "Списаны",
      cancelled: "Отменены",
      failed: "Ошибка",
      unknown: "Неизвестный статус",
    },
  },
  pl: {
    offerTypes: {
      bookableService: "Usługa z rezerwacją",
      service: "Usługa",
      product: "Produkt",
      bundle: "Pakiet",
      consultation: "Konsultacja",
      reward: "Certyfikat / nagroda",
      unknown: "Nieznany typ oferty",
    },
    organizationTypes: {
      privateBusiness: "Działalność prywatna",
      company: "Firma",
      nonProfit: "Organizacja non-profit",
      publicInstitution: "Instytucja publiczna",
      unknown: "Nieznany typ organizacji",
    },
    verificationStatuses: {
      verified: "Zweryfikowano",
      pending: "W trakcie weryfikacji",
      rejected: "Odrzucono",
      unverified: "Bez weryfikacji",
    },
    certificateStatuses: {
      active: "Aktywny",
      requested: "Zamówiony",
      issued: "Utworzony",
      redeemed: "Wykorzystany",
      cancelled: "Anulowany",
      expired: "Wygasł",
      rejected: "Odrzucony",
      unknown: "Nieznany status",
    },
    certificateAvailability: {
      unavailable: "Certyfikat niedostępny",
      unlimited: "Liczba certyfikatów nie jest ograniczona",
      available: (remaining, maxTotal) =>
        "Dostępne certyfikaty: " + remaining + " z " + maxTotal,
      limitCheckFailed: (maxTotal) =>
        "Limit certyfikatów: " + maxTotal + "; nie udało się sprawdzić pozostałej liczby",
    },
    certificatePaymentModes: {
      unavailable: "Niedostępny",
      available: "Certyfikat dostępny",
      pointsOnly: "Tylko POINTS",
      moneyOnly: "Tylko pieniądze",
      mixed: "POINTS + pieniądze",
      unknown: "Nieznany tryb płatności",
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
    purchaseConfirmationStatuses: {
      pending: "Oczekuje na potwierdzenie",
      confirmed: "Potwierdzono",
      rejected: "Odrzucono",
      cancelled: "Anulowano",
      unknown: "Nieznany status",
    },
    pointsStatuses: {
      reserved: "Zarezerwowane",
      released: "Zwolnione",
      captured: "Pobrane",
      cancelled: "Anulowane",
      failed: "Błąd",
      unknown: "Nieznany status",
    },
  },
  en: {
    offerTypes: {
      bookableService: "Bookable service",
      service: "Service",
      product: "Product",
      bundle: "Bundle",
      consultation: "Consultation",
      reward: "Certificate / reward",
      unknown: "Unknown offer type",
    },
    organizationTypes: {
      privateBusiness: "Private business",
      company: "Company",
      nonProfit: "Non-profit organization",
      publicInstitution: "Public organization",
      unknown: "Unknown organization type",
    },
    verificationStatuses: {
      verified: "Verified",
      pending: "Under review",
      rejected: "Rejected",
      unverified: "Not verified",
    },
    certificateStatuses: {
      active: "Active",
      requested: "Requested",
      issued: "Issued",
      redeemed: "Redeemed",
      cancelled: "Cancelled",
      expired: "Expired",
      rejected: "Rejected",
      unknown: "Unknown status",
    },
    certificateAvailability: {
      unavailable: "Certificate unavailable",
      unlimited: "The number of certificates is not limited",
      available: (remaining, maxTotal) =>
        "Available certificates: " + remaining + " of " + maxTotal,
      limitCheckFailed: (maxTotal) =>
        "Certificate limit: " + maxTotal + "; remaining availability could not be checked",
    },
    certificatePaymentModes: {
      unavailable: "Unavailable",
      available: "Certificate available",
      pointsOnly: "POINTS only",
      moneyOnly: "Money only",
      mixed: "POINTS + money",
      unknown: "Unknown payment mode",
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
    purchaseConfirmationStatuses: {
      pending: "Pending confirmation",
      confirmed: "Confirmed",
      rejected: "Rejected",
      cancelled: "Cancelled",
      unknown: "Unknown status",
    },
    pointsStatuses: {
      reserved: "Reserved",
      released: "Released",
      captured: "Captured",
      cancelled: "Cancelled",
      failed: "Failed",
      unknown: "Unknown status",
    },
  },
  es: {
    offerTypes: {
      bookableService: "Servicio con reserva",
      service: "Servicio",
      product: "Producto",
      bundle: "Paquete",
      consultation: "Consulta",
      reward: "Certificado / recompensa",
      unknown: "Tipo de oferta desconocido",
    },
    organizationTypes: {
      privateBusiness: "Negocio privado",
      company: "Empresa",
      nonProfit: "Organización sin ánimo de lucro",
      publicInstitution: "Organización pública",
      unknown: "Tipo de organización desconocido",
    },
    verificationStatuses: {
      verified: "Verificado",
      pending: "En revisión",
      rejected: "Rechazado",
      unverified: "Sin verificación",
    },
    certificateStatuses: {
      active: "Activo",
      requested: "Solicitado",
      issued: "Emitido",
      redeemed: "Canjeado",
      cancelled: "Cancelado",
      expired: "Caducado",
      rejected: "Rechazado",
      unknown: "Estado desconocido",
    },
    certificateAvailability: {
      unavailable: "Certificado no disponible",
      unlimited: "La cantidad de certificados no está limitada",
      available: (remaining, maxTotal) =>
        "Certificados disponibles: " + remaining + " de " + maxTotal,
      limitCheckFailed: (maxTotal) =>
        "Límite de certificados: " + maxTotal + "; no se pudo comprobar el saldo restante",
    },
    certificatePaymentModes: {
      unavailable: "No disponible",
      available: "Certificado disponible",
      pointsOnly: "Solo POINTS",
      moneyOnly: "Solo dinero",
      mixed: "POINTS + dinero",
      unknown: "Modo de pago desconocido",
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
    purchaseConfirmationStatuses: {
      pending: "Pendiente de confirmación",
      confirmed: "Confirmado",
      rejected: "Rechazado",
      cancelled: "Cancelado",
      unknown: "Estado desconocido",
    },
    pointsStatuses: {
      reserved: "Reservados",
      released: "Liberados",
      captured: "Capturados",
      cancelled: "Cancelados",
      failed: "Error",
      unknown: "Estado desconocido",
    },
  },
  uk: {
    offerTypes: {
      bookableService: "Послуга із записом",
      service: "Послуга",
      product: "Товар",
      bundle: "Пакет",
      consultation: "Консультація",
      reward: "Сертифікат / винагорода",
      unknown: "Невідомий тип пропозиції",
    },
    organizationTypes: {
      privateBusiness: "Приватний бізнес",
      company: "Компанія",
      nonProfit: "Некомерційна організація",
      publicInstitution: "Публічна організація",
      unknown: "Невідомий тип організації",
    },
    verificationStatuses: {
      verified: "Перевірено",
      pending: "На перевірці",
      rejected: "Відхилено",
      unverified: "Без верифікації",
    },
    certificateStatuses: {
      active: "Активний",
      requested: "Запитаний",
      issued: "Створений",
      redeemed: "Використаний",
      cancelled: "Скасований",
      expired: "Закінчився",
      rejected: "Відхилений",
      unknown: "Невідомий статус",
    },
    certificateAvailability: {
      unavailable: "Сертифікат недоступний",
      unlimited: "Кількість сертифікатів не обмежена",
      available: (remaining, maxTotal) =>
        "Доступно сертифікатів: " + remaining + " з " + maxTotal,
      limitCheckFailed: (maxTotal) =>
        "Ліміт сертифікатів: " + maxTotal + "; залишок не вдалося перевірити",
    },
    certificatePaymentModes: {
      unavailable: "Недоступний",
      available: "Сертифікат доступний",
      pointsOnly: "Тільки POINTS",
      moneyOnly: "Тільки гроші",
      mixed: "POINTS + гроші",
      unknown: "Невідомий режим оплати",
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
    purchaseConfirmationStatuses: {
      pending: "Очікує підтвердження",
      confirmed: "Підтверджено",
      rejected: "Відхилено",
      cancelled: "Скасовано",
      unknown: "Невідомий статус",
    },
    pointsStatuses: {
      reserved: "Зарезервовано",
      released: "Звільнено",
      captured: "Списано",
      cancelled: "Скасовано",
      failed: "Помилка",
      unknown: "Невідомий статус",
    },
  },
  de: {
    offerTypes: {
      bookableService: "Buchbare Dienstleistung",
      service: "Dienstleistung",
      product: "Produkt",
      bundle: "Paket",
      consultation: "Beratung",
      reward: "Zertifikat / Prämie",
      unknown: "Unbekannter Angebotstyp",
    },
    organizationTypes: {
      privateBusiness: "Privates Unternehmen",
      company: "Unternehmen",
      nonProfit: "Gemeinnützige Organisation",
      publicInstitution: "Öffentliche Organisation",
      unknown: "Unbekannter Organisationstyp",
    },
    verificationStatuses: {
      verified: "Verifiziert",
      pending: "In Prüfung",
      rejected: "Abgelehnt",
      unverified: "Nicht verifiziert",
    },
    certificateStatuses: {
      active: "Aktiv",
      requested: "Angefordert",
      issued: "Ausgestellt",
      redeemed: "Eingelöst",
      cancelled: "Storniert",
      expired: "Abgelaufen",
      rejected: "Abgelehnt",
      unknown: "Unbekannter Status",
    },
    certificateAvailability: {
      unavailable: "Zertifikat nicht verfügbar",
      unlimited: "Die Anzahl der Zertifikate ist nicht begrenzt",
      available: (remaining, maxTotal) =>
        "Verfügbare Zertifikate: " + remaining + " von " + maxTotal,
      limitCheckFailed: (maxTotal) =>
        "Zertifikatslimit: " + maxTotal + "; der Restbestand konnte nicht geprüft werden",
    },
    certificatePaymentModes: {
      unavailable: "Nicht verfügbar",
      available: "Zertifikat verfügbar",
      pointsOnly: "Nur POINTS",
      moneyOnly: "Nur Geld",
      mixed: "POINTS + Geld",
      unknown: "Unbekannter Zahlungsmodus",
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
    purchaseConfirmationStatuses: {
      pending: "Wartet auf Bestätigung",
      confirmed: "Bestätigt",
      rejected: "Abgelehnt",
      cancelled: "Storniert",
      unknown: "Unbekannter Status",
    },
    pointsStatuses: {
      reserved: "Reserviert",
      released: "Freigegeben",
      captured: "Abgebucht",
      cancelled: "Storniert",
      failed: "Fehler",
      unknown: "Unbekannter Status",
    },
  },
  cs: {
    offerTypes: {
      bookableService: "Služba s rezervací",
      service: "Služba",
      product: "Produkt",
      bundle: "Balíček",
      consultation: "Konzultace",
      reward: "Certifikát / odměna",
      unknown: "Neznámý typ nabídky",
    },
    organizationTypes: {
      privateBusiness: "Soukromé podnikání",
      company: "Firma",
      nonProfit: "Nezisková organizace",
      publicInstitution: "Veřejná organizace",
      unknown: "Neznámý typ organizace",
    },
    verificationStatuses: {
      verified: "Ověřeno",
      pending: "Probíhá ověření",
      rejected: "Odmítnuto",
      unverified: "Bez ověření",
    },
    certificateStatuses: {
      active: "Aktivní",
      requested: "Objednaný",
      issued: "Vystavený",
      redeemed: "Uplatněný",
      cancelled: "Zrušený",
      expired: "Vypršel",
      rejected: "Odmítnutý",
      unknown: "Neznámý stav",
    },
    certificateAvailability: {
      unavailable: "Certifikát není dostupný",
      unlimited: "Počet certifikátů není omezen",
      available: (remaining, maxTotal) =>
        "Dostupné certifikáty: " + remaining + " z " + maxTotal,
      limitCheckFailed: (maxTotal) =>
        "Limit certifikátů: " + maxTotal + "; zbývající počet se nepodařilo ověřit",
    },
    certificatePaymentModes: {
      unavailable: "Nedostupný",
      available: "Certifikát dostupný",
      pointsOnly: "Pouze POINTS",
      moneyOnly: "Pouze peníze",
      mixed: "POINTS + peníze",
      unknown: "Neznámý režim platby",
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
    purchaseConfirmationStatuses: {
      pending: "Čeká na potvrzení",
      confirmed: "Potvrzeno",
      rejected: "Odmítnuto",
      cancelled: "Zrušeno",
      unknown: "Neznámý stav",
    },
    pointsStatuses: {
      reserved: "Rezervováno",
      released: "Uvolněno",
      captured: "Odečteno",
      cancelled: "Zrušeno",
      failed: "Chyba",
      unknown: "Neznámý stav",
    },
  },
};

export function isSystemLabelsLocale(value: string): value is SystemLabelsLocale {
  return Object.prototype.hasOwnProperty.call(systemLabelsMessages, value);
}

export function getSystemLabelsMessages(
  locale: string | null | undefined,
): SystemLabelsMessages {
  const normalizedLocale = (locale ?? "").trim().toLowerCase();
  const baseLocale = normalizedLocale.split("-")[0];

  if (isSystemLabelsLocale(baseLocale)) {
    return systemLabelsMessages[baseLocale];
  }

  return systemLabelsMessages.en;
}

export function getOfferTypeLabel(
  offerType: string | null | undefined,
  locale: string | null | undefined,
): string {
  const labels = getSystemLabelsMessages(locale).offerTypes;

  switch (offerType) {
    case "bookable_service":
      return labels.bookableService;
    case "service":
      return labels.service;
    case "product":
      return labels.product;
    case "bundle":
      return labels.bundle;
    case "consultation":
      return labels.consultation;
    case "reward":
      return labels.reward;
    default:
      return offerType || labels.unknown;
  }
}

export function getOrganizationTypeLabel(
  organizationType: string | null | undefined,
  locale: string | null | undefined,
): string {
  const labels = getSystemLabelsMessages(locale).organizationTypes;

  switch (organizationType) {
    case "private_business":
      return labels.privateBusiness;
    case "company":
      return labels.company;
    case "non_profit":
      return labels.nonProfit;
    case "public_institution":
      return labels.publicInstitution;
    default:
      return organizationType || labels.unknown;
  }
}

export function getVerificationStatusLabel(
  verificationStatus: string | null | undefined,
  locale: string | null | undefined,
): string {
  const labels = getSystemLabelsMessages(locale).verificationStatuses;

  switch (verificationStatus) {
    case "verified":
      return labels.verified;
    case "pending":
      return labels.pending;
    case "rejected":
      return labels.rejected;
    default:
      return labels.unverified;
  }
}
