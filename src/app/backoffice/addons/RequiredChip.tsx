import { Chip, Typography } from "@mui/material";
import { useTranslations } from "next-intl";

/**
 * Required / Optional for an add-on group — the list card and the
 * detail panel both use this. Required is the strong one: filled primary
 * (Backoffice brown, contrastText — 12.3:1 light, 8.0:1 dark, see
 * theme.ts). Optional is quiet: outlined, text.secondary. Never an
 * error/status colour — this is a category, not a state (DESIGN.md
 * Rule 13). The word is always there, so it's never colour alone.
 */
export default function RequiredChip({
  isRequired,
  large = false,
}: {
  isRequired: boolean;
  /** Touch screens' group panel: the medium chip with body2 words (one
   *  step up from caption). */
  large?: boolean;
}) {
  const t = useTranslations("bo.addons");
  return (
    <Chip
      size={large ? "medium" : "small"}
      color={isRequired ? "primary" : "default"}
      variant={isRequired ? "filled" : "outlined"}
      sx={isRequired ? undefined : { color: "text.secondary" }}
      label={
        <Typography variant={large ? "body2" : "caption"} component="span">
          {isRequired ? t("required") : t("optional")}
        </Typography>
      }
    />
  );
}
