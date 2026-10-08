import Link from "next/link";
import { Box, Button, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { TableService } from "@/app/services";
import { requireBackofficeContext } from "@/app/lib/access/backofficeContext";
import TableCard from "./TableCard";

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
  const tables = await TableService.getTablesByLocation(location.locationId);

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
            // Phones: one full-width column. From sm: as many ~260–300px
            // cards as fit (two from ~600px).
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              sm: "repeat(auto-fill, minmax(260px, 300px))",
            },
            gap: { xs: 1, sm: 1.5 },
          }}
        >
          {/* The Counter QR first, then the tables in order. */}
          {[...tables]
            .sort(
              (a, b) =>
                Number(b.isCounter === true) - Number(a.isCounter === true),
            )
            .map((table) => (
              // Only what the card shows — never the whole row: the access
              // key (counterAccessKey) must not reach the browser.
              <TableCard
                key={table.id}
                table={{
                  id: table.id,
                  name: table.name,
                  qrcodeImageUrl: table.qrcodeImageUrl,
                  isArchived: table.isArchived,
                  isCounter: table.isCounter === true,
                }}
              />
            ))}
        </Box>
      )}
    </Box>
  );
}
