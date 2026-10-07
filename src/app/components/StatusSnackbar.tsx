"use client";

import { Alert, Snackbar } from "@mui/material";

/** A short outcome message: a switch saved, or the safe error. */
export interface StatusMessage {
  text: string;
  severity: "success" | "error";
}

/** The one top-centre snackbar the Backoffice on/off switches report to
 *  (Add-ons, Menus). Pass null to hide it. */
export default function StatusSnackbar({
  message,
  onClose,
}: {
  message: StatusMessage | null;
  onClose: () => void;
}) {
  return (
    <Snackbar
      open={message !== null}
      autoHideDuration={2000}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
    >
      <Alert
        severity={message?.severity ?? "success"}
        variant="filled"
        sx={{ width: "100%" }}
      >
        {message?.text}
      </Alert>
    </Snackbar>
  );
}
