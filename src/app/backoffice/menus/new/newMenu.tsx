import { Box, Typography } from "@mui/material";
import { MenuService } from "@/app/services";
import { getSessionContext } from "@/app/lib/session";
import MenuForm from "@/app/components/MenuForm";

export default async function NewMenuPage() {
  const { companyId } = await getSessionContext();

  if (!companyId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Please sign in to create a menu.
        </Typography>
      </Box>
    );
  }

  const categories = await MenuService.getMenuCategories(companyId);

  return <MenuForm categories={categories} />;
}
