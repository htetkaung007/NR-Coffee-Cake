"use client";

import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useLocale, useTranslations } from "next-intl";
import { localizedText } from "@/app/lib/i18n/localizedText";

export interface MenuCategoryOption {
  id: number;
  name: string;
  /** The shop's Myanmar name — shown in the Myanmar Backoffice. */
  nameMy?: string | null;
}

interface MenuCategoryChipsProps {
  categories: MenuCategoryOption[];
  selectedCategoryIds: number[];
  onToggle: (id: number) => void;
  /** "+ New category" — opens the create dialog (no navigation). */
  onCreateCategory: () => void;
  /** Shown under the chips (and the label turns error-coloured) — in
   *  words, never colour alone. */
  error?: string;
}

const ERROR_ID = "menu-category-error";

export default function MenuCategoryChips({
  categories,
  selectedCategoryIds,
  onToggle,
  onCreateCategory,
  error,
}: MenuCategoryChipsProps) {
  const t = useTranslations("bo.menuForm");
  const locale = useLocale();
  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          mb: 1,
        }}
      >
        <Typography
          variant="body2"
          id="menu-category-label"
          sx={{ mb: 1, color: error ? "error.main" : undefined }}
        >
          {t("category")}
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon fontSize="small" />}
          onClick={onCreateCategory}
          sx={{ minHeight: 44 }}
        >
          {t("newCategory")}
        </Button>
      </Stack>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        role="group"
        aria-labelledby="menu-category-label"
        aria-describedby={error ? ERROR_ID : undefined}
        sx={{ flexWrap: "wrap" }}
      >
        {categories.map((category) => {
          const selected = selectedCategoryIds.includes(category.id);
          return (
            <Chip
              // The label's size is its caption Typography's.
              sx={{ fontWeight: 700 }}
              key={category.id}
              label={
                <Typography variant="caption" component="span">
                  {localizedText(locale, category.name, category.nameMy)}
                </Typography>
              }
              onClick={() => onToggle(category.id)}
              color={selected ? "primary" : "default"}
              variant={selected ? "filled" : "outlined"}
            />
          );
        })}
      </Stack>
      {error && (
        <Typography
          id={ERROR_ID}
          variant="caption"
          color="error"
          sx={{ display: "block", mt: 0.5 }}
        >
          {error}
        </Typography>
      )}
    </Box>
  );
}
