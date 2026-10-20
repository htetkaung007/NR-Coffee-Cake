"use client";

import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import type { OptionRow } from "@/app/lib/hooks/useOptionRows";
import {
  myanmarNameCount,
  myanmarPlaceholder,
} from "@/app/lib/menu/addonOptionNames";
import { useTranslations } from "next-intl";
import { useStaffMoney } from "@/app/lib/hooks/useStaffWords";
import { ADDON_OPTION_NAME_MAX } from "@/app/lib/schemas/addonSchema";
import LanguageTaggedField from "./LanguageTaggedField";

interface OptionRowsEditorProps {
  options: OptionRow[];
  updateOption: (
    index: number,
    field: "name" | "nameMy" | "price",
    value: string,
  ) => void;
  addOption: () => void;
  removeOption: (index: number) => void;
}

/** One option's fields and its ×. Below md a stacked block (EN + ×,
 *  မြန်မာ, Price — each with its tag); from md one grid row under the
 *  column headers (no tags). */
const rowGridSx = {
  display: "grid",
  gap: 1,
  // Top-aligned: the name fields carry their character counters below,
  // so the inputs (and the price / ×) line up along their tops.
  alignItems: "start",
  gridTemplateColumns: {
    xs: "minmax(0, 1fr) 44px",
    md: "minmax(0, 1fr) minmax(0, 1fr) 128px 44px",
  },
  gridTemplateAreas: {
    xs: `"en remove" "my my" "price price"`,
    md: `"en my price remove"`,
  },
} as const;

/** "N of M have a Myanmar name": warning tint until every saved option
 *  has one, then success. Words plus an icon-free tint — the count says
 *  it, never colour alone. */
function MyanmarCountChip({ named, total }: { named: number; total: number }) {
  const t = useTranslations("bo.addonForm");
  const complete = named === total;
  return (
    <Chip
      size="small"
      label={
        <Typography variant="caption" component="span">
          {t("myanmarCount", { named, total })}
        </Typography>
      }
      sx={(theme) => ({
        flexShrink: 0,
        maxWidth: "100%",
        bgcolor: alpha(
          complete ? theme.palette.success.main : theme.palette.warning.main,
          0.12,
        ),
        // successText is the success role's text shade (≥ 4.5:1); the
        // Backoffice has no warning text shade, so the words stay
        // text.primary on the warning tint.
        color: complete
          ? (theme.palette.successText ?? theme.palette.text.primary)
          : theme.palette.text.primary,
      })}
    />
  );
}

/** The add-on group form's "Options" section — shared by the add-on
 *  group page and the "Connect Add-On Group" dialog. Rows come from
 *  useOptionRows; the price keeps digits only (blank / 0 = free). */
export default function OptionRowsEditor({
  options,
  updateOption,
  addOption,
  removeOption,
}: OptionRowsEditorProps) {
  const t = useTranslations("bo.addonForm");
  const money = useStaffMoney();
  const { named, total } = myanmarNameCount(options);

  return (
    <Box>
      <Stack
        direction="row"
        useFlexGap
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography variant="subtitle2" component="h2">
          {t("options")}
        </Typography>
        {total > 0 && <MyanmarCountChip named={named} total={total} />}
      </Stack>
      <Typography
        variant="caption"
        component="p"
        color="text.secondary"
        sx={{ mb: 2 }}
      >
        {t("optionsHint")}
      </Typography>

      {/* Column headers — md and up only, where the fields have no tag. */}
      <Box
        aria-hidden
        sx={{ ...rowGridSx, display: { xs: "none", md: "grid" }, mb: 1 }}
      >
        {[
          { area: "en", text: t("colEnglish") },
          { area: "my", text: t("colMyanmar") },
          { area: "price", text: t("colPrice") },
        ].map((column) => (
          <Typography
            key={column.area}
            variant="caption"
            color="text.secondary"
            sx={{
              gridArea: column.area,
              textAlign: column.area === "price" ? "right" : undefined,
            }}
          >
            {column.text}
          </Typography>
        ))}
      </Box>

      <Stack spacing={{ xs: 2, md: 1 }}>
        {options.map((row, index) => {
          const number = index + 1;
          return (
            <Box
              key={index}
              sx={{
                ...rowGridSx,
                // Below md a divider between option blocks.
                "&:not(:first-of-type)": {
                  borderTop: { xs: "1px solid", md: "none" },
                  borderColor: "divider",
                  pt: { xs: 2, md: 0 },
                },
              }}
            >
              <LanguageTaggedField
                tag="en"
                tagBelowMdOnly
                ariaLabel={t("optionEn", { number })}
                placeholder={t("optionPlaceholder")}
                maxLength={ADDON_OPTION_NAME_MAX}
                value={row.name}
                onChange={(event) =>
                  updateOption(index, "name", event.target.value)
                }
                sx={{ gridArea: "en" }}
              />
              <LanguageTaggedField
                tag="my"
                tagBelowMdOnly
                myanmar
                ariaLabel={t("optionMy", { number })}
                placeholder={myanmarPlaceholder(row.name, {
                  empty: t("myanmarEmpty"),
                  shownIfEmpty: (name) => t("shownIfEmpty", { name }),
                })}
                maxLength={ADDON_OPTION_NAME_MAX}
                value={row.nameMy}
                onChange={(event) =>
                  updateOption(index, "nameMy", event.target.value)
                }
                sx={{ gridArea: "my" }}
              />
              <LanguageTaggedField
                tag="price"
                tagBelowMdOnly
                numeric
                ariaLabel={t("optionPrice", { number })}
                placeholder="0"
                endText={money.currency}
                value={row.price}
                onChange={(event) => {
                  // Keep only digits — avoids native type="number" quirks
                  // (blocked keys, scroll-wheel changes, mobile keypad
                  // differences) while still guaranteeing a clean integer.
                  const digitsOnly = event.target.value.replace(/[^0-9]/g, "");
                  updateOption(index, "price", digitsOnly);
                }}
                sx={{ gridArea: "price" }}
              />
              <IconButton
                onClick={() => removeOption(index)}
                disabled={options.length === 1}
                aria-label={t("removeOption", { number })}
                sx={{ gridArea: "remove", width: 44, height: 44 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        })}
      </Stack>

      <Button
        variant="outlined"
        onClick={addOption}
        startIcon={<AddIcon />}
        sx={{ mt: 2, minHeight: 44 }}
      >
        {t("addOption")}
      </Button>
    </Box>
  );
}
