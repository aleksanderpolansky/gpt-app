# P4.10.0-C8-P3-B5-A — Route-side Integration Map

Date: 2026-05-20
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / debug route integration map before passing resolved candidates

This checkpoint does not change runtime code.

Goal: identify route-side insertion points for converting resolved Category Derivation candidates into additionalCategoryLinks.

## 1. Git status

```text
 M docs/value-objects/category-derivation-route-side-integration-map-c8-p3-b5-a.md
```

## 2. Recent commits

```text
3f1fc4c Map category derivation route-side bridge integration
119f5d7 Document category derivation bridge no-flag regression pass
cd78bea Fix category derivation bridge additional link scope
022c158 Add no-flag bridge regression browser test
43bd1cc Call category derivation bridge additional category link helper
7431272 Fix category derivation bridge additional category link helper insertion
2cf42b2 Add category derivation bridge additional category link helper
88e20ca Add category derivation bridge additional category link contract
faca640 Map category derivation bridge edit points
8602757 Restore full category derivation bridge preflight report
b6b6c87 Preflight category derivation bridge implementation
3f347a1 Preflight category derivation bridge implementation
```

## 3. File status

- FOUND: .\src\app\api\activity\debug\free-text-value-object-test\route.ts (673 lines)
- FOUND: .\lib\activity\valueObjectBridge.ts (1628 lines)
- FOUND: .\lib\activity\categoryDerivation\types.ts (132 lines)
- FOUND: .\lib\activity\categoryDerivation\resolver.ts (349 lines)
- FOUND: .\lib\activity\categoryDerivation\persistDerivations.ts (328 lines)

## 4. Route flag: enableCategoryDerivation

```text

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:34 | pattern: enableCategoryDerivation -----
        naturalInput?: unknown;
        title?: unknown;
        description?: unknown;
        durationMinutes?: unknown;
        startedAt?: unknown;
        endedAt?: unknown;
   34:   enableCategoryDerivation?: unknown;
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
      

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:141 | pattern: enableCategoryDerivation -----
      function resolveCategoryDerivationOptions(
        body: FreeTextValueObjectTestBody
      ):
        | { ok: true; options: CategoryDerivationRouteOptions }
        | { ok: false; error: string } {
        const enabled =
  141:     asBoolean(body.enableCategoryDerivation) ??
          asBoolean(body.categoryDerivationEnabled) ??
          asBoolean(body.categoryDerivation) ??
          false;
      
        const dryRun = asBoolean(body.categoryDerivationDryRun) ?? false;
      
        const rawCreatePolicy =
          asString(body.categoryDerivationCreatePolicy) ?? "suggested_only";
      
        const allowedPolicies: CategoryResolverCreatePolicy[] = [
          "never",
          "suggested_only",

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:391 | pattern: enableCategoryDerivation -----
          message: ACTIVITY_RECORDING_ENABLED
            ? "Debug-only endpoint for testing completed free-text Activity Event -> Value Object fallback mapping."
            : ACTIVITY_RECORDING_DISABLED_MESSAGE,
          categoryDerivation: {
            available: true,
            defaultEnabled: false,
  391:       enableFlag: "enableCategoryDerivation",
            dryRunFlag: "categoryDerivationDryRun",
            createPolicyField: "categoryDerivationCreatePolicy",
            createPolicyValues: [
              "never",
              "suggested_only",
              "active_for_confirmed_required",
            ],
          },
          example: {
            inputText: "walked to work for 15 minutes",
            durationMinutes: 15,
            title: "Walked to work",

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:404 | pattern: enableCategoryDerivation -----
            ],
          },
          example: {
            inputText: "walked to work for 15 minutes",
            durationMinutes: 15,
            title: "Walked to work",
  404:       enableCategoryDerivation: true,
            categoryDerivationCreatePolicy: "suggested_only",
            categoryDerivationDryRun: false,
          },
        });
      }
      
      export async function POST(request: Request) {
        if (!ACTIVITY_RECORDING_ENABLED) {
          return NextResponse.json(
            {
              ok: false,
              error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
```

## 5. Route flag: categoryDerivationDryRun

```text

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:37 | pattern: categoryDerivationDryRun -----
        durationMinutes?: unknown;
        startedAt?: unknown;
        endedAt?: unknown;
        enableCategoryDerivation?: unknown;
        categoryDerivationEnabled?: unknown;
        categoryDerivation?: unknown;
   37:   categoryDerivationDryRun?: unknown;
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:146 | pattern: categoryDerivationDryRun -----
        const enabled =
          asBoolean(body.enableCategoryDerivation) ??
          asBoolean(body.categoryDerivationEnabled) ??
          asBoolean(body.categoryDerivation) ??
          false;
      
  146:   const dryRun = asBoolean(body.categoryDerivationDryRun) ?? false;
      
        const rawCreatePolicy =
          asString(body.categoryDerivationCreatePolicy) ?? "suggested_only";
      
        const allowedPolicies: CategoryResolverCreatePolicy[] = [
          "never",
          "suggested_only",
          "active_for_confirmed_required",
        ];
      
        if (!allowedPolicies.includes(rawCreatePolicy as CategoryResolverCreatePolicy)) {
          return {

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:392 | pattern: categoryDerivationDryRun -----
            ? "Debug-only endpoint for testing completed free-text Activity Event -> Value Object fallback mapping."
            : ACTIVITY_RECORDING_DISABLED_MESSAGE,
          categoryDerivation: {
            available: true,
            defaultEnabled: false,
            enableFlag: "enableCategoryDerivation",
  392:       dryRunFlag: "categoryDerivationDryRun",
            createPolicyField: "categoryDerivationCreatePolicy",
            createPolicyValues: [
              "never",
              "suggested_only",
              "active_for_confirmed_required",
            ],
          },
          example: {
            inputText: "walked to work for 15 minutes",
            durationMinutes: 15,
            title: "Walked to work",
            enableCategoryDerivation: true,

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:406 | pattern: categoryDerivationDryRun -----
          example: {
            inputText: "walked to work for 15 minutes",
            durationMinutes: 15,
            title: "Walked to work",
            enableCategoryDerivation: true,
            categoryDerivationCreatePolicy: "suggested_only",
  406:       categoryDerivationDryRun: false,
          },
        });
      }
      
      export async function POST(request: Request) {
        if (!ACTIVITY_RECORDING_ENABLED) {
          return NextResponse.json(
            {
              ok: false,
              error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
            },
            { status: 503 }

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:519 | pattern: categoryDerivationDryRun -----
            processing_status: "processed",
            metadata_json: {
              parser: "debug_free_text_value_object_test_v1",
              p4Step: "P4.10.0-C8-O1",
              freeTextValueObjectTest: true,
              categoryDerivationEnabled: categoryDerivationOptions.enabled,
  519:         categoryDerivationDryRun: categoryDerivationOptions.dryRun,
              categoryDerivationCreatePolicy: categoryDerivationOptions.createPolicy,
              aiUsed: false,
              createdAt: nowIso,
            },
          })
          .select()
          .single();
      
        if (createError || !createdEventData) {
          return NextResponse.json(
            {
              ok: false,
```

## 6. Route create policy

```text

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:38 | pattern: categoryDerivationCreatePolicy -----
        startedAt?: unknown;
        endedAt?: unknown;
        enableCategoryDerivation?: unknown;
        categoryDerivationEnabled?: unknown;
        categoryDerivation?: unknown;
        categoryDerivationDryRun?: unknown;
   38:   categoryDerivationCreatePolicy?: unknown;
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:149 | pattern: categoryDerivationCreatePolicy -----
          asBoolean(body.categoryDerivation) ??
          false;
      
        const dryRun = asBoolean(body.categoryDerivationDryRun) ?? false;
      
        const rawCreatePolicy =
  149:     asString(body.categoryDerivationCreatePolicy) ?? "suggested_only";
      
        const allowedPolicies: CategoryResolverCreatePolicy[] = [
          "never",
          "suggested_only",
          "active_for_confirmed_required",
        ];
      
        if (!allowedPolicies.includes(rawCreatePolicy as CategoryResolverCreatePolicy)) {
          return {
            ok: false,
            error:
              "categoryDerivationCreatePolicy must be one of: never, suggested_only, active_for_confirmed_required.",

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:161 | pattern: categoryDerivationCreatePolicy -----
        ];
      
        if (!allowedPolicies.includes(rawCreatePolicy as CategoryResolverCreatePolicy)) {
          return {
            ok: false,
            error:
  161:         "categoryDerivationCreatePolicy must be one of: never, suggested_only, active_for_confirmed_required.",
          };
        }
      
        return {
          ok: true,
          options: {
            enabled,
            dryRun,
            createPolicy: rawCreatePolicy as CategoryResolverCreatePolicy,
          },
        };
      }

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:393 | pattern: categoryDerivationCreatePolicy -----
            : ACTIVITY_RECORDING_DISABLED_MESSAGE,
          categoryDerivation: {
            available: true,
            defaultEnabled: false,
            enableFlag: "enableCategoryDerivation",
            dryRunFlag: "categoryDerivationDryRun",
  393:       createPolicyField: "categoryDerivationCreatePolicy",
            createPolicyValues: [
              "never",
              "suggested_only",
              "active_for_confirmed_required",
            ],
          },
          example: {
            inputText: "walked to work for 15 minutes",
            durationMinutes: 15,
            title: "Walked to work",
            enableCategoryDerivation: true,
            categoryDerivationCreatePolicy: "suggested_only",

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:405 | pattern: categoryDerivationCreatePolicy -----
          },
          example: {
            inputText: "walked to work for 15 minutes",
            durationMinutes: 15,
            title: "Walked to work",
            enableCategoryDerivation: true,
  405:       categoryDerivationCreatePolicy: "suggested_only",
            categoryDerivationDryRun: false,
          },
        });
      }
      
      export async function POST(request: Request) {
        if (!ACTIVITY_RECORDING_ENABLED) {
          return NextResponse.json(
            {
              ok: false,
              error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
            },

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:520 | pattern: categoryDerivationCreatePolicy -----
            metadata_json: {
              parser: "debug_free_text_value_object_test_v1",
              p4Step: "P4.10.0-C8-O1",
              freeTextValueObjectTest: true,
              categoryDerivationEnabled: categoryDerivationOptions.enabled,
              categoryDerivationDryRun: categoryDerivationOptions.dryRun,
  520:         categoryDerivationCreatePolicy: categoryDerivationOptions.createPolicy,
              aiUsed: false,
              createdAt: nowIso,
            },
          })
          .select()
          .single();
      
        if (createError || !createdEventData) {
          return NextResponse.json(
            {
              ok: false,
              error: createError?.message ?? "Failed to create activity event.",
```

## 7. Route derivation result

```text

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:540 | pattern: categoryDerivationResult -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:558 | pattern: categoryDerivationResult -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:596 | pattern: categoryDerivationResult -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:597 | pattern: categoryDerivationResult -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:598 | pattern: categoryDerivationResult -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:599 | pattern: categoryDerivationResult -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:601 | pattern: categoryDerivationResult -----
            categoryDerivation: {
              enabled: categoryDerivationResult.enabled,
              ok: categoryDerivationResult.ok,
              skipped: categoryDerivationResult.skipped,
              error: categoryDerivationResult.error ?? null,
              extractionCandidateCount:
  601:           categoryDerivationResult.extraction?.candidateCount ?? null,
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:603 | pattern: categoryDerivationResult -----
              ok: categoryDerivationResult.ok,
              skipped: categoryDerivationResult.skipped,
              error: categoryDerivationResult.error ?? null,
              extractionCandidateCount:
                categoryDerivationResult.extraction?.candidateCount ?? null,
              resolutionCreatedCount:
  603:           categoryDerivationResult.resolution?.createdCount ?? null,
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
```

## 8. Route resolved candidates

```text

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:315 | pattern: resolvedCandidates -----
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
      
```

## 9. Route persist derivations

```text

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:19 | pattern: persistCategoryDerivations -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:309 | pattern: persistCategoryDerivations -----
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
```

## 10. Route bridge call

```text

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:9 | pattern: processActivityValueObjectBridge -----
      
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:550 | pattern: processActivityValueObjectBridge -----
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
```

## 11. Route bridge result

```text

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:550 | pattern: bridgeResult -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:567 | pattern: bridgeResult -----
          userId: appUser.id,
          rawSignalId: null,
          activityEventId: createdEvent.id,
          processingRunId,
          processorName: "activity_debug_free_text_value_object_test",
          processingStage: "finalize",
  567:     processingStatus: bridgeResult.ok
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:570 | pattern: bridgeResult -----
          processingRunId,
          processorName: "activity_debug_free_text_value_object_test",
          processingStage: "finalize",
          processingStatus: bridgeResult.ok
            ? categoryDerivationWarning
              ? "warning"
  570:         : bridgeResult.skipped
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:575 | pattern: bridgeResult -----
              ? "warning"
              : bridgeResult.skipped
                ? "skipped"
                : "completed"
            : "warning",
          severity:
  575:       bridgeResult.ok && !categoryDerivationWarning ? "info" : "warning",
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:588 | pattern: bridgeResult -----
              enabled: categoryDerivationOptions.enabled,
              dryRun: categoryDerivationOptions.dryRun,
              createPolicy: categoryDerivationOptions.createPolicy,
            },
          },
          output: {
  588:       ok: bridgeResult.ok,
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
              error: categoryDerivationResult.error ?? null,
              extractionCandidateCount:

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:589 | pattern: bridgeResult -----
              dryRun: categoryDerivationOptions.dryRun,
              createPolicy: categoryDerivationOptions.createPolicy,
            },
          },
          output: {
            ok: bridgeResult.ok,
  589:       skipped: bridgeResult.skipped,
            skipReason: bridgeResult.skipReason,
            mappingSkipped: bridgeResult.mappingResult?.skipped ?? null,
            mappingsCount: bridgeResult.mappingResult?.mappings.length ?? 0,
            bridgeCreatedCount: bridgeResult.bridgeResult?.created.length ?? 0,
            errors: bridgeResult.errors,
            categoryDerivation: {
              enabled: categoryDerivationResult.enabled,
              ok: categoryDerivationResult.ok,
              skipped: categoryDerivationResult.skipped,
              error: categoryDerivationResult.error ?? null,
              extractionCandidateCount:
                categoryDerivationResult.extraction?.candidateCount ?? null,

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:590 | pattern: bridgeResult -----
              createPolicy: categoryDerivationOptions.createPolicy,
            },
          },
          output: {
            ok: bridgeResult.ok,
            skipped: bridgeResult.skipped,
  590:       skipReason: bridgeResult.skipReason,
            mappingSkipped: bridgeResult.mappingResult?.skipped ?? null,
            mappingsCount: bridgeResult.mappingResult?.mappings.length ?? 0,
            bridgeCreatedCount: bridgeResult.bridgeResult?.created.length ?? 0,
            errors: bridgeResult.errors,
            categoryDerivation: {
              enabled: categoryDerivationResult.enabled,
              ok: categoryDerivationResult.ok,
              skipped: categoryDerivationResult.skipped,
              error: categoryDerivationResult.error ?? null,
              extractionCandidateCount:
                categoryDerivationResult.extraction?.candidateCount ?? null,
              resolutionCreatedCount:

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:591 | pattern: bridgeResult -----
            },
          },
          output: {
            ok: bridgeResult.ok,
            skipped: bridgeResult.skipped,
            skipReason: bridgeResult.skipReason,
  591:       mappingSkipped: bridgeResult.mappingResult?.skipped ?? null,
            mappingsCount: bridgeResult.mappingResult?.mappings.length ?? 0,
            bridgeCreatedCount: bridgeResult.bridgeResult?.created.length ?? 0,
            errors: bridgeResult.errors,
            categoryDerivation: {
              enabled: categoryDerivationResult.enabled,
              ok: categoryDerivationResult.ok,
              skipped: categoryDerivationResult.skipped,
              error: categoryDerivationResult.error ?? null,
              extractionCandidateCount:
                categoryDerivationResult.extraction?.candidateCount ?? null,
              resolutionCreatedCount:
                categoryDerivationResult.resolution?.createdCount ?? null,
```

## 12. Type: ResolvedCategoryCandidate

```text

----- .\lib\activity\categoryDerivation\types.ts:58 | pattern: ResolvedCategoryCandidate -----
        isRequired?: boolean;
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

----- .\lib\activity\categoryDerivation\types.ts:90 | pattern: ResolvedCategoryCandidate -----
        errors: string[];
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
```

## 13. Type: resolutionStatus

```text

----- .\lib\activity\categoryDerivation\types.ts:33 | pattern: resolutionStatus -----
        | "purpose"
        | "activity_meaning"
        | "metric"
        | "context"
        | "other";
      
   33: export type CategoryDerivationResolutionStatus =
        | "resolved_existing"
        | "created_suggested"
        | "created_active"
        | "unresolved";
      
      export type CategoryDerivationRunStatus =
        | "started"
        | "completed"
        | "completed_with_warnings"
        | "failed";
      
      export interface CategoryCandidate {

----- .\lib\activity\categoryDerivation\types.ts:60 | pattern: resolutionStatus -----
        needsUserReview?: boolean;
        metadata?: JsonRecord;
      }
      
      export interface ResolvedCategoryCandidate extends CategoryCandidate {
        categoryId: string | null;
   60:   resolutionStatus: CategoryDerivationResolutionStatus;
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
```

## 14. Resolver: resolved_existing

```text

----- .\lib\activity\categoryDerivation\resolver.ts:257 | pattern: resolved_existing -----
              title:
                candidate.title ??
                existing.row.title ??
                existing.row.name ??
                normalizeTitle(candidate),
              categoryId: existing.row.id,
  257:         resolutionStatus: "resolved_existing",
              metadata: {
                ...(candidate.metadata ?? {}),
                normalizedSlug,
                existingStatus: existing.row.status ?? null,
              },
            });
            continue;
          }
      
          if (!shouldCreateCategory(candidate, createPolicy) || options.dryRun) {
            unresolvedCount += 1;
            resolved.push({
```

## 15. Resolver: created_suggested

```text

----- .\lib\activity\categoryDerivation\resolver.ts:321 | pattern: created_suggested -----
              candidate.title ??
              created.row.title ??
              created.row.name ??
              normalizeTitle(candidate),
            categoryId: created.row.id,
            resolutionStatus:
  321:         created.row.status === "active" ? "created_active" : "created_suggested",
            metadata: {
              ...(candidate.metadata ?? {}),
              normalizedSlug,
              createdStatus: created.row.status ?? null,
            },
          });
        }
      
        return {
          ok: errors.length === 0,
          candidates: resolved,
          createdCount,
```

## 16. Resolver: created_active

```text

----- .\lib\activity\categoryDerivation\resolver.ts:321 | pattern: created_active -----
              candidate.title ??
              created.row.title ??
              created.row.name ??
              normalizeTitle(candidate),
            categoryId: created.row.id,
            resolutionStatus:
  321:         created.row.status === "active" ? "created_active" : "created_suggested",
            metadata: {
              ...(candidate.metadata ?? {}),
              normalizedSlug,
              createdStatus: created.row.status ?? null,
            },
          });
        }
      
        return {
          ok: errors.length === 0,
          candidates: resolved,
          createdCount,
```

## 17. Persistence: activity_category_derivations

```text

----- .\lib\activity\categoryDerivation\persistDerivations.ts:231 | pattern: activity_category_derivations -----
        payload: ActivityCategoryDerivationInsert,
      ): Promise<{
        row: ActivityCategoryDerivationRow | null;
        error: string | null;
      }> {
        const result = await supabase
  231:     .from<ActivityCategoryDerivationRow>("activity_category_derivations")
          .insert(payload as unknown as Record<string, unknown>)
          .select("*")
          .maybeSingle();
      
        return {
          row: result.data ?? null,
          error: errorMessage(result.error),
        };
      }
      
      export async function persistCategoryDerivations(
        supabase: CategoryDerivationPersistenceSupabaseClient,

----- .\lib\activity\categoryDerivation\persistDerivations.ts:302 | pattern: activity_category_derivations -----
            supabase,
            insertPayload,
          );
      
          if (insertResult.error || !insertResult.row?.id) {
            errors.push(
  302:         `Failed to insert activity_category_derivations for ${insertPayload.candidate_slug}: ${
                insertResult.error ?? "no row returned"
              }`,
            );
            continue;
          }
      
          derivationRowsCreated += 1;
        }
      
        return {
          ok: errors.length === 0,
          derivationRunId,
```

## 18. Bridge contract: AdditionalValueObjectCategoryLink

```text

----- .\lib\activity\valueObjectBridge.ts:117 | pattern: AdditionalValueObjectCategoryLink -----
        aggregateType?: string;
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
      

----- .\lib\activity\valueObjectBridge.ts:157 | pattern: AdditionalValueObjectCategoryLink -----
        /**
         * C8-P additive optional input.
         *
         * When absent, existing bridge behavior must remain unchanged.
         * Runtime handling is intentionally implemented in a later checkpoint.
         */
  157:   additionalCategoryLinks?: AdditionalValueObjectCategoryLink[];
      };
      
      export type ValueObjectBridgeCreatedItem = {
        valueObjectId: string;
        valueObjectInstanceId: string | null;
        linkId: string | null;
        stateDeltaId: string | null;
        aggregateId: string | null;
        snapshotId: string | null;
      
        /**
         * P4.9.1 additive v4.2 projection fields.

----- .\lib\activity\valueObjectBridge.ts:194 | pattern: AdditionalValueObjectCategoryLink -----
      
        /**
         * C8-P additive Category Derivation category links.
         *
         * Empty unless additionalCategoryLinks is passed to the bridge.
         */
  194:   additionalValueObjectCategoryLinks: Array<{
          valueObjectCategoryLinkId: string | null;
          categoryId: string;
          candidateSlug: string;
          errorMessage: string | null;
        }>;
        additionalValueObjectCategoryLinkErrors: string[];
      
        skipped: boolean;
        skipReason: string | null;
      };
      
      export type ProcessValueObjectBridgeResult = {

----- .\lib\activity\valueObjectBridge.ts:200 | pattern: AdditionalValueObjectCategoryLink -----
        additionalValueObjectCategoryLinks: Array<{
          valueObjectCategoryLinkId: string | null;
          categoryId: string;
          candidateSlug: string;
          errorMessage: string | null;
        }>;
  200:   additionalValueObjectCategoryLinkErrors: string[];
      
        skipped: boolean;
        skipReason: string | null;
      };
      
      export type ProcessValueObjectBridgeResult = {
        ok: boolean;
        skipped: boolean;
        skipReason: string | null;
        eventId: string;
        eventStatus: string | null;
        mappingsRequested: number;

----- .\lib\activity\valueObjectBridge.ts:1036 | pattern: AdditionalValueObjectCategoryLink -----
      function isAdditionalCategoryLinkMetadataRecord(
        value: unknown
      ): value is Record<string, unknown> {
        return typeof value === "object" && value !== null && !Array.isArray(value);
      }
      
 1036: async function createAdditionalValueObjectCategoryLinks(params: {
        supabase: SupabaseClient;
        eventId: string;
        valueObjectId: string;
        activityEventValueObjectLinkId: string | null;
        processorName: string;
        additionalCategoryLinks: AdditionalValueObjectCategoryLink[] | null | undefined;
      }): Promise<{
        created: Array<{
          valueObjectCategoryLinkId: string | null;
          categoryId: string;
          candidateSlug: string;
          errorMessage: string | null;

----- .\lib\activity\valueObjectBridge.ts:1042 | pattern: AdditionalValueObjectCategoryLink -----
      async function createAdditionalValueObjectCategoryLinks(params: {
        supabase: SupabaseClient;
        eventId: string;
        valueObjectId: string;
        activityEventValueObjectLinkId: string | null;
        processorName: string;
 1042:   additionalCategoryLinks: AdditionalValueObjectCategoryLink[] | null | undefined;
      }): Promise<{
        created: Array<{
          valueObjectCategoryLinkId: string | null;
          categoryId: string;
          candidateSlug: string;
          errorMessage: string | null;
        }>;
        errors: string[];
      }> {
        const {
          supabase,
          eventId,

----- .\lib\activity\valueObjectBridge.ts:1260 | pattern: AdditionalValueObjectCategoryLink -----
            snapshotId: null,
            activityEventValueObjectLinkId: null,
            usageAggregateId: null,
            v42ProjectionError: null,
            valueObjectCategoryLinkId: null,
            valueObjectCategoryLinkError: null,
 1260:       additionalValueObjectCategoryLinks: [],
            additionalValueObjectCategoryLinkErrors: [],
            skipped: false,
            skipReason: null,
          };
      
          if (
            mapping.deltaValueNumeric === null &&
            mapping.deltaValueText === null &&
            typeof mapping.deltaValueNumeric !== "number" &&
            typeof mapping.deltaValueText !== "string"
          ) {
            createdItem.skipped = true;

----- .\lib\activity\valueObjectBridge.ts:1261 | pattern: AdditionalValueObjectCategoryLink -----
            activityEventValueObjectLinkId: null,
            usageAggregateId: null,
            v42ProjectionError: null,
            valueObjectCategoryLinkId: null,
            valueObjectCategoryLinkError: null,
            additionalValueObjectCategoryLinks: [],
 1261:       additionalValueObjectCategoryLinkErrors: [],
            skipped: false,
            skipReason: null,
          };
      
          if (
            mapping.deltaValueNumeric === null &&
            mapping.deltaValueText === null &&
            typeof mapping.deltaValueNumeric !== "number" &&
            typeof mapping.deltaValueText !== "string"
          ) {
            createdItem.skipped = true;
            createdItem.skipReason = "missing_delta_value";
```

## 19. Bridge input: additionalCategoryLinks

```text

----- .\lib\activity\valueObjectBridge.ts:157 | pattern: additionalCategoryLinks?: AdditionalValueObjectCategoryLink[] -----
        /**
         * C8-P additive optional input.
         *
         * When absent, existing bridge behavior must remain unchanged.
         * Runtime handling is intentionally implemented in a later checkpoint.
         */
  157:   additionalCategoryLinks?: AdditionalValueObjectCategoryLink[];
      };
      
      export type ValueObjectBridgeCreatedItem = {
        valueObjectId: string;
        valueObjectInstanceId: string | null;
        linkId: string | null;
        stateDeltaId: string | null;
        aggregateId: string | null;
        snapshotId: string | null;
      
        /**
         * P4.9.1 additive v4.2 projection fields.
```

## 20. Required route-side rules for next implementation

- Do not pass additionalCategoryLinks when enableCategoryDerivation is false.
- Do not pass additionalCategoryLinks when categoryDerivationDryRun is true.
- Do not pass unresolved candidates.
- Only pass candidates with valid categoryId.
- Allowed resolutionStatus values: resolved_existing, created_suggested, created_active.
- Use categoryTable = contextual_categories.
- Use categoryRole = semantic_component.
- Use source = rule.
- Put sourceLayer = category_derivation into metadata.
- Preserve no-flag behavior already verified in B4-C.

## 21. Next step

Proceed to P4.10.0-C8-P3-B5-B:
- add route-side helper to convert resolved candidates into AdditionalValueObjectCategoryLink[]
- pass additionalCategoryLinks into processActivityValueObjectBridge only when non-dryRun and resolved
- run TypeScript smoke check
- run browser dryRun regression
- run browser non-dryRun controlled test
