import { Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { formatAmount } from "@/app/lib/orderFormat";

/**
 * The total row at the foot of every bill panel — the order detail's
 * bill (BillContent), the History detail and the New Order panel — so
 * all three read the same: a body1 label, and the amount as the one
 * emphasized number (h5, text.primary — never red).
 */
export default function BillTotal({
  label,
  amount,
  sx,
}: {
  label: string;
  amount: number;
  /** Layout only (e.g. the gap to the button below). */
  sx?: SxProps<Theme>;
}) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={[
        { justifyContent: "space-between", alignItems: "baseline" },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Typography variant="body1">{label}</Typography>
      <Typography component="p" variant="h5">
        {formatAmount(amount)}
      </Typography>
    </Stack>
  );
}
