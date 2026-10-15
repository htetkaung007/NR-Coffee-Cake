import Link from "next/link";
import { Box, Button, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { LocationService } from "@/app/services";
import { requireBackofficeAccess } from "@/app/lib/access/backofficeContext";
import LocationCard from "./LocationCard";

export default async function LocationsPage() {
  const { scope, fallback } = await requireBackofficeAccess({
    signedOut: "Please sign in to view locations.",
    access: "owner",
  });
  if (!scope) return fallback;
  const { companyId, userId } = scope;

  const [locations, selectedLocation] = await Promise.all([
    LocationService.getAllLocationsForCompany(companyId),
    LocationService.getSelectedLocation(userId, companyId),
  ]);

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Typography variant="h6">Locations</Typography>
        <Link href="/backoffice/locations/new" passHref>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ textTransform: "none" }}
          >
            New Location
          </Button>
        </Link>
      </Box>

      {locations.length === 0 ? (
        <Typography color="text.secondary">No locations yet.</Typography>
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
