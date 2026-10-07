import { Chip, Typography } from "@mui/material";

/**
 * Required / Optional for an add-on group — the list card and the
 * detail panel both use this. Required is the strong one: filled primary
 * (Backoffice brown, contrastText — 12.3:1 light, 8.0:1 dark, see
 * theme.ts). Optional is quiet: outlined, text.secondary. Never an
 * error/status colour — this is a category, not a state (DESIGN.md
 * Rule 13). The word is always there, so it's never colour alone.
 */
export default function RequiredChip({ isRequired }: { isRequired: boolean }) {
  return (
    <Chip
      size="small"
      color={isRequired ? "primary" : "default"}
      variant={isRequired ? "filled" : "outlined"}
      sx={isRequired ? undefined : { color: "text.secondary" }}
      label={
        <Typography variant="caption" component="span">
          {isRequired ? "Required" : "Optional"}
        </Typography>
      }
    />
  );
}
