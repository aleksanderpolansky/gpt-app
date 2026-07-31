"use client";

import { useEffect, useState } from "react";

type Props = {
  readonly value: string;
  readonly locale: string;
};

export function GiftCertificateScanLocalDateTime({
  value,
  locale,
}: Props) {
  const [formatted, setFormatted] = useState("—");

  useEffect(() => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      setFormatted(value);
      return;
    }

    setFormatted(
      new Intl.DateTimeFormat(
        locale === "en" ? "en-US" : locale,
        {
          dateStyle: "medium",
          timeStyle: "medium",
        },
      ).format(date),
    );
  }, [locale, value]);

  return <>{formatted}</>;
}
