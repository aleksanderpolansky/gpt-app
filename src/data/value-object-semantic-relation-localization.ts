import type {
  ValueObjectRelationPerspective,
  ValueObjectRelationTypeDto,
  ValueObjectSemanticRelationLocale,
} from "@/types/value-object-semantic-relation";

type LocalizedText = Record<ValueObjectSemanticRelationLocale, string>;

const TITLES_BY_KEY: Record<string, LocalizedText> = {
  "valueObject.relation.relatedTo.title": {
    en: "Related to",
    pl: "Powiązany z",
    ru: "Связан с",
    uk: "Пов’язаний з",
    de: "Verbunden mit",
    es: "Relacionado con",
    cs: "Souvisí s",
  },
  "valueObject.relation.sameSubjectAs.title": {
    en: "Same subject as",
    pl: "Ten sam przedmiot co",
    ru: "Тот же предмет наблюдения",
    uk: "Той самий предмет спостереження",
    de: "Gleicher Gegenstand wie",
    es: "Mismo objeto que",
    cs: "Stejný předmět jako",
  },
  "valueObject.relation.supports.title": {
    en: "Supports",
    pl: "Wspiera",
    ru: "Поддерживает",
    uk: "Підтримує",
    de: "Unterstützt",
    es: "Apoya",
    cs: "Podporuje",
  },
  "valueObject.relation.supportedBy.title": {
    en: "Supported by",
    pl: "Wspierany przez",
    ru: "Поддерживается",
    uk: "Підтримується",
    de: "Unterstützt durch",
    es: "Apoyado por",
    cs: "Podporován",
  },
  "valueObject.relation.dependsOn.title": {
    en: "Depends on",
    pl: "Zależy od",
    ru: "Зависит от",
    uk: "Залежить від",
    de: "Hängt ab von",
    es: "Depende de",
    cs: "Závisí na",
  },
  "valueObject.relation.prerequisiteFor.title": {
    en: "Required for",
    pl: "Wymagany dla",
    ru: "Необходим для",
    uk: "Необхідний для",
    de: "Erforderlich für",
    es: "Necesario para",
    cs: "Nutný pro",
  },
  "valueObject.relation.conflictsWith.title": {
    en: "Conflicts with",
    pl: "Jest w konflikcie z",
    ru: "Конфликтует с",
    uk: "Конфліктує з",
    de: "Steht im Konflikt mit",
    es: "Entra en conflicto con",
    cs: "Je v konfliktu s",
  },
  "valueObject.relation.influences.title": {
    en: "Influences",
    pl: "Wpływa na",
    ru: "Влияет на",
    uk: "Впливає на",
    de: "Beeinflusst",
    es: "Influye en",
    cs: "Ovlivňuje",
  },
  "valueObject.relation.influencedBy.title": {
    en: "Influenced by",
    pl: "Pod wpływem",
    ru: "Испытывает влияние",
    uk: "Зазнає впливу",
    de: "Beeinflusst durch",
    es: "Influenciado por",
    cs: "Ovlivňován",
  },
};

const DESCRIPTIONS_BY_KEY: Record<string, LocalizedText> = {
  "valueObject.relation.relatedTo.description": {
    en: "The objects have a meaningful connection without a stronger declared relation.",
    pl: "Obiekty mają znaczący związek bez określenia silniejszej relacji.",
    ru: "Объекты имеют смысловую связь без указания более точного отношения.",
    uk: "Об’єкти мають смисловий зв’язок без визначення точнішого відношення.",
    de: "Die Objekte haben einen inhaltlichen Zusammenhang ohne genauer definierte Beziehung.",
    es: "Los objetos tienen una conexión significativa sin una relación más específica.",
    cs: "Objekty mají významovou souvislost bez přesnějšího určení vztahu.",
  },
  "valueObject.relation.sameSubjectAs.description": {
    en: "The objects describe the same observed subject in different structural contexts.",
    pl: "Obiekty opisują ten sam przedmiot obserwacji w różnych kontekstach strukturalnych.",
    ru: "Объекты описывают один предмет наблюдения в разных структурных контекстах.",
    uk: "Об’єкти описують один предмет спостереження в різних структурних контекстах.",
    de: "Die Objekte beschreiben denselben Beobachtungsgegenstand in verschiedenen Strukturkontexten.",
    es: "Los objetos describen el mismo objeto observado en distintos contextos estructurales.",
    cs: "Objekty popisují tentýž předmět pozorování v různých strukturálních kontextech.",
  },
  "valueObject.relation.supports.description": {
    en: "The source object helps maintain, strengthen or develop the target object.",
    pl: "Obiekt źródłowy pomaga utrzymać, wzmocnić lub rozwinąć obiekt docelowy.",
    ru: "Исходный объект помогает сохранять, усиливать или развивать целевой объект.",
    uk: "Вихідний об’єкт допомагає зберігати, посилювати або розвивати цільовий об’єкт.",
    de: "Das Ausgangsobjekt hilft, das Zielobjekt zu erhalten, zu stärken oder zu entwickeln.",
    es: "El objeto de origen ayuda a mantener, fortalecer o desarrollar el objeto de destino.",
    cs: "Zdrojový objekt pomáhá cílový objekt udržovat, posilovat nebo rozvíjet.",
  },
  "valueObject.relation.supportedBy.description": {
    en: "The current object is maintained, strengthened or developed by the related object.",
    pl: "Bieżący obiekt jest utrzymywany, wzmacniany lub rozwijany przez powiązany obiekt.",
    ru: "Текущий объект сохраняется, усиливается или развивается благодаря связанному объекту.",
    uk: "Поточний об’єкт зберігається, посилюється або розвивається завдяки пов’язаному об’єкту.",
    de: "Das aktuelle Objekt wird durch das verbundene Objekt erhalten, gestärkt oder entwickelt.",
    es: "El objeto actual se mantiene, fortalece o desarrolla gracias al objeto relacionado.",
    cs: "Aktuální objekt je souvisejícím objektem udržován, posilován nebo rozvíjen.",
  },
  "valueObject.relation.dependsOn.description": {
    en: "The source object requires the target object or its sufficient state.",
    pl: "Obiekt źródłowy wymaga obiektu docelowego lub jego odpowiedniego stanu.",
    ru: "Исходный объект требует целевого объекта или его достаточного состояния.",
    uk: "Вихідний об’єкт потребує цільового об’єкта або його достатнього стану.",
    de: "Das Ausgangsobjekt benötigt das Zielobjekt oder einen ausreichenden Zustand davon.",
    es: "El objeto de origen necesita el objeto de destino o un estado suficiente de este.",
    cs: "Zdrojový objekt vyžaduje cílový objekt nebo jeho dostatečný stav.",
  },
  "valueObject.relation.prerequisiteFor.description": {
    en: "The current object is required for the related object.",
    pl: "Bieżący obiekt jest wymagany dla obiektu powiązanego.",
    ru: "Текущий объект необходим для связанного объекта.",
    uk: "Поточний об’єкт необхідний для пов’язаного об’єкта.",
    de: "Das aktuelle Objekt ist für das verbundene Objekt erforderlich.",
    es: "El objeto actual es necesario para el objeto relacionado.",
    cs: "Aktuální objekt je nutný pro související objekt.",
  },
  "valueObject.relation.conflictsWith.description": {
    en: "The objects compete, obstruct each other or require an explicit trade-off.",
    pl: "Obiekty konkurują, przeszkadzają sobie lub wymagają świadomego kompromisu.",
    ru: "Объекты конкурируют, мешают друг другу или требуют осознанного компромисса.",
    uk: "Об’єкти конкурують, заважають один одному або потребують свідомого компромісу.",
    de: "Die Objekte konkurrieren, behindern einander oder erfordern eine bewusste Abwägung.",
    es: "Los objetos compiten, se obstaculizan o exigen una compensación explícita.",
    cs: "Objekty si konkurují, překážejí nebo vyžadují vědomý kompromis.",
  },
  "valueObject.relation.influences.description": {
    en: "Changes in the source object can affect the target object.",
    pl: "Zmiany w obiekcie źródłowym mogą wpływać na obiekt docelowy.",
    ru: "Изменения исходного объекта могут влиять на целевой объект.",
    uk: "Зміни вихідного об’єкта можуть впливати на цільовий об’єкт.",
    de: "Änderungen am Ausgangsobjekt können das Zielobjekt beeinflussen.",
    es: "Los cambios en el objeto de origen pueden afectar al objeto de destino.",
    cs: "Změny zdrojového objektu mohou ovlivnit cílový objekt.",
  },
  "valueObject.relation.influencedBy.description": {
    en: "The current object can be affected by changes in the related object.",
    pl: "Na bieżący obiekt mogą wpływać zmiany w obiekcie powiązanym.",
    ru: "На текущий объект могут влиять изменения связанного объекта.",
    uk: "На поточний об’єкт можуть впливати зміни пов’язаного об’єкта.",
    de: "Das aktuelle Objekt kann durch Änderungen am verbundenen Objekt beeinflusst werden.",
    es: "El objeto actual puede verse afectado por cambios en el objeto relacionado.",
    cs: "Aktuální objekt může být ovlivněn změnami souvisejícího objektu.",
  },
};

export function humanizeSemanticRelationCode(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function resolveSemanticRelationTitle(
  relationType: ValueObjectRelationTypeDto,
  locale: ValueObjectSemanticRelationLocale,
  perspective: ValueObjectRelationPerspective = "outgoing",
) {
  const key = perspective === "incoming"
    ? relationType.reverseTitleKey
    : relationType.titleKey;

  return TITLES_BY_KEY[key]?.[locale] ??
    humanizeSemanticRelationCode(relationType.relationTypeCode);
}

export function resolveSemanticRelationDescription(
  relationType: ValueObjectRelationTypeDto,
  locale: ValueObjectSemanticRelationLocale,
  perspective: ValueObjectRelationPerspective = "outgoing",
) {
  const key = perspective === "incoming"
    ? relationType.reverseDescriptionKey
    : relationType.descriptionKey;

  return DESCRIPTIONS_BY_KEY[key]?.[locale] ?? key;
}
