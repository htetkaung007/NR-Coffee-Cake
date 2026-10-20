import { Box } from "@mui/material";
import { useTranslations } from "next-intl";

/** A field's helper line with its "12/50 characters" counter on the
 *  right (and an optional hint on the left) — the same counter on an
 *  English field and its Myanmar twin. `count` is the value's length, as
 *  the schema (Zod) counts it. Use with `formHelperText: { component:
 *  "div" }` when there's a hint. Staff screens only. */
export default function CharacterCount({
  count,
  max,
  hint,
}: {
  count: number;
  max: number;
  hint?: string;
}) {
  const t = useTranslations("bo.common");
  const counter = t("characters", { count, max });
  if (!hint) return counter;
  return (
    <Box component="span" sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
      <span>{hint}</span>
      <Box component="span" sx={{ flexShrink: 0 }}>
        {counter}
      </Box>
    </Box>
  );
}
