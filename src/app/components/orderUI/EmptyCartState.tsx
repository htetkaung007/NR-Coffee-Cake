"use client";

import { Avatar, Box, Button, Stack, Typography } from "@mui/material";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";

import BackCircleButton from "./BackCircleButton";

interface EmptyCartStateProps {
  onBack: () => void;
  onBrowseMenu: () => void;
}

/**
 * The cart page when there's nothing in it — no item list, no total, no
 * order button; just a header, a message and a way back to the menu.
 * Shown for a brand-new cart, after "Order more", and after the last item
 * in a cart is removed (replacing the old "Order confirmed" screen, which
 * only belongs to a round that's still the latest thing the customer did).
 */
export default function EmptyCartState({
  onBack,
  onBrowseMenu,
}: EmptyCartStateProps) {
  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: 720,
          mx: "auto",
          p: { xs: 2, sm: 3 },
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <BackCircleButton ariaLabel="Back to menu" onClick={onBack} />
          <Typography variant="h6">Your cart</Typography>
        </Stack>

        <Stack
          sx={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            pb: 8,
          }}
        >
          <Avatar
            sx={(theme) => ({
              width: 96,
              height: 96,
              mb: 2.5,
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              color: theme.palette.decor.mutedText,
            })}
          >
            <ShoppingBagOutlinedIcon sx={{ fontSize: 44 }} />
          </Avatar>

          <Typography variant="h6" sx={{ mb: 0.75 }}>
            Your cart is empty
          </Typography>
          <Typography
            variant="body2"
            sx={(theme) => ({
              maxWidth: 220,
              color: theme.palette.decor.mutedText,
            })}
          >
            Add items from the menu to get started
          </Typography>

          <Button
            variant="contained"
            onClick={onBrowseMenu}
            sx={{ mt: 3, borderRadius: 999, px: 4, py: 1.25 }}
          >
            Browse menu
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
