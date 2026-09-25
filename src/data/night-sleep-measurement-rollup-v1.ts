import type { MeasurementRollupDefinitionV1 } from "@/lib/reality-core/measurement-rollup-contract-v1";
import { MEASUREMENT_ROLLUP_CONTRACT_VERSION } from "@/lib/reality-core/measurement-rollup-contract-v1";

/**
 * Candidate rollup contract for the Night sleep duration measurement family.
 *
 * Important:
 * - the universal parameter remains "duration";
 * - semantic specificity belongs to observation objects;
 * - the target leaf is not a new ontology node type;
 * - "rollup_target" is a role inside this analytics contract only;
 * - missing components are UNKNOWN, never implicit zero;
 * - direct total is preferred when present;
 * - complete Light + Deep + REM can derive the total;
 * - direct total + complete components are compared, never added together;
 * - facts from different events/bundles are never mixed silently.
 */
export const NIGHT_SLEEP_DURATION_ROLLUP_V1: MeasurementRollupDefinitionV1 = {
  contractVersion: MEASUREMENT_ROLLUP_CONTRACT_VERSION,
  id: "night_sleep_duration_rollup_v1",
  familyCode: "sleep_duration",
  status: "draft",

  parameterCode: "duration",
  canonicalUnitCode: "minute",

  targetValueObjectId: "84d2f41f-4068-518a-b9d9-047b0d0e0762",
  targetSemanticRole: "rollup_target",

  componentValueObjectIds: [
    "607c0db7-d29d-5b5f-89a4-8317bb37fc62",
    "45d472b0-88fe-5642-b7d0-cbe2502c4ca9",
    "a620cf08-9cdb-5c7a-b428-721f356e2d8e",
  ],

  operator: "sum",
  requiredComponentPolicy: "all",
  directValuePolicy: "prefer_direct",
  missingValuePolicy: "unknown",
  discrepancyPolicy: "flag",
  bundlePolicy: "explicit_or_single",

  sameActivityEventRequired: true,
  sameMeasurementBundleRequired: true,
  doubleCountProtection: true,

  // Sleep-stage values from consumer wearables are commonly minute-rounded.
  discrepancyToleranceAbsolute: 1,
};

export const NIGHT_SLEEP_DURATION_ROLLUP_OBJECTS_V1 = {
  target: {
    valueObjectId: "84d2f41f-4068-518a-b9d9-047b0d0e0762",
    canonicalKey: "system.night_sleep_duration.795eb5e577",
    titleEn: "Night sleep duration",
    titleRu: "Продолжительность ночного сна",
  },
  components: [
    {
      valueObjectId: "607c0db7-d29d-5b5f-89a4-8317bb37fc62",
      canonicalKey: "system.light_sleep_duration.5032860127",
      titleEn: "Light sleep duration",
      titleRu: "Продолжительность лёгкого сна",
    },
    {
      valueObjectId: "45d472b0-88fe-5642-b7d0-cbe2502c4ca9",
      canonicalKey: "system.deep_sleep_duration.b665898744",
      titleEn: "Deep sleep duration",
      titleRu: "Продолжительность глубокого сна",
    },
    {
      valueObjectId: "a620cf08-9cdb-5c7a-b428-721f356e2d8e",
      canonicalKey: "system.rem_sleep_duration.ad2e51ca88",
      titleEn: "REM sleep duration",
      titleRu: "Продолжительность REM-сна",
    },
  ],
} as const;
