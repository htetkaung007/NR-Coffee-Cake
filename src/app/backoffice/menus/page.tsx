import { AppService, MenuService } from "@/app/services";
import { getSessionContext } from "@/app/lib/session";

import { Box, Button, Typography } from "@mui/material";

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
    <Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", p: 2 }}>
        <Button
          variant="contained"
          href="/backoffice/menus/new"
          sx={{
            mb: 2,
            ml: 1,

            gap: 1,
          }}
        >
          Create Menu
        </Button>
      </Box>

      <Box
        sx={{
          minWidth: 360,
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
    </Box>
  );
}
