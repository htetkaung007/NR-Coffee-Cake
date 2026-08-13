import { Box, Typography } from "@mui/material";
import { TableService } from "@/app/services";
import { getSessionContext } from "@/app/lib/session";
import EditTable from "./editTable";

export default async function EditTablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tableId = Number(id);

  const { companyId } = await getSessionContext();
  if (!companyId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          You must be signed in to manage tables.
        </Typography>
      </Box>
    );
  }

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
