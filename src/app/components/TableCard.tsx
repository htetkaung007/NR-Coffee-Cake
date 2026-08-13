"use client";

import Link from "next/link";
import { Card, Box, Typography, Chip, Button } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import TableRestaurantOutlinedIcon from "@mui/icons-material/TableRestaurantOutlined";

export interface TableCardData {
  id: number;
  name: string;
  qrcodeImageUrl: string | null;
  isArchived: boolean;
}

interface TableCardProps {
  table: TableCardData;
}

/**
 * Opens the table's QR code image in a new tab and triggers the
 * browser's native print dialog once it's loaded. No new library for
 * this — the QR code is already a plain image URL (qrcodeImageUrl),
 * so window.print() on a dedicated tab is the simplest thing that
 * works, and it's the same approach a receipt/label print flow would
 * use anyway.
 */
function handlePrintQrCode(qrcodeImageUrl: string, tableName: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return; // popup blocked — nothing we can do here

  printWindow.document.write(`
    <html>
      <head><title>QR Code — ${tableName}</title></head>
      <body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;">
        <img src="${qrcodeImageUrl}" style="max-width:90%;" onload="window.print()" />
      </body>
    </html>
  `);
  printWindow.document.close();
}

export default function TableCard({ table }: TableCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: { xs: 2, md: 2.5 },
        bgcolor: "background.paper",
        p: { xs: 1.5, sm: 2 },
        opacity: table.isArchived ? 0.6 : 1,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Box
        sx={{
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: 1.5,
          bgcolor: "action.hover",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <TableRestaurantOutlinedIcon
          sx={{ fontSize: 32, color: "text.secondary" }}
        />
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Typography variant="body1">{table.name}</Typography>
        {table.isArchived && (
          <Chip
            label={
              <Typography variant="caption" component="span">
                Archived
              </Typography>
            }
            size="small"
            color="default"
          />
        )}
      </Box>

      <Button
        size="small"
        variant="outlined"
        startIcon={<PrintOutlinedIcon sx={{ fontSize: 14 }} />}
        disabled={!table.qrcodeImageUrl}
        onClick={() =>
          table.qrcodeImageUrl &&
          handlePrintQrCode(table.qrcodeImageUrl, table.name)
        }
        sx={{ alignSelf: "flex-start", fontSize: "0.75rem" }}
      >
        Print QR Code
      </Button>

      <Button
        component={Link}
        href={`/backoffice/tables/${table.id}`}
        size="small"
        variant="outlined"
        startIcon={<EditIcon sx={{ fontSize: 14 }} />}
        sx={{ alignSelf: "flex-start", fontSize: "0.75rem" }}
      >
        Edit
      </Button>
    </Card>
  );
}
