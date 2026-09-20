"use client";

import { useRouter } from "next/navigation";
import { Box, BottomNavigation, BottomNavigationAction } from "@mui/material";
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";

export type OrderBotBarTab = "menu" | "cart" | "history";

interface OrderBotBarProps {
  locationId: number;
  /** Table QR only — Counter QR has no tableId, and its pages are
   *  scoped by locationId alone. */
  tableId?: number;
  active?: OrderBotBarTab;
}

const TABS: { value: OrderBotBarTab; label: string; icon: React.ReactNode }[] =
  [
    { value: "menu", label: "Menu", icon: <GridViewOutlinedIcon /> },
    { value: "cart", label: "Cart", icon: <ShoppingCartOutlinedIcon /> },
    { value: "history", label: "History", icon: <ReceiptLongOutlinedIcon /> },
  ];

/**
 * The customer-facing sticky bottom navigation: Menu / Cart / History.
 * Pinned to the bottom of the page's flex column (so it stays put while
 * the menu scrolls, and sits at the bottom even on a short page).
 *
 * No cart badge here on purpose — the count lives on OrderTopBar's cart
 * icon only. Navigates with router.push + refresh (not a plain <Link>)
 * for the same reason the cart pages do: a soft navigation was seen to
 * occasionally leave the old page's tree mounted (Router Cache quirk).
 */
export default function OrderBotBar({
  locationId,
  tableId,
  active = "menu",
}: OrderBotBarProps) {
  const router = useRouter();
  const query = tableId
    ? `locationId=${locationId}&tableId=${tableId}`
    : `locationId=${locationId}`;

  function go(tab: OrderBotBarTab) {
    if (tab === active) return;
    router.push(`/${tab}?${query}`);
    router.refresh();
  }

  return (
    <Box
      component="nav"
      aria-label="Order navigation"
      sx={{
        position: "sticky",
        bottom: 0,
        zIndex: 4,
        bgcolor: "background.paper",
        borderTop: "1px solid",
        borderColor: "divider",
        pb: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <BottomNavigation
        showLabels
        value={active}
        onChange={(_event, next: OrderBotBarTab) => go(next)}
        sx={{ maxWidth: 1200, mx: "auto", bgcolor: "transparent" }}
      >
        {TABS.map((tab) => (
          <BottomNavigationAction
            key={tab.value}
            value={tab.value}
            label={tab.label}
            icon={tab.icon}
            sx={{
              "& .MuiBottomNavigationAction-label": {
                fontSize: "0.75rem",
                fontWeight: 600,
              },
            }}
          />
        ))}
      </BottomNavigation>
    </Box>
  );
}
