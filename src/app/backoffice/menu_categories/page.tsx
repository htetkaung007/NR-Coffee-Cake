import { Box, Typography } from "@mui/material";
import { AppService, MenuService } from "@/app/services";
import { getSessionContext } from "@/app/lib/session";
import MenuCategoriesGrid from "./[id]/page";

export default async function MenuCategoriesPage() {
  const { companyId, userId } = await getSessionContext();

  if (!companyId || !userId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Please sign in to view menu categories.
        </Typography>
      </Box>
    );
  }

  const selectedLocation = await AppService.getSelectedLocation(userId);
  if (!selectedLocation) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          No location selected. Please choose a location first.
        </Typography>
      </Box>
    );
  }

  const categories = await MenuService.getMenuCategoriesWithCounts(
    companyId,
    selectedLocation.locationId,
  );

  return (
    <MenuCategoriesGrid
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        menuCount: category._count.menuMenuCategory,
        isEnabledAtLocation: category.isEnabledAtLocation,
      }))}
    />
  );
}
