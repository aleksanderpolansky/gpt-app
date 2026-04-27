import { supabase } from "./supabase";

export type BookingConflictCheckResult = {
  hasConflict: boolean;
  conflictingBookings: Array<{
    id: string;
    offer_id: string;
    booking_status: string;
    start_time: string;
    end_time: string;
  }>;
  errorMessage: string | null;
};

export async function checkBookingConflictByOffer(params: {
  offerId: string;
  startTime: string;
  endTime: string;
  excludeBookingId?: string | null;
}): Promise<BookingConflictCheckResult> {
  const { offerId, startTime, endTime, excludeBookingId = null } = params;

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return {
      hasConflict: true,
      conflictingBookings: [],
      errorMessage: "Invalid startTime or endTime",
    };
  }

  if (end <= start) {
    return {
      hasConflict: true,
      conflictingBookings: [],
      errorMessage: "endTime must be after startTime",
    };
  }

  let query = supabase
    .from("bookings")
    .select("id,offer_id,booking_status,start_time,end_time")
    .eq("offer_id", offerId)
    .neq("booking_status", "cancelled")
    .lt("start_time", end.toISOString())
    .gt("end_time", start.toISOString());

  if (excludeBookingId) {
    query = query.neq("id", excludeBookingId);
  }

  const { data, error } = await query;

  if (error) {
    return {
      hasConflict: true,
      conflictingBookings: [],
      errorMessage: error.message,
    };
  }

  return {
    hasConflict: (data ?? []).length > 0,
    conflictingBookings: data ?? [],
    errorMessage: null,
  };
}