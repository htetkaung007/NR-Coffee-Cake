import { getTranslations } from "next-intl/server";
import { Box, Typography } from "@mui/material";
import ListPageHeader from "@/app/components/ListPageHeader";
import { LocationService } from "@/app/services";
import { requireBackofficeAccess } from "@/app/lib/access/backofficeContext";
import LocationCard from "./LocationCard";

export default async function LocationsPage() {
  const { scope, fallback } = await requireBackofficeAccess({
    access: "owner",
  });
  if (!scope) return fallback;
  const t = await getTranslations("bo.locations");
  const { companyId, userId } = scope;

  const [locations, selectedLocation] = await Promise.all([
    LocationService.getAllLocationsForCompany(companyId),
    LocationService.getSelectedLocation(userId, companyId),
  ]);

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <ListPageHeader
        title={t("title")}
        newHref="/backoffice/locations/new"
        newLabel={t("newLocation")}
      />

      {locations.length === 0 ? (
        <Typography color="text.secondary">{t("noLocations")}</Typography>
      ) : (
        <Box
          sx={{
            display: "grid",
            // From sm the permanent sidebar takes 260px, so columns
            // follow the content width, not the viewport: as many
            // ≥180px cards as fit (auto-fill keeps a few cards at that
            // size on a wide screen instead of stretching them).
            gridTemplateColumns: {
              xs: "repeat(1, 1fr)",
              sm: "repeat(auto-fill, minmax(250px, 1fr))",
            },
            gap: { xs: 1.5, sm: 2, md: 2.5 },
          }}
        >
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              isSelected={selectedLocation?.locationId === location.id}
              canSwitch
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
