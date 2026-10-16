"use client";

import { useId, useState, useTransition } from "react";
import {
  Box,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import { rotateAccessKeyAction } from "./action";

/**
 * The table card's ⋯ menu — today one action, "New QR code", on every
 * table and the Counter. It rotates the access key and renders a new QR
 * image (rotateAccessKeyAction): use it when a QR is misused or the
 * shop's address / IP changes. Every old copy stops scanning at once,
 * so it asks first (DESIGN.md Rule 21). Open bills and table sessions
 * aren't touched — only new scans need the new QR. The action enforces
 * the permission (TABLES_MANAGE or owner); this menu is display only.
 */
export default function NewQrCodeMenu({
  tableId,
  tableName,
}: {
  tableId: number;
  tableName: string;
}) {
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openConfirm() {
    setAnchor(null);
    setError(null);
    setConfirmOpen(true);
  }

  function makeNewQr() {
    setError(null);
    startTransition(async () => {
      const result = await rotateAccessKeyAction(tableId);
      if (result.success) setConfirmOpen(false);
      else setError(result.error.message);
    });
  }

  return (
    <>
      <Tooltip title="More">
        <IconButton
          aria-label={`More for ${tableName}`}
          aria-haspopup="menu"
          aria-controls={anchor ? menuId : undefined}
          aria-expanded={anchor ? true : undefined}
          onClick={(event) => setAnchor(event.currentTarget)}
          sx={{
            width: 44,
            height: 44,
            flexShrink: 0,
            color: "text.primary",
            [hoverCapableMedia]: { "&:hover": { bgcolor: "action.hover" } },
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={openConfirm} sx={{ minHeight: 44 }}>
          <ListItemIcon>
            <QrCode2Icon fontSize="small" />
          </ListItemIcon>
          <ListItemText>New QR code</ListItemText>
        </MenuItem>
      </Menu>
      <ConfirmDialog
        open={confirmOpen}
        title={`Make a new QR code for ${tableName}?`}
        message={
          <>
            The old QR — printed or photographed — stops working at once.
            Print and put up the new one.
            {error && (
              <Box component="span" sx={{ display: "block", mt: 1 }}>
                <Typography
                  variant="body2"
                  component="span"
                  color="error"
                  role="alert"
                >
                  {error}
                </Typography>
              </Box>
            )}
          </>
        }
        confirmLabel="Make new QR"
        pendingLabel="Making…"
        destructive
        pending={isPending}
        onConfirm={makeNewQr}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
