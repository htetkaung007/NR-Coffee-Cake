import { Box, Typography } from "@mui/material";
import { AppService, MenuService } from "@/app/services";
import { getSessionContext } from "@/app/lib/session";
import MenuForm from "@/app/components/MenuForm";

export default async function EditMenuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const menuId = Number(id);

  const { companyId, userId } = await getSessionContext();
  if (!companyId || !userId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Please sign in to edit a menu.
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

  const [categories, menu] = await Promise.all([
    MenuService.getMenuCategories(companyId),
    MenuService.getMenuById(menuId, selectedLocation.locationId),
  ]);

  if (!menu) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">Menu not found.</Typography>
      </Box>
    );
  }

  return <MenuForm categories={categories} initialData={menu} />;
}
