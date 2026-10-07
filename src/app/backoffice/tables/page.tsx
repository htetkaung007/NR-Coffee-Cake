import Link from "next/link";
import { Box, Button, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { TableService } from "@/app/services";
import { requireBackofficeContext } from "@/app/lib/backofficeContext";
import TableCard from "@/app/components/TableCard";

export default async function TablesPage() {
  const { context, fallback } = await requireBackofficeContext({
    signedOut: "Please sign in to view tables.",
    noLocation: "Select a location first to view its tables.",
    access: "TABLES_MANAGE",
  });
  if (!context) return fallback;
  const { location } = context;

  // Tables are scoped to whichever location the user currently has
  // selected — same "selected location" concept the Menu list uses.
  const tables = await TableService.getTablesByLocation(
    location.locationId,
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
            // As many ≥ 240px columns as fit (one on a 320px phone).
            gridTemplateColumns: "repeat(auto-fill, minmax(min(240px, 100%), 1fr))",
            gap: { xs: 1, sm: 1.5 },
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
