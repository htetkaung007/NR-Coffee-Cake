import { Box, Typography } from "@mui/material";
import { MenuService } from "@/app/services";
import { getSessionContext } from "@/app/lib/session";
import NewAddon from "./newAddon";

export default async function NewAddonPage() {
  const { companyId } = await getSessionContext();

  if (!companyId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Please sign in to create an addon group.
        </Typography>
      </Box>
    );
  }

  const menusData = await MenuService.getMenus(companyId);
  const menus = menusData.map((menu) => ({ id: menu.id, name: menu.name }));

  return <NewAddon menus={menus} />;
}
