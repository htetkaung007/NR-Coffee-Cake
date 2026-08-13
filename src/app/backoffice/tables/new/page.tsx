import { getSessionContext } from "@/app/lib/session";
import { Box, Typography } from "@mui/material";
import NewTable from "./newTable";

export default async function NewTablePage() {
  const { companyId } = await getSessionContext();

  if (!companyId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          You must be signed in to create a table.
        </Typography>
      </Box>
    );
  }

  return <NewTable />;
}
