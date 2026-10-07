import { LocationService, MenuService, PermissionService } from "@/app/services";
import { requireBackofficeContext } from "@/app/lib/backofficeContext";
import { ASK_OWNER_HINTS, hasPermission } from "@/app/lib/permissions";
import { Box, Button, Stack, Typography } from "@mui/material";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import NewItemFab, { NewItemFabSpacer } from "@/app/components/NewItemFab";
import MenuGrid from "./MenuGrid";

export default async function MenusPage() {
  const { context, fallback } = await requireBackofficeContext({
    signedOut: "Please sign in to view menus.",
    // Managers see the list (they'll turn menus on/off here); creating
    // and editing are the owner's (menus/new, menus/[id]).
    access: "staff",
  });
  if (!context) return fallback;
  const { companyId, location, role, userId } = context;
  // Display only — creating a menu is the owner's (its page checks too).
  const isOwner = role === "ADMIN";

  const [menus, locationRow, granted] = await Promise.all([
    MenuService.getMenusWithDetails(companyId, location.locationId),
    LocationService.getLocationById(location.locationId),
    isOwner ? [] : PermissionService.getGrantedPermissions(userId),
  ]);
  // Display only — setMenuAvailableAction checks the permission itself.
  const canToggle = hasPermission(role, granted, "MENU_AVAILABILITY");
  const locationName = locationRow?.name ?? "this location";

  return (
    <Box>
      {/* Title first, then which location the switches act on (they
          are per location). Create Menu sits beside it from lg; below
          lg it's the floating "+". */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          px: { xs: 1, sm: 2, md: 3 },
          pt: { xs: 2, md: 3 },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6">
            Menus
          </Typography>
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ alignItems: "center", color: "text.secondary" }}
          >
            <PlaceOutlinedIcon fontSize="small" aria-hidden />
            <Typography variant="body2">
              Availability for: {locationName}
            </Typography>
          </Stack>
          {!canToggle && (
            <Typography variant="body2" color="text.secondary">
              {ASK_OWNER_HINTS.MENU_AVAILABILITY}
            </Typography>
          )}
        </Box>
        {isOwner && (
          <Button
            variant="contained"
            href="/backoffice/menus/new"
            sx={{ display: { xs: "none", lg: "inline-flex" }, flexShrink: 0 }}
          >
            Create Menu
          </Button>
        )}
      </Box>
      {menus.length === 0 ? (
        <Box sx={{ p: 3 }}>
          <Typography color="text.secondary">No menu items yet.</Typography>
        </Box>
      ) : (
        <MenuGrid
          menus={menus.map((menu) => ({
            ...menu,
            description: menu.description ?? undefined,
          }))}
          canToggle={canToggle}
          locationName={locationName}
        />
      )}

      {/* Below lg: the floating "+" (and room for it under the grid). */}
      {isOwner && (
        <>
          <NewItemFabSpacer hideFrom="lg" />
          <NewItemFab
            href="/backoffice/menus/new"
            label="Create menu"
            hideFrom="lg"
          />
        </>
      )}
    </Box>
  );
}
