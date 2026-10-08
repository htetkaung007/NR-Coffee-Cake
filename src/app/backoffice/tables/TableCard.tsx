"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Card,
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  Stack,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import TableRestaurantOutlinedIcon from "@mui/icons-material/TableRestaurantOutlined";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import { rotateAccessKeyAction } from "./action";
import { downloadQrCode } from "@/app/lib/qr/downloadQrCode";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";

export interface TableCardData {
  id: number;
  name: string;
  qrcodeImageUrl: string | null;
  isArchived: boolean;
  /** The location's Counter QR (walk-in orders), not a seat. */
  isCounter: boolean;
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

/** Why there's no QR to show, in words (never a silent placeholder):
 *  - "missing": no QR image URL — the sign-up "Default Table" is created
 *    without one (and without an access key), and so is any table whose
 *    QR upload failed. "Create QR code" fixes it (rotateAccessKeyAction:
 *    a key, then the image — safe, since no QR was ever printed).
 *  - "broken": the URL is there but the image won't load (file storage
 *    unreachable, or the file is gone). */
type QrProblem = "missing" | "broken";

const QR_PROBLEM_TEXT: Record<QrProblem, string> = {
  missing: "QR not set up yet",
  broken: "QR image couldn't load — check file storage, then reload",
};

const actionButtonSx = {
  minHeight: 44,
  borderColor: "inputBorder",
  color: "text.primary",
  [hoverCapableMedia]: {
    "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
  },
} as const;

/** One QR action — normal contrast when it works; when there's no QR,
 *  disabled with the reason in a tooltip (the span keeps the tooltip
 *  working on a disabled button). */
function QrActionButton({
  label,
  icon,
  problem,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  problem: QrProblem | null;
  onClick: () => void;
}) {
  return (
    <Tooltip title={problem ? QR_PROBLEM_TEXT[problem] : ""}>
      <Box component="span" sx={{ display: "block", minWidth: 0 }}>
        <Button
          fullWidth
          size="small"
          variant="outlined"
          startIcon={icon}
          disabled={problem !== null}
          onClick={onClick}
          sx={actionButtonSx}
        >
          {label}
        </Button>
      </Box>
    </Tooltip>
  );
}

/** The square QR preview: the real image on white (scannable in dark
 *  mode too), or the reason there isn't one — with "Create QR code" when
 *  it was never set up. */
function QrPreview({
  table,
  qrcodeImageUrl,
  problem,
  onImageError,
}: {
  table: TableCardData;
  qrcodeImageUrl: string | null;
  problem: QrProblem | null;
  onImageError: () => void;
}) {
  const [isCreating, startCreating] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);

  function createQr() {
    setCreateError(null);
    startCreating(async () => {
      const result = await rotateAccessKeyAction(table.id);
      if (!result.success) setCreateError(result.error.message);
    });
  }

  return (
    <Box
      sx={{
        width: 180,
        maxWidth: "100%",
        alignSelf: "center",
        aspectRatio: "1 / 1",
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        textAlign: "center",
        ...(problem === null
          ? { bgcolor: "common.white", p: 1 }
          : { bgcolor: "action.hover", p: 1.5 }),
      }}
    >
      {problem === null && qrcodeImageUrl ? (
        <Box
          component="img"
          src={qrcodeImageUrl}
          alt={`QR code for ${table.name}`}
          onError={onImageError}
          sx={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : (
        <>
          <QrCode2Icon aria-hidden sx={{ color: "text.secondary" }} />
          <Typography variant="body2" color="text.secondary">
            {problem ? QR_PROBLEM_TEXT[problem] : ""}
          </Typography>
          {problem === "missing" && (
            <Button
              size="small"
              variant="outlined"
              onClick={createQr}
              disabled={isCreating}
              sx={actionButtonSx}
            >
              {isCreating ? "Creating…" : "Create QR code"}
            </Button>
          )}
          {createError && (
            <Typography variant="caption" color="error" role="alert">
              {createError}
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}

/**
 * A table card: the QR preview on top; then icon + name with the Edit
 * icon button; then Print QR and Save QR as an equal-width pair (stacked
 * only on very narrow phones). The Counter QR gets its own icon and a
 * "Counter" label so it never reads as a table (icon + label, not a
 * status colour — DESIGN.md Rule 13).
 */
export default function TableCard({ table }: TableCardProps) {
  // "" (the column default) means no QR, the same as null.
  const qrcodeImageUrl = table.qrcodeImageUrl || null;
  // The URL whose image failed to load — a new URL gets a fresh try.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const problem: QrProblem | null =
    qrcodeImageUrl === null
      ? "missing"
      : failedUrl === qrcodeImageUrl
        ? "broken"
        : null;
  const KindIcon = table.isCounter
    ? StorefrontOutlinedIcon
    : TableRestaurantOutlinedIcon;

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
        gap: 1.5,
      }}
    >
      <QrPreview
        table={table}
        qrcodeImageUrl={qrcodeImageUrl}
        problem={problem}
        onImageError={() => setFailedUrl(qrcodeImageUrl)}
      />

      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", minWidth: 0 }}
      >
        <KindIcon aria-hidden sx={{ color: "text.secondary", flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body1" sx={{ overflowWrap: "anywhere" }}>
            {table.name}
          </Typography>
          {table.isCounter && (
            <Typography variant="caption" color="text.secondary">
              Counter · walk-in orders
            </Typography>
          )}
        </Box>
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
        <Tooltip title="Edit">
          <IconButton
            component={Link}
            href={`/backoffice/tables/${table.id}`}
            aria-label={`Edit ${table.name}`}
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              color: "text.primary",
              [hoverCapableMedia]: { "&:hover": { bgcolor: "action.hover" } },
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* An equal-width pair; one per row only below 340px. */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 1,
          "@media (max-width: 339.95px)": { gridTemplateColumns: "1fr" },
        }}
      >
        <QrActionButton
          label="Print QR"
          icon={<PrintOutlinedIcon fontSize="small" />}
          problem={problem}
          onClick={() =>
            qrcodeImageUrl && handlePrintQrCode(qrcodeImageUrl, table.name)
          }
        />
        <QrActionButton
          label="Save QR"
          icon={<DownloadOutlinedIcon fontSize="small" />}
          problem={problem}
          onClick={() =>
            qrcodeImageUrl && downloadQrCode(qrcodeImageUrl, table.name)
          }
        />
      </Box>
    </Card>
  );
}
