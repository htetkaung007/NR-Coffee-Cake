import { Box, Typography } from "@mui/material";
import { AddonService, MenuService } from "@/app/services";
import { getSessionContext } from "@/app/lib/session";
import NewAddon from "../new/newAddon";

export default async function EditAddonGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const addonCategoryId = Number(id);

  const { companyId } = await getSessionContext();
  if (!companyId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Please sign in to edit an addon group.
        </Typography>
      </Box>
    );
  }

  const [category, menusData, connectedMenuIds] = await Promise.all([
    AddonService.getAddonCategoryWithAddons(addonCategoryId),
    MenuService.getMenus(companyId),
    AddonService.getMenuIdsForAddonCategory(addonCategoryId),
  ]);

  if (!category) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Addon category not found.
        </Typography>
      </Box>
    );
  }

  const menus = menusData.map((menu) => ({ id: menu.id, name: menu.name }));

  return (
    <NewAddon
      menus={menus}
      initialData={{
        id: category.id,
        groupName: category.name,
        isRequired: category.isRequired,
        options: category.addons.map((addon) => ({
          id: addon.id,
          name: addon.name,
          price: addon.price,
        })),
        menuIds: connectedMenuIds,
      }}
    />
  );
}
