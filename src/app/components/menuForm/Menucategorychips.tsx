"use client";

import { Box, Chip, Stack, Typography } from "@mui/material";
import Link from "next/link";

export interface MenuCategoryOption {
  id: number;
  name: string;
}

interface MenuCategoryChipsProps {
  categories: MenuCategoryOption[];
  selectedCategoryIds: number[];
  onToggle: (id: number) => void;
}

export default function MenuCategoryChips({
  categories,
  selectedCategoryIds,
  onToggle,
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
        <Typography
          variant="caption"
          component={Link}
          href="/backoffice/menu_categories/new"
          sx={{
            color: "primary.main",
            textDecoration: "none",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          + Add Category
        </Typography>
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
