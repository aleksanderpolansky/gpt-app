"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { formatLocalizedPoints } from "@/components/figma-dashboard/certificate-value-format";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";
type ProductServiceKind = "product_type" | "service_type";
type DeliveryMode =
  | "product_pickup"
  | "product_delivery"
  | "service_offline"
  | "service_online";
type CoverageMode = "percentage" | "provider_currency_amount";

type GiftCertificateCreateFormProps = {
  locale: LocaleCode;
  valueObject: {
    id: string;
    title: string;
    description: string | null;
    objectKind: ProductServiceKind;
    ordinaryPrice: number;
    currency: string;
    ordinaryDurationMinutes: number | null;
    imageUrl: string | null;
  };
  provider: {
    label: string;
    type: "personal" | "avatar" | "organization";
  };
  referenceRate: {
    providerCurrencyPerEuro: number;
    referenceDate: string;
    sourceLabel: string;
  };
};

type CreateResponse = {
  ok?: boolean;
  error?: string;
  errorCode?: string | null;
  activityEventId?: string;
  redirectUrl?: string;
};

type Copy = {
  eyebrow: string;
  title: string;
  intro: string;
  back: string;
  provider: string;
  item: string;
  product: string;
  service: string;
  ordinaryPrice: string;
  ordinaryDuration: string;
  deliveryMode: string;
  productPickup: string;
  productDelivery: string;
  serviceOffline: string;
  serviceOnline: string;
  availableFrom: string;
  availableUntil: string;
  validityHint: string;
  coverageMode: string;
  coverageHint: string;
  percentage: string;
  percentageHint: string;
  amount: string;
  amountHint: string;
  coverageValue: string;
  exchangeRate: string;
  exchangeRateHint: string;
  individualTime: string;
  individualTimeHint: string;
  serviceStart: string;
  serviceDuration: string;
  serviceDurationHint: string;
  exactSlotHint: string;
  terms: string;
  termsHint: string;
  preview: string;
  points: string;
  covered: string;
  remainder: string;
  externalPayment: string;
  create: string;
  creating: string;
  errorPrefix: string;
  saveError: string;
  individualTimeSaveError: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    eyebrow: "Gift certificate",
    title: "Create a gift certificate",
    intro:
      "Set the validity period, usage conditions and the part of the ordinary price you are ready to give to the visitor. After saving, you can review the details and publish the certificate.",
    back: "Back to product or service",
    provider: "Provider",
    item: "Product or service",
    product: "Product",
    service: "Service",
    ordinaryPrice: "Ordinary price",
    ordinaryDuration: "Ordinary duration",
    deliveryMode: "How it will be provided",
    productPickup: "Product pickup",
    productDelivery: "Product delivery",
    serviceOffline: "Service offline",
    serviceOnline: "Service online",
    availableFrom: "Valid from",
    availableUntil: "Valid until",
    validityHint:
      "By default, the certificate is valid from today for one calendar month. You may change both dates; the period may not exceed 31 days.",
    coverageMode: "Gift for the visitor",
    coverageHint:
      "Specify the part of the ordinary price that you are ready to give to the visitor who orders the certificate. The visitor does not pay this part in money. Entitlement to the gift is confirmed by points earned for confirmed purchases from your enterprise and other enterprises listed on ARCTor. Points are not transferred to you and are not payment.",
    percentage: "Give part of the price as a percentage",
    percentageHint:
      "Specify what percentage of the ordinary price you are ready to give to the visitor.",
    amount: "Give an amount in provider currency",
    amountHint:
      "Specify the amount in your enterprise's currency that you are ready to give to the visitor.",
    coverageValue: "Gift amount",
    exchangeRate: "Provider-currency units per 1 €",
    exchangeRateHint:
      "Required because ARCTor points use the euro as the reference currency. 1 point = 1 €.",
    individualTime: "Arrange the visit time individually",
    individualTimeHint:
      "The visitor and the provider agree on the exact date and time after the certificate is ordered. Clear the checkbox to specify the exact service date and time.",
    serviceStart: "Visit date and time",
    serviceDuration: "Duration, minutes",
    serviceDurationHint:
      "The end time is calculated automatically. The default duration is 30 minutes.",
    exactSlotHint:
      "Choose a valid visit start and a positive duration.",
    terms: "Additional certificate conditions",
    termsHint:
      "Optional field. Add restrictions, booking rules or other important information for the visitor.",
    preview: "Calculation preview",
    points: "Points required",
    covered: "Gift for the visitor",
    remainder: "Buyer will pay the remainder",
    externalPayment:
      "The remaining amount is paid to the provider outside ARCTor. Points confirm the visitor's right to the gift and are not transferred to the provider.",
    create: "Save and review",
    creating: "Saving…",
    errorPrefix: "Could not create:",
    saveError: "The certificate could not be saved. Check the entered data and try again.",
    individualTimeSaveError:
      "The certificate could not be saved with an individually arranged visit time. Refresh the page and try again.",
  },
  pl: {
    eyebrow: "Bon podarunkowy",
    title: "Utwórz bon podarunkowy",
    intro:
      "Ustaw okres ważności, warunki wykorzystania i część zwykłej ceny, którą chcesz podarować odwiedzającemu. Po zapisaniu sprawdzisz dane i opublikujesz bon.",
    back: "Wróć do produktu lub usługi",
    provider: "Dostawca",
    item: "Produkt lub usługa",
    product: "Produkt",
    service: "Usługa",
    ordinaryPrice: "Zwykła cena",
    ordinaryDuration: "Zwykły czas",
    deliveryMode: "Sposób przekazania",
    productPickup: "Odbiór produktu",
    productDelivery: "Dostawa produktu",
    serviceOffline: "Usługa stacjonarna",
    serviceOnline: "Usługa online",
    availableFrom: "Ważny od",
    availableUntil: "Ważny do",
    validityHint:
      "Domyślnie bon jest ważny od dziś przez jeden miesiąc kalendarzowy. Obie daty można zmienić; okres nie może przekraczać 31 dni.",
    coverageMode: "Prezent dla odwiedzającego",
    coverageHint:
      "Wskaż część zwykłej ceny, którą chcesz podarować osobie zamawiającej bon. Tej części odwiedzający nie płaci pieniędzmi. Prawo do prezentu potwierdzają punkty przyznawane za potwierdzone zakupy w Twoim przedsiębiorstwie i innych przedsiębiorstwach obecnych w ARCTor. Punkty nie są przekazywane Tobie i nie stanowią zapłaty.",
    percentage: "Podaruj część ceny w procentach",
    percentageHint:
      "Wskaż, jaki procent zwykłej ceny chcesz podarować odwiedzającemu.",
    amount: "Podaruj kwotę w walucie dostawcy",
    amountHint:
      "Wskaż kwotę w walucie Twojego przedsiębiorstwa, którą chcesz podarować odwiedzającemu.",
    coverageValue: "Wartość prezentu",
    exchangeRate: "Jednostki waluty dostawcy za 1 €",
    exchangeRateHint:
      "Wymagane, ponieważ walutą odniesienia punktów ARCTor jest euro. 1 punkt = 1 €.",
    individualTime: "Termin wizyty ustalany indywidualnie",
    individualTimeHint:
      "Po zamówieniu bonu odwiedzający i przedstawiciel przedsiębiorstwa uzgadniają dokładną datę i godzinę. Odznacz pole, aby wskazać dokładną datę i godzinę wykonania usługi.",
    serviceStart: "Data i godzina wizyty",
    serviceDuration: "Czas trwania, minuty",
    serviceDurationHint:
      "Godzina zakończenia jest obliczana automatycznie. Domyślny czas to 30 minut.",
    exactSlotHint:
      "Wybierz prawidłową datę i godzinę wizyty oraz dodatni czas trwania.",
    terms: "Dodatkowe warunki bonu",
    termsHint:
      "Pole opcjonalne. Możesz podać ograniczenia, zasady rezerwacji lub inne ważne informacje dla odwiedzającego.",
    preview: "Podgląd obliczenia",
    points: "Wymagana liczba punktów",
    covered: "Prezent dla odwiedzającego",
    remainder: "Kupujący dopłaci",
    externalPayment:
      "Pozostałą kwotę odwiedzający płaci dostawcy poza ARCTor. Punkty potwierdzają prawo do prezentu i nie są przekazywane dostawcy.",
    create: "Zapisz i sprawdź",
    creating: "Zapisywanie…",
    errorPrefix: "Nie udało się utworzyć:",
    saveError: "Nie udało się zapisać bonu. Sprawdź wprowadzone dane i spróbuj ponownie.",
    individualTimeSaveError:
      "Nie udało się zapisać bonu z terminem ustalanym indywidualnie. Odśwież stronę i spróbuj ponownie.",
  },
  ru: {
    eyebrow: "Подарочный сертификат",
    title: "Создать подарочный сертификат",
    intro:
      "Укажите срок действия, условия использования и часть обычной стоимости, которую вы готовы подарить посетителю. После сохранения вы сможете проверить данные и опубликовать сертификат.",
    back: "Назад к товару или услуге",
    provider: "Предоставляющий",
    item: "Товар или услуга",
    product: "Товар",
    service: "Услуга",
    ordinaryPrice: "Обычная стоимость",
    ordinaryDuration: "Обычная продолжительность",
    deliveryMode: "Способ предоставления",
    productPickup: "Самовывоз товара",
    productDelivery: "Доставка товара",
    serviceOffline: "Услуга офлайн",
    serviceOnline: "Услуга онлайн",
    availableFrom: "Действует с",
    availableUntil: "Действует до",
    validityHint:
      "По умолчанию сертификат действует с сегодняшнего дня в течение одного календарного месяца. Обе даты можно изменить; срок не может превышать 31 день.",
    coverageMode: "Подарок посетителю",
    coverageHint:
      "Укажите часть обычной стоимости, которую вы готовы подарить посетителю, заказавшему сертификат. Эту часть посетитель не оплачивает деньгами. Право на подарок подтверждается пунктами, которые начисляются за подтверждённые покупки у вашего предприятия и других предприятий, представленных на ARCTor. Пункты не переводятся вам и не являются оплатой.",
    percentage: "Подарить часть стоимости в процентах",
    percentageHint:
      "Укажите, какой процент обычной стоимости вы готовы подарить посетителю.",
    amount: "Подарить сумму в валюте предоставляющего",
    amountHint:
      "Укажите сумму в валюте вашего предприятия, которую вы готовы подарить посетителю.",
    coverageValue: "Размер подарка",
    exchangeRate: "Единиц валюты предоставляющего за 1 €",
    exchangeRateHint:
      "Обязательно, поскольку расчётная валюта пунктов ARCTor — евро. 1 пункт = 1 €.",
    individualTime: "Время визита согласовывается индивидуально",
    individualTimeHint:
      "Точную дату и время посетитель согласует с представителем предприятия после заказа сертификата. Снимите галочку, чтобы указать точные дату и время оказания услуги.",
    serviceStart: "Дата и время начала",
    serviceDuration: "Продолжительность, минуты",
    serviceDurationHint:
      "Окончание рассчитывается автоматически. По умолчанию — 30 минут.",
    exactSlotHint:
      "Укажите корректные дату и время начала и положительную продолжительность услуги.",
    terms: "Дополнительные условия сертификата",
    termsHint:
      "Необязательное поле. Здесь можно указать ограничения, правила записи или другую важную информацию для посетителя.",
    preview: "Предварительный расчёт",
    points: "Требуется пунктов",
    covered: "Подарок посетителю",
    remainder: "Покупатель доплатит",
    externalPayment:
      "Оставшаяся сумма оплачивается предоставляющему вне ARCTor. Пункты подтверждают право посетителя на подарок и не переводятся предоставляющему.",
    create: "Сохранить и проверить",
    creating: "Сохраняется…",
    errorPrefix: "Не удалось создать:",
    saveError: "Не удалось сохранить сертификат. Проверьте введённые данные и повторите попытку.",
    individualTimeSaveError:
      "Не удалось сохранить сертификат с индивидуальным согласованием времени. Обновите страницу и повторите попытку.",
  },
  uk: {
    eyebrow: "Подарунковий сертифікат",
    title: "Створити подарунковий сертифікат",
    intro:
      "Укажіть строк дії, умови використання та частину звичайної вартості, яку ви готові подарувати відвідувачу. Після збереження ви зможете перевірити дані й опублікувати сертифікат.",
    back: "Назад до товару або послуги",
    provider: "Надавач",
    item: "Товар або послуга",
    product: "Товар",
    service: "Послуга",
    ordinaryPrice: "Звичайна вартість",
    ordinaryDuration: "Звичайна тривалість",
    deliveryMode: "Спосіб надання",
    productPickup: "Самовивіз товару",
    productDelivery: "Доставка товару",
    serviceOffline: "Послуга офлайн",
    serviceOnline: "Послуга онлайн",
    availableFrom: "Діє з",
    availableUntil: "Діє до",
    validityHint:
      "За замовчуванням сертифікат діє від сьогодні протягом одного календарного місяця. Обидві дати можна змінити; строк не може перевищувати 31 день.",
    coverageMode: "Подарунок відвідувачу",
    coverageHint:
      "Укажіть частину звичайної вартості, яку ви готові подарувати відвідувачу, що замовив сертифікат. Цю частину відвідувач не сплачує грошима. Право на подарунок підтверджується пунктами, які нараховуються за підтверджені покупки у вашого підприємства та інших підприємств, представлених на ARCTor. Пункти не переказуються вам і не є оплатою.",
    percentage: "Подарувати частину вартості у відсотках",
    percentageHint:
      "Укажіть, який відсоток звичайної вартості ви готові подарувати відвідувачу.",
    amount: "Подарувати суму у валюті надавача",
    amountHint:
      "Укажіть суму у валюті вашого підприємства, яку ви готові подарувати відвідувачу.",
    coverageValue: "Розмір подарунка",
    exchangeRate: "Одиниць валюти надавача за 1 €",
    exchangeRateHint:
      "Обов’язково, оскільки розрахункова валюта пунктів ARCTor — євро. 1 пункт = 1 €.",
    individualTime: "Час візиту узгоджується індивідуально",
    individualTimeHint:
      "Точну дату й час відвідувач узгоджує з представником підприємства після замовлення сертифіката. Зніміть позначку, щоб указати точні дату й час надання послуги.",
    serviceStart: "Дата й час початку",
    serviceDuration: "Тривалість, хвилини",
    serviceDurationHint:
      "Час завершення розраховується автоматично. За замовчуванням — 30 хвилин.",
    exactSlotHint:
      "Укажіть правильні дату й час початку та додатну тривалість послуги.",
    terms: "Додаткові умови сертифіката",
    termsHint:
      "Необов’язкове поле. Тут можна вказати обмеження, правила запису або іншу важливу інформацію для відвідувача.",
    preview: "Попередній розрахунок",
    points: "Потрібно пунктів",
    covered: "Подарунок відвідувачу",
    remainder: "Покупець доплатить",
    externalPayment:
      "Залишок сплачується надавачу поза ARCTor. Пункти підтверджують право відвідувача на подарунок і не переказуються надавачу.",
    create: "Зберегти й перевірити",
    creating: "Збереження…",
    errorPrefix: "Не вдалося створити:",
    saveError: "Не вдалося зберегти сертифікат. Перевірте введені дані та повторіть спробу.",
    individualTimeSaveError:
      "Не вдалося зберегти сертифікат з індивідуальним узгодженням часу. Оновіть сторінку та повторіть спробу.",
  },
  de: {
    eyebrow: "Geschenkgutschein",
    title: "Geschenkgutschein erstellen",
    intro:
      "Legen Sie Gültigkeit, Nutzungsbedingungen und den Teil des regulären Preises fest, den Sie dem Besucher schenken möchten. Nach dem Speichern können Sie die Angaben prüfen und den Gutschein veröffentlichen.",
    back: "Zurück zum Produkt oder zur Dienstleistung",
    provider: "Anbieter",
    item: "Produkt oder Dienstleistung",
    product: "Produkt",
    service: "Dienstleistung",
    ordinaryPrice: "Regulärer Preis",
    ordinaryDuration: "Übliche Dauer",
    deliveryMode: "Art der Bereitstellung",
    productPickup: "Produktabholung",
    productDelivery: "Produktlieferung",
    serviceOffline: "Dienstleistung vor Ort",
    serviceOnline: "Online-Dienstleistung",
    availableFrom: "Gültig ab",
    availableUntil: "Gültig bis",
    validityHint:
      "Standardmäßig gilt der Gutschein ab heute einen Kalendermonat lang. Beide Daten können geändert werden; der Zeitraum darf 31 Tage nicht überschreiten.",
    coverageMode: "Geschenk für den Besucher",
    coverageHint:
      "Geben Sie den Teil des regulären Preises an, den Sie dem Besucher bei Bestellung des Gutscheins schenken möchten. Diesen Teil bezahlt der Besucher nicht mit Geld. Das Recht auf das Geschenk wird durch Punkte bestätigt, die für bestätigte Einkäufe bei Ihrem Unternehmen und anderen auf ARCTor vertretenen Unternehmen vergeben werden. Die Punkte werden Ihnen nicht übertragen und sind keine Zahlung.",
    percentage: "Einen Teil des Preises prozentual schenken",
    percentageHint:
      "Geben Sie an, welchen Prozentsatz des regulären Preises Sie dem Besucher schenken möchten.",
    amount: "Einen Betrag in Anbieterwährung schenken",
    amountHint:
      "Geben Sie den Betrag in der Währung Ihres Unternehmens an, den Sie dem Besucher schenken möchten.",
    coverageValue: "Wert des Geschenks",
    exchangeRate: "Einheiten der Anbieterwährung je 1 €",
    exchangeRateHint:
      "Erforderlich, weil der Euro die Referenzwährung für ARCTor-Punkte ist. 1 Punkt = 1 €.",
    individualTime: "Besuchszeit wird individuell vereinbart",
    individualTimeHint:
      "Nach der Gutscheinbestellung vereinbaren Besucher und Unternehmensvertreter das genaue Datum und die genaue Uhrzeit. Deaktivieren Sie das Kontrollkästchen, um Datum und Uhrzeit der Dienstleistung genau festzulegen.",
    serviceStart: "Datum und Uhrzeit des Besuchs",
    serviceDuration: "Dauer, Minuten",
    serviceDurationHint:
      "Das Ende wird automatisch berechnet. Die Standarddauer beträgt 30 Minuten.",
    exactSlotHint:
      "Wählen Sie einen gültigen Beginn und eine positive Dauer.",
    terms: "Zusätzliche Gutscheinbedingungen",
    termsHint:
      "Optionales Feld. Hier können Einschränkungen, Buchungsregeln oder andere wichtige Informationen für den Besucher angegeben werden.",
    preview: "Berechnungsvorschau",
    points: "Erforderliche Punkte",
    covered: "Geschenk für den Besucher",
    remainder: "Der Käufer zahlt den Rest",
    externalPayment:
      "Der Restbetrag wird außerhalb von ARCTor an den Anbieter gezahlt. Punkte bestätigen das Recht auf das Geschenk und werden nicht an den Anbieter übertragen.",
    create: "Speichern und prüfen",
    creating: "Wird gespeichert…",
    errorPrefix: "Erstellung fehlgeschlagen:",
    saveError: "Der Gutschein konnte nicht gespeichert werden. Prüfen Sie die eingegebenen Daten und versuchen Sie es erneut.",
    individualTimeSaveError:
      "Der Gutschein mit individuell vereinbarter Besuchszeit konnte nicht gespeichert werden. Aktualisieren Sie die Seite und versuchen Sie es erneut.",
  },
  es: {
    eyebrow: "Certificado de regalo",
    title: "Crear certificado de regalo",
    intro:
      "Indique el período de validez, las condiciones de uso y la parte del precio habitual que desea regalar al visitante. Después de guardar podrá revisar los datos y publicar el certificado.",
    back: "Volver al producto o servicio",
    provider: "Proveedor",
    item: "Producto o servicio",
    product: "Producto",
    service: "Servicio",
    ordinaryPrice: "Precio habitual",
    ordinaryDuration: "Duración habitual",
    deliveryMode: "Forma de prestación",
    productPickup: "Recogida del producto",
    productDelivery: "Entrega del producto",
    serviceOffline: "Servicio presencial",
    serviceOnline: "Servicio online",
    availableFrom: "Válido desde",
    availableUntil: "Válido hasta",
    validityHint:
      "De forma predeterminada, el certificado es válido desde hoy durante un mes natural. Puede cambiar ambas fechas; el período no puede superar 31 días.",
    coverageMode: "Regalo para el visitante",
    coverageHint:
      "Indique la parte del precio habitual que desea regalar al visitante que solicite el certificado. El visitante no paga esa parte con dinero. El derecho al regalo se confirma con puntos obtenidos por compras confirmadas en su empresa y en otras empresas presentes en ARCTor. Los puntos no se le transfieren y no constituyen un pago.",
    percentage: "Regalar parte del precio en porcentaje",
    percentageHint:
      "Indique qué porcentaje del precio habitual desea regalar al visitante.",
    amount: "Regalar un importe en la moneda del proveedor",
    amountHint:
      "Indique el importe en la moneda de su empresa que desea regalar al visitante.",
    coverageValue: "Valor del regalo",
    exchangeRate: "Unidades de moneda del proveedor por 1 €",
    exchangeRateHint:
      "Obligatorio porque la moneda de referencia de los puntos ARCTor es el euro. 1 punto = 1 €.",
    individualTime: "La hora de la visita se acuerda individualmente",
    individualTimeHint:
      "Después de solicitar el certificado, el visitante y el representante de la empresa acuerdan la fecha y hora exactas. Desmarque la casilla para indicar la fecha y hora exactas de prestación del servicio.",
    serviceStart: "Fecha y hora de la visita",
    serviceDuration: "Duración, minutos",
    serviceDurationHint:
      "La hora de finalización se calcula automáticamente. La duración predeterminada es de 30 minutos.",
    exactSlotHint:
      "Elija una fecha y hora de inicio válidas y una duración positiva.",
    terms: "Condiciones adicionales del certificado",
    termsHint:
      "Campo opcional. Añada restricciones, reglas de reserva u otra información importante para el visitante.",
    preview: "Vista previa del cálculo",
    points: "Puntos necesarios",
    covered: "Regalo para el visitante",
    remainder: "El comprador pagará el resto",
    externalPayment:
      "El importe restante se paga al proveedor fuera de ARCTor. Los puntos confirman el derecho al regalo y no se transfieren al proveedor.",
    create: "Guardar y revisar",
    creating: "Guardando…",
    errorPrefix: "No se pudo crear:",
    saveError: "No se pudo guardar el certificado. Revise los datos introducidos e inténtelo de nuevo.",
    individualTimeSaveError:
      "No se pudo guardar el certificado con la hora de visita acordada individualmente. Actualice la página e inténtelo de nuevo.",
  },
  cs: {
    eyebrow: "Dárkový certifikát",
    title: "Vytvořit dárkový certifikát",
    intro:
      "Nastavte dobu platnosti, podmínky využití a část běžné ceny, kterou chcete návštěvníkovi darovat. Po uložení můžete údaje zkontrolovat a certifikát zveřejnit.",
    back: "Zpět k produktu nebo službě",
    provider: "Poskytovatel",
    item: "Produkt nebo služba",
    product: "Produkt",
    service: "Služba",
    ordinaryPrice: "Obvyklá cena",
    ordinaryDuration: "Obvyklá délka",
    deliveryMode: "Způsob poskytnutí",
    productPickup: "Vyzvednutí produktu",
    productDelivery: "Doručení produktu",
    serviceOffline: "Služba osobně",
    serviceOnline: "Služba online",
    availableFrom: "Platí od",
    availableUntil: "Platí do",
    validityHint:
      "Ve výchozím nastavení platí certifikát ode dneška jeden kalendářní měsíc. Obě data lze změnit; období nesmí překročit 31 dní.",
    coverageMode: "Dárek pro návštěvníka",
    coverageHint:
      "Uveďte část běžné ceny, kterou chcete darovat návštěvníkovi objednávajícímu certifikát. Tuto část návštěvník neplatí penězi. Nárok na dárek potvrzují body získané za potvrzené nákupy u vašeho podniku a dalších podniků uvedených na ARCTor. Body se vám nepřevádějí a nejsou platbou.",
    percentage: "Darovat část ceny v procentech",
    percentageHint:
      "Uveďte, jaké procento běžné ceny chcete návštěvníkovi darovat.",
    amount: "Darovat částku v měně poskytovatele",
    amountHint:
      "Uveďte částku v měně vašeho podniku, kterou chcete návštěvníkovi darovat.",
    coverageValue: "Hodnota dárku",
    exchangeRate: "Jednotek měny poskytovatele za 1 €",
    exchangeRateHint:
      "Povinné, protože referenční měnou bodů ARCTor je euro. 1 bod = 1 €.",
    individualTime: "Čas návštěvy se domlouvá individuálně",
    individualTimeHint:
      "Po objednání certifikátu si návštěvník a zástupce podniku dohodnou přesné datum a čas. Zrušte zaškrtnutí, chcete-li zadat přesné datum a čas poskytnutí služby.",
    serviceStart: "Datum a čas návštěvy",
    serviceDuration: "Délka, minuty",
    serviceDurationHint:
      "Konec se vypočítá automaticky. Výchozí délka je 30 minut.",
    exactSlotHint:
      "Zvolte platný začátek návštěvy a kladnou délku.",
    terms: "Další podmínky certifikátu",
    termsHint:
      "Volitelné pole. Můžete uvést omezení, pravidla rezervace nebo jiné důležité informace pro návštěvníka.",
    preview: "Náhled výpočtu",
    points: "Potřebné body",
    covered: "Dárek pro návštěvníka",
    remainder: "Kupující doplatí",
    externalPayment:
      "Zbývající částka se platí poskytovateli mimo ARCTor. Body potvrzují nárok na dárek a poskytovateli se nepřevádějí.",
    create: "Uložit a zkontrolovat",
    creating: "Ukládání…",
    errorPrefix: "Nepodařilo se vytvořit:",
    saveError: "Certifikát se nepodařilo uložit. Zkontrolujte zadané údaje a zkuste to znovu.",
    individualTimeSaveError:
      "Certifikát s individuálně domluveným časem návštěvy se nepodařilo uložit. Obnovte stránku a zkuste to znovu.",
  },

};

function buildLocaleHref(pathname: string, locale: LocaleCode) {
  return locale === "en"
    ? pathname
    : `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function makeIdempotencyKey() {
  if (
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
  ) {
    return `gift-certificate:${globalThis.crypto.randomUUID()}`;
  }

  return `gift-certificate:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2)}`;
}

function parseNumber(value: string) {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateDateDifferenceDays(from: string, until: string) {
  if (!from || !until) {
    return null;
  }

  const fromDate = new Date(`${from}T00:00:00Z`);
  const untilDate = new Date(`${until}T00:00:00Z`);

  if (
    Number.isNaN(fromDate.getTime()) ||
    Number.isNaN(untilDate.getTime())
  ) {
    return null;
  }

  return Math.round(
    (untilDate.getTime() - fromDate.getTime()) / 86_400_000,
  );
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDefaultValidityRange(now = new Date()) {
  const from = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
  );
  const targetMonthIndex = from.getMonth() + 1;
  const targetYear = from.getFullYear() + Math.floor(targetMonthIndex / 12);
  const targetMonth = targetMonthIndex % 12;
  const targetMonthLastDay = new Date(
    targetYear,
    targetMonth + 1,
    0,
  ).getDate();
  const until = new Date(
    targetYear,
    targetMonth,
    Math.min(from.getDate(), targetMonthLastDay),
    12,
  );

  return {
    from: formatDateInputValue(from),
    until: formatDateInputValue(until),
  };
}

export function GiftCertificateCreateForm({
  locale,
  valueObject,
  provider,
  referenceRate,
}: GiftCertificateCreateFormProps) {
  const router = useRouter();
  const copy = COPY[locale];
  const isService = valueObject.objectKind === "service_type";
  const deliveryOptions = isService
    ? ([
        ["service_offline", copy.serviceOffline],
        ["service_online", copy.serviceOnline],
      ] as const)
    : ([
        ["product_pickup", copy.productPickup],
        ["product_delivery", copy.productDelivery],
      ] as const);

  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(
    deliveryOptions[0][0],
  );
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [coverageMode, setCoverageMode] =
    useState<CoverageMode>("percentage");
  const [coverageValue, setCoverageValue] = useState("100");
  const [individualServiceTime, setIndividualServiceTime] =
    useState(true);
  const [serviceStart, setServiceStart] = useState("");
  const [serviceDurationMinutes, setServiceDurationMinutes] = useState(
    String(valueObject.ordinaryDurationMinutes ?? 30),
  );
  const [termsText, setTermsText] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(
    makeIdempotencyKey,
  );
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [itemImageFailed, setItemImageFailed] = useState(false);
  const errorMessageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const defaults = getDefaultValidityRange();

    setAvailableFrom((current) => current || defaults.from);
    setAvailableUntil((current) => current || defaults.until);
  }, []);

  useEffect(() => {
    setItemImageFailed(false);
  }, [valueObject.imageUrl]);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      errorMessageRef.current?.focus({ preventScroll: true });
      errorMessageRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [errorMessage]);

  const calculation = useMemo(() => {
    const ordinaryPrice = roundMoney(valueObject.ordinaryPrice);
    const rawCoverage = parseNumber(coverageValue);
    const rawRate = referenceRate.providerCurrencyPerEuro;

    let coveredProviderAmount = Number.NaN;

    if (coverageMode === "percentage") {
      coveredProviderAmount = roundMoney(
        ordinaryPrice * rawCoverage / 100,
      );
    } else {
      coveredProviderAmount = roundMoney(rawCoverage);
    }

    const remainder = roundMoney(
      ordinaryPrice - coveredProviderAmount,
    );
    const pointsPrice = Math.ceil(
      coveredProviderAmount / rawRate,
    );

    return {
      ordinaryPrice,
      coveredProviderAmount,
      remainder,
      pointsPrice,
      valid:
        Number.isFinite(ordinaryPrice) &&
        ordinaryPrice >= 0 &&
        Number.isFinite(rawCoverage) &&
        (coverageMode === "percentage"
          ? rawCoverage >= 0 && rawCoverage <= 100
          : rawCoverage >= 0 && rawCoverage <= ordinaryPrice) &&
        Number.isFinite(rawRate) &&
        rawRate > 0 &&
        coveredProviderAmount >= 0 &&
        coveredProviderAmount <= ordinaryPrice &&
        remainder >= 0 &&
        pointsPrice >= 0,
    };
  }, [
    coverageMode,
    coverageValue,
    referenceRate.providerCurrencyPerEuro,
    valueObject.ordinaryPrice,
  ]);

  async function submit() {
    setErrorMessage("");

    const validityDays = calculateDateDifferenceDays(
      availableFrom,
      availableUntil,
    );

    if (
      validityDays === null ||
      validityDays < 0 ||
      validityDays > 31
    ) {
      setErrorMessage(`${copy.errorPrefix} ${copy.validityHint}`);
      return;
    }

    if (!calculation.valid) {
      setErrorMessage(`${copy.errorPrefix} ${copy.coverageValue}.`);
      return;
    }

    let startedAt: string | null = null;
    let endedAt: string | null = null;

    if (isService && !individualServiceTime) {
      const startDate = new Date(serviceStart);
      const durationMinutes = Number(serviceDurationMinutes.trim());

      if (
        !serviceStart ||
        Number.isNaN(startDate.getTime()) ||
        !Number.isInteger(durationMinutes) ||
        durationMinutes <= 0
      ) {
        setErrorMessage(`${copy.errorPrefix} ${copy.exactSlotHint}`);
        return;
      }

      startedAt = startDate.toISOString();
      endedAt = new Date(
        startDate.getTime() + durationMinutes * 60_000,
      ).toISOString();
    }

    setPending(true);

    try {
      const response = await fetch(
        `/api/value-objects/${valueObject.id}/gift-certificates/draft`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            idempotencyKey,
            deliveryMode,
            availableFrom,
            availableUntil,
            pointsCoverageMode: coverageMode,
            pointsCoveragePercent:
              coverageMode === "percentage"
                ? parseNumber(coverageValue)
                : null,
            pointsCoveredAmount:
              coverageMode === "provider_currency_amount"
                ? parseNumber(coverageValue)
                : null,
            termsText: termsText.trim() || null,
            startedAt,
            endedAt,
            locale,
          }),
        },
      );

      const data = (await response.json()) as CreateResponse;

      if (!response.ok || !data.ok || !data.redirectUrl) {
        const technicalCode =
          data.errorCode === "PGC3B_SERVICE_REQUIRES_EXACT_SCHEDULE" ||
          data.error === "PGC3B_SERVICE_REQUIRES_EXACT_SCHEDULE"
            ? "PGC3B_SERVICE_REQUIRES_EXACT_SCHEDULE"
            : `HTTP ${response.status}`;

        console.error("Gift certificate draft save failed", {
          status: response.status,
          error: data.error,
          errorCode: data.errorCode,
        });

        throw new Error(technicalCode);
      }

      setIdempotencyKey(makeIdempotencyKey());
      router.push(data.redirectUrl);
      router.refresh();
    } catch (error) {
      const responseError =
        error instanceof Error ? error.message : null;

      setErrorMessage(
        responseError === "PGC3B_SERVICE_REQUIRES_EXACT_SCHEDULE"
          ? copy.individualTimeSaveError
          : copy.saveError,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-full bg-[#f0f2f7] px-4 py-8 text-[#1a1d2e]">
      <div className="mx-auto grid w-full max-w-[1180px] gap-5">
        <header className="rounded-[26px] border border-black/[0.07] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#3b6ef8]">
            {copy.eyebrow}
          </div>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-[800px]">
              <h1 className="text-[30px] font-bold tracking-[-0.03em] text-[#111827]">
                {copy.title}
              </h1>
              <p className="mt-3 text-[14px] leading-6 text-[#5a5f7a]">
                {copy.intro}
              </p>
            </div>
            <Link
              href={buildLocaleHref(
                `/value-objects/${valueObject.id}`,
                locale,
              )}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
            >
              {copy.back}
            </Link>
          </div>
        </header>

        <section className="grid gap-5">
          <article className="rounded-[24px] border border-black/[0.07] bg-white p-6 shadow-sm">
            <div className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#e7eaf2] bg-[#f8fafc] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7c8099]">
                    {copy.provider}
                  </div>
                  <div className="mt-2 text-[14px] font-bold text-[#111827]">
                    {provider.label}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#e7eaf2] bg-[#f8fafc] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7c8099]">
                    {copy.item}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#dfe4ff] bg-[#eef2ff] sm:h-24 sm:w-24">
                      {valueObject.imageUrl && !itemImageFailed ? (
                        <img
                          src={valueObject.imageUrl}
                          alt={valueObject.title}
                          className="h-full w-full object-cover object-center"
                          loading="eager"
                          onError={() => setItemImageFailed(true)}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-[#7c8099]">
                          {isService ? copy.service : copy.product}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-[14px] font-bold text-[#111827]">
                        {valueObject.title}
                      </div>
                      <div className="mt-1 text-[12px] text-[#7c8099]">
                        {isService ? copy.service : copy.product}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#e7eaf2] bg-white p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7c8099]">
                    {copy.ordinaryPrice}
                  </div>
                  <div className="mt-2 font-mono text-[18px] font-bold text-[#111827]">
                    {valueObject.ordinaryPrice.toFixed(2)}{" "}
                    {valueObject.currency}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#e7eaf2] bg-white p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7c8099]">
                    {copy.ordinaryDuration}
                  </div>
                  <div className="mt-2 font-mono text-[18px] font-bold text-[#111827]">
                    {isService && valueObject.ordinaryDurationMinutes
                      ? `${valueObject.ordinaryDurationMinutes} min`
                      : "—"}
                  </div>
                </div>
              </div>

              <fieldset className="grid gap-3">
                <legend className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                  {copy.deliveryMode}
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {deliveryOptions.map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setDeliveryMode(mode)}
                      className={
                        deliveryMode === mode
                          ? "rounded-2xl border border-[#3b6ef8] bg-[#eef2ff] p-4 text-left text-[14px] font-bold text-[#315bd0]"
                          : "rounded-2xl border border-[#e4e7f0] bg-white p-4 text-left text-[14px] font-bold text-[#4a4f6a]"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                    {copy.availableFrom}
                  </span>
                  <input
                    type="date"
                    value={availableFrom}
                    onChange={(event) =>
                      setAvailableFrom(event.target.value)
                    }
                    className="min-h-12 rounded-xl border border-[#dfe3f1] bg-white px-4 text-[14px] text-[#1a1d2e]"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                    {copy.availableUntil}
                  </span>
                  <input
                    type="date"
                    value={availableUntil}
                    onChange={(event) =>
                      setAvailableUntil(event.target.value)
                    }
                    className="min-h-12 rounded-xl border border-[#dfe3f1] bg-white px-4 text-[14px] text-[#1a1d2e]"
                  />
                </label>
              </div>
              <p className="-mt-2 text-[12px] leading-5 text-[#7c8099]">
                {copy.validityHint}
              </p>

              {isService ? (
                <fieldset className="grid gap-3 rounded-2xl border border-[#e4e7f0] bg-[#f8fafc] p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={individualServiceTime}
                      onChange={(event) =>
                        setIndividualServiceTime(event.target.checked)
                      }
                      className="mt-1 h-4 w-4 rounded border-[#cfd5e6] text-[#3b6ef8]"
                    />
                    <span className="grid gap-1">
                      <span className="text-[14px] font-bold text-[#1a1d2e]">
                        {copy.individualTime}
                      </span>
                      <span className="text-[12px] leading-5 text-[#7c8099]">
                        {copy.individualTimeHint}
                      </span>
                    </span>
                  </label>

                  {!individualServiceTime ? (
                    <div className="grid gap-4 border-t border-[#e4e7f0] pt-4 sm:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                          {copy.serviceStart}
                        </span>
                        <input
                          type="datetime-local"
                          value={serviceStart}
                          onChange={(event) =>
                            setServiceStart(event.target.value)
                          }
                          className="min-h-12 rounded-xl border border-[#dfe3f1] bg-white px-4 text-[14px] text-[#1a1d2e]"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                          {copy.serviceDuration}
                        </span>
                        <input
                          inputMode="numeric"
                          value={serviceDurationMinutes}
                          onChange={(event) =>
                            setServiceDurationMinutes(event.target.value)
                          }
                          className="min-h-12 rounded-xl border border-[#dfe3f1] bg-white px-4 text-[14px] text-[#1a1d2e]"
                        />
                      </label>
                      <p className="text-[12px] leading-5 text-[#7c8099] sm:col-span-2">
                        {copy.serviceDurationHint}
                      </p>
                    </div>
                  ) : null}
                </fieldset>
              ) : null}

              <fieldset className="grid gap-3 rounded-2xl border border-[#e4e7f0] bg-[#f8fafc] p-4">
                <legend className="px-1 text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                  {copy.coverageMode}
                </legend>
                <p className="text-[12px] leading-5 text-[#5a5f7a]">
                  {copy.coverageHint}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      [
                        "percentage",
                        copy.percentage,
                        copy.percentageHint,
                      ],
                      [
                        "provider_currency_amount",
                        copy.amount,
                        copy.amountHint,
                      ],
                    ] as const
                  ).map(([mode, label, hint]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setCoverageMode(mode);
                        setCoverageValue(
                          mode === "percentage"
                            ? "100"
                            : valueObject.ordinaryPrice.toFixed(2),
                        );
                      }}
                      className={
                        coverageMode === mode
                          ? "grid gap-2 rounded-2xl border border-[#3b6ef8] bg-[#eef2ff] p-4 text-left text-[#315bd0]"
                          : "grid gap-2 rounded-2xl border border-[#e4e7f0] bg-white p-4 text-left text-[#4a4f6a]"
                      }
                    >
                      <span className="text-[14px] font-bold">{label}</span>
                      <span className="text-[12px] leading-5 opacity-80">
                        {hint}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="grid gap-2">
                <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                  {copy.coverageValue}
                </span>
                <div className="flex min-h-12 items-center rounded-xl border border-[#dfe3f1] bg-white">
                  <input
                    inputMode="decimal"
                    value={coverageValue}
                    onChange={(event) =>
                      setCoverageValue(event.target.value)
                    }
                    className="min-h-11 min-w-0 flex-1 rounded-xl px-4 text-[14px] text-[#1a1d2e] outline-none"
                  />
                  <span className="px-4 font-mono text-[13px] font-bold text-[#7c8099]">
                    {coverageMode === "percentage"
                      ? "%"
                      : valueObject.currency}
                  </span>
                </div>
              </label>

              <section className="rounded-2xl border border-[#dfe3f1] bg-[#f8fafc] p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#3b6ef8]">
                  {copy.preview}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    [
                      copy.covered,
                      calculation.valid
                        ? `${calculation.coveredProviderAmount.toFixed(2)} ${valueObject.currency}`
                        : "—",
                    ],
                    [
                      copy.points,
                      calculation.valid
                        ? formatLocalizedPoints(calculation.pointsPrice, locale)
                        : "—",
                    ],
                    [
                      copy.remainder,
                      calculation.valid
                        ? `${calculation.remainder.toFixed(2)} ${valueObject.currency}`
                        : "—",
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-[#e7eaf2] bg-white p-4"
                    >
                      <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7c8099]">
                        {label}
                      </div>
                      <div className="mt-2 font-mono text-[16px] font-bold text-[#111827]">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 rounded-2xl border border-[#ffe6b5] bg-[#fffaf0] p-4 text-[12px] leading-5 text-[#7a5d1d]">
                  {copy.externalPayment}
                </p>
              </section>

              <label className="grid gap-2">
                <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                  {copy.terms}
                </span>
                <textarea
                  value={termsText}
                  onChange={(event) =>
                    setTermsText(event.target.value)
                  }
                  maxLength={4000}
                  rows={4}
                  className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e]"
                />
                <span className="text-[12px] leading-5 text-[#7c8099]">
                  {copy.termsHint}
                </span>
              </label>

              {errorMessage ? (
                <div
                  ref={errorMessageRef}
                  role="alert"
                  aria-live="assertive"
                  tabIndex={-1}
                  className="rounded-[18px] border border-[#ffd5d5] bg-[#fff7f7] p-4 text-[14px] font-semibold leading-6 text-[#b42318] outline-none"
                >
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void submit()}
                disabled={pending}
                className="min-h-12 rounded-xl bg-[#3b6ef8] px-5 text-[14px] font-bold text-white shadow-[0_10px_22px_rgba(59,110,248,0.22)] transition hover:bg-[#315bd0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? copy.creating : copy.create}
              </button>
            </div>
          </article>

        </section>
      </div>
    </main>
  );
}
