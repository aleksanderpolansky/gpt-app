import { NextResponse } from "next/server";

import {
  ActorContextError,
  CALENDAR_AI_RULE_MAX_LENGTH,
  normalizeCalendarAiRuleLocale,
  readEffectiveCalendarAiRules,
  resolveRequiredCalendarAiRuleActorContext,
  restoreSystemCalendarAiRules,
  saveCalendarAiRules,
  validateCalendarAiRuleText,
} from "@/lib/calendar/aiInterpretationRules.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRIORITY = [
  "explicit_current_message",
  "personal_user_rules",
  "arctor_standard_rules",
  "user_clarification",
] as const;

function responseForPreference(preference: Awaited<ReturnType<typeof readEffectiveCalendarAiRules>>) {
  return {
    ok: true,
    route: "/api/calendar/ai-rules",
    preference,
    priority: PRIORITY,
    maxLength: CALENDAR_AI_RULE_MAX_LENGTH,
    syntax: {
      deterministicShortcut:
        'WHEN "phrase" => TITLE "Activity title"; NEXT Sunday 09:00-12:00; TARGET "Observation object"',
      comments: "Lines beginning with #, // or ; are ignored by deterministic shortcut parsing.",
      naturalLanguage:
        "Natural-language guidance is passed to the semantic model after explicit message data.",
    },
  };
}

function errorResponse(error: unknown) {
  if (error instanceof ActorContextError) {
    return NextResponse.json(
      { ok: false, error: error.message, errorCode: error.code },
      { status: error.status },
    );
  }

  const message = error instanceof Error ? error.message : "Unknown calendar AI rules error";
  const status = message.startsWith("RULE_TEXT_") ? 400 : 500;

  return NextResponse.json(
    { ok: false, error: message },
    { status },
  );
}

export async function GET(request: Request) {
  try {
    const actorContext = await resolveRequiredCalendarAiRuleActorContext();
    const locale = normalizeCalendarAiRuleLocale(new URL(request.url).searchParams.get("locale"));
    const preference = await readEffectiveCalendarAiRules(actorContext.appUserId, locale);

    return NextResponse.json(responseForPreference(preference), { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const actorContext = await resolveRequiredCalendarAiRuleActorContext();
    const parsed = await request.json().catch(() => null);
    const body = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
    const locale = normalizeCalendarAiRuleLocale(body.locale);
    const validated = validateCalendarAiRuleText(body.ruleText);

    if (!validated.ok) {
      return NextResponse.json(
        { ok: false, error: validated.error },
        { status: 400 },
      );
    }

    const preference = await saveCalendarAiRules({
      ownerUserId: actorContext.appUserId,
      actorId: actorContext.actorId,
      locale,
      ruleText: validated.value,
    });

    return NextResponse.json(responseForPreference(preference), { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const actorContext = await resolveRequiredCalendarAiRuleActorContext();
    const parsed = await request.json().catch(() => null);
    const body = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
    const urlLocale = new URL(request.url).searchParams.get("locale");
    const locale = normalizeCalendarAiRuleLocale(body.locale ?? urlLocale);
    const preference = await restoreSystemCalendarAiRules({
      ownerUserId: actorContext.appUserId,
      actorId: actorContext.actorId,
      locale,
    });

    return NextResponse.json(responseForPreference(preference), { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
