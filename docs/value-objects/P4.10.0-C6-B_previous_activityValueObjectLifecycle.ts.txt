import type { SupabaseClient } from "@supabase/supabase-js";

import {
  processValueObjectBridgeForActivityEvent,
  type ProcessValueObjectBridgeResult,
} from "./valueObjectBridge";

import {
  resolveValueObjectMappingsFromRubricatorForActivityEvent,
  type RubricatorValueObjectMappingResult,
} from "./rubricatorValueObjectMapper";

export type ProcessActivityValueObjectBridgeInput = {
  supabase: SupabaseClient;
  eventId: string;
  processorName: string;
  allowNonCompletedEvent?: boolean;
};

export type ProcessActivityValueObjectBridgeResult = {
  ok: boolean;
  skipped: boolean;
  skipReason: string | null;
  eventId: string;
  processorName: string;
  mappingResult: RubricatorValueObjectMappingResult | null;
  bridgeResult: ProcessValueObjectBridgeResult | null;
  errors: string[];
};

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown value object bridge lifecycle error.";
  }
}

/**
 * Normal lifecycle wrapper for Activity Event -> Rubricator Mapper -> Value Object Bridge.
 *
 * Important:
 * - This wrapper is for normal completed/confirmed lifecycle paths.
 * - It does not create missing controlled Value Objects.
 * - It does not use controlled text fallback.
 * - It must not be called for imported_pending events before confirm.
 * - Duplicate protection is delegated to processValueObjectBridgeForActivityEvent.
 */
export async function processActivityValueObjectBridge(
  input: ProcessActivityValueObjectBridgeInput
): Promise<ProcessActivityValueObjectBridgeResult> {
  const { supabase, eventId, processorName, allowNonCompletedEvent = false } =
    input;

  try {
    const mappingResult =
      await resolveValueObjectMappingsFromRubricatorForActivityEvent({
        supabase,
        eventId,
        createMissingControlledValueObject: false,
        allowControlledTextFallback: false,
      });

    if (!mappingResult.ok) {
      return {
        ok: false,
        skipped: mappingResult.skipped,
        skipReason: mappingResult.skipReason,
        eventId,
        processorName,
        mappingResult,
        bridgeResult: null,
        errors: mappingResult.errors,
      };
    }

    if (mappingResult.skipped || mappingResult.mappings.length === 0) {
      return {
        ok: true,
        skipped: true,
        skipReason:
          mappingResult.skipReason ??
          (mappingResult.mappings.length === 0
            ? "no_value_object_mappings"
            : "mapping_skipped"),
        eventId,
        processorName,
        mappingResult,
        bridgeResult: null,
        errors: mappingResult.errors,
      };
    }

    const bridgeResult = await processValueObjectBridgeForActivityEvent({
      supabase,
      eventId,
      mappings: mappingResult.mappings,
      allowNonCompletedEvent,
      processorName,
    });

    return {
      ok: bridgeResult.ok,
      skipped: bridgeResult.skipped,
      skipReason: bridgeResult.skipReason,
      eventId,
      processorName,
      mappingResult,
      bridgeResult,
      errors: [...mappingResult.errors, ...bridgeResult.errors],
    };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      skipReason: "exception",
      eventId,
      processorName,
      mappingResult: null,
      bridgeResult: null,
      errors: [normalizeErrorMessage(error)],
    };
  }
}
