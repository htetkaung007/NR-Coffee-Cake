"use client";

import { Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import { useCustomerLabels } from "@/app/lib/hooks/useCustomerLabels";
import type { RemovedByStaff } from "@/app/lib/order/roundLine";

/**
 * A customer line's "Removed by staff · <reasons>" note — the whole line
 * ("removedAll") or some of it ("removedSome", with the count). Never the
 * staff note or who (DESIGN.md §26). The cart's lines and the receipt
 * share it; each passes its own colour / spacing in `sx`.
 */
export default function RemovedByStaffNote({
  removed,
  isFullyRemoved,
  sx,
}: {
  removed: RemovedByStaff;
  isFullyRemoved: boolean;
  sx?: SxProps<Theme>;
}) {
  const tReceipt = useTranslations("receipt");
  const labels = useCustomerLabels();
  const reasons = labels.voidReasons(removed.reasons);
  return (
    <Typography
      variant="body2"
      sx={[{ display: "block" }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {isFullyRemoved
        ? tReceipt("removedAll", { reasons })
        : tReceipt("removedSome", { count: removed.quantity, reasons })}
    </Typography>
  );
}
