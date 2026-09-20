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
}

/** One addon group: its title (with a "Required" chip when it is), then
 *  a radio list (required — pick one) or a checkbox list (optional). */
export default function AddonCategorySection({
  category,
  selectedIds,
  variant,
  onSelectRequired,
  onToggleOptional,
}: AddonCategorySectionProps) {
  const isSheet = variant === "sheet";
  const rowSx = isSheet ? sheetRowSx : dialogRowSx;
  const labelPlacement = isSheet ? "start" : "end";

  return (
    <Box>
      <Divider sx={{ mb: 1.5 }} />
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          mb: 0.5,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {category.name}
        </Typography>
        {category.isRequired && (
          <Chip
            label="Required"
            size="small"
            color="error"
            variant="outlined"
            sx={{
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
              label={<AddonLabel addon={addon} variant={variant} />}
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
              label={<AddonLabel addon={addon} variant={variant} />}
              labelPlacement={labelPlacement}
              sx={rowSx}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

function AddonLabel({
  addon,
  variant,
}: {
  addon: Addon;
  variant: MenuDetailVariant;
}) {
  return (
    <Stack
      direction="row"
      sx={{
        width: "100%",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span>{addon.name}</span>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          ...(variant === "sheet" && { fontSize: SHEET_TEXT.small }),
        }}
        color={addon.price > 0 ? "error" : "success"}
      >
        {addon.price > 0 ? `+${addon.price.toLocaleString()} MMK` : "Free"}
      </Typography>
    </Stack>
  );
}
