"use client";

import { useCustomerPrice } from "@/app/lib/hooks/useCustomerPrice";
import { Avatar, Box, Chip, Stack, Typography } from "@mui/material";
import RestaurantOutlinedIcon from "@mui/icons-material/RestaurantOutlined";
import StickyNote2OutlinedIcon from "@mui/icons-material/StickyNote2Outlined";
import { useTranslations } from "next-intl";
import type { RemovedByStaff } from "@/app/lib/order/roundLine";
import type { ContributorWho } from "@/app/lib/order/contributors";
import { useCustomerLabels } from "@/app/lib/hooks/useCustomerLabels";

import BackCircleButton from "./BackCircleButton";
import RemovedByStaffNote from "./RemovedByStaffNote";
import { HideBottomBar } from "./OrderBotBar";

export interface ReceiptLine {
  id: number;
  menuName: string;
  imageUrl: string | null;
  /** Its add-ons by group, in the customer's language — "Sweet: Low"
   *  (lib/order/addonLabel); "" when none. */
  addonsText: string;
  note: string | null;
  /** What's still on the order (staff-voided units left out). */
  quantity: number;
  total: number;
  /** Units staff took back — how many and why, never the staff's note or
   *  name. Null when none. */
  removedByStaff: RemovedByStaff | null;
}

interface OrderReceiptProps {
  orderNumber: string;
  status: string;
  lines: ReceiptLine[];
  /** Table QR: the same lines per person ("Your order", "Customer 2
   *  order"… — put into words here), each with its subtotal. Counter:
   *  absent — a flat list. */
  groups?: { key: string; who: ContributorWho; subtotal: number; lines: ReceiptLine[] }[];
  total: number;
  backHref: string;
  /** The footer's "Order more" — a client component, so the page
   *  supplies it and this stays a plain server-renderable view. */
  orderMore: React.ReactNode;
}

/** A round status chip's colour — used by the receipt and by the history
 *  list, so the same round reads the same in both. The words are the
 *  customer's roundStatus.<STATUS> (useCustomerLabels). */
export function statusChipColor(status: string): "default" | "success" {
  return status === "PENDING" || status === "COOKING" ? "success" : "default";
}

/** One receipt line: photo, name, add-ons, note, quantity and amount.
 *  The one place this markup lives — the flat (Counter) and per-person
 *  (Table) layouts both render lines through it. */
function ReceiptLineRow({ line }: { line: ReceiptLine }) {
  const t = useTranslations("common");
  const tReceipt = useTranslations("receipt");
  const { price } = useCustomerPrice();
  const removed = line.removedByStaff;
  // Every unit taken back: still listed, dimmed and struck through, with
  // the words saying why (DESIGN.md Rule 26). Never in the total.
  const isFullyRemoved = removed !== null && line.quantity === 0;
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ py: 1.5, alignItems: "flex-start", opacity: isFullyRemoved ? 0.6 : 1 }}
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
        <Typography
          variant="body1"
          sx={{
            fontWeight: 600,
            overflowWrap: "anywhere",
            textDecoration: isFullyRemoved ? "line-through" : "none",
          }}
        >
          {line.menuName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {line.addonsText !== "" ? line.addonsText : tReceipt("noAddons")}
        </Typography>
        {line.note && (
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ alignItems: "flex-start", mt: 0.25 }}
          >
            <StickyNote2OutlinedIcon
              sx={{ fontSize: 16, mt: "4px", color: "text.secondary" }}
            />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontStyle: "italic", overflowWrap: "anywhere" }}
            >
              {line.note}
            </Typography>
          </Stack>
        )}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ display: "block", mt: 0.25 }}
        >
          {t("qty", { quantity: isFullyRemoved ? removed.quantity : line.quantity })}
        </Typography>
        {removed && (
          <RemovedByStaffNote
            removed={removed}
            isFullyRemoved={isFullyRemoved}
            sx={{ color: "text.secondary", mt: 0.25 }}
          />
        )}
      </Box>

      {!isFullyRemoved && (
        <Typography
          variant="body1"
          sx={{ fontWeight: 600, color: "primary.main", flexShrink: 0, whiteSpace: "nowrap" }}
        >
          {price(line.total)}
        </Typography>
      )}
    </Stack>
  );
}

/** Read-only receipt for one order (round): what was ordered, with each
 *  line's addons / note / quantity / price, and the total. No service
 *  charge row — the project has no service charge, so subtotal = total. */
export default function OrderReceipt({
  orderNumber,
  status,
  lines,
  groups,
  total,
  backHref,
  orderMore,
}: OrderReceiptProps) {
  const t = useTranslations("common");
  const tReceipt = useTranslations("receipt");
  const { price } = useCustomerPrice();
  const labels = useCustomerLabels();

  return (
    <Box
      sx={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Its own Back and Order more cover the way on — the floating
         bar would only take the room the lines need. */}
      <HideBottomBar />
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
            ariaLabel={tReceipt("backToHistory")}
          />
          <Box>
            <Typography variant="h6">{t("orderNumber", { number: orderNumber })}</Typography>
            <Chip
              label={labels.roundStatus(status)}
              color={statusChipColor(status)}
              size="small"
            />
          </Box>
        </Stack>

        <Stack
          divider={
            <Box sx={{ borderBottom: "1px solid", borderColor: "divider" }} />
          }
        >
          {groups
            ? groups.map((group) => (
                <Box key={group.key} sx={{ py: 1.5 }}>
                  <Stack
                    direction="row"
                    sx={{ justifyContent: "space-between" }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {labels.contributorHeading(group.who)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {price(group.subtotal)}
                    </Typography>
                  </Stack>
                  {group.lines.map((line) => (
                    <ReceiptLineRow key={line.id} line={line} />
                  ))}
                </Box>
              ))
            : lines.map((line) => <ReceiptLineRow key={line.id} line={line} />)}
        </Stack>
      </Box>

      {/* ONE compact row: the total on the left, Order more on the
         right (no subtotal — with no service charge it equals the
         total). At the bottom edge, clear of the home indicator. */}
      <Box
        sx={{
          flexShrink: 0,
          bgcolor: "background.paper",
          borderTop: "1px solid",
          borderColor: "divider",
          px: { xs: 2, sm: 3 },
          pt: 1.5,
          pb: "calc(12px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{ maxWidth: 720, mx: "auto", alignItems: "center" }}
        >
          <Box sx={{ flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary" component="p">
              {t("total")}
            </Typography>
            <Typography
              variant="subtitle1"
              component="p"
              sx={{ whiteSpace: "nowrap" }}
            >
              {price(total)}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0, maxWidth: 280, ml: "auto" }}>
            {orderMore}
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
