import type { ValueObjectBranchPolicyDto } from "@/types/value-object-branch-policy";

export type ValueObjectBranchPolicyLocale =
  | "en"
  | "pl"
  | "ru"
  | "uk"
  | "de"
  | "es"
  | "cs";

type LocalizedText = Record<ValueObjectBranchPolicyLocale, string>;

const TITLES_BY_KEY: Record<string, LocalizedText> = {
  "valueObject.branch.externalCapital.title": {
    en: "External capital",
    pl: "Kapitał zewnętrzny",
    ru: "Внешний капитал",
    uk: "Зовнішній капітал",
    de: "Externes Kapital",
    es: "Capital externo",
    cs: "Vnější kapitál",
  },
  "valueObject.branch.internalCapability.title": {
    en: "Internal capability",
    pl: "Zdolność wewnętrzna",
    ru: "Внутренняя способность",
    uk: "Внутрішня спроможність",
    de: "Interne Fähigkeit",
    es: "Capacidad interna",
    cs: "Vnitřní schopnost",
  },
  "valueObject.branch.resource.title": {
    en: "Resource",
    pl: "Zasób",
    ru: "Ресурс",
    uk: "Ресурс",
    de: "Ressource",
    es: "Recurso",
    cs: "Zdroj",
  },
  "valueObject.branch.biologicalSystem.title": {
    en: "Biological system",
    pl: "Układ biologiczny",
    ru: "Биологическая система",
    uk: "Біологічна система",
    de: "Biologisches System",
    es: "Sistema biológico",
    cs: "Biologický systém",
  },
  "valueObject.branch.mediatorHormone.title": {
    en: "Mediator or hormone",
    pl: "Mediator lub hormon",
    ru: "Медиатор или гормон",
    uk: "Медіатор або гормон",
    de: "Mediator oder Hormon",
    es: "Mediador u hormona",
    cs: "Mediátor nebo hormon",
  },
};

const DESCRIPTIONS_BY_KEY: Record<string, LocalizedText> = {
  "valueObject.branch.externalCapital.description": {
    en: "Economic, social, institutional and symbolic capital outside the actor.",
    pl: "Kapitał ekonomiczny, społeczny, instytucjonalny i symboliczny poza aktorem.",
    ru: "Экономический, социальный, институциональный и символический капитал вне актора.",
    uk: "Економічний, соціальний, інституційний і символічний капітал поза актором.",
    de: "Ökonomisches, soziales, institutionelles und symbolisches Kapital außerhalb des Akteurs.",
    es: "Capital económico, social, institucional y simbólico externo al actor.",
    cs: "Ekonomický, sociální, institucionální a symbolický kapitál mimo aktéra.",
  },
  "valueObject.branch.internalCapability.description": {
    en: "Body, knowledge, skills, emotions and self-regulation that belong to the actor.",
    pl: "Ciało, wiedza, umiejętności, emocje i samoregulacja należące do aktora.",
    ru: "Тело, знания, навыки, эмоции и саморегуляция, принадлежащие актору.",
    uk: "Тіло, знання, навички, емоції та саморегуляція, що належать актору.",
    de: "Körper, Wissen, Fähigkeiten, Emotionen und Selbstregulation des Akteurs.",
    es: "Cuerpo, conocimientos, habilidades, emociones y autorregulación del actor.",
    cs: "Tělo, znalosti, dovednosti, emoce a seberegulace aktéra.",
  },
  "valueObject.branch.resource.description": {
    en: "Spendable or renewable resources such as time, money, energy and attention.",
    pl: "Zasoby zużywalne lub odnawialne, takie jak czas, pieniądze, energia i uwaga.",
    ru: "Расходуемые или восстанавливаемые ресурсы: время, деньги, энергия и внимание.",
    uk: "Витратні або відновлювані ресурси: час, гроші, енергія та увага.",
    de: "Verbrauchbare oder erneuerbare Ressourcen wie Zeit, Geld, Energie und Aufmerksamkeit.",
    es: "Recursos consumibles o renovables como tiempo, dinero, energía y atención.",
    cs: "Spotřebovatelné nebo obnovitelné zdroje, například čas, peníze, energie a pozornost.",
  },
  "valueObject.branch.biologicalSystem.description": {
    en: "Body systems and components that require system-specific measurement rules.",
    pl: "Układy i części organizmu wymagające właściwych im reguł pomiaru.",
    ru: "Системы и компоненты организма со специализированными правилами измерения.",
    uk: "Системи й компоненти організму зі спеціалізованими правилами вимірювання.",
    de: "Körpersysteme und Komponenten mit systemspezifischen Messregeln.",
    es: "Sistemas y componentes corporales con reglas de medición específicas.",
    cs: "Tělesné systémy a součásti se specifickými pravidly měření.",
  },
  "valueObject.branch.mediatorHormone.description": {
    en: "Hormones, neurotransmitters and mediators with measurement conditions and units.",
    pl: "Hormony, neuroprzekaźniki i mediatory z warunkami oraz jednostkami pomiaru.",
    ru: "Гормоны, нейромедиаторы и медиаторы с условиями и единицами измерения.",
    uk: "Гормони, нейромедіатори й медіатори з умовами та одиницями вимірювання.",
    de: "Hormone, Neurotransmitter und Mediatoren mit Messbedingungen und Einheiten.",
    es: "Hormonas, neurotransmisores y mediadores con condiciones y unidades de medición.",
    cs: "Hormony, neurotransmitery a mediátory s podmínkami a jednotkami měření.",
  },
};

export function humanizeValueObjectCode(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function resolveValueObjectBranchPolicyTitle(
  policy: ValueObjectBranchPolicyDto,
  locale: ValueObjectBranchPolicyLocale,
) {
  return TITLES_BY_KEY[policy.titleKey]?.[locale] ??
    humanizeValueObjectCode(policy.branchTypeCode);
}

export function resolveValueObjectBranchPolicyDescription(
  policy: ValueObjectBranchPolicyDto,
  locale: ValueObjectBranchPolicyLocale,
) {
  return DESCRIPTIONS_BY_KEY[policy.descriptionKey]?.[locale] ??
    policy.descriptionKey;
}
