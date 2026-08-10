import Link from "next/link";
import { Box, Button, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { AppService, LocationService } from "@/app/services";
import { getSessionContext } from "@/app/lib/session";
import LocationCard from "@/app/components/locationCard";

export default async function LocationsPage() {
  const { companyId, userId, role } = await getSessionContext();

  if (!companyId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Please sign in to view locations.
        </Typography>
      </Box>
    );
  }

  if (role !== "ADMIN") {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Only Admins can access Locations.
        </Typography>
      </Box>
    );
  }

  const [locations, selectedLocation] = await Promise.all([
    LocationService.getAllLocationsForCompany(companyId),
    userId ? AppService.getSelectedLocation(userId) : null,
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
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              sm: "repeat(3, 1fr)",
              md: "repeat(4, 1fr)",
              lg: "repeat(5, 1fr)",
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
