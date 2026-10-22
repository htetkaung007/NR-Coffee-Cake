import { LocationService, MenuService, PermissionService } from "@/app/services";
import { requireBackofficeContext } from "@/app/lib/access/backofficeContext";
import { hasPermission } from "@/app/lib/access/permissions";
import { getTranslations } from "next-intl/server";
import { Box, Button, Stack, Typography } from "@mui/material";
import { touchTabletMedia } from "@/app/lib/theme/sharedThemeTokens";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import NewItemFab, { NewItemFabSpacer } from "@/app/components/NewItemFab";
import MenuGrid from "./MenuGrid";
import MenuStatusChips from "./MenuStatusChips";
import {
  countMenusByStatus,
  filterMenusByStatus,
  parseMenuStatusFilter,
} from "@/app/lib/menu/menuStatusFilter";

export default async function MenusPage({
  searchParams,
}: {
  /** ?status=soldOut | unavailable — the chips' filter (untrusted:
   *  anything else is "all"). */
  searchParams: Promise<{ status?: string }>;
}) {
  const filter = parseMenuStatusFilter((await searchParams).status);
  const { context, fallback } = await requireBackofficeContext({
    // Managers see the list (they'll turn menus on/off here); creating
    // and editing are the owner's (menus/new, menus/[id]).
    access: "staff",
  });
  if (!context) return fallback;
  const tPermissions = await getTranslations("bo.permissions");
  const t = await getTranslations("bo.menus");
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
  const locationName = locationRow?.name ?? t("thisLocation");
  // The chips filter, never reorder: the cards keep their usual order.
  const counts = countMenusByStatus(menus);
  const shownMenus = filterMenusByStatus(menus, filter);

  return (
    // The same page padding and header spacing as the Tables page.
    // Touch tablets: 16px on top and a 16px header gap, so more of the
    // grid fits the screen.
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, [touchTabletMedia]: { pt: 2 } }}>
      {/* Title first, then which location the switches act on (they
          are per location). Create Menu sits beside it from lg; below
          lg it's the floating "+". */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          mb: 3,
          [touchTabletMedia]: { mb: 2 },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" component="h1">
            {t("title")}
          </Typography>
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ alignItems: "center", color: "text.secondary" }}
          >
            <PlaceOutlinedIcon fontSize="small" aria-hidden />
            <Typography variant="body2">
              {t("availabilityFor", { location: locationName })}
            </Typography>
          </Stack>
          {!canToggle && (
            <Typography variant="body2" color="text.secondary">
              {tPermissions("askOwner.MENU_AVAILABILITY")}
            </Typography>
          )}
        </Box>
        {isOwner && (
          <Button
            variant="contained"
            href="/backoffice/menus/new"
            sx={{ display: { xs: "none", lg: "inline-flex" }, flexShrink: 0 }}
          >
            {t("createMenu")}
          </Button>
        )}
      </Box>
      {menus.length === 0 ? (
        <Typography color="text.secondary">{t("noMenus")}</Typography>
      ) : (
        <>
          <MenuStatusChips selected={filter} counts={counts} />
          {shownMenus.length === 0 ? (
            // The chips stay; one muted line says the filter is empty.
            <Typography variant="body2" color="text.secondary">
              {filter === "soldOut" ? t("emptySoldOut") : t("emptyOff")}
            </Typography>
          ) : (
            <MenuGrid
              menus={shownMenus.map((menu) => ({
                ...menu,
                description: menu.description ?? undefined,
              }))}
              canToggle={canToggle}
              locationName={locationName}
            />
          )}
        </>
      )}

      {/* Below lg: the floating "+" (and room for it under the grid). */}
      {isOwner && (
        <>
          <NewItemFabSpacer hideFrom="lg" />
          <NewItemFab
            href="/backoffice/menus/new"
            label={t("createMenuFab")}
            hideFrom="lg"
          />
        </>
      )}
    </Box>
  );
}
