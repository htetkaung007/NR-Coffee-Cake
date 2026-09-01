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
  /** Optional — clicking the card (or its Add-to-cart button) opens the
   *  caller's own flow (e.g. MenuDetailDialog for addon selection).
   *  Left undefined in MenuForm's live-preview usage, where the card is
   *  just a static preview and isn't meant to be clickable. */
  onAddToCart?: () => void;
}

const FALLBACK_IMAGE =
  "http://localhost:9000/nrrestaurant/menu/2-1785697412707.webp";

/** Watercolor & Scribbles aesthetic — a couple of soft, blurred color
 *  blobs plus a light scribble line sitting behind the image, using the
 *  project's existing brand CSS variables (globals.css) rather than new
 *  hardcoded hex values. Purely decorative: pointerEvents "none" and
 *  z-indexed under the real content so it never blocks clicks. */
function WatercolorScribbleOverlay() {
  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
        opacity: 0.55,
        mixBlendMode: "multiply",
        background: `
          radial-gradient(circle at 12% 18%, var(--color-brand-accent) 0%, transparent 40%),
          radial-gradient(circle at 88% 78%, var(--color-brand-caramel) 0%, transparent 45%)
        `,
      }}
    >
      <svg width="100%" height="100%" style={{ display: "block" }}>
        <path
          d="M8,20 C40,5 70,45 110,15 S170,50 210,10"
          stroke="var(--color-brand-coffee-light)"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
          strokeLinecap="round"
        />
      </svg>
    </Box>
  );
}

/** Customer-facing card — used both for the backoffice's new-menu live
 *  preview (no onAddToCart) and the customer-facing order grid (with
 *  onAddToCart wired to open MenuDetailDialog). */
export default function OdMenuCard({ item, onAddToCart }: OdMenuCardProps) {
  const isAvailable = item.stockQuantity > 0 && item.isAvailable;

  return (
    <Card
      elevation={0}
      onClick={onAddToCart}
      sx={{
        width: "100%",

        maxWidth: 360,

        mx: "auto",
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        p: 0.5,
        cursor: onAddToCart ? "pointer" : "default",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": onAddToCart
          ? { transform: "translateY(-2px)", boxShadow: 3 }
          : undefined,
        // Rule 10 — no hardcoded hex in sx; the blob colors above live
        // in the brand CSS vars (globals.css), not inline here.
        "&:hover .odmenucard-image": onAddToCart
          ? { transform: "scale(1.08)" }
          : undefined,
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
          className="odmenucard-image"
          src={item.imageUrl || FALLBACK_IMAGE}
          alt={item.name}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform 0.3s ease",
            position: "relative",
            zIndex: 0,
          }}
        />

        <WatercolorScribbleOverlay />

        <Chip
          label={isAvailable ? "Available" : "out of stock"}
          color={isAvailable ? "success" : "error"}
          size="small"
          sx={{ position: "absolute", top: 10, right: 10, zIndex: 2 }}
        />
        {item.stockQuantity <= 5 && (
          <Chip
            label={`Only left : ${item.stockQuantity}`}
            size="small"
            sx={{
              position: "absolute",
              bottom: 10,
              left: 10,
              zIndex: 2,
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
          variant="contained"
          endIcon={<ShoppingCartOutlinedIcon />}
          sx={{
            // Button shape
            borderRadius: "5px",

            // Button size
            minHeight: {
              xs: 42,
              sm: 46,
            },

            px: {
              xs: 2,
              sm: 2.5,
            },

            py: {
              xs: 0.9,
              sm: 1.1,
            },

            // Typography
            fontFamily: "var(--font-english), var(--font-myanmar), sans-serif",
            fontSize: {
              xs: "0.78rem",
              sm: "0.85rem",
            },
            fontWeight: 700,
            textTransform: "none",
            whiteSpace: "nowrap",

            // Color
            color: "#FFF9ED",
            backgroundColor: "#C75A3C",

            // Ink border
            border: "2px solid #59402F",

            // Printed paper offset shadow
            boxShadow: "3px 3px 0 #59402F",

            // Smooth interaction
            transition: "all 160ms ease-out",

            "&:hover": {
              backgroundColor: "#A9432F",
              boxShadow: "2px 2px 0 #59402F",
              transform: "translate(1px, 1px)",
            },

            "&:active": {
              boxShadow: "0 0 0 #59402F",
              transform: "translate(3px, 3px)",
            },

            "&:focus-visible": {
              outline: "3px solid rgba(199, 90, 60, 0.35)",
              outlineOffset: "3px",
            },

            "& .MuiButton-endIcon": {
              marginLeft: 0.8,
            },
          }}
        >
          Add to order
        </Button>
      </Box>
    </Card>
  );
}
