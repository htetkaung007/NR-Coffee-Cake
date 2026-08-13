import Link from "next/link";
import { Box, Button, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { AppService, TableService } from "@/app/services";
import { getSessionContext } from "@/app/lib/session";
import TableCard from "@/app/components/TableCard";

export default async function TablesPage() {
  const { companyId, userId } = await getSessionContext();

  if (!companyId || !userId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Please sign in to view tables.
        </Typography>
      </Box>
    );
  }

  const selectedLocation = await AppService.getSelectedLocation(userId);
  if (!selectedLocation) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Select a location first to view its tables.
        </Typography>
      </Box>
    );
  }

  // Tables are scoped to whichever location the user currently has
  // selected — same "selected location" concept the Menu list uses.
  const tables = await TableService.getTablesByLocation(
    selectedLocation.locationId,
  );

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
        <Typography variant="h6">Tables</Typography>
        <Link href="/backoffice/tables/new" passHref>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ textTransform: "none" }}
          >
            New Table
          </Button>
        </Link>
      </Box>

      {tables.length === 0 ? (
        <Typography color="text.secondary">No tables yet.</Typography>
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
          {tables.map((table) => (
            <TableCard key={table.id} table={table} />
          ))}
        </Box>
      )}
    </Box>
  );
}
