"use client";

import {
  Box,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";

import { SHEET_TEXT } from "./sheetText";
import type { Addon, AddonCategory, MenuDetailVariant } from "./types";
import { useOrderUiLabels } from "../OrderUiLabels";
import LocalizedName from "@/app/components/LocalizedName";

/** Phone addon row: name + price on the left, the radio / checkbox at the
 *  right edge, a hairline between rows. */
const sheetRowSx = {
  width: "100%",
  mx: 0,
  justifyContent: "space-between",
  borderBottom: "1px solid",
  borderColor: "divider",
  "&:last-of-type": { borderBottom: 0 },
  "& .MuiFormControlLabel-label": {
    flex: 1,
    fontSize: SHEET_TEXT.body,
    lineHeight: 1.5,
  },
};

/** Tablet / desktop addon row: control on the left, as before. */
const dialogRowSx = {
  width: "100%",
  mr: 0,
  "& .MuiFormControlLabel-label": { width: "100%" },
};

interface AddonCategorySectionProps {
  category: AddonCategory;
  /** Addon ids currently picked in this category. */
  selectedIds: number[];
  variant: MenuDetailVariant;
  onSelectRequired: (addonId: number) => void;
  onToggleOptional: (addonId: number) => void;
  /** The Backoffice's "Customer sees" preview only: in Myanmar, a name
   *  with no Myanmar twin gets a dotted warning underline. */
  markUntranslated?: boolean;
}

/** One addon group: its title (with a "Required" chip when it is), then
 *  a radio list (required — pick one) or a checkbox list (optional). */
export default function AddonCategorySection({
  category,
  selectedIds,
  variant,
  onSelectRequired,
  onToggleOptional,
  markUntranslated = false,
}: AddonCategorySectionProps) {
  const labelsAll = useOrderUiLabels();
  const labels = labelsAll.menuDetail;
  const isSheet = variant === "sheet";
  const rowSx = isSheet ? sheetRowSx : dialogRowSx;
  const labelPlacement = isSheet ? "start" : "end";

  return (
    <Box>
      {/* 16px above the group's title, 8px below it. */}
      <Divider sx={{ mb: 2 }} />
      <Stack
        direction="row"
        spacing={1}
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        {/* Larger than the option rows (body2), so each group reads as
            its own question; long names wrap (Myanmar too) instead of
            pushing the chip off a 320px screen. */}
        <Typography
          variant="subtitle1"
          component="h3"
          sx={{ fontWeight: 600, minWidth: 0, overflowWrap: "anywhere" }}
        >
          <ShopName
            en={category.name}
            my={category.nameMy}
            mark={markUntranslated}
          />
        </Typography>
        {category.isRequired && (
          <Chip
            label={labels.required}
            size="small"
            color="error"
            variant="outlined"
            sx={{
              flexShrink: 0,
              height: 20,
              fontSize: isSheet ? "0.65rem" : "0.7rem",
              fontWeight: 600,
              borderRadius: 1,
            }}
          />
        )}
      </Stack>

      {category.isRequired ? (
        <RadioGroup
          value={selectedIds[0] ?? ""}
          onChange={(event) => onSelectRequired(Number(event.target.value))}
        >
          {category.addons.map((addon) => (
            <FormControlLabel
              key={addon.id}
              value={addon.id}
              disabled={!addon.isAvailable}
              control={<Radio size="small" />}
              label={
                <AddonLabel
                  addon={addon}
                  variant={variant}
                  markUntranslated={markUntranslated}
                />
              }
              labelPlacement={labelPlacement}
              sx={rowSx}
            />
          ))}
        </RadioGroup>
      ) : (
        <Stack>
          {category.addons.map((addon) => (
            <FormControlLabel
              key={addon.id}
              control={
                <Checkbox
                  size="small"
                  checked={selectedIds.includes(addon.id)}
                  disabled={!addon.isAvailable}
                  onChange={() => onToggleOptional(addon.id)}
                />
              }
              label={
                <AddonLabel
                  addon={addon}
                  variant={variant}
                  markUntranslated={markUntranslated}
                />
              }
              labelPlacement={labelPlacement}
              sx={rowSx}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

/** A group / option name in the customer's language (with the
 *  preview's untranslated marker when asked). */
function ShopName({
  en,
  my,
  mark,
}: {
  en: string;
  my: string | null | undefined;
  mark: boolean;
}) {
  const { locale } = useOrderUiLabels();
  return (
    <LocalizedName locale={locale} en={en} my={my} markUntranslated={mark} />
  );
}

function AddonLabel({
  addon,
  variant,
  markUntranslated,
}: {
  addon: Addon;
  variant: MenuDetailVariant;
  markUntranslated: boolean;
}) {
  const { menuDetail: labels, priceDelta } = useOrderUiLabels();
  return (
    <Stack
      direction="row"
      sx={{
        width: "100%",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span>
        <ShopName en={addon.name} my={addon.nameMy} mark={markUntranslated} />
      </span>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          ...(variant === "sheet" && { fontSize: SHEET_TEXT.small }),
          // The theme's menu price color (the storefront's red; never red
          // under the Backoffice theme) — "Free" stays success.
          color: addon.price > 0 ? "decor.price" : "success.main",
        }}
      >
        {addon.price > 0 ? priceDelta(addon.price) : labels.free}
      </Typography>
    </Stack>
  );
}
