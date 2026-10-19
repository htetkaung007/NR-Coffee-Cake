"use client";

import { useState } from "react";
import { Box } from "@mui/material";
import {
  touchCardGap,
  touchTabletMedia,
} from "@/app/lib/theme/sharedThemeTokens";

/** Touch tablets: as many columns as the page's width allows, each at
 *  least this wide (auto-fill + minmax, never a fixed count), so they
 *  follow the sidebar (expanded / rail) — 1180px landscape: 4 (5 with
 *  the rail); 800px portrait: 2 even with the full sidebar (3 with the
 *  rail). MenuGridCard's narrow-card rules keep 170px readable. */
const TOUCH_CARD_MIN_PX = 170;
import MenuGridCard, { type MenuCardData } from "./MenuGridCard";
import StatusSnackbar, {
  type StatusMessage,
} from "@/app/components/StatusSnackbar";

/**
 * The menus grid plus the one snackbar every card's on/off switch
 * reports to ("Iced Latte is off at Yangon Branch", or the safe error).
 * Each card owns its own optimistic switch state.
 */
export default function MenuGrid({
  menus,
  canToggle,
  locationName,
}: {
  menus: MenuCardData[];
  /** Display only — setMenuAvailableAction checks the permission itself. */
  canToggle: boolean;
  locationName: string;
}) {
  const [message, setMessage] = useState<StatusMessage | null>(null);

  return (
    <>
      {/* 2 columns on phones; from sm, as many ≥ 220px columns as fit;
          touch tablets: as many ≥ TOUCH_CARD_MIN_PX columns as fit, 16px
          gaps, the card's photo capped lower (MenuGridCard). */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(auto-fill, minmax(220px, 1fr))",
          },
          gap: { xs: 1, sm: 1.5, md: 2 },
          [touchTabletMedia]: {
            gridTemplateColumns: `repeat(auto-fill, minmax(${TOUCH_CARD_MIN_PX}px, 1fr))`,
            // 16px (shared with the customer grid) — the cards never touch.
            gap: touchCardGap,
          },
        }}
      >
        {menus.map((menu) => (
          <MenuGridCard
            key={menu.id}
            item={menu}
            canToggle={canToggle}
            locationName={locationName}
            onNotify={setMessage}
          />
        ))}
      </Box>

      <StatusSnackbar message={message} onClose={() => setMessage(null)} />
    </>
  );
}
