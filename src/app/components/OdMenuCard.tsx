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
  "http://localhost:9000/nrrestaurant/menu/2-1785697412707.webp";
/** Customer-facing card used exclusively for the new-menu live preview. */
export default function OdMenuCard({ item }: OdMenuCardProps) {
  const isAvailable = item.stockQuantity > 0 && item.isAvailable;

  return (
    <Card
      elevation={0}
      sx={{
        width: "100%",

        maxWidth: 350,

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
          label={isAvailable ? "Available" : "out of stock"}
          color={isAvailable ? "success" : "error"}
          size="small"
          sx={{ position: "absolute", top: 10, right: 10 }}
        />
        {item.stockQuantity <= 5 && (
          <Chip
            label={`Only left : ${item.stockQuantity}`}
            size="small"
            sx={{
              position: "absolute",
              bottom: 10,
              left: 10,
              fontWeight: 700,
              bgcolor: "background.paper",
              color: "text.primary",
            }}
          />
        )}
      </Box>

      <Box sx={{ pt: 1.5 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 1.5,
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="body1">{item.name || "Dish name"}</Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 0.5,
                mb: item.description ? 0 : 1,
                display: "flex",
              }}
            >
              {item.description}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant="body1"
              sx={{ fontWeight: 795, color: "primary.main" }}
            >
              {item.price.toLocaleString()} MMK
            </Typography>
          </Box>
        </Box>

        <Button
          fullWidth
          disabled={!isAvailable}
          startIcon={<ShoppingCartOutlinedIcon />}
          variant="contained"
          sx={{ mt: 1.5, mb: 1, textTransform: "none", fontWeight: 700 }}
        >
          Add to cart
        </Button>
      </Box>
    </Card>
  );
}
