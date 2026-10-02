import { MenuService } from "@/app/services";
import { requireBackofficeContext } from "@/app/lib/backofficeContext";
import { Box, Button, Typography } from "@mui/material";
import BOMenuCard from "@/app/components/BoMenuCard";
import NewItemFab, { NewItemFabSpacer } from "@/app/components/NewItemFab";

export default async function MenusPage() {
  const { context, fallback } = await requireBackofficeContext({
    signedOut: "Please sign in to view menus.",
  });
  if (!context) return fallback;
  const { companyId, location } = context;

  const menus = await MenuService.getMenusWithDetails(
    companyId,
    location.locationId,
  );

  return (
    <Box>
      {/* Desktop/tablet: normal button, top-right */}
      <Box
        sx={{
          display: { xs: "none", sm: "none", lg: "flex" },
          justifyContent: "flex-end",
          p: 2,
        }}
      >
        <Button
          variant="contained"
          href="/backoffice/menus/new"
          sx={{ mb: 2, ml: 1, gap: 1 }}
        >
          Create Menu
        </Button>
      </Box>
      {menus.length === 0 ? (
        <Box sx={{ p: 3 }}>
          <Typography color="text.secondary">No menu items yet.</Typography>
        </Box>
      ) : (
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
          {menus.map((menu) => (
            <BOMenuCard
              key={menu.id}
              item={{
                ...menu,
                description: menu.description ?? undefined,
              }}
            />
          ))}
        </Box>
      )}

      {/* Below lg: the floating "+" (and room for it under the grid). */}
      <NewItemFabSpacer hideFrom="lg" />
      <NewItemFab
        href="/backoffice/menus/new"
        label="Create menu"
        hideFrom="lg"
      />
    </Box>
  );
}
