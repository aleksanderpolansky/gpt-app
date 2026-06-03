import type {
  ValueObjectDomain,
  ValueObjectDomainGroup,
  ValueObjectFilterState,
  ValueObjectLifecycleStatus,
  ValueObjectNormalizedModel,
  ValueObjectPrivacyLevel,
  ValueObjectUiNode,
  ValueObjectUiSummary,
} from "./value-object-types";

const REVIEW_LIFECYCLE_STATUSES: readonly ValueObjectLifecycleStatus[] = [
  "needs_review",
];

const normalizeText = (value: string): string => value.trim().toLowerCase();

const includesNormalized = (value: string, query: string): boolean =>
  normalizeText(value).includes(normalizeText(query));

const hasSelectedValue = <TValue extends string>(
  selectedValues: readonly TValue[],
  value: TValue,
): boolean => selectedValues.length === 0 || selectedValues.includes(value);

export const clampValueObjectPercent = (value: number): number => {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
};

export const formatValueObjectPercent = (value: number): string =>
  `${clampValueObjectPercent(value)}%`;

export const isValueObjectNeedsReview = (
  valueObject: ValueObjectUiNode,
): boolean =>
  REVIEW_LIFECYCLE_STATUSES.includes(valueObject.lifecycleStatus) ||
  valueObject.attentionStatus === "needs_review";

export const getValueObjectSearchText = (
  valueObject: ValueObjectUiNode,
): string =>
  [
    valueObject.title,
    valueObject.description,
    valueObject.domain,
    valueObject.privacyLevel,
    valueObject.lifecycleStatus,
    valueObject.attentionStatus,
    ...valueObject.categoryLabels,
    ...valueObject.sourceLabels,
    ...valueObject.tags,
    ...valueObject.notes,
    ...valueObject.protocolFeatures.flatMap((feature) => [
      feature.label,
      feature.value,
      feature.helper ?? "",
    ]),
    ...valueObject.reviewSignals.flatMap((signal) => [
      signal.label,
      signal.description,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export const getValueObjectById = (
  valueObjects: readonly ValueObjectUiNode[],
  valueObjectId: string,
): ValueObjectUiNode | undefined =>
  valueObjects.find((valueObject) => valueObject.id === valueObjectId);

export const getValueObjectChildren = (
  valueObjects: readonly ValueObjectUiNode[],
  parentId: string,
): readonly ValueObjectUiNode[] =>
  valueObjects.filter((valueObject) => valueObject.parentId === parentId);

export const getValueObjectRelatedObjects = (
  valueObjects: readonly ValueObjectUiNode[],
  valueObject: ValueObjectUiNode,
): readonly ValueObjectUiNode[] =>
  valueObject.relatedObjectIds
    .map((relatedObjectId) => getValueObjectById(valueObjects, relatedObjectId))
    .filter((relatedObject): relatedObject is ValueObjectUiNode =>
      Boolean(relatedObject),
    );

export const filterValueObjects = (
  valueObjects: readonly ValueObjectUiNode[],
  filterState: ValueObjectFilterState,
): readonly ValueObjectUiNode[] => {
  const query = normalizeText(filterState.searchQuery);

  return valueObjects.filter((valueObject) => {
    const matchesSearch =
      query.length === 0 || includesNormalized(getValueObjectSearchText(valueObject), query);

    const matchesDomain = hasSelectedValue<ValueObjectDomain>(
      filterState.selectedDomains,
      valueObject.domain,
    );

    const matchesPrivacy = hasSelectedValue<ValueObjectPrivacyLevel>(
      filterState.selectedPrivacyLevels,
      valueObject.privacyLevel,
    );

    const matchesLifecycle = hasSelectedValue<ValueObjectLifecycleStatus>(
      filterState.selectedStatuses,
      valueObject.lifecycleStatus,
    );

    const matchesReviewMode =
      !filterState.showOnlyNeedsReview || isValueObjectNeedsReview(valueObject);

    return (
      matchesSearch &&
      matchesDomain &&
      matchesPrivacy &&
      matchesLifecycle &&
      matchesReviewMode
    );
  });
};

export const sortValueObjectsForDisplay = (
  valueObjects: readonly ValueObjectUiNode[],
): readonly ValueObjectUiNode[] =>
  [...valueObjects].sort((firstObject, secondObject) => {
    const reviewWeight =
      Number(isValueObjectNeedsReview(secondObject)) -
      Number(isValueObjectNeedsReview(firstObject));

    if (reviewWeight !== 0) {
      return reviewWeight;
    }

    const activityWeight = secondObject.activityCount - firstObject.activityCount;

    if (activityWeight !== 0) {
      return activityWeight;
    }

    return firstObject.title.localeCompare(secondObject.title);
  });

export const createValueObjectSummary = (
  valueObjects: readonly ValueObjectUiNode[],
): ValueObjectUiSummary => {
  const totalObjects = valueObjects.length;
  const activeObjects = valueObjects.filter(
    (valueObject) => valueObject.lifecycleStatus === "active",
  ).length;
  const needsReviewObjects = valueObjects.filter(isValueObjectNeedsReview).length;
  const privateObjects = valueObjects.filter(
    (valueObject) => valueObject.privacyLevel === "private",
  ).length;
  const sharedObjects = valueObjects.filter(
    (valueObject) => valueObject.privacyLevel !== "private",
  ).length;

  const averageProgressPercent =
    totalObjects === 0
      ? 0
      : clampValueObjectPercent(
          valueObjects.reduce(
            (progressSum, valueObject) =>
              progressSum + valueObject.progressPercent,
            0,
          ) / totalObjects,
        );

  return {
    totalObjects,
    activeObjects,
    needsReviewObjects,
    privateObjects,
    sharedObjects,
    averageProgressPercent,
  };
};

export const createValueObjectDomainGroups = (
  valueObjects: readonly ValueObjectUiNode[],
  domainGroups: readonly ValueObjectDomainGroup[],
): readonly ValueObjectDomainGroup[] =>
  domainGroups.map((domainGroup) => {
    const objectIds = valueObjects
      .filter((valueObject) => valueObject.domain === domainGroup.domain)
      .map((valueObject) => valueObject.id);

    return {
      ...domainGroup,
      objectIds,
    };
  });

export const createValueObjectNormalizedModel = (
  valueObjects: readonly ValueObjectUiNode[],
  domainGroups: readonly ValueObjectDomainGroup[],
): ValueObjectNormalizedModel => {
  const sortedObjects = sortValueObjectsForDisplay(valueObjects);
  const normalizedDomainGroups = createValueObjectDomainGroups(
    sortedObjects,
    domainGroups,
  );

  return {
    objects: sortedObjects,
    domainGroups: normalizedDomainGroups,
    summary: createValueObjectSummary(sortedObjects),
  };
};

export const resolveSelectedValueObject = (
  valueObjects: readonly ValueObjectUiNode[],
  selectedObjectId: string,
): ValueObjectUiNode | undefined =>
  getValueObjectById(valueObjects, selectedObjectId) ?? valueObjects[0];

export const getValueObjectDomainLabel = (
  domainGroups: readonly ValueObjectDomainGroup[],
  domain: ValueObjectDomain,
): string =>
  domainGroups.find((domainGroup) => domainGroup.domain === domain)?.label ??
  domain;

export const getValueObjectTreeDepth = (
  valueObjects: readonly ValueObjectUiNode[],
  valueObject: ValueObjectUiNode,
): number => {
  let depth = 0;
  let currentParentId = valueObject.parentId;

  while (currentParentId) {
    const parentObject = getValueObjectById(valueObjects, currentParentId);

    if (!parentObject) {
      return depth;
    }

    depth += 1;
    currentParentId = parentObject.parentId;
  }

  return depth;
};
