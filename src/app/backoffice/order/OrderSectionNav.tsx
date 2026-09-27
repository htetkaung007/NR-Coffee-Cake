"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Stack, Typography } from "@mui/material";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";

const SECTIONS = [
  { value: "open" as const, label: "Open", href: "/backoffice/order" },
  { value: "history" as const, label: "History", href: "/backoffice/order/history" },
];

/** [Open] [History] — links (not local state, per DESIGN.md Rule 17),
 *  part of OrdersPageHeader on both the Order List and History pages.
 *  The selected half follows the URL, so neither page has to say which
 *  one it is. The sidebar's own "Orders" item already stays highlighted
 *  on both routes (its isActive check is a startsWith on
 *  "/backoffice/order"). */
export default function OrderSectionNav() {
  const pathname = usePathname();
  const active = pathname?.startsWith("/backoffice/order/history")
    ? "history"
    : "open";

  return (
    <Stack
      direction="row"
      role="group"
      aria-label="Order view"
      sx={{
        display: "inline-flex",
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        p: 0.5,
        gap: 0.5,
      }}
    >
      {SECTIONS.map((section) => {
        const selected = section.value === active;
        return (
          <Link
            key={section.value}
            href={section.href}
            aria-current={selected ? "page" : undefined}
            style={{ textDecoration: "none" }}
          >
            <Typography
              component="span"
              variant="button"
              sx={(theme) => ({
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 44,
                minWidth: 80,
                px: 1.5,
                borderRadius: 1.5,
                color: selected ? "primary.contrastText" : "text.primary",
                bgcolor: selected ? "primary.main" : "transparent",
                transition: "background-color 160ms ease-out, color 160ms ease-out",
                [hoverCapableMedia]: {
                  "&:hover": {
                    // action.hover, not background.default — the page
                    // itself is background.default, so that hover
                    // wouldn't show.
                    bgcolor: selected
                      ? "primary.main"
                      : theme.palette.action.hover,
                  },
                },
              })}
            >
              {section.label}
            </Typography>
          </Link>
        );
      })}
    </Stack>
  );
}
