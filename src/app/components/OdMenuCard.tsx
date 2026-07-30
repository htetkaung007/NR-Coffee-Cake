"use client";

import { Box, Button, Card, Chip, Typography } from "@mui/material";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";

export interface OdMenuCardData {
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string | null;
  stockQuantity: number;
  isAvailable: boolean;
}

interface OdMenuCardProps {
  item: OdMenuCardData;
}

const FALLBACK_IMAGE =
  "https://5ez9pz51cl93qmhn.public.blob.vercel-storage.com/Default%20MenuIcon-8J6xP2FAGf6AoosGMi7w7Lg6nUi4zx.png";

/** Customer-facing card used exclusively for the new-menu live preview. */
export default function OdMenuCard({ item }: OdMenuCardProps) {
  const isAvailable = item.stockQuantity > 0 && item.isAvailable;

  return (
    <Card
      elevation={0}
      sx={{
        width: "100%",
        maxWidth: 340,
        mx: "auto",
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        p: 1.25,
      }}
    >
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 2,
          aspectRatio: "1.45 / 1",
          bgcolor: "grey.100",
        }}
      >
        <Box
          component="img"
          src={item.imageUrl || FALLBACK_IMAGE}
          alt={item.name}
          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <Chip
          label={item.category}
          size="small"
          sx={{ position: "absolute", top: 10, left: 10, fontWeight: 700 }}
        />
        <Chip
          label={isAvailable ? "Available" : "Unavailable"}
          color={isAvailable ? "success" : "error"}
          size="small"
          sx={{ position: "absolute", top: 10, right: 10, fontWeight: 700 }}
        />
        <Chip
          label={`Stock: ${item.stockQuantity}`}
          size="small"
          sx={{ position: "absolute", bottom: 10, left: 10, fontWeight: 700 }}
        />
      </Box>

      <Box sx={{ pt: 1.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
          <Typography sx={{ fontWeight: 800 }}>{item.name || "Dish name"}</Typography>
          <Typography color="primary.main" sx={{ fontWeight: 800 }}>
            {item.price.toLocaleString()} MMK
          </Typography>
        </Box>
        <Typography
          color="text.secondary"
          sx={{ mt: 0.5, fontSize: "0.78rem", minHeight: "2.5em" }}
        >
          {item.description || "Your item description will appear here."}
        </Typography>
        <Button
          fullWidth
          disabled={!isAvailable}
          startIcon={<ShoppingCartOutlinedIcon />}
          variant="contained"
          sx={{ mt: 1.5, textTransform: "none", fontWeight: 700 }}
        >
          Add to cart
        </Button>
      </Box>
    </Card>
  );
}
