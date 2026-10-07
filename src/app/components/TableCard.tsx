"use client";

import Link from "next/link";
import {
  Card,
  Box,
  Typography,
  Chip,
  Button,
  Stack,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import TableRestaurantOutlinedIcon from "@mui/icons-material/TableRestaurantOutlined";
import { downloadQrCode } from "../lib/qr/downloadQrCode";
import { hoverCapableMedia } from "../lib/theme/sharedThemeTokens";

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

/** Why Print / Save QR are off: the table has no QR image yet. The
 *  sign-up "Default Table" is created without one; uploading a logo in
 *  Edit generates it. */
const NO_QR_HINT = "No QR code yet — upload a logo in Edit to create it";

/** One QR action — normal contrast when enabled; when the table has no
 *  QR image, disabled with the reason in a tooltip (the span keeps the
 *  tooltip working on a disabled button). */
function QrActionButton({
  label,
  icon,
  isEnabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  isEnabled: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip title={isEnabled ? "" : NO_QR_HINT}>
      <Box component="span">
        <Button
          size="small"
          variant="outlined"
          startIcon={icon}
          disabled={!isEnabled}
          onClick={onClick}
          sx={actionButtonSx}
        >
          {label}
        </Button>
      </Box>
    </Tooltip>
  );
}

const actionButtonSx = {
  minHeight: 44,
  borderColor: "inputBorder",
  color: "text.primary",
  [hoverCapableMedia]: {
    "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
  },
} as const;

/**
 * A compact table row-card: icon + name (+ Archived) on top, then Print
 * QR · Save QR · Edit on one line where it fits (wrapping on phones).
 * The QR image itself is shown on the table's Edit page.
 */
export default function TableCard({ table }: TableCardProps) {
  const qrcodeImageUrl = table.qrcodeImageUrl || null;
  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.paper",
        p: 1.5,
        opacity: table.isArchived ? 0.6 : 1,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
        <TableRestaurantOutlinedIcon
          fontSize="small"
          aria-hidden
          sx={{ color: "text.secondary", flexShrink: 0 }}
        />
        <Typography
          variant="body1"
          sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}
        >
          {table.name}
        </Typography>
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
      </Stack>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        <QrActionButton
          label="Print QR"
          icon={<PrintOutlinedIcon fontSize="small" />}
          isEnabled={qrcodeImageUrl !== null}
          onClick={() =>
            qrcodeImageUrl && handlePrintQrCode(qrcodeImageUrl, table.name)
          }
        />
        <QrActionButton
          label="Save QR"
          icon={<DownloadOutlinedIcon fontSize="small" />}
          isEnabled={qrcodeImageUrl !== null}
          onClick={() =>
            qrcodeImageUrl && downloadQrCode(qrcodeImageUrl, table.name)
          }
        />
        <Button
          component={Link}
          href={`/backoffice/tables/${table.id}`}
          size="small"
          variant="outlined"
          startIcon={<EditIcon fontSize="small" />}
          sx={actionButtonSx}
        >
          Edit
        </Button>
      </Box>
    </Card>
  );
}
