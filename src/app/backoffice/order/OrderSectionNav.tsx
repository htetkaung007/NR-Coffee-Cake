"use client";

import Link from "next/link";
import { Stack, Typography } from "@mui/material";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";

const SECTIONS = [
  { value: "open" as const, label: "Open", href: "/backoffice/order" },
  { value: "history" as const, label: "History", href: "/backoffice/order/history" },
];

/** [Open] [History] — links (not local state, per DESIGN.md Rule 17),
 *  shared by the Order List page and the History page so the same
 *  control switches between them either way. The sidebar's own
 *  "Orders" item already stays highlighted on both routes (its
 *  isActive check is a startsWith on "/backoffice/order"). */
export default function OrderSectionNav({
  active,
}: {
  active: "open" | "history";
}) {
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
              sx={{
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
                    bgcolor: selected ? "primary.main" : "background.default",
                  },
                },
              }}
            >
              {section.label}
            </Typography>
          </Link>
        );
      })}
    </Stack>
  );
}
