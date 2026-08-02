import { Box, Typography } from "@mui/material";
import { MenuService } from "@/app/services";
import { getSessionContext } from "@/app/lib/session";
import MenuCategoryCard from "@/app/components/MenuCategoryCard";

export default async function MenuCategoriesPage() {
  const { companyId } = await getSessionContext();

  if (!companyId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Please sign in to view menu categories.
        </Typography>
      </Box>
    );
  }

  const categories = await MenuService.getMenuCategoriesWithCounts(companyId);

  if (categories.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">No menu categories yet.</Typography>
      </Box>
    );
  }

  return (
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
        p: { xs: 1.5, sm: 2, md: 3 },
      }}
    >
      {categories.map((category) => (
        <MenuCategoryCard
          key={category.id}
          category={{
            id: category.id,
            name: category.name,
            menuCount: category._count.menuMenuCategory,
          }}
        />
      ))}
    </Box>
  );
}
