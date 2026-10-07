"use client";

import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

export interface MenuCategoryOption {
  id: number;
  name: string;
}

interface MenuCategoryChipsProps {
  categories: MenuCategoryOption[];
  selectedCategoryIds: number[];
  onToggle: (id: number) => void;
  /** "+ New category" — opens the create dialog (no navigation). */
  onCreateCategory: () => void;
}

export default function MenuCategoryChips({
  categories,
  selectedCategoryIds,
  onToggle,
  onCreateCategory,
}: MenuCategoryChipsProps) {
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
        <Typography variant="body2" sx={{ mb: 1 }}>
          Menu Category
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon fontSize="small" />}
          onClick={onCreateCategory}
          sx={{ minHeight: 44 }}
        >
          New category
        </Button>
      </Stack>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        {categories.map((category) => {
          const selected = selectedCategoryIds.includes(category.id);
          return (
            <Chip
              sx={{
                fontWeight: 700,
                fontSize: { xs: "0.72rem", sm: "0.8rem" },
              }}
              key={category.id}
              label={
                <Typography variant="caption" component="span">
                  {category.name}
                </Typography>
              }
              onClick={() => onToggle(category.id)}
              color={selected ? "primary" : "default"}
              variant={selected ? "filled" : "outlined"}
            />
          );
        })}
      </Stack>
    </Box>
  );
}
