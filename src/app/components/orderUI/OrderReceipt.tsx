"use client";

import { Avatar, Box, Chip, Stack, Typography } from "@mui/material";
import RestaurantOutlinedIcon from "@mui/icons-material/RestaurantOutlined";
import StickyNote2OutlinedIcon from "@mui/icons-material/StickyNote2Outlined";

import BackCircleButton from "./BackCircleButton";

export interface ReceiptLine {
  id: number;
  menuName: string;
  imageUrl: string | null;
  addonNames: string[];
  note: string | null;
  quantity: number;
  total: number;
}

interface OrderReceiptProps {
  orderNumber: string;
  status: string;
  lines: ReceiptLine[];
  total: number;
  backHref: string;
  /** The footer's "Order more" — a client component, so the page
   *  supplies it and this stays a plain server-renderable view. */
  orderMore: React.ReactNode;
}

/** Customer-facing status labels — used by the receipt and by the
 *  history list, so the same round reads the same in both. */
export const ORDER_STATUS_CHIP: Record<
  string,
  { label: string; color: "default" | "success" }
> = {
  PENDING_APPROVAL: { label: "Awaiting approval", color: "default" },
  PENDING: { label: "Approved", color: "success" },
  COOKING: { label: "Cooking", color: "success" },
};

/** Read-only receipt for one order (round): what was ordered, with each
 *  line's addons / note / quantity / price, and the total. No service
 *  charge row — the project has no service charge, so subtotal = total. */
export default function OrderReceipt({
  orderNumber,
  status,
  lines,
  total,
  backHref,
  orderMore,
}: OrderReceiptProps) {
  const chip = ORDER_STATUS_CHIP[status] ?? {
    label: status,
    color: "default",
  };

  return (
    <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          p: { xs: 2, sm: 3 },
          maxWidth: 720,
          width: "100%",
          mx: "auto",
        }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center", mb: 2 }}
        >
          <BackCircleButton
            href={backHref}
            ariaLabel="Back to order history"
          />
          <Box>
            <Typography variant="h6">{`Order ${orderNumber}`}</Typography>
            <Chip label={chip.label} color={chip.color} size="small" />
          </Box>
        </Stack>

        <Stack
          divider={
            <Box sx={{ borderBottom: "1px solid", borderColor: "divider" }} />
          }
        >
          {lines.map((line) => (
            <Stack
              key={line.id}
              direction="row"
              spacing={1.5}
              sx={{ py: 1.5, alignItems: "flex-start" }}
            >
              <Avatar
                variant="rounded"
                src={line.imageUrl ?? undefined}
                alt={line.menuName}
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: "background.paper",
                  color: "text.secondary",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <RestaurantOutlinedIcon fontSize="small" />
              </Avatar>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  {line.menuName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {line.addonNames.length > 0
                    ? line.addonNames.join(", ")
                    : "No add-ons"}
                </Typography>
                {line.note && (
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: "flex-start", mt: 0.25 }}
                  >
                    <StickyNote2OutlinedIcon
                      sx={{ fontSize: 14, mt: "2px", color: "text.secondary" }}
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontStyle: "italic", overflowWrap: "anywhere" }}
                    >
                      {line.note}
                    </Typography>
                  </Stack>
                )}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.25 }}
                >
                  Qty {line.quantity}
                </Typography>
              </Box>

              <Typography
                variant="body1"
                sx={{ fontWeight: 700, color: "primary.main", flexShrink: 0 }}
              >
                {line.total.toLocaleString()} MMK
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          bgcolor: "background.paper",
          borderTop: "1px solid",
          borderColor: "divider",
          p: { xs: 2, sm: 3 },
        }}
      >
        <Box sx={{ maxWidth: 720, mx: "auto" }}>
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", mb: 0.5 }}
          >
            <Typography variant="body2" color="text.secondary">
              Subtotal
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {total.toLocaleString()} MMK
            </Typography>
          </Stack>
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", mb: 1.5 }}
          >
            <Typography variant="body1" sx={{ fontWeight: 800 }}>
              Total
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 800 }}>
              {total.toLocaleString()} MMK
            </Typography>
          </Stack>
          {orderMore}
        </Box>
      </Box>
    </Box>
  );
}
