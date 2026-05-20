# P4.10.0-C8-P3-B5-B0 — Exact Route Patch Anchors

Date: 2026-05-20
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / exact route patch anchors before B5-B implementation

This checkpoint does not change runtime code.

Goal: capture exact anchors for adding route-side conversion of resolved Category Derivation candidates into additionalCategoryLinks.

## 1. Git status

```text
?? docs/value-objects/category-derivation-route-patch-anchors-c8-p3-b5-b0.md
```

## 2. Recent commits

```text
e6393a6 Restore full category derivation route-side integration map
b05ed56 Map category derivation route-side bridge integration
3f1fc4c Map category derivation route-side bridge integration
119f5d7 Document category derivation bridge no-flag regression pass
cd78bea Fix category derivation bridge additional link scope
022c158 Add no-flag bridge regression browser test
43bd1cc Call category derivation bridge additional category link helper
7431272 Fix category derivation bridge additional category link helper insertion
2cf42b2 Add category derivation bridge additional category link helper
88e20ca Add category derivation bridge additional category link contract
```

## 3. File line counts

```text
.\src\app\api\activity\debug\free-text-value-object-test\route.ts => 673 lines
.\lib\activity\categoryDerivation\types.ts => 132 lines
.\lib\activity\valueObjectBridge.ts => 1628 lines
```

## 4. Route imports

```text
MATCH COUNT: 11

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:1 | pattern: import  -----
    1: import { NextResponse } from "next/server";
      import { randomUUID } from "crypto";
      
      import {
        ACTIVITY_RECORDING_DISABLED_MESSAGE,
        ACTIVITY_RECORDING_ENABLED,
      } from "../../../../../../lib/activity/activityRecordingConfig";
      import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
      import { processActivityValueObjectBridge } from "../../../../../../lib/activity/activityValueObjectLifecycle";
      import { safeCreateActivityProcessingLog } from "../../../../../../lib/activity/activityProcessingLogs";
      import { supabase } from "../../../../../../lib/supabase";
      import { deriveCategoryCandidates } from "../../../../../../lib/activity/categoryDerivation/ruleExtractor";
      import {
        resolveCategoryCandidates,
        type CategoryResolverCreatePolicy,
        type CategoryResolverSupabaseClient,
      } from "../../../../../../lib/activity/categoryDerivation/resolver";
      import {
        persistCategoryDerivations,
        type CategoryDerivationPersistenceSupabaseClient,
      } from "../../../../../../lib/activity/categoryDerivation/persistDerivations";
      import type { CategoryDerivationInput } from "../../../../../../lib/activity/categoryDerivation/types";
      
      export const dynamic = "force-dynamic";
      
      type FreeTextValueObjectTestBody = {
        inputText?: unknown;
        naturalInput?: unknown;
        title?: unknown;
        description?: unknown;
        durationMinutes?: unknown;
        startedAt?: unknown;
        endedAt?: unknown;
        enableCategoryDerivation?: unknown;
        categoryDerivationEnabled?: unknown;
        categoryDerivation?: unknown;

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:2 | pattern: import  -----
    2: import { randomUUID } from "crypto";
      
      import {
        ACTIVITY_RECORDING_DISABLED_MESSAGE,
        ACTIVITY_RECORDING_ENABLED,
      } from "../../../../../../lib/activity/activityRecordingConfig";
      import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
      import { processActivityValueObjectBridge } from "../../../../../../lib/activity/activityValueObjectLifecycle";
      import { safeCreateActivityProcessingLog } from "../../../../../../lib/activity/activityProcessingLogs";
      import { supabase } from "../../../../../../lib/supabase";
      import { deriveCategoryCandidates } from "../../../../../../lib/activity/categoryDerivation/ruleExtractor";
      import {
        resolveCategoryCandidates,
        type CategoryResolverCreatePolicy,
        type CategoryResolverSupabaseClient,
      } from "../../../../../../lib/activity/categoryDerivation/resolver";
      import {
        persistCategoryDerivations,
        type CategoryDerivationPersistenceSupabaseClient,
      } from "../../../../../../lib/activity/categoryDerivation/persistDerivations";
      import type { CategoryDerivationInput } from "../../../../../../lib/activity/categoryDerivation/types";
      
      export const dynamic = "force-dynamic";
      
      type FreeTextValueObjectTestBody = {
        inputText?: unknown;
        naturalInput?: unknown;
        title?: unknown;
        description?: unknown;
        durationMinutes?: unknown;
        startedAt?: unknown;
        endedAt?: unknown;
        enableCategoryDerivation?: unknown;
        categoryDerivationEnabled?: unknown;
        categoryDerivation?: unknown;
        categoryDerivationDryRun?: unknown;

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:4 | pattern: import  -----
    4: import {
        ACTIVITY_RECORDING_DISABLED_MESSAGE,
        ACTIVITY_RECORDING_ENABLED,
      } from "../../../../../../lib/activity/activityRecordingConfig";
      import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
      import { processActivityValueObjectBridge } from "../../../../../../lib/activity/activityValueObjectLifecycle";
      import { safeCreateActivityProcessingLog } from "../../../../../../lib/activity/activityProcessingLogs";
      import { supabase } from "../../../../../../lib/supabase";
      import { deriveCategoryCandidates } from "../../../../../../lib/activity/categoryDerivation/ruleExtractor";
      import {
        resolveCategoryCandidates,
        type CategoryResolverCreatePolicy,
        type CategoryResolverSupabaseClient,
      } from "../../../../../../lib/activity/categoryDerivation/resolver";
      import {
        persistCategoryDerivations,
        type CategoryDerivationPersistenceSupabaseClient,
      } from "../../../../../../lib/activity/categoryDerivation/persistDerivations";
      import type { CategoryDerivationInput } from "../../../../../../lib/activity/categoryDerivation/types";
      
      export const dynamic = "force-dynamic";
      
      type FreeTextValueObjectTestBody = {
        inputText?: unknown;
        naturalInput?: unknown;
        title?: unknown;
        description?: unknown;
        durationMinutes?: unknown;
        startedAt?: unknown;
        endedAt?: unknown;
        enableCategoryDerivation?: unknown;
        categoryDerivationEnabled?: unknown;
        categoryDerivation?: unknown;
        categoryDerivationDryRun?: unknown;
        categoryDerivationCreatePolicy?: unknown;
      };

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:8 | pattern: import  -----
    8: import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
      import { processActivityValueObjectBridge } from "../../../../../../lib/activity/activityValueObjectLifecycle";
      import { safeCreateActivityProcessingLog } from "../../../../../../lib/activity/activityProcessingLogs";
      import { supabase } from "../../../../../../lib/supabase";
      import { deriveCategoryCandidates } from "../../../../../../lib/activity/categoryDerivation/ruleExtractor";
      import {
        resolveCategoryCandidates,
        type CategoryResolverCreatePolicy,
        type CategoryResolverSupabaseClient,
      } from "../../../../../../lib/activity/categoryDerivation/resolver";
      import {
        persistCategoryDerivations,
        type CategoryDerivationPersistenceSupabaseClient,
      } from "../../../../../../lib/activity/categoryDerivation/persistDerivations";
      import type { CategoryDerivationInput } from "../../../../../../lib/activity/categoryDerivation/types";
      
      export const dynamic = "force-dynamic";
      
      type FreeTextValueObjectTestBody = {
        inputText?: unknown;
        naturalInput?: unknown;
        title?: unknown;
        description?: unknown;
        durationMinutes?: unknown;
        startedAt?: unknown;
        endedAt?: unknown;
        enableCategoryDerivation?: unknown;
        categoryDerivationEnabled?: unknown;
        categoryDerivation?: unknown;
        categoryDerivationDryRun?: unknown;
        categoryDerivationCreatePolicy?: unknown;
      };
      
      type CategoryDerivationRouteOptions = {
        enabled: boolean;
        dryRun: boolean;

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:9 | pattern: import  -----
    9: import { processActivityValueObjectBridge } from "../../../../../../lib/activity/activityValueObjectLifecycle";
      import { safeCreateActivityProcessingLog } from "../../../../../../lib/activity/activityProcessingLogs";
      import { supabase } from "../../../../../../lib/supabase";
      import { deriveCategoryCandidates } from "../../../../../../lib/activity/categoryDerivation/ruleExtractor";
      import {
        resolveCategoryCandidates,
        type CategoryResolverCreatePolicy,
        type CategoryResolverSupabaseClient,
      } from "../../../../../../lib/activity/categoryDerivation/resolver";
      import {
        persistCategoryDerivations,
        type CategoryDerivationPersistenceSupabaseClient,
      } from "../../../../../../lib/activity/categoryDerivation/persistDerivations";
      import type { CategoryDerivationInput } from "../../../../../../lib/activity/categoryDerivation/types";
      
      export const dynamic = "force-dynamic";
      
      type FreeTextValueObjectTestBody = {
        inputText?: unknown;
        naturalInput?: unknown;
        title?: unknown;
        description?: unknown;
        durationMinutes?: unknown;
        startedAt?: unknown;
        endedAt?: unknown;
        enableCategoryDerivation?: unknown;
        categoryDerivationEnabled?: unknown;
        categoryDerivation?: unknown;
        categoryDerivationDryRun?: unknown;
        categoryDerivationCreatePolicy?: unknown;
      };
      
      type CategoryDerivationRouteOptions = {
        enabled: boolean;
        dryRun: boolean;
        createPolicy: CategoryResolverCreatePolicy;

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:10 | pattern: import  -----
   10: import { safeCreateActivityProcessingLog } from "../../../../../../lib/activity/activityProcessingLogs";
      import { supabase } from "../../../../../../lib/supabase";
      import { deriveCategoryCandidates } from "../../../../../../lib/activity/categoryDerivation/ruleExtractor";
      import {
        resolveCategoryCandidates,
        type CategoryResolverCreatePolicy,
        type CategoryResolverSupabaseClient,
      } from "../../../../../../lib/activity/categoryDerivation/resolver";
      import {
        persistCategoryDerivations,
        type CategoryDerivationPersistenceSupabaseClient,
      } from "../../../../../../lib/activity/categoryDerivation/persistDerivations";
      import type { CategoryDerivationInput } from "../../../../../../lib/activity/categoryDerivation/types";
      
      export const dynamic = "force-dynamic";
      
      type FreeTextValueObjectTestBody = {
        inputText?: unknown;
        naturalInput?: unknown;
        title?: unknown;
        description?: unknown;
        durationMinutes?: unknown;
        startedAt?: unknown;
        endedAt?: unknown;
        enableCategoryDerivation?: unknown;
        categoryDerivationEnabled?: unknown;
        categoryDerivation?: unknown;
        categoryDerivationDryRun?: unknown;
        categoryDerivationCreatePolicy?: unknown;
      };
      
      type CategoryDerivationRouteOptions = {
        enabled: boolean;
        dryRun: boolean;
        createPolicy: CategoryResolverCreatePolicy;
      };
```

## 5. Route body type

```text
MATCH COUNT: 1

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:26 | pattern: type FreeTextValueObjectTestBody -----
   26: type FreeTextValueObjectTestBody = {
        inputText?: unknown;
        naturalInput?: unknown;
        title?: unknown;
        description?: unknown;
        durationMinutes?: unknown;
        startedAt?: unknown;
        endedAt?: unknown;
        enableCategoryDerivation?: unknown;
        categoryDerivationEnabled?: unknown;
        categoryDerivation?: unknown;
        categoryDerivationDryRun?: unknown;
        categoryDerivationCreatePolicy?: unknown;
      };
      
      type CategoryDerivationRouteOptions = {
        enabled: boolean;
        dryRun: boolean;
        createPolicy: CategoryResolverCreatePolicy;
      };
      
      type CategoryDerivationRouteResult = {
        enabled: boolean;
        ok: boolean | null;
        skipped: boolean;
        reason?: string | null;
        error?: string | null;
        options: CategoryDerivationRouteOptions;
        extraction?: {
          ok: boolean;
          skipped: boolean;
          skipReason: string | null;
          processorVersion: string;
          ruleVersion: string | null;
          confidence: number | null;
          candidateCount: number;
          warnings: string[];
          errors: string[];
          candidates: unknown[];
        };
        resolution?: {
          ok: boolean;
          createdCount: number;
          reusedCount: number;
          unresolvedCount: number;
          warnings: string[];
```

## 6. Category derivation options type

```text
MATCH COUNT: 1

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:41 | pattern: type CategoryDerivationRouteOptions -----
   41: type CategoryDerivationRouteOptions = {
        enabled: boolean;
        dryRun: boolean;
        createPolicy: CategoryResolverCreatePolicy;
      };
      
      type CategoryDerivationRouteResult = {
        enabled: boolean;
        ok: boolean | null;
        skipped: boolean;
        reason?: string | null;
        error?: string | null;
        options: CategoryDerivationRouteOptions;
        extraction?: {
          ok: boolean;
          skipped: boolean;
          skipReason: string | null;
          processorVersion: string;
          ruleVersion: string | null;
          confidence: number | null;
          candidateCount: number;
          warnings: string[];
          errors: string[];
          candidates: unknown[];
        };
        resolution?: {
          ok: boolean;
          createdCount: number;
          reusedCount: number;
          unresolvedCount: number;
          warnings: string[];
          errors: string[];
          candidates: unknown[];
        };
        persistence?: {
          ok: boolean;
```

## 7. runCategoryDerivationForDebugRoute function

```text
MATCH COUNT: 2

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:258 | pattern: runCategoryDerivationForDebugRoute -----
        const startedDate = new Date(endedDate.getTime() - durationMinutes * 60000);
      
        return {
          ok: true as const,
          startedAt: startedDate.toISOString(),
          endedAt: endedDate.toISOString(),
          durationMinutes,
        };
      }
      
  258: async function runCategoryDerivationForDebugRoute(params: {
        activityEventId: string;
        inputText: string;
        title: string | null;
        description: string | null;
        durationMinutes: number;
        personActorId: string;
        options: CategoryDerivationRouteOptions;
      }): Promise<CategoryDerivationRouteResult> {
        const { options } = params;
      
        if (!options.enabled) {
          return {
            enabled: false,
            ok: null,
            skipped: true,
            reason: "feature_flag_disabled",
            options,
          };
        }
      
        try {
          const derivationInput: CategoryDerivationInput = {
            activityEventId: params.activityEventId,
            inputText: params.inputText,
            title: params.title,
            description: params.description,
            durationMinutes: params.durationMinutes,
            inputLanguage: null,
            actorId: params.personActorId,
            organizationId: null,
            metadata: {
              endpoint: "/api/activity/debug/free-text-value-object-test",
              p4Step: "P4.10.0-C8-O1",
              featureFlag: "categoryDerivation",
            },
          };
      
          const extractionResult = deriveCategoryCandidates(derivationInput);
      
          const resolutionResult = await resolveCategoryCandidates(
            supabase as unknown as CategoryResolverSupabaseClient,
            extractionResult.candidates,
            {
              createPolicy: options.createPolicy,
              dryRun: options.dryRun,

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:540 | pattern: runCategoryDerivationForDebugRoute -----
            {
              ok: false,
              error: createError?.message ?? "Failed to create activity event.",
            },
            { status: 500 }
          );
        }
      
        const createdEvent = createdEventData as { id: string };
      
  540:   const categoryDerivationResult = await runCategoryDerivationForDebugRoute({
          activityEventId: createdEvent.id,
          inputText,
          title,
          description,
          durationMinutes: timing.durationMinutes,
          personActorId: personActor.id,
          options: categoryDerivationOptions,
        });
      
        const bridgeResult = await processActivityValueObjectBridge({
          supabase,
          eventId: createdEvent.id,
          processorName: "activity_debug_free_text_value_object_test",
          allowNonCompletedEvent: false,
        });
      
        const categoryDerivationWarning =
          categoryDerivationResult.enabled && categoryDerivationResult.ok === false;
      
        const logResult = await safeCreateActivityProcessingLog({
          userId: appUser.id,
          rawSignalId: null,
          activityEventId: createdEvent.id,
          processingRunId,
          processorName: "activity_debug_free_text_value_object_test",
          processingStage: "finalize",
          processingStatus: bridgeResult.ok
            ? categoryDerivationWarning
              ? "warning"
              : bridgeResult.skipped
                ? "skipped"
                : "completed"
            : "warning",
          severity:
            bridgeResult.ok && !categoryDerivationWarning ? "info" : "warning",
          message: "Debug free-text Value Object bridge processed.",
          input: {
            eventId: createdEvent.id,
            inputText,
            durationMinutes: timing.durationMinutes,
            categoryDerivation: {
              enabled: categoryDerivationOptions.enabled,
              dryRun: categoryDerivationOptions.dryRun,
              createPolicy: categoryDerivationOptions.createPolicy,
            },
```

## 8. categoryDerivationResult usage

```text
MATCH COUNT: 14

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:540 | pattern: categoryDerivationResult -----
            {
              ok: false,
              error: createError?.message ?? "Failed to create activity event.",
            },
            { status: 500 }
          );
        }
      
        const createdEvent = createdEventData as { id: string };
      
  540:   const categoryDerivationResult = await runCategoryDerivationForDebugRoute({
          activityEventId: createdEvent.id,
          inputText,
          title,
          description,
          durationMinutes: timing.durationMinutes,
          personActorId: personActor.id,
          options: categoryDerivationOptions,
        });
      
        const bridgeResult = await processActivityValueObjectBridge({
          supabase,
          eventId: createdEvent.id,
          processorName: "activity_debug_free_text_value_object_test",
          allowNonCompletedEvent: false,
        });
      
        const categoryDerivationWarning =
          categoryDerivationResult.enabled && categoryDerivationResult.ok === false;
      
        const logResult = await safeCreateActivityProcessingLog({
          userId: appUser.id,
          rawSignalId: null,
          activityEventId: createdEvent.id,
          processingRunId,
          processorName: "activity_debug_free_text_value_object_test",
          processingStage: "finalize",
          processingStatus: bridgeResult.ok
            ? categoryDerivationWarning
              ? "warning"
              : bridgeResult.skipped
                ? "skipped"
                : "completed"
            : "warning",
          severity:
            bridgeResult.ok && !categoryDerivationWarning ? "info" : "warning",

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:558 | pattern: categoryDerivationResult -----
        });
      
        const bridgeResult = await processActivityValueObjectBridge({
          supabase,
          eventId: createdEvent.id,
          processorName: "activity_debug_free_text_value_object_test",
          allowNonCompletedEvent: false,
        });
      
        const categoryDerivationWarning =
  558:     categoryDerivationResult.enabled && categoryDerivationResult.ok === false;
      
        const logResult = await safeCreateActivityProcessingLog({
          userId: appUser.id,
          rawSignalId: null,
          activityEventId: createdEvent.id,
          processingRunId,
          processorName: "activity_debug_free_text_value_object_test",
          processingStage: "finalize",
          processingStatus: bridgeResult.ok
            ? categoryDerivationWarning
              ? "warning"
              : bridgeResult.skipped
                ? "skipped"
                : "completed"
            : "warning",
          severity:
            bridgeResult.ok && !categoryDerivationWarning ? "info" : "warning",
          message: "Debug free-text Value Object bridge processed.",
          input: {
            eventId: createdEvent.id,
            inputText,
            durationMinutes: timing.durationMinutes,
            categoryDerivation: {
              enabled: categoryDerivationOptions.enabled,
              dryRun: categoryDerivationOptions.dryRun,
              createPolicy: categoryDerivationOptions.createPolicy,
            },
          },
          output: {
            ok: bridgeResult.ok,
            skipped: bridgeResult.skipped,
            skipReason: bridgeResult.skipReason,
            mappingSkipped: bridgeResult.mappingResult?.skipped ?? null,
            mappingsCount: bridgeResult.mappingResult?.mappings.length ?? 0,
            bridgeCreatedCount: bridgeResult.bridgeResult?.created.length ?? 0,

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:596 | pattern: categoryDerivationResult -----
          },
          output: {
            ok: bridgeResult.ok,
            skipped: bridgeResult.skipped,
            skipReason: bridgeResult.skipReason,
            mappingSkipped: bridgeResult.mappingResult?.skipped ?? null,
            mappingsCount: bridgeResult.mappingResult?.mappings.length ?? 0,
            bridgeCreatedCount: bridgeResult.bridgeResult?.created.length ?? 0,
            errors: bridgeResult.errors,
            categoryDerivation: {
  596:         enabled: categoryDerivationResult.enabled,
              ok: categoryDerivationResult.ok,
              skipped: categoryDerivationResult.skipped,
              error: categoryDerivationResult.error ?? null,
              extractionCandidateCount:
                categoryDerivationResult.extraction?.candidateCount ?? null,
              resolutionCreatedCount:
                categoryDerivationResult.resolution?.createdCount ?? null,
              resolutionReusedCount:
                categoryDerivationResult.resolution?.reusedCount ?? null,
              resolutionUnresolvedCount:
                categoryDerivationResult.resolution?.unresolvedCount ?? null,
              derivationRunId:
                categoryDerivationResult.persistence?.derivationRunId ?? null,
              derivationRowsCreated:
                categoryDerivationResult.persistence?.derivationRowsCreated ?? null,
            },
          },
          metadata: {
            endpoint: "/api/activity/debug/free-text-value-object-test",
            p4Step: "P4.10.0-C8-O1",
          },
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: new Date().getTime() - processingStartedAt.getTime(),
        });
      
        const responseOk =
          bridgeResult.ok &&
          (!categoryDerivationResult.enabled || categoryDerivationResult.ok !== false);
      
        return NextResponse.json({
          ok: responseOk,
          status: bridgeResult.ok
            ? bridgeResult.skipped
              ? "created_but_bridge_skipped"

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:597 | pattern: categoryDerivationResult -----
          output: {
            ok: bridgeResult.ok,
            skipped: bridgeResult.skipped,
            skipReason: bridgeResult.skipReason,
            mappingSkipped: bridgeResult.mappingResult?.skipped ?? null,
            mappingsCount: bridgeResult.mappingResult?.mappings.length ?? 0,
            bridgeCreatedCount: bridgeResult.bridgeResult?.created.length ?? 0,
            errors: bridgeResult.errors,
            categoryDerivation: {
              enabled: categoryDerivationResult.enabled,
  597:         ok: categoryDerivationResult.ok,
              skipped: categoryDerivationResult.skipped,
              error: categoryDerivationResult.error ?? null,
              extractionCandidateCount:
                categoryDerivationResult.extraction?.candidateCount ?? null,
              resolutionCreatedCount:
                categoryDerivationResult.resolution?.createdCount ?? null,
              resolutionReusedCount:
                categoryDerivationResult.resolution?.reusedCount ?? null,
              resolutionUnresolvedCount:
                categoryDerivationResult.resolution?.unresolvedCount ?? null,
              derivationRunId:
                categoryDerivationResult.persistence?.derivationRunId ?? null,
              derivationRowsCreated:
                categoryDerivationResult.persistence?.derivationRowsCreated ?? null,
            },
          },
          metadata: {
            endpoint: "/api/activity/debug/free-text-value-object-test",
            p4Step: "P4.10.0-C8-O1",
          },
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: new Date().getTime() - processingStartedAt.getTime(),
        });
      
        const responseOk =
          bridgeResult.ok &&
          (!categoryDerivationResult.enabled || categoryDerivationResult.ok !== false);
      
        return NextResponse.json({
          ok: responseOk,
          status: bridgeResult.ok
            ? bridgeResult.skipped
              ? "created_but_bridge_skipped"
              : "created_and_bridge_processed"

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:598 | pattern: categoryDerivationResult -----
            ok: bridgeResult.ok,
            skipped: bridgeResult.skipped,
            skipReason: bridgeResult.skipReason,
            mappingSkipped: bridgeResult.mappingResult?.skipped ?? null,
            mappingsCount: bridgeResult.mappingResult?.mappings.length ?? 0,
            bridgeCreatedCount: bridgeResult.bridgeResult?.created.length ?? 0,
            errors: bridgeResult.errors,
            categoryDerivation: {
              enabled: categoryDerivationResult.enabled,
              ok: categoryDerivationResult.ok,
  598:         skipped: categoryDerivationResult.skipped,
              error: categoryDerivationResult.error ?? null,
              extractionCandidateCount:
                categoryDerivationResult.extraction?.candidateCount ?? null,
              resolutionCreatedCount:
                categoryDerivationResult.resolution?.createdCount ?? null,
              resolutionReusedCount:
                categoryDerivationResult.resolution?.reusedCount ?? null,
              resolutionUnresolvedCount:
                categoryDerivationResult.resolution?.unresolvedCount ?? null,
              derivationRunId:
                categoryDerivationResult.persistence?.derivationRunId ?? null,
              derivationRowsCreated:
                categoryDerivationResult.persistence?.derivationRowsCreated ?? null,
            },
          },
          metadata: {
            endpoint: "/api/activity/debug/free-text-value-object-test",
            p4Step: "P4.10.0-C8-O1",
          },
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: new Date().getTime() - processingStartedAt.getTime(),
        });
      
        const responseOk =
          bridgeResult.ok &&
          (!categoryDerivationResult.enabled || categoryDerivationResult.ok !== false);
      
        return NextResponse.json({
          ok: responseOk,
          status: bridgeResult.ok
            ? bridgeResult.skipped
              ? "created_but_bridge_skipped"
              : "created_and_bridge_processed"
            : "created_but_bridge_failed",

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:599 | pattern: categoryDerivationResult -----
            skipped: bridgeResult.skipped,
            skipReason: bridgeResult.skipReason,
            mappingSkipped: bridgeResult.mappingResult?.skipped ?? null,
            mappingsCount: bridgeResult.mappingResult?.mappings.length ?? 0,
            bridgeCreatedCount: bridgeResult.bridgeResult?.created.length ?? 0,
            errors: bridgeResult.errors,
            categoryDerivation: {
              enabled: categoryDerivationResult.enabled,
              ok: categoryDerivationResult.ok,
              skipped: categoryDerivationResult.skipped,
  599:         error: categoryDerivationResult.error ?? null,
              extractionCandidateCount:
                categoryDerivationResult.extraction?.candidateCount ?? null,
              resolutionCreatedCount:
                categoryDerivationResult.resolution?.createdCount ?? null,
              resolutionReusedCount:
                categoryDerivationResult.resolution?.reusedCount ?? null,
              resolutionUnresolvedCount:
                categoryDerivationResult.resolution?.unresolvedCount ?? null,
              derivationRunId:
                categoryDerivationResult.persistence?.derivationRunId ?? null,
              derivationRowsCreated:
                categoryDerivationResult.persistence?.derivationRowsCreated ?? null,
            },
          },
          metadata: {
            endpoint: "/api/activity/debug/free-text-value-object-test",
            p4Step: "P4.10.0-C8-O1",
          },
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: new Date().getTime() - processingStartedAt.getTime(),
        });
      
        const responseOk =
          bridgeResult.ok &&
          (!categoryDerivationResult.enabled || categoryDerivationResult.ok !== false);
      
        return NextResponse.json({
          ok: responseOk,
          status: bridgeResult.ok
            ? bridgeResult.skipped
              ? "created_but_bridge_skipped"
              : "created_and_bridge_processed"
            : "created_but_bridge_failed",
          event: createdEventData,
```

## 9. resolvedCandidates usage

```text
MATCH COUNT: 1

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:315 | pattern: resolvedCandidates -----
              defaultCategoryType: "derived",
            }
          );
      
          const persistenceResult = await persistCategoryDerivations(
            supabase as unknown as CategoryDerivationPersistenceSupabaseClient,
            {
              activityEventId: params.activityEventId,
              input: derivationInput,
              derivationResult: extractionResult,
  315:         resolvedCandidates: resolutionResult.candidates,
              actorId: params.personActorId,
              organizationId: null,
              modelName: null,
              promptVersion: null,
              needsUserConfirmation:
                resolutionResult.unresolvedCount > 0 ||
                extractionResult.candidates.some((candidate) =>
                  Boolean(candidate.needsUserReview)
                ),
            }
          );
      
          const ok =
            extractionResult.ok && resolutionResult.ok && persistenceResult.ok;
      
          return {
            enabled: true,
            ok,
            skipped: false,
            options,
            extraction: {
              ok: extractionResult.ok,
              skipped: extractionResult.skipped ?? false,
              skipReason: extractionResult.skipReason ?? null,
              processorVersion: extractionResult.processorVersion,
              ruleVersion: extractionResult.ruleVersion ?? null,
              confidence: extractionResult.confidence ?? null,
              candidateCount: extractionResult.candidates.length,
              warnings: extractionResult.warnings,
              errors: extractionResult.errors,
              candidates: extractionResult.candidates,
            },
            resolution: {
              ok: resolutionResult.ok,
              createdCount: resolutionResult.createdCount,
```

## 10. persistCategoryDerivations usage

```text
MATCH COUNT: 2

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:19 | pattern: persistCategoryDerivations -----
      import { processActivityValueObjectBridge } from "../../../../../../lib/activity/activityValueObjectLifecycle";
      import { safeCreateActivityProcessingLog } from "../../../../../../lib/activity/activityProcessingLogs";
      import { supabase } from "../../../../../../lib/supabase";
      import { deriveCategoryCandidates } from "../../../../../../lib/activity/categoryDerivation/ruleExtractor";
      import {
        resolveCategoryCandidates,
        type CategoryResolverCreatePolicy,
        type CategoryResolverSupabaseClient,
      } from "../../../../../../lib/activity/categoryDerivation/resolver";
      import {
   19:   persistCategoryDerivations,
        type CategoryDerivationPersistenceSupabaseClient,
      } from "../../../../../../lib/activity/categoryDerivation/persistDerivations";
      import type { CategoryDerivationInput } from "../../../../../../lib/activity/categoryDerivation/types";
      
      export const dynamic = "force-dynamic";
      
      type FreeTextValueObjectTestBody = {
        inputText?: unknown;
        naturalInput?: unknown;
        title?: unknown;
        description?: unknown;
        durationMinutes?: unknown;
        startedAt?: unknown;
        endedAt?: unknown;
        enableCategoryDerivation?: unknown;
        categoryDerivationEnabled?: unknown;
        categoryDerivation?: unknown;
        categoryDerivationDryRun?: unknown;
        categoryDerivationCreatePolicy?: unknown;
      };
      
      type CategoryDerivationRouteOptions = {
        enabled: boolean;
        dryRun: boolean;
        createPolicy: CategoryResolverCreatePolicy;
      };
      
      type CategoryDerivationRouteResult = {
        enabled: boolean;
        ok: boolean | null;
        skipped: boolean;
        reason?: string | null;
        error?: string | null;
        options: CategoryDerivationRouteOptions;
        extraction?: {

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:309 | pattern: persistCategoryDerivations -----
            supabase as unknown as CategoryResolverSupabaseClient,
            extractionResult.candidates,
            {
              createPolicy: options.createPolicy,
              dryRun: options.dryRun,
              sourceType: "rule",
              defaultCategoryType: "derived",
            }
          );
      
  309:     const persistenceResult = await persistCategoryDerivations(
            supabase as unknown as CategoryDerivationPersistenceSupabaseClient,
            {
              activityEventId: params.activityEventId,
              input: derivationInput,
              derivationResult: extractionResult,
              resolvedCandidates: resolutionResult.candidates,
              actorId: params.personActorId,
              organizationId: null,
              modelName: null,
              promptVersion: null,
              needsUserConfirmation:
                resolutionResult.unresolvedCount > 0 ||
                extractionResult.candidates.some((candidate) =>
                  Boolean(candidate.needsUserReview)
                ),
            }
          );
      
          const ok =
            extractionResult.ok && resolutionResult.ok && persistenceResult.ok;
      
          return {
            enabled: true,
            ok,
            skipped: false,
            options,
            extraction: {
              ok: extractionResult.ok,
              skipped: extractionResult.skipped ?? false,
              skipReason: extractionResult.skipReason ?? null,
              processorVersion: extractionResult.processorVersion,
              ruleVersion: extractionResult.ruleVersion ?? null,
              confidence: extractionResult.confidence ?? null,
              candidateCount: extractionResult.candidates.length,
              warnings: extractionResult.warnings,
```

## 11. bridge call

```text
MATCH COUNT: 1

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:550 | pattern: processActivityValueObjectBridge({ -----
        const createdEvent = createdEventData as { id: string };
      
        const categoryDerivationResult = await runCategoryDerivationForDebugRoute({
          activityEventId: createdEvent.id,
          inputText,
          title,
          description,
          durationMinutes: timing.durationMinutes,
          personActorId: personActor.id,
          options: categoryDerivationOptions,
        });
      
  550:   const bridgeResult = await processActivityValueObjectBridge({
          supabase,
          eventId: createdEvent.id,
          processorName: "activity_debug_free_text_value_object_test",
          allowNonCompletedEvent: false,
        });
      
        const categoryDerivationWarning =
          categoryDerivationResult.enabled && categoryDerivationResult.ok === false;
      
        const logResult = await safeCreateActivityProcessingLog({
          userId: appUser.id,
          rawSignalId: null,
          activityEventId: createdEvent.id,
          processingRunId,
          processorName: "activity_debug_free_text_value_object_test",
          processingStage: "finalize",
          processingStatus: bridgeResult.ok
            ? categoryDerivationWarning
              ? "warning"
              : bridgeResult.skipped
                ? "skipped"
                : "completed"
            : "warning",
          severity:
            bridgeResult.ok && !categoryDerivationWarning ? "info" : "warning",
          message: "Debug free-text Value Object bridge processed.",
          input: {
            eventId: createdEvent.id,
            inputText,
            durationMinutes: timing.durationMinutes,
            categoryDerivation: {
              enabled: categoryDerivationOptions.enabled,
              dryRun: categoryDerivationOptions.dryRun,
              createPolicy: categoryDerivationOptions.createPolicy,
            },
          },
          output: {
            ok: bridgeResult.ok,
            skipped: bridgeResult.skipped,
            skipReason: bridgeResult.skipReason,
            mappingSkipped: bridgeResult.mappingResult?.skipped ?? null,
            mappingsCount: bridgeResult.mappingResult?.mappings.length ?? 0,
            bridgeCreatedCount: bridgeResult.bridgeResult?.created.length ?? 0,
            errors: bridgeResult.errors,
            categoryDerivation: {
```

## 12. bridge response object

```text
MATCH COUNT: 4

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:9 | pattern: valueObjectBridge -----
      import { NextResponse } from "next/server";
      import { randomUUID } from "crypto";
      
      import {
        ACTIVITY_RECORDING_DISABLED_MESSAGE,
        ACTIVITY_RECORDING_ENABLED,
      } from "../../../../../../lib/activity/activityRecordingConfig";
      import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
    9: import { processActivityValueObjectBridge } from "../../../../../../lib/activity/activityValueObjectLifecycle";
      import { safeCreateActivityProcessingLog } from "../../../../../../lib/activity/activityProcessingLogs";
      import { supabase } from "../../../../../../lib/supabase";
      import { deriveCategoryCandidates } from "../../../../../../lib/activity/categoryDerivation/ruleExtractor";
      import {
        resolveCategoryCandidates,
        type CategoryResolverCreatePolicy,
        type CategoryResolverSupabaseClient,
      } from "../../../../../../lib/activity/categoryDerivation/resolver";
      import {
        persistCategoryDerivations,
        type CategoryDerivationPersistenceSupabaseClient,
      } from "../../../../../../lib/activity/categoryDerivation/persistDerivations";
      import type { CategoryDerivationInput } from "../../../../../../lib/activity/categoryDerivation/types";
      
      export const dynamic = "force-dynamic";
      
      type FreeTextValueObjectTestBody = {
        inputText?: unknown;
        naturalInput?: unknown;
        title?: unknown;
        description?: unknown;
        durationMinutes?: unknown;
        startedAt?: unknown;
        endedAt?: unknown;
        enableCategoryDerivation?: unknown;
        categoryDerivationEnabled?: unknown;
        categoryDerivation?: unknown;
        categoryDerivationDryRun?: unknown;
        categoryDerivationCreatePolicy?: unknown;
      };
      
      type CategoryDerivationRouteOptions = {
        enabled: boolean;
        dryRun: boolean;
        createPolicy: CategoryResolverCreatePolicy;

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:550 | pattern: valueObjectBridge -----
        const categoryDerivationResult = await runCategoryDerivationForDebugRoute({
          activityEventId: createdEvent.id,
          inputText,
          title,
          description,
          durationMinutes: timing.durationMinutes,
          personActorId: personActor.id,
          options: categoryDerivationOptions,
        });
      
  550:   const bridgeResult = await processActivityValueObjectBridge({
          supabase,
          eventId: createdEvent.id,
          processorName: "activity_debug_free_text_value_object_test",
          allowNonCompletedEvent: false,
        });
      
        const categoryDerivationWarning =
          categoryDerivationResult.enabled && categoryDerivationResult.ok === false;
      
        const logResult = await safeCreateActivityProcessingLog({
          userId: appUser.id,
          rawSignalId: null,
          activityEventId: createdEvent.id,
          processingRunId,
          processorName: "activity_debug_free_text_value_object_test",
          processingStage: "finalize",
          processingStatus: bridgeResult.ok
            ? categoryDerivationWarning
              ? "warning"
              : bridgeResult.skipped
                ? "skipped"
                : "completed"
            : "warning",
          severity:
            bridgeResult.ok && !categoryDerivationWarning ? "info" : "warning",
          message: "Debug free-text Value Object bridge processed.",
          input: {
            eventId: createdEvent.id,
            inputText,
            durationMinutes: timing.durationMinutes,
            categoryDerivation: {
              enabled: categoryDerivationOptions.enabled,
              dryRun: categoryDerivationOptions.dryRun,
              createPolicy: categoryDerivationOptions.createPolicy,
            },

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:636 | pattern: valueObjectBridge -----
      
        return NextResponse.json({
          ok: responseOk,
          status: bridgeResult.ok
            ? bridgeResult.skipped
              ? "created_but_bridge_skipped"
              : "created_and_bridge_processed"
            : "created_but_bridge_failed",
          event: createdEventData,
          categoryDerivation: categoryDerivationResult,
  636:     valueObjectBridge: {
            ok: bridgeResult.ok,
            skipped: bridgeResult.skipped,
            skipReason: bridgeResult.skipReason,
            errors: bridgeResult.errors,
            mapping: bridgeResult.mappingResult
              ? {
                  ok: bridgeResult.mappingResult.ok,
                  skipped: bridgeResult.mappingResult.skipped,
                  skipReason: bridgeResult.mappingResult.skipReason,
                  classificationSummaryCount:
                    bridgeResult.mappingResult.classificationSummary.length,
                  mappingsCount: bridgeResult.mappingResult.mappings.length,
                  mappings: bridgeResult.mappingResult.mappings,
                }
              : null,
            bridge: bridgeResult.bridgeResult
              ? {
                  ok: bridgeResult.bridgeResult.ok,
                  skipped: bridgeResult.bridgeResult.skipped,
                  skipReason: bridgeResult.bridgeResult.skipReason,
                  mappingsRequested: bridgeResult.bridgeResult.mappingsRequested,
                  createdCount: bridgeResult.bridgeResult.created.length,
                  created: bridgeResult.bridgeResult.created,
                  errors: bridgeResult.bridgeResult.errors,
                }
              : null,
          },
          processingLogs: {
            processingRunId,
            valueObjectBridge: {
              ok: logResult.ok,
              error: logResult.error,
              logId: logResult.log?.id ?? null,
            },
          },

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:666 | pattern: valueObjectBridge -----
                  skipReason: bridgeResult.bridgeResult.skipReason,
                  mappingsRequested: bridgeResult.bridgeResult.mappingsRequested,
                  createdCount: bridgeResult.bridgeResult.created.length,
                  created: bridgeResult.bridgeResult.created,
                  errors: bridgeResult.bridgeResult.errors,
                }
              : null,
          },
          processingLogs: {
            processingRunId,
  666:       valueObjectBridge: {
              ok: logResult.ok,
              error: logResult.error,
              logId: logResult.log?.id ?? null,
            },
          },
        });
      }
```

## 13. ResolvedCategoryCandidate type

```text
MATCH COUNT: 2

----- .\lib\activity\categoryDerivation\types.ts:58 | pattern: ResolvedCategoryCandidate -----
        isConfirmed?: boolean;
        needsUserReview?: boolean;
        metadata?: JsonRecord;
      }
      
   58: export interface ResolvedCategoryCandidate extends CategoryCandidate {
        categoryId: string | null;
        resolutionStatus: CategoryDerivationResolutionStatus;
      }
      
      export interface CategoryDerivationInput {
        activityEventId?: string;
        inputText: string;
        title?: string | null;
        description?: string | null;
        durationMinutes?: number | null;
        inputLanguage?: string | null;
        actorId?: string | null;
        organizationId?: string | null;
        metadata?: JsonRecord;
      }
      
      export interface CategoryDerivationResult {
        ok: boolean;
        skipped?: boolean;
        skipReason?: string | null;
        processorVersion: string;
        ruleVersion?: string | null;
        confidence?: number | null;
        candidates: CategoryCandidate[];
        warnings: string[];
        errors: string[];
        metadata?: JsonRecord;
      }
      
      export interface CategoryResolutionResult {
        ok: boolean;
        candidates: ResolvedCategoryCandidate[];
        createdCount: number;
        reusedCount: number;
        unresolvedCount: number;
        warnings: string[];
        errors: string[];
        metadata?: JsonRecord;
      }
      
      export interface CategoryDerivationRunInsert {
        activity_event_id: string;
        actor_id?: string | null;
        organization_id?: string | null;
        input_text?: string | null;

----- .\lib\activity\categoryDerivation\types.ts:90 | pattern: ResolvedCategoryCandidate -----
        metadata?: JsonRecord;
      }
      
      export interface CategoryResolutionResult {
        ok: boolean;
   90:   candidates: ResolvedCategoryCandidate[];
        createdCount: number;
        reusedCount: number;
        unresolvedCount: number;
        warnings: string[];
        errors: string[];
        metadata?: JsonRecord;
      }
      
      export interface CategoryDerivationRunInsert {
        activity_event_id: string;
        actor_id?: string | null;
        organization_id?: string | null;
        input_text?: string | null;
        input_language?: string | null;
        processor_version: string;
        rule_version?: string | null;
        model_name?: string | null;
        prompt_version?: string | null;
        status: CategoryDerivationRunStatus;
        confidence?: number | null;
        needs_user_confirmation?: boolean;
        input_json?: JsonRecord;
        output_json?: JsonRecord;
        error_json?: JsonRecord | null;
      }
      
      export interface ActivityCategoryDerivationInsert {
        activity_event_id: string;
        derivation_run_id?: string | null;
        category_id?: string | null;
        candidate_slug: string;
        candidate_title?: string | null;
        semantic_layer?: string | null;
        category_type?: string | null;
        source: CategoryDerivationSource;
        confidence?: number | null;
        is_required?: boolean;
        is_confirmed?: boolean;
        needs_user_review?: boolean;
        is_rejected?: boolean;
        metadata_json?: JsonRecord;
      }
```

## 14. AdditionalValueObjectCategoryLink type

```text
MATCH COUNT: 1

----- .\lib\activity\valueObjectBridge.ts:117 | pattern: export type AdditionalValueObjectCategoryLink -----
        aggregateKey?: string;
      
        metadata?: Record<string, unknown>;
      };
      
  117: export type AdditionalValueObjectCategoryLink = {
        /**
         * C8-P additive optional category-link contract.
         *
         * This type is intentionally optional and is not used unless a caller passes
         * additionalCategoryLinks into processValueObjectBridge().
         */
        categoryId: string;
        categoryTable?: "contextual_categories";
        categoryRole?: ValueObjectCategoryRole;
        source?: V42ProjectionSource;
        confidence?: number | null;
      
        derivationRunId?: string | null;
        activityCategoryDerivationId?: string | null;
        activityEventId?: string | null;
      
        candidateSlug: string;
        candidateTitle?: string | null;
        semanticLayer?: string | null;
        categoryType?: string | null;
        resolutionStatus?: string | null;
      
        metadata?: Record<string, unknown>;
      };
      
      export type ProcessValueObjectBridgeInput = {
        supabase: SupabaseClient;
        eventId: string;
        mappings: ValueObjectBridgeMapping[];
        source?: BridgeSource;
        allowNonCompletedEvent?: boolean;
        processorName?: string;
      
        /**
         * C8-P additive optional input.
         *
         * When absent, existing bridge behavior must remain unchanged.
         * Runtime handling is intentionally implemented in a later checkpoint.
         */
        additionalCategoryLinks?: AdditionalValueObjectCategoryLink[];
      };
      
      export type ValueObjectBridgeCreatedItem = {
        valueObjectId: string;
        valueObjectInstanceId: string | null;
```

## 15. B5-B implementation target

- Add route-side helper near category derivation helper functions.
- Convert only resolved candidates with valid categoryId.
- Do not pass additionalCategoryLinks when Category Derivation is disabled.
- Do not pass additionalCategoryLinks when categoryDerivationDryRun is true.
- Pass additionalCategoryLinks into processActivityValueObjectBridge.
- Keep no-flag behavior unchanged.
- Then run transpile smoke check and browser dryRun/non-dryRun tests.
