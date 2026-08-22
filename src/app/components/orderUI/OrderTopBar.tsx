"use client";

import { AppBar, Toolbar, Box, Typography, Chip } from "@mui/material";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";

interface OrderTopBarProps {
  /** "Table 5" for a Table QR session, "#A042" for a Counter/Staff
   *  session, or null for plain online browsing (no session at all). */
  label: string | null;
  isReadOnly: boolean;
}

/**
 * Distinct from Backoffice's AppBar on purpose — this is a
 * customer-facing screen, not a staff tool, so it uses its own color
 * (primary-tinted, not the neutral Backoffice bar) to make the two
 * apps feel unmistakably different even if a staff member has both
 * open in adjacent tabs.
 */
export default function OrderTopBar({ label, isReadOnly }: OrderTopBarProps) {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="primary"
      sx={{ borderBottom: "1px solid", borderColor: "divider" }}
    >
      <Toolbar sx={{ gap: 1.5 }}>
        <StorefrontOutlinedIcon />
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
          Café Maw
        </Typography>

        {label && (
          <Chip
            label={label}
            size="small"
            sx={{
              bgcolor: "rgba(255,255,255,0.18)",
              color: "inherit",
              fontWeight: 600,
            }}
          />
        )}

        {isReadOnly && (
          <Chip
            label="Order placed"
            size="small"
            color="success"
            sx={{ fontWeight: 600 }}
          />
        )}
      </Toolbar>
    </AppBar>
  );
}
