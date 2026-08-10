import { getSessionContext } from "@/app/lib/session";
import { Box, Typography } from "@mui/material";
import NewLocation from "./newLocation";

export default async function NewLocationPage() {
  const { role } = await getSessionContext();

  if (role !== "ADMIN") {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Only Admins can create locations.
        </Typography>
      </Box>
    );
  }

  return <NewLocation />;
}
