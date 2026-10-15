"use client";

import { forwardRef } from "react";
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
import { alpha, type Theme } from "@mui/material/styles";

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

/** Tablet / desktop: the options as a grid of tiles — 2 columns once the
 *  column is ≥ 420px wide (a container query on the scrolling column),
 *  1 below. */
const tileGridSx = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: 1,
  "@container (min-width: 420px)": {
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
} as const;

/** One option tile — the WHOLE tile is the label of its radio / checkbox
 *  (one control). Selected: a 2px primary edge drawn as the 1px border +
 *  a 1px inset ring, so the box never changes size. */
function tileSx(selected: boolean) {
  return (theme: Theme) => ({
    m: 0,
    width: "100%",
    minHeight: 48,
    pr: 1.5,
    border: "1px solid",
    borderColor: selected ? "primary.main" : "divider",
    borderRadius: 1,
    boxShadow: selected
      ? `inset 0 0 0 1px ${theme.palette.primary.main}`
      : "none",
    bgcolor: selected
      ? alpha(theme.palette.primary.main, 0.06)
      : "background.paper",
    transition: "background-color 150ms ease, border-color 150ms ease",
    "& .MuiFormControlLabel-label": { flex: 1, minWidth: 0 },
  });
}

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
  /** The dialog's first block: no divider above it (dividers only go
   *  BETWEEN groups), and its header keeps clear of the dialog's
   *  top-right close button. */
  isFirst?: boolean;
}

/**
 * One addon group: its title and a radio list (required — pick one) or
 * a checkbox list (optional).
 * - sheet (phone): rows with the control on the right, a "Required" chip
 *   (warning) beside the title — as before.
 * - dialog (tablet / desktop): title + "Choose 1" / "Choose any", a
 *   status chip (Required → ✓ Done; Optional), and the options as tiles.
 * The section's root takes a ref and focus (tabIndex -1), so the
 * "Please choose: …" line can bring a missing group into view.
 */
const AddonCategorySection = forwardRef<
  HTMLDivElement,
  AddonCategorySectionProps
>(function AddonCategorySection(
  {
    category,
    selectedIds,
    variant,
    onSelectRequired,
    onToggleOptional,
    markUntranslated = false,
    isFirst = false,
  },
  ref,
) {
  const labels = useOrderUiLabels().menuDetail;
  const isSheet = variant === "sheet";
  const isAnswered = selectedIds.length > 0;
  const headingId = `addon-group-${category.id}-title`;

  const title = (
    <Typography
      id={headingId}
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
  );

  const optionLabel = (addon: Addon) => (
    <AddonLabel
      addon={addon}
      variant={variant}
      markUntranslated={markUntranslated}
    />
  );

  return (
    <Box ref={ref} tabIndex={-1} sx={{ outline: "none", scrollMarginTop: 16 }}>
      {/* 16px above the group's title, 8px below it. */}
      {!isFirst && <Divider sx={{ mb: 2 }} />}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
          // The 44px close button sits 12px in; + 8px → its chip stays
          // clear of it (24px column padding + 40px = 64px from the edge).
          ...(isFirst && { pr: 5 }),
        }}
      >
        {isSheet ? (
          title
        ) : (
          <Box sx={{ minWidth: 0 }}>
            {title}
            <Typography variant="caption" component="p" color="text.secondary">
              {category.isRequired ? labels.chooseOne : labels.chooseAny}
            </Typography>
          </Box>
        )}
        {isSheet ? (
          category.isRequired && (
            <StatusChip tone="warning" label={labels.required} />
          )
        ) : category.isRequired ? (
          isAnswered ? (
            <StatusChip tone="success" label={labels.done} />
          ) : (
            <StatusChip tone="warning" label={labels.required} />
          )
        ) : (
          <StatusChip tone="neutral" label={labels.optional} />
        )}
      </Stack>

      {category.isRequired ? (
        <RadioGroup
          aria-labelledby={headingId}
          value={selectedIds[0] ?? ""}
          onChange={(event) => onSelectRequired(Number(event.target.value))}
          sx={isSheet ? undefined : tileGridSx}
        >
          {category.addons.map((addon) => (
            <FormControlLabel
              key={addon.id}
              value={addon.id}
              disabled={!addon.isAvailable}
              control={<Radio size="small" />}
              label={optionLabel(addon)}
              labelPlacement={isSheet ? "start" : "end"}
              sx={isSheet ? sheetRowSx : tileSx(selectedIds.includes(addon.id))}
            />
          ))}
        </RadioGroup>
      ) : (
        <Box
          role="group"
          aria-labelledby={headingId}
          sx={
            isSheet ? { display: "flex", flexDirection: "column" } : tileGridSx
          }
        >
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
              label={optionLabel(addon)}
              labelPlacement={isSheet ? "start" : "end"}
              sx={isSheet ? sheetRowSx : tileSx(selectedIds.includes(addon.id))}
            />
          ))}
        </Box>
      )}
    </Box>
  );
});

export default AddonCategorySection;

/** A group's state as a small chip — words always (never colour alone):
 *  warning "Required" until answered, success "✓ Done", neutral
 *  "Optional". Text in the roles' text shades (≥ 4.5:1). */
function StatusChip({
  tone,
  label,
}: {
  tone: "warning" | "success" | "neutral";
  label: string;
}) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={
        <Typography variant="caption" component="span">
          {label}
        </Typography>
      }
      sx={(theme) => {
        if (tone === "neutral") {
          return {
            flexShrink: 0,
            color: "text.secondary",
            borderColor: "divider",
          };
        }
        const role = theme.palette[tone];
        const text =
          (tone === "warning"
            ? theme.palette.warningText
            : theme.palette.successText) ?? theme.palette.text.primary;
        return {
          flexShrink: 0,
          color: text,
          borderColor: role.main,
          bgcolor: alpha(role.main, 0.12),
        };
      }}
    />
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
  const isSheet = variant === "sheet";
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        width: "100%",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      {isSheet ? (
        <span>
          <ShopName en={addon.name} my={addon.nameMy} mark={markUntranslated} />
        </span>
      ) : (
        <Typography
          variant="body2"
          component="span"
          sx={{ fontWeight: 600, minWidth: 0, overflowWrap: "anywhere" }}
        >
          <ShopName en={addon.name} my={addon.nameMy} mark={markUntranslated} />
        </Typography>
      )}
      <Typography
        variant="body2"
        component="span"
        sx={(theme) => ({
          flexShrink: 0,
          whiteSpace: "nowrap",
          fontWeight: 600,
          ...(isSheet && { fontSize: SHEET_TEXT.small }),
          // The menu card's price tone (decor.price: the storefront's
          // red; text.primary under the Backoffice theme). "Free" in the
          // success role's text shade.
          color:
            addon.price > 0
              ? theme.palette.decor.price
              : (theme.palette.successText ?? theme.palette.success.main),
        })}
      >
        {addon.price > 0 ? priceDelta(addon.price) : labels.free}
      </Typography>
    </Stack>
  );
}
