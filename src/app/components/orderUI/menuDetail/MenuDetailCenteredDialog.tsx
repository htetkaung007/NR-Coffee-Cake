"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

/** Tablet / laptop / desktop centered dialog — the size it always had
 *  (480 wide, 85vh tall), plus the min values. */
const DIALOG = {
  minWidth: 320,
  minHeight: 320,
  maxWidth: 480,
  maxHeight: "85vh",
};

interface MenuDetailCenteredDialogProps {
  open: boolean;
  onClose: () => void;
  /** The sticky action area (MenuDetailFooter), or null. */
  footer: React.ReactNode;
  children: React.ReactNode;
}

/** The item detail as a centered dialog, for screens wider than a phone. */
export default function MenuDetailCenteredDialog({
  open,
  onClose,
  footer,
  children,
}: MenuDetailCenteredDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      sx={{
        "& .MuiDialog-paper": {
          minWidth: DIALOG.minWidth,
          minHeight: DIALOG.minHeight,
          maxWidth: DIALOG.maxWidth,
          maxHeight: DIALOG.maxHeight,
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogTitle sx={{ pr: 6, flexShrink: 0 }}>
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ flex: "1 1 auto", overflowY: "auto" }}>
        {children}
      </DialogContent>
      {footer}
    </Dialog>
  );
}
