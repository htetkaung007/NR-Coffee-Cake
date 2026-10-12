"use client";

import { useId, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import type { ActionResult } from "@/app/lib/actionResult";
import {
  VOID_NOTE_MAX_LENGTH,
  VOID_REASONS,
  voidReasonLabel,
  type VoidReason,
} from "@/app/lib/order/voids";

/** What the dialog asks the page to do. */
export interface VoidRequest {
  quantity: number;
  reason: VoidReason;
  note: string | null;
  returnToStock: boolean;
}

const stepperSx = {
  width: 44,
  height: 44,
  border: 1,
  borderColor: "divider",
  borderRadius: 1,
} as const;

/**
 * "Void Latte?" — staff take items back off an accepted, unpaid order:
 * how many (a stepper, 1 … what's left; hidden when only one is left),
 * why (one reason, required), a note for Other only, and whether the
 * units go back into stock (on by default — off when they were already
 * made). "Void item" is the destructive confirm (error colour, DESIGN.md
 * Rule 21) and stays off until a reason is picked. While it runs every
 * control is disabled and the dialog can't be dismissed; an error shows
 * inside it. Opens with nothing picked, so a stray Enter voids nothing.
 */
export default function VoidItemDialog({
  open,
  menuName,
  remaining,
  onClose,
  onVoid,
}: {
  open: boolean;
  menuName: string;
  /** Units still on the line — the most that can be voided. */
  remaining: number;
  onClose: () => void;
  onVoid: (request: VoidRequest) => Promise<ActionResult<unknown>>;
}) {
  const titleId = useId();
  const reasonLabelId = useId();
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState<VoidReason | null>(null);
  const [note, setNote] = useState("");
  const [returnToStock, setReturnToStock] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // A fresh form each time it opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuantity(1);
      setReason(null);
      setNote("");
      setReturnToStock(true);
      setError(null);
    }
  }

  function close() {
    if (!isPending) onClose();
  }

  async function submit() {
    if (!reason || isPending) return;
    setError(null);
    setIsPending(true);
    const result = await onVoid({
      quantity,
      reason,
      note: reason === "OTHER" ? note : null,
      returnToStock,
    });
    setIsPending(false);
    if (result.success) onClose();
    else setError(result.error.message);
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="xs"
      aria-labelledby={titleId}
      slotProps={{
        paper: {
          sx: { m: { xs: 2 }, width: { xs: "calc(100% - 32px)", sm: "100%" } },
        },
      }}
    >
      <Box
        component="form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        <DialogTitle id={titleId} sx={{ overflowWrap: "anywhere" }}>
          Void {menuName}?
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              It comes off the bill. The line stays on the order, struck
              through, with the reason.
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}

            {remaining > 1 && (
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  How many
                </Typography>
                <IconButton
                  aria-label="One fewer"
                  disabled={isPending || quantity <= 1}
                  onClick={() => setQuantity((value) => value - 1)}
                  sx={stepperSx}
                >
                  <RemoveIcon fontSize="small" />
                </IconButton>
                <Typography
                  variant="body1"
                  aria-live="polite"
                  aria-label={`Void ${quantity} of ${remaining}`}
                  sx={{ minWidth: 32, textAlign: "center" }}
                >
                  {quantity}
                </Typography>
                <IconButton
                  aria-label="One more"
                  disabled={isPending || quantity >= remaining}
                  onClick={() => setQuantity((value) => value + 1)}
                  sx={stepperSx}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Stack>
            )}

            <FormControl disabled={isPending}>
              <FormLabel id={reasonLabelId}>Reason</FormLabel>
              <RadioGroup
                aria-labelledby={reasonLabelId}
                value={reason ?? ""}
                onChange={(event) => setReason(event.target.value as VoidReason)}
              >
                {VOID_REASONS.map((value) => (
                  <FormControlLabel
                    key={value}
                    value={value}
                    control={<Radio />}
                    label={voidReasonLabel(value)}
                    sx={{ minHeight: 44 }}
                  />
                ))}
              </RadioGroup>
            </FormControl>

            {reason === "OTHER" && (
              <TextField
                label="Note (optional)"
                placeholder="e.g. spilled before serving"
                fullWidth
                value={note}
                disabled={isPending}
                onChange={(event) => setNote(event.target.value)}
                slotProps={{
                  htmlInput: { maxLength: VOID_NOTE_MAX_LENGTH },
                  formHelperText: { component: "div" },
                }}
                helperText={
                  <Box
                    component="span"
                    sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}
                  >
                    <span>Staff only — the customer never sees it.</span>
                    <Box component="span" sx={{ flexShrink: 0 }}>
                      {note.length}/{VOID_NOTE_MAX_LENGTH}
                    </Box>
                  </Box>
                }
              />
            )}

            <FormControlLabel
              control={
                <Checkbox
                  checked={returnToStock}
                  disabled={isPending}
                  onChange={(event) => setReturnToStock(event.target.checked)}
                />
              }
              label="Put back in stock"
              sx={{ minHeight: 44 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={close} disabled={isPending} sx={{ minHeight: 44 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            disabled={isPending || reason === null}
            sx={{ minHeight: 44 }}
          >
            {isPending ? "Voiding…" : "Void item"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
