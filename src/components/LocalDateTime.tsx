"use client";

import { useEffect, useState } from "react";

type LocalDateTimeProps = {
  value: string | null | undefined;
  fallback?: string;
  showHelperText?: boolean;
};

function isSameLocalDay(firstDate: Date, secondDate: Date) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function formatLocalDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Некорректная дата";
  }

  const now = new Date();

  const timeText = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  if (isSameLocalDay(date, now)) {
    return `сегодня, ${timeText}`;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function LocalDateTime({
  value,
  fallback = "—",
  showHelperText = true,
}: LocalDateTimeProps) {
  const [formattedValue, setFormattedValue] = useState<string>(
    value ? "..." : fallback
  );

  useEffect(() => {
    if (!value) {
      setFormattedValue(fallback);
      return;
    }

    setFormattedValue(formatLocalDateTime(value));
  }, [value, fallback]);

  return (
    <span>
      <span>{formattedValue}</span>
      {value && showHelperText ? (
        <span style={{ color: "#777777", fontSize: "12px" }}>
          {" "}
          · Время показано по настройкам вашего устройства.
        </span>
      ) : null}
    </span>
  );
}