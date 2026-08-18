"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Box, Button, Fab, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MenuCategoryCard, {
  MenuCategoryCardData,
} from "@/app/components/MenuCategoryCard";
import EditMenuCategoryDialog, {
  EditableMenuCategory,
} from "@/app/components/Editmenucategorydialog ";

interface MenuCategoriesGridProps {
  categories: MenuCategoryCardData[];
}

export default function MenuCategoriesGrid({
  categories,
}: MenuCategoriesGridProps) {
  const router = useRouter();
  const [editingCategory, setEditingCategory] =
    useState<EditableMenuCategory | null>(null);

  return (
    <>
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}
        >
          <Typography variant="h6">Menu Categories</Typography>
          <Link href="/backoffice/menu_categories/new">
            <Button
              variant="contained"
              size="small"
              sx={{ display: { xs: "none", sm: "inline-flex" } }}
            >
              + New Menu Category
            </Button>
          </Link>
        </Stack>

        {categories.length === 0 ? (
          <Typography color="text.secondary">
            No menu categories yet.
          </Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, 1fr)",
                sm: "repeat(3, 1fr)",
                md: "repeat(4, 1fr)",
                lg: "repeat(5, 1fr)",
                xl: "repeat(6, 1fr)",
              },
              gap: { xs: 1.5, sm: 2, md: 2.5 },
            }}
          >
            {categories.map((category) => (
              <MenuCategoryCard
                key={category.id}
                category={category}
                onClick={() =>
                  setEditingCategory({
                    id: category.id,
                    name: category.name,
                    isEnabledAtLocation: category.isEnabledAtLocation,
                  })
                }
              />
            ))}
          </Box>
        )}
      </Box>

      <Link href="/backoffice/menu_categories/new">
        <Fab
          color="primary"
          aria-label="New menu category"
          sx={{
            display: { xs: "flex", sm: "none" },
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1050,
          }}
        >
          <AddIcon />
        </Fab>
      </Link>

      <EditMenuCategoryDialog
        open={editingCategory !== null}
        category={editingCategory}
        onClose={() => setEditingCategory(null)}
        onSaved={() => router.refresh()}
      />
    </>
  );
}
