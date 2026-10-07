"use client";

import { useState } from "react";
import { Box } from "@mui/material";
import BOMenuCard, { type MenuCardData } from "@/app/components/BoMenuCard";
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
      {/* 2 columns on phones; from sm, as many ≥ 220px columns as fit. */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(auto-fill, minmax(220px, 1fr))",
          },
          gap: { xs: 1, sm: 1.5, md: 2 },
          p: { xs: 1, sm: 2, md: 3 },
        }}
      >
        {menus.map((menu) => (
          <BOMenuCard
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
