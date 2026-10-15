"use client";

import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";

import AddonCategorySection from "./AddonCategorySection";
import MenuDetailHeader from "./MenuDetailHeader";
import NoteField from "./NoteField";
import { SHEET_TEXT } from "./sheetText";
import type { AddonCategory, MenuDetail, MenuDetailVariant } from "./types";
import { useOrderUiLabels } from "../OrderUiLabels";

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
  isSoldOut: boolean;
  showNote: boolean;
  note: string;
  onNoteChange: (next: string) => void;
  error: string | null;
  /** Each group's section element, by group id — so the "Please choose"
   *  line can bring the first missing one into view. */
  registerGroup?: (groupId: number, element: HTMLDivElement | null) => void;
}

/** The scrollable part of the item detail: loading / couldn't-load
 *  states, or the item — on the phone sheet: header, sold-out notice,
 *  addon groups, note, error; in the tablet / desktop dialog (its right
 *  column): sold-out notice, addon groups as tiles, note, error (the
 *  photo, name and price are MenuDetailAside's, the quantity is in the
 *  footer). */
export default function MenuDetailBody({
  variant,
  loading,
  detail,
  categories,
  selected,
  onSelectRequired,
  onToggleOptional,
  isSoldOut,
  showNote,
  note,
  onNoteChange,
  error,
  registerGroup,
}: MenuDetailBodyProps) {
  const labels = useOrderUiLabels().menuDetail;
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
        {labels.couldNotLoad}
      </Typography>
    );
  }

  return (
    <Stack spacing={2.5}>
      {isSheet && <MenuDetailHeader detail={detail} />}

      {isSoldOut && (
        // In the dialog it can be the first block: clear of the close
        // button in the top-right corner.
        <Alert severity="warning" sx={isSheet ? undefined : { mr: 5 }}>
          {labels.justSoldOut}
        </Alert>
      )}

      {categories.map((category, index) => (
        <AddonCategorySection
          key={category.id}
          isFirst={!isSheet && index === 0 && !isSoldOut}
          ref={(element) => registerGroup?.(category.id, element)}
          category={category}
          selectedIds={selected[category.id] ?? []}
          variant={variant}
          onSelectRequired={(addonId) => onSelectRequired(category.id, addonId)}
          onToggleOptional={(addonId) => onToggleOptional(category.id, addonId)}
        />
      ))}

      {showNote && (
        <Box
          // With no groups, the note is the dialog's first block.
          sx={!isSheet && categories.length === 0 ? { mr: 5 } : undefined}
        >
          <NoteField
            value={note}
            onChange={onNoteChange}
            variant={variant}
            showDivider={isSheet || categories.length > 0}
          />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
