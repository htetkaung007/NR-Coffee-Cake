"use client";

import "dayjs/locale/my";
import { useLocale } from "next-intl";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";

/** MUI X's date pickers (the calendar behind History's day and the
 *  Reports' period navigator) in the staff's language: month and weekday
 *  names from dayjs's locale ("my" or the default English), digits 0–9. */
export default function StaffDateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = useLocale();
  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
      adapterLocale={locale === "my" ? "my" : "en"}
    >
      {children}
    </LocalizationProvider>
  );
}
