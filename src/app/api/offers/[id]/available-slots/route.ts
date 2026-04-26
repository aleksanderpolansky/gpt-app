import { NextResponse } from "next/server";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type AvailabilityRule = {
  id: string;
  weekday: string;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  valid_from: string | null;
  valid_until: string | null;
};

type CalendarEvent = {
  id: string;
  start_time: string;
  end_time: string;
};

type AvailableSlot = {
  offerId: string;
  availabilityRuleId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

async function getCurrentUserContext() {
  const session = await auth0.getSession();

  if (!session?.user) {
    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      ),
    };
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("*")
    .eq("auth0_sub", session.user.sub)
    .single();

  if (appUserError) {
    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: appUserError.message },
        { status: 500 }
      ),
    };
  }

  const { data: person, error: personError } = await supabase
    .from("persons")
    .select("*")
    .eq("user_id", appUser.id)
    .single();

  if (personError) {
    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: personError.message },
        { status: 500 }
      ),
    };
  }

  const { data: personActor, error: personActorError } = await supabase
    .from("actors")
    .select("*")
    .eq("person_id", person.id)
    .eq("actor_type", "person")
    .single();

  if (personActorError) {
    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: personActorError.message },
        { status: 500 }
      ),
    };
  }

  return {
    appUser,
    person,
    personActor,
    errorResponse: null,
  };
}

function isValidDateString(dateString: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
}

function getWeekdayNameFromDateString(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  const weekdayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  return weekdayNames[date.getDay()];
}

function combineDateAndTime(dateString: string, timeString: string) {
  const normalizedTimeString = timeString.slice(0, 5);

  return new Date(`${dateString}T${normalizedTimeString}:00`);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000);
}

function doIntervalsOverlap(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date
) {
  return firstStart < secondEnd && secondStart < firstEnd;
}

function isSlotBlockedByCalendarEvents(
  slotStart: Date,
  slotEnd: Date,
  calendarEvents: CalendarEvent[]
) {
  return calendarEvents.some((calendarEvent) => {
    const eventStart = new Date(calendarEvent.start_time);
    const eventEnd = new Date(calendarEvent.end_time);

    return doIntervalsOverlap(slotStart, slotEnd, eventStart, eventEnd);
  });
}

function buildSlotsForRule(
  offerId: string,
  rule: AvailabilityRule,
  dateString: string,
  calendarEvents: CalendarEvent[]
) {
  const slots: AvailableSlot[] = [];

  const ruleStart = combineDateAndTime(dateString, rule.start_time);
  const ruleEnd = combineDateAndTime(dateString, rule.end_time);

  let currentStart = addMinutes(ruleStart, rule.buffer_before_minutes);
  const slotStepMinutes =
    rule.slot_duration_minutes + rule.buffer_after_minutes;

  while (true) {
    const currentEnd = addMinutes(currentStart, rule.slot_duration_minutes);

    if (currentEnd > ruleEnd) {
      break;
    }

    const blocked = isSlotBlockedByCalendarEvents(
      currentStart,
      currentEnd,
      calendarEvents
    );

    if (!blocked) {
      slots.push({
        offerId,
        availabilityRuleId: rule.id,
        startTime: currentStart.toISOString(),
        endTime: currentEnd.toISOString(),
        durationMinutes: rule.slot_duration_minutes,
      });
    }

    currentStart = addMinutes(currentStart, slotStepMinutes);
  }

  return slots;
}

export async function GET(request: Request, context: RouteContext) {
  const { personActor, errorResponse } = await getCurrentUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!personActor) {
    return NextResponse.json(
      { error: "User context not found" },
      { status: 500 }
    );
  }

  const { id: offerId } = await context.params;

  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");

  if (!dateParam) {
    return NextResponse.json(
      { error: "date query parameter is required, for example ?date=2026-04-25" },
      { status: 400 }
    );
  }

  if (!isValidDateString(dateParam)) {
    return NextResponse.json(
      { error: "Invalid date query parameter. Use YYYY-MM-DD format." },
      { status: 400 }
    );
  }

  const dateString = dateParam;
  const weekday = getWeekdayNameFromDateString(dateString);

  const { data: availabilityRules, error: availabilityRulesError } =
    await supabase
      .from("availability_rules")
      .select("*")
      .eq("offer_id", offerId)
      .eq("provider_actor_id", personActor.id)
      .eq("weekday", weekday)
      .eq("is_active", true);

  if (availabilityRulesError) {
    return NextResponse.json(
      { error: availabilityRulesError.message },
      { status: 500 }
    );
  }

  const activeRulesForDate = (availabilityRules ?? []).filter(
    (rule: AvailabilityRule) => {
      if (rule.valid_from && dateString < rule.valid_from) {
        return false;
      }

      if (rule.valid_until && dateString > rule.valid_until) {
        return false;
      }

      return true;
    }
  );

  const dayStart = new Date(`${dateString}T00:00:00`);
  const dayEnd = new Date(`${dateString}T23:59:59`);

  const { data: calendarEvents, error: calendarEventsError } = await supabase
    .from("calendar_events")
    .select("id,start_time,end_time")
    .eq("actor_id", personActor.id)
    .gte("start_time", dayStart.toISOString())
    .lte("start_time", dayEnd.toISOString())
    .in("status", ["planned", "confirmed", "completed"]);

  if (calendarEventsError) {
    return NextResponse.json(
      { error: calendarEventsError.message },
      { status: 500 }
    );
  }

  const availableSlots = activeRulesForDate.flatMap((rule: AvailabilityRule) =>
    buildSlotsForRule(
      offerId,
      rule,
      dateString,
      (calendarEvents ?? []) as CalendarEvent[]
    )
  );

  return NextResponse.json({
    ok: true,
    offerId,
    date: dateString,
    weekday,
    availableSlots,
  });
}