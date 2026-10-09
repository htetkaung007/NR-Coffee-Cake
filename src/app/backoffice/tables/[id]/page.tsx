import { Box, Typography } from "@mui/material";
import { TableService } from "@/app/services";
import { requireBackofficeContext } from "@/app/lib/access/backofficeContext";
import EditTable from "./EditTable";

export default async function EditTablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tableId = Number(id);

  const { context, fallback } = await requireBackofficeContext({
    signedOut: "You must be signed in to manage tables.",
    access: "TABLES_MANAGE",
  });
  if (!context) return fallback;
  const { location, ...scope } = context;

  // Another company's table — or, for a manager, another location's —
  // reads as not found.
  const table = await TableService.getTableById(tableId, {
    ...scope,
    locationId: location.locationId,
  }).catch(() => null);
  if (!table) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">Table not found.</Typography>
      </Box>
    );
  }

  return (
    <EditTable
      table={{
        id: table.id,
        name: table.name,
        qrcodeImageUrl: table.qrcodeImageUrl,
        isArchived: table.isArchived,
      }}
    />
  );
}
