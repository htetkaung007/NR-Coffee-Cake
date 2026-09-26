"use client";

import { Box, Chip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

/** A small filled circle for a chip's icon slot. */
export function StatusDot() {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        bgcolor: "currentColor",
      }}
    />
  );
}

/** Status chip on a tint of its palette role — the label stays
 *  text.primary (readable on any role), the role color only tints the
 *  background, border and icon. The label always says the status in
 *  words, so it's never carried by color alone. */
export default function StatusChip({
  tone,
  icon,
  label,
}: {
  tone: "warning" | "success" | "error";
  icon: React.ReactElement;
  label: React.ReactNode;
}) {
  return (
    <Chip
      size="small"
      icon={icon}
      label={
        <Typography variant="caption" component="span">
          {label}
        </Typography>
      }
      sx={(theme) => ({
        flexShrink: 0,
        color: "text.primary",
        bgcolor: alpha(theme.palette[tone].main, 0.12),
        border: 1,
        borderColor: `${tone}.main`,
        "& .MuiChip-icon": { color: `${tone}.main`, ml: 1 },
      })}
    />
  );
}
