"use client";

import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";

import AddonCategorySection from "./AddonCategorySection";
import MenuDetailHeader from "./MenuDetailHeader";
import NoteField from "./NoteField";
import QuantityStepper, { type QuantityControl } from "./QuantityStepper";
import { SHEET_TEXT } from "./sheetText";
import type { AddonCategory, MenuDetail, MenuDetailVariant } from "./types";

interface MenuDetailBodyProps {
  variant: MenuDetailVariant;
  loading: boolean;
  detail: MenuDetail | null;
  /** The item's addon groups, already in display order (required first). */
  categories: AddonCategory[];
  /** Picked addon ids, keyed by category id. */
  selected: Record<number, number[]>;
  onSelectRequired: (categoryId: number, addonId: number) => void;
  onToggleOptional: (categoryId: number, addonId: number) => void;
  quantity: QuantityControl;
  isSoldOut: boolean;
  showNote: boolean;
  note: string;
  onNoteChange: (next: string) => void;
  error: string | null;
}

/** The scrollable middle of the item detail: loading / couldn't-load
 *  states, or the item (header, sold-out notice, quantity on tablet /
 *  desktop, addon groups, note, error). */
export default function MenuDetailBody({
  variant,
  loading,
  detail,
  categories,
  selected,
  onSelectRequired,
  onToggleOptional,
  quantity,
  isSoldOut,
  showNote,
  note,
  onNoteChange,
  error,
}: MenuDetailBodyProps) {
  const isSheet = variant === "sheet";

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!detail) {
    return (
      <Typography
        color="text.secondary"
        sx={isSheet ? { fontSize: SHEET_TEXT.body } : undefined}
      >
        This item couldn&apos;t be loaded.
      </Typography>
    );
  }

  return (
    <Stack spacing={2.5}>
      <MenuDetailHeader detail={detail} variant={variant} />

      {isSoldOut && <Alert severity="warning">This item just sold out.</Alert>}

      {/* Tablet / desktop keep the stepper in the content; on phones it
         lives in the sticky footer instead (see MenuDetailFooter). */}
      {!isSheet && !isSoldOut && (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Quantity
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <QuantityStepper quantity={quantity} variant="plain" />
            {quantity.max <= 5 && (
              <Typography variant="caption" color="warning.main">
                Only {quantity.max} left
              </Typography>
            )}
          </Stack>
        </Box>
      )}

      {categories.map((category) => (
        <AddonCategorySection
          key={category.id}
          category={category}
          selectedIds={selected[category.id] ?? []}
          variant={variant}
          onSelectRequired={(addonId) => onSelectRequired(category.id, addonId)}
          onToggleOptional={(addonId) => onToggleOptional(category.id, addonId)}
        />
      ))}

      {showNote && (
        <NoteField value={note} onChange={onNoteChange} variant={variant} />
      )}

      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
