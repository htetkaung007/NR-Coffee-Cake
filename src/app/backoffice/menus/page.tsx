import { AppService, MenuService } from "@/app/services";
import { getSessionContext } from "@/app/lib/session";
import MenuCard from "@/app/components/BoMenuCard";
import { Box, Typography } from "@mui/material";
import Link from "next/link";
import BOMenuCard from "@/app/components/BoMenuCard";

export default async function MenusPage() {
  const { companyId, userId } = await getSessionContext();

  if (!companyId || !userId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Please sign in to view menus.
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

  const menus = await MenuService.getMenusWithDetails(
    companyId,
    selectedLocation.locationId,
  );

  if (menus.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">No menu items yet.</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2, 1fr)",
          sm: "repeat(2, 1fr)",
          md: "repeat(3, 1fr)",
          lg: "repeat(4, 1fr)",
          xl: "repeat(5, 1fr)",
        },
        gap: { xs: 1.5, sm: 2, md: 2.5 },
        p: { xs: 1.5, sm: 2, md: 3 },
      }}
    >
      {/*  <Button component={Link} href="/backoffice/menus/new">
        + Create New Menu
      </Button> */}
      {menus.map((menu) => (
        <BOMenuCard key={menu.id} item={menu} />
      ))}
    </Box>
  );
}
