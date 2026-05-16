export type KnownTemplateRubricatorClassificationRule = {
  ruleKey: string;
  templateSlug: string;
  objectTypeCode: string;
  actionTypeCode: string;
  contextCode: string;
  contextualCategorySlug: string;
  classificationRole: "primary";
  isPrimary: boolean;
  confidence: number;
};

export const KNOWN_TEMPLATE_RUBRICATOR_CLASSIFICATION_RULES: readonly KnownTemplateRubricatorClassificationRule[] = [
  {
    ruleKey: "german_marketing_handwriting_practice_to_business_german",
    templateSlug: "german-marketing-handwriting-practice",
    objectTypeCode: "German_language",
    actionTypeCode: "practice",
    contextCode: "learning",
    contextualCategorySlug: "business-german",
    classificationRole: "primary",
    isPrimary: true,
    confidence: 1,
  },
  {
    ruleKey: "knee_training_health_practice_to_knee_exercises",
    templateSlug: "knee-training-health-practice",
    objectTypeCode: "knee",
    actionTypeCode: "train",
    contextCode: "health",
    contextualCategorySlug: "knee-exercises",
    classificationRole: "primary",
    isPrimary: true,
    confidence: 1,
  },
];
