# P4.10.0-C8-P3-B5-A — Route-side Integration Map

Date: 2026-05-20
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / debug route integration map before passing resolved candidates

This checkpoint does not change runtime code.

Goal: identify exact route-side insertion points for converting resolved Category Derivation candidates into additionalCategoryLinks.

## 1. Git status

```text
?? docs/value-objects/category-derivation-route-side-integration-map-c8-p3-b5-a.md
```

## 2. Recent commits

```text
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
9178350 Document category link constraint inspection result
```

## 3. File status

- FOUND: .\src\app\api\activity\debug\free-text-value-object-test\route.ts (673 lines)
- FOUND: .\lib\activity\valueObjectBridge.ts (1628 lines)
- FOUND: .\lib\activity\categoryDerivation\types.ts (132 lines)
- FOUND: .\lib\activity\categoryDerivation\resolver.ts (349 lines)
- FOUND: .\lib\activity\categoryDerivation\persistDerivations.ts (328 lines)

## 4. Debug route — request flags and category derivation options

```text

### Pattern: enableCategoryDerivation

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:34 -----
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
      

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:141 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:391 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:404 -----
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

### Pattern: categoryDerivationDryRun

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:37 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:146 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:392 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:406 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:519 -----
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

### Pattern: categoryDerivationCreatePolicy

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:38 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:149 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:161 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:393 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:405 -----
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

### Pattern: categoryDerivationEnabled

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:35 -----
        title?: unknown;
        description?: unknown;
        durationMinutes?: unknown;
        startedAt?: unknown;
        endedAt?: unknown;
        enableCategoryDerivation?: unknown;
   35:   categoryDerivationEnabled?: unknown;
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:142 -----
        body: FreeTextValueObjectTestBody
      ):
        | { ok: true; options: CategoryDerivationRouteOptions }
        | { ok: false; error: string } {
        const enabled =
          asBoolean(body.enableCategoryDerivation) ??
  142:     asBoolean(body.categoryDerivationEnabled) ??
          asBoolean(body.categoryDerivation) ??
          false;
      
        const dryRun = asBoolean(body.categoryDerivationDryRun) ?? false;
      
        const rawCreatePolicy =
          asString(body.categoryDerivationCreatePolicy) ?? "suggested_only";
      
        const allowedPolicies: CategoryResolverCreatePolicy[] = [
          "never",
          "suggested_only",
          "active_for_confirmed_required",

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:518 -----
            privacy_scope: "private",
            processing_status: "processed",
            metadata_json: {
              parser: "debug_free_text_value_object_test_v1",
              p4Step: "P4.10.0-C8-O1",
              freeTextValueObjectTest: true,
  518:         categoryDerivationEnabled: categoryDerivationOptions.enabled,
              categoryDerivationDryRun: categoryDerivationOptions.dryRun,
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

### Pattern: categoryDerivationOptions

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:135 -----
          return false;
        }
      
        return null;
      }
      
  135: function resolveCategoryDerivationOptions(
        body: FreeTextValueObjectTestBody
      ):
        | { ok: true; options: CategoryDerivationRouteOptions }
        | { ok: false; error: string } {
        const enabled =
          asBoolean(body.enableCategoryDerivation) ??
          asBoolean(body.categoryDerivationEnabled) ??
          asBoolean(body.categoryDerivation) ??
          false;
      
        const dryRun = asBoolean(body.categoryDerivationDryRun) ?? false;
      

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:473 -----
              error: timing.error,
            },
            { status: 400 }
          );
        }
      
  473:   const categoryDerivationOptionsResult =
          resolveCategoryDerivationOptions(body);
      
        if (!categoryDerivationOptionsResult.ok) {
          return NextResponse.json(
            {
              ok: false,
              error: categoryDerivationOptionsResult.error,
            },
            { status: 400 }
          );
        }
      

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:474 -----
            },
            { status: 400 }
          );
        }
      
        const categoryDerivationOptionsResult =
  474:     resolveCategoryDerivationOptions(body);
      
        if (!categoryDerivationOptionsResult.ok) {
          return NextResponse.json(
            {
              ok: false,
              error: categoryDerivationOptionsResult.error,
            },
            { status: 400 }
          );
        }
      
        const categoryDerivationOptions = categoryDerivationOptionsResult.options;

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:476 -----
          );
        }
      
        const categoryDerivationOptionsResult =
          resolveCategoryDerivationOptions(body);
      
  476:   if (!categoryDerivationOptionsResult.ok) {
          return NextResponse.json(
            {
              ok: false,
              error: categoryDerivationOptionsResult.error,
            },
            { status: 400 }
          );
        }
      
        const categoryDerivationOptions = categoryDerivationOptionsResult.options;
        const processingRunId = randomUUID();
        const processingStartedAt = new Date();

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:480 -----
          resolveCategoryDerivationOptions(body);
      
        if (!categoryDerivationOptionsResult.ok) {
          return NextResponse.json(
            {
              ok: false,
  480:         error: categoryDerivationOptionsResult.error,
            },
            { status: 400 }
          );
        }
      
        const categoryDerivationOptions = categoryDerivationOptionsResult.options;
        const processingRunId = randomUUID();
        const processingStartedAt = new Date();
        const nowIso = new Date().toISOString();
        const title = asString(body.title) ?? "Free-text activity test";
        const description = asString(body.description);
      
```

## 5. Debug route — category derivation execution pipeline

```text

### Pattern: runCategoryDerivationForDebugRoute

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:258 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:540 -----
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

### Pattern: extractCategoryCandidates
(no matches)

### Pattern: resolveCategoryCandidates

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:14 -----
      import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
      import { processActivityValueObjectBridge } from "../../../../../../lib/activity/activityValueObjectLifecycle";
      import { safeCreateActivityProcessingLog } from "../../../../../../lib/activity/activityProcessingLogs";
      import { supabase } from "../../../../../../lib/supabase";
      import { deriveCategoryCandidates } from "../../../../../../lib/activity/categoryDerivation/ruleExtractor";
      import {
   14:   resolveCategoryCandidates,
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:298 -----
              featureFlag: "categoryDerivation",
            },
          };
      
          const extractionResult = deriveCategoryCandidates(derivationInput);
      
  298:     const resolutionResult = await resolveCategoryCandidates(
            supabase as unknown as CategoryResolverSupabaseClient,
            extractionResult.candidates,
            {
              createPolicy: options.createPolicy,
              dryRun: options.dryRun,
              sourceType: "rule",
              defaultCategoryType: "derived",
            }
          );
      
          const persistenceResult = await persistCategoryDerivations(
            supabase as unknown as CategoryDerivationPersistenceSupabaseClient,

### Pattern: persistCategoryDerivations

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:19 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:309 -----
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

### Pattern: categoryDerivationResult

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:540 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:558 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:596 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:597 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:598 -----
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

### Pattern: derivationRunId

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:77 -----
          warnings: string[];
          errors: string[];
          candidates: unknown[];
        };
        persistence?: {
          ok: boolean;
   77:     derivationRunId: string | null;
          derivationRowsCreated: number;
          candidateCount: number;
          resolvedCandidateCount: number;
          unresolvedCandidateCount: number;
          warnings: string[];
          errors: string[];
        };
      };
      
      function asString(value: unknown): string | null {
        if (typeof value !== "string") {
          return null;

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:359 -----
              warnings: resolutionResult.warnings,
              errors: resolutionResult.errors,
              candidates: resolutionResult.candidates,
            },
            persistence: {
              ok: persistenceResult.ok,
  359:         derivationRunId: persistenceResult.derivationRunId,
              derivationRowsCreated: persistenceResult.derivationRowsCreated,
              candidateCount: persistenceResult.candidateCount,
              resolvedCandidateCount: persistenceResult.resolvedCandidateCount,
              unresolvedCandidateCount: persistenceResult.unresolvedCandidateCount,
              warnings: persistenceResult.warnings,
              errors: persistenceResult.errors,
            },
          };
        } catch (error) {
          return {
            enabled: true,
            ok: false,

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:608 -----
              resolutionCreatedCount:
                categoryDerivationResult.resolution?.createdCount ?? null,
              resolutionReusedCount:
                categoryDerivationResult.resolution?.reusedCount ?? null,
              resolutionUnresolvedCount:
                categoryDerivationResult.resolution?.unresolvedCount ?? null,
  608:         derivationRunId:
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:609 -----
                categoryDerivationResult.resolution?.createdCount ?? null,
              resolutionReusedCount:
                categoryDerivationResult.resolution?.reusedCount ?? null,
              resolutionUnresolvedCount:
                categoryDerivationResult.resolution?.unresolvedCount ?? null,
              derivationRunId:
  609:           categoryDerivationResult.persistence?.derivationRunId ?? null,
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

### Pattern: resolvedCandidates

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:315 -----
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
      

### Pattern: activityCategoryDerivations
(no matches)
```

## 6. Debug route — bridge mapping and bridge call

```text

### Pattern: rubricatorValueObjectMapper
(no matches)

### Pattern: mappingResult

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:591 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:592 -----
          },
          output: {
            ok: bridgeResult.ok,
            skipped: bridgeResult.skipped,
            skipReason: bridgeResult.skipReason,
            mappingSkipped: bridgeResult.mappingResult?.skipped ?? null,
  592:       mappingsCount: bridgeResult.mappingResult?.mappings.length ?? 0,
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
              resolutionReusedCount:

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:641 -----
          categoryDerivation: categoryDerivationResult,
          valueObjectBridge: {
            ok: bridgeResult.ok,
            skipped: bridgeResult.skipped,
            skipReason: bridgeResult.skipReason,
            errors: bridgeResult.errors,
  641:       mapping: bridgeResult.mappingResult
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:643 -----
            ok: bridgeResult.ok,
            skipped: bridgeResult.skipped,
            skipReason: bridgeResult.skipReason,
            errors: bridgeResult.errors,
            mapping: bridgeResult.mappingResult
              ? {
  643:             ok: bridgeResult.mappingResult.ok,
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:644 -----
            skipped: bridgeResult.skipped,
            skipReason: bridgeResult.skipReason,
            errors: bridgeResult.errors,
            mapping: bridgeResult.mappingResult
              ? {
                  ok: bridgeResult.mappingResult.ok,
  644:             skipped: bridgeResult.mappingResult.skipped,
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

### Pattern: processActivityValueObjectBridge

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:9 -----
      
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:550 -----
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

### Pattern: bridgeResult

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:550 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:567 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:570 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:575 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:588 -----
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

### Pattern: valueObjectBridge

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:9 -----
      
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:550 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:636 -----
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

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:666 -----
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

### Pattern: created_and_bridge_processed

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:632 -----
      
        return NextResponse.json({
          ok: responseOk,
          status: bridgeResult.ok
            ? bridgeResult.skipped
              ? "created_but_bridge_skipped"
  632:         : "created_and_bridge_processed"
            : "created_but_bridge_failed",
          event: createdEventData,
          categoryDerivation: categoryDerivationResult,
          valueObjectBridge: {
            ok: bridgeResult.ok,
            skipped: bridgeResult.skipped,
            skipReason: bridgeResult.skipReason,
            errors: bridgeResult.errors,
            mapping: bridgeResult.mappingResult
              ? {
                  ok: bridgeResult.mappingResult.ok,
                  skipped: bridgeResult.mappingResult.skipped,

### Pattern: created_but_bridge_failed

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:633 -----
        return NextResponse.json({
          ok: responseOk,
          status: bridgeResult.ok
            ? bridgeResult.skipped
              ? "created_but_bridge_skipped"
              : "created_and_bridge_processed"
  633:       : "created_but_bridge_failed",
          event: createdEventData,
          categoryDerivation: categoryDerivationResult,
          valueObjectBridge: {
            ok: bridgeResult.ok,
            skipped: bridgeResult.skipped,
            skipReason: bridgeResult.skipReason,
            errors: bridgeResult.errors,
            mapping: bridgeResult.mappingResult
              ? {
                  ok: bridgeResult.mappingResult.ok,
                  skipped: bridgeResult.mappingResult.skipped,
                  skipReason: bridgeResult.mappingResult.skipReason,
```

## 7. Category Derivation types — candidate and resolution fields

```text

### Pattern: CategoryCandidate

----- .\lib\activity\categoryDerivation\types.ts:45 -----
      export type CategoryDerivationRunStatus =
        | "started"
        | "completed"
        | "completed_with_warnings"
        | "failed";
      
   45: export interface CategoryCandidate {
        slug: string;
        title?: string;
        semanticLayer?: CategoryDerivationSemanticLayer | string;
        categoryType?: string;
        confidence?: number;
        source: CategoryDerivationSource;
        isRequired?: boolean;
        isConfirmed?: boolean;
        needsUserReview?: boolean;
        metadata?: JsonRecord;
      }
      

----- .\lib\activity\categoryDerivation\types.ts:58 -----
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

----- .\lib\activity\categoryDerivation\types.ts:82 -----
        ok: boolean;
        skipped?: boolean;
        skipReason?: string | null;
        processorVersion: string;
        ruleVersion?: string | null;
        confidence?: number | null;
   82:   candidates: CategoryCandidate[];
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

----- .\lib\activity\categoryDerivation\types.ts:90 -----
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

### Pattern: ResolvedCategoryCandidate

----- .\lib\activity\categoryDerivation\types.ts:58 -----
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

----- .\lib\activity\categoryDerivation\types.ts:90 -----
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

### Pattern: CategoryResolutionResult

----- .\lib\activity\categoryDerivation\types.ts:88 -----
        candidates: CategoryCandidate[];
        warnings: string[];
        errors: string[];
        metadata?: JsonRecord;
      }
      
   88: export interface CategoryResolutionResult {
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

### Pattern: resolutionStatus

----- .\lib\activity\categoryDerivation\types.ts:33 -----
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

----- .\lib\activity\categoryDerivation\types.ts:60 -----
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

### Pattern: categoryId

----- .\lib\activity\categoryDerivation\types.ts:59 -----
        isConfirmed?: boolean;
        needsUserReview?: boolean;
        metadata?: JsonRecord;
      }
      
      export interface ResolvedCategoryCandidate extends CategoryCandidate {
   59:   categoryId: string | null;
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

### Pattern: candidateSlug
(no matches)

### Pattern: semanticLayer

----- .\lib\activity\categoryDerivation\types.ts:17 -----
        | "rule"
        | "ai"
        | "user"
        | "system"
        | "migration";
      
   17: export type CategoryDerivationSemanticLayer =
        | "action"
        | "object"
        | "domain"
        | "participant"
        | "relationship_context"
        | "role"
        | "duty"
        | "responsibility"
        | "care_function"
        | "purpose"
        | "activity_meaning"
        | "metric"

----- .\lib\activity\categoryDerivation\types.ts:48 -----
        | "completed_with_warnings"
        | "failed";
      
      export interface CategoryCandidate {
        slug: string;
        title?: string;
   48:   semanticLayer?: CategoryDerivationSemanticLayer | string;
        categoryType?: string;
        confidence?: number;
        source: CategoryDerivationSource;
        isRequired?: boolean;
        isConfirmed?: boolean;
        needsUserReview?: boolean;
        metadata?: JsonRecord;
      }
      
      export interface ResolvedCategoryCandidate extends CategoryCandidate {
        categoryId: string | null;
        resolutionStatus: CategoryDerivationResolutionStatus;

### Pattern: categoryType

----- .\lib\activity\categoryDerivation\types.ts:49 -----
        | "failed";
      
      export interface CategoryCandidate {
        slug: string;
        title?: string;
        semanticLayer?: CategoryDerivationSemanticLayer | string;
   49:   categoryType?: string;
        confidence?: number;
        source: CategoryDerivationSource;
        isRequired?: boolean;
        isConfirmed?: boolean;
        needsUserReview?: boolean;
        metadata?: JsonRecord;
      }
      
      export interface ResolvedCategoryCandidate extends CategoryCandidate {
        categoryId: string | null;
        resolutionStatus: CategoryDerivationResolutionStatus;
      }

### Pattern: confidence

----- .\lib\activity\categoryDerivation\types.ts:50 -----
      
      export interface CategoryCandidate {
        slug: string;
        title?: string;
        semanticLayer?: CategoryDerivationSemanticLayer | string;
        categoryType?: string;
   50:   confidence?: number;
        source: CategoryDerivationSource;
        isRequired?: boolean;
        isConfirmed?: boolean;
        needsUserReview?: boolean;
        metadata?: JsonRecord;
      }
      
      export interface ResolvedCategoryCandidate extends CategoryCandidate {
        categoryId: string | null;
        resolutionStatus: CategoryDerivationResolutionStatus;
      }
      

----- .\lib\activity\categoryDerivation\types.ts:81 -----
      export interface CategoryDerivationResult {
        ok: boolean;
        skipped?: boolean;
        skipReason?: string | null;
        processorVersion: string;
        ruleVersion?: string | null;
   81:   confidence?: number | null;
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

----- .\lib\activity\categoryDerivation\types.ts:110 -----
        input_language?: string | null;
        processor_version: string;
        rule_version?: string | null;
        model_name?: string | null;
        prompt_version?: string | null;
        status: CategoryDerivationRunStatus;
  110:   confidence?: number | null;
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

----- .\lib\activity\categoryDerivation\types.ts:126 -----
        category_id?: string | null;
        candidate_slug: string;
        candidate_title?: string | null;
        semantic_layer?: string | null;
        category_type?: string | null;
        source: CategoryDerivationSource;
  126:   confidence?: number | null;
        is_required?: boolean;
        is_confirmed?: boolean;
        needs_user_review?: boolean;
        is_rejected?: boolean;
        metadata_json?: JsonRecord;
      }
```

## 8. Resolver — resolutionStatus and categoryId production

```text

### Pattern: resolutionStatus

----- .\lib\activity\categoryDerivation\resolver.ts:223 -----
          if (normalizedSlug.length === 0) {
            unresolvedCount += 1;
            warnings.push(`Candidate slug could not be normalized: ${candidate.slug}`);
            resolved.push({
              ...candidate,
              categoryId: null,
  223:         resolutionStatus: "unresolved",
              metadata: {
                ...(candidate.metadata ?? {}),
                normalizedSlug,
                resolverWarning: "empty_normalized_slug",
              },
            });
            continue;
          }
      
          const semanticLayer = candidate.semanticLayer
            ? String(candidate.semanticLayer)
            : undefined;

----- .\lib\activity\categoryDerivation\resolver.ts:257 -----
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

----- .\lib\activity\categoryDerivation\resolver.ts:273 -----
          if (!shouldCreateCategory(candidate, createPolicy) || options.dryRun) {
            unresolvedCount += 1;
            resolved.push({
              ...candidate,
              slug: normalizedSlug,
              categoryId: null,
  273:         resolutionStatus: "unresolved",
              metadata: {
                ...(candidate.metadata ?? {}),
                normalizedSlug,
                dryRun: options.dryRun ?? false,
                createPolicy,
              },
            });
            continue;
          }
      
          const created = await createCategory(supabase, candidate, normalizedSlug, {
            ...options,

----- .\lib\activity\categoryDerivation\resolver.ts:300 -----
              }`,
            );
            resolved.push({
              ...candidate,
              slug: normalizedSlug,
              categoryId: null,
  300:         resolutionStatus: "unresolved",
              metadata: {
                ...(candidate.metadata ?? {}),
                normalizedSlug,
                createError: created.error ?? "no row returned",
              },
            });
            continue;
          }
      
          createdCount += 1;
          resolved.push({
            ...candidate,

----- .\lib\activity\categoryDerivation\resolver.ts:320 -----
            title:
              candidate.title ??
              created.row.title ??
              created.row.name ??
              normalizeTitle(candidate),
            categoryId: created.row.id,
  320:       resolutionStatus:
              created.row.status === "active" ? "created_active" : "created_suggested",
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

### Pattern: categoryId

----- .\lib\activity\categoryDerivation\resolver.ts:222 -----
      
          if (normalizedSlug.length === 0) {
            unresolvedCount += 1;
            warnings.push(`Candidate slug could not be normalized: ${candidate.slug}`);
            resolved.push({
              ...candidate,
  222:         categoryId: null,
              resolutionStatus: "unresolved",
              metadata: {
                ...(candidate.metadata ?? {}),
                normalizedSlug,
                resolverWarning: "empty_normalized_slug",
              },
            });
            continue;
          }
      
          const semanticLayer = candidate.semanticLayer
            ? String(candidate.semanticLayer)

----- .\lib\activity\categoryDerivation\resolver.ts:256 -----
              slug: normalizedSlug,
              title:
                candidate.title ??
                existing.row.title ??
                existing.row.name ??
                normalizeTitle(candidate),
  256:         categoryId: existing.row.id,
              resolutionStatus: "resolved_existing",
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

----- .\lib\activity\categoryDerivation\resolver.ts:272 -----
      
          if (!shouldCreateCategory(candidate, createPolicy) || options.dryRun) {
            unresolvedCount += 1;
            resolved.push({
              ...candidate,
              slug: normalizedSlug,
  272:         categoryId: null,
              resolutionStatus: "unresolved",
              metadata: {
                ...(candidate.metadata ?? {}),
                normalizedSlug,
                dryRun: options.dryRun ?? false,
                createPolicy,
              },
            });
            continue;
          }
      
          const created = await createCategory(supabase, candidate, normalizedSlug, {

----- .\lib\activity\categoryDerivation\resolver.ts:299 -----
                created.error ?? "no row returned"
              }`,
            );
            resolved.push({
              ...candidate,
              slug: normalizedSlug,
  299:         categoryId: null,
              resolutionStatus: "unresolved",
              metadata: {
                ...(candidate.metadata ?? {}),
                normalizedSlug,
                createError: created.error ?? "no row returned",
              },
            });
            continue;
          }
      
          createdCount += 1;
          resolved.push({

----- .\lib\activity\categoryDerivation\resolver.ts:319 -----
            slug: normalizedSlug,
            title:
              candidate.title ??
              created.row.title ??
              created.row.name ??
              normalizeTitle(candidate),
  319:       categoryId: created.row.id,
            resolutionStatus:
              created.row.status === "active" ? "created_active" : "created_suggested",
            metadata: {
              ...(candidate.metadata ?? {}),
              normalizedSlug,
              createdStatus: created.row.status ?? null,
            },
          });
        }
      
        return {
          ok: errors.length === 0,

### Pattern: resolved_existing

----- .\lib\activity\categoryDerivation\resolver.ts:257 -----
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

### Pattern: created_suggested

----- .\lib\activity\categoryDerivation\resolver.ts:321 -----
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

### Pattern: created_active

----- .\lib\activity\categoryDerivation\resolver.ts:321 -----
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

### Pattern: unresolved

----- .\lib\activity\categoryDerivation\resolver.ts:212 -----
        const resolved: ResolvedCategoryCandidate[] = [];
        const warnings: string[] = [];
        const errors: string[] = [];
      
        let createdCount = 0;
        let reusedCount = 0;
  212:   let unresolvedCount = 0;
      
        for (const candidate of candidates) {
          const normalizedSlug = normalizeCategoryCandidateSlug(candidate.slug);
      
          if (normalizedSlug.length === 0) {
            unresolvedCount += 1;
            warnings.push(`Candidate slug could not be normalized: ${candidate.slug}`);
            resolved.push({
              ...candidate,
              categoryId: null,
              resolutionStatus: "unresolved",
              metadata: {

----- .\lib\activity\categoryDerivation\resolver.ts:218 -----
        let unresolvedCount = 0;
      
        for (const candidate of candidates) {
          const normalizedSlug = normalizeCategoryCandidateSlug(candidate.slug);
      
          if (normalizedSlug.length === 0) {
  218:       unresolvedCount += 1;
            warnings.push(`Candidate slug could not be normalized: ${candidate.slug}`);
            resolved.push({
              ...candidate,
              categoryId: null,
              resolutionStatus: "unresolved",
              metadata: {
                ...(candidate.metadata ?? {}),
                normalizedSlug,
                resolverWarning: "empty_normalized_slug",

## 9. Persistence — derivation row ids and persisted candidates

```text

### Pattern: activity_category_derivations

----- .\lib\activity\categoryDerivation\persistDerivations.ts:231 -----
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
      

## 10. Bridge contract already available

```text

### Pattern: export type AdditionalValueObjectCategoryLink

----- .\lib\activity\valueObjectBridge.ts:117 -----
        aggregateType?: string;

## 11. Required route-side rules for next implementation

- Do not pass additionalCategoryLinks when enableCategoryDerivation is false.
- Do not pass additionalCategoryLinks when categoryDerivationDryRun is true.
- Do not pass unresolved candidates.
- Only pass candidates with valid categoryId.
- Allowed resolutionStatus values for passing:
  - resolved_existing
  - created_suggested
  - created_active
- Use categoryTable = contextual_categories.
- Use categoryRole = semantic_component.
- Use source = rule because source = category_derivation is not allowed by DB constraint.
- Put sourceLayer = category_derivation into metadata.
- Preserve no-flag behavior already verified in B4-C.

## 12. Next step

Proceed to P4.10.0-C8-P3-B5-B:

- add route-side helper to convert resolved candidates into AdditionalValueObjectCategoryLink[]
- pass additionalCategoryLinks into processActivityValueObjectBridge only when non-dryRun and resolved
- run TypeScript smoke check
- run browser dryRun regression
- run browser non-dryRun controlled test
