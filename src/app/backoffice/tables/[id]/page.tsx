import { Box, Typography } from "@mui/material";
import { TableService } from "@/app/services";
import { requireBackofficeAccess } from "@/app/lib/access/backofficeContext";
import EditTable from "./EditTable";

export default async function EditTablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tableId = Number(id);

  const { scope, fallback } = await requireBackofficeAccess({
    signedOut: "You must be signed in to manage tables.",
    access: "TABLES_MANAGE",
  });
  if (!scope) return fallback;

  const table = await TableService.getTableById(tableId).catch(() => null);
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
