import { Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { useStaffMoney } from "@/app/lib/hooks/useStaffWords";

/**
 * The total row at the foot of every bill panel — the order detail's
 * bill (BillContent), the History detail and the New Order panel — so
 * all three read the same: a body1 label, and the amount as the one
 * emphasized number (h5, text.primary — never red).
 */
export default function BillTotal({
  label,
  amount,
  formatMoney,
  sx,
}: {
  label: string;
  amount: number;
  /** How the amount reads — default: the staff's money words, "8,997
   *  MMK" / "8,997 ကျပ်" (useStaffMoney). */
  formatMoney?: (amount: number) => string;
  /** Layout only (e.g. the gap to the button below). */
  sx?: SxProps<Theme>;
}) {
  const money = useStaffMoney();
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
        {(formatMoney ?? money.amount)(amount)}
      </Typography>
    </Stack>
  );
}
