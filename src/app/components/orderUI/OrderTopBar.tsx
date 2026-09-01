"use client";

import { AppBar, Toolbar, Badge, IconButton, Typography } from "@mui/material";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";

interface OrderTopBarProps {
  /** Company.name (the brand's shop name), not Location.name (a branch
   *  label like "Downtown") — see LocationService.getShopNameForLocation.
   *  Falls back to a generic label when a location couldn't be resolved
   *  (e.g. a bad/expired locationId). */
  shopName: string | null;
  /** Number of distinct lines in the cart — drives the small red badge
   *  on the cart icon, same as the mock's red dot. Omitted (or 0) hides
   *  the badge but the icon itself always shows. */
  cartItemCount?: number;
  /** Optional — lets the page decide what tapping the cart icon does
   *  (e.g. scroll down to the cart summary). No-op if omitted. */
  onCartClick?: () => void;
}

/**
 * Simple customer-facing header — Logo + shop name on the left, cart
 * icon on the right, per the design mock. Plain background.paper (not
 * primary-tinted) to match the mock's white bar, distinct from
 * Backoffice's own AppBar.
 */
export default function OrderTopBar({
  shopName,
  cartItemCount = 0,
  onCartClick,
}: OrderTopBarProps) {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="transparent"
      sx={{
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Toolbar sx={{ gap: 1.5 }}>
        <StorefrontOutlinedIcon color="primary" />
        <Typography
          variant="h6"
          sx={{ flexGrow: 1, fontWeight: 700, color: "text.primary" }}
        >
          {shopName ?? "Café Maw"}
        </Typography>

        <IconButton onClick={onCartClick} aria-label="View cart">
          <Badge badgeContent={cartItemCount} color="error">
            <ShoppingCartOutlinedIcon sx={{ color: "text.primary" }} />
          </Badge>
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
