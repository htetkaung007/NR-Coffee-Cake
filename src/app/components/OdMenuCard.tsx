"use client";

import {
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
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

/** How faded an unavailable (out-of-stock) card's photo and text are. */
const OUT_OF_STOCK_OPACITY = 0.5;

const FALLBACK_IMAGE =
  "http://localhost:9000/nrrestaurant/menu/2-1785697412707.webp";

/** Watercolor & Scribbles aesthetic — a couple of soft, blurred color
 *  blobs plus a light scribble line sitting behind the image, with colors
 *  read from the Od theme (secondary + palette.decor). Purely decorative:
 *  pointerEvents "none" and z-indexed under the real content so it never
 *  blocks clicks. */
function WatercolorScribbleOverlay() {
  const { palette } = useTheme();

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
          radial-gradient(circle at 12% 18%, ${palette.secondary.main} 0%, transparent 40%),
          radial-gradient(circle at 88% 78%, ${palette.decor.wash} 0%, transparent 45%)
        `,
      }}
    >
      <svg width="100%" height="100%" style={{ display: "block" }}>
        <path
          d="M8,20 C40,5 70,45 110,15 S170,50 210,10"
          stroke={palette.decor.scribble}
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
const DESCRIPTION_PREVIEW_LENGTH = 28;

export default function OdMenuCard({ item, onAddToCart }: OdMenuCardProps) {
  const theme = useTheme();
  const { palette } = theme;
  // Phones (below the `sm` breakpoint). Every compact-layout override
  // below lives under this one media query, so tablet/desktop keep the
  // original larger card exactly as it was.
  const mobile = theme.breakpoints.down("sm");
  const isAvailable = item.stockQuantity > 0 && item.isAvailable;
  const isDescriptionTruncated =
    item.description.length > DESCRIPTION_PREVIEW_LENGTH;
  const descriptionPreview = isDescriptionTruncated
    ? item.description.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd() + "…"
    : item.description;

  return (
    <Card
      elevation={0}
      onClick={onAddToCart}
      sx={{
        width: "100%",

        maxWidth: 360,
        maxHeight: 400,

        mx: "auto",
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        p: 0.5,
        [mobile]: { display: "flex", flexDirection: "column", height: 210 },
        cursor: onAddToCart ? "pointer" : "default",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": onAddToCart
          ? { transform: "translateY(-2px)", boxShadow: 3 }
          : undefined,
        // Rule 10 — no hardcoded hex in sx; every color here comes from
        // the Od theme (see odTheme.ts).
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
          [mobile]: {
            aspectRatio: "auto",
            height: 112,
            minHeight: 96,
            maxHeight: 130,
            flexShrink: 0,
          },
        }}
      >
        {/* Photo + watercolor overlay fade together when out of stock; the
           status chips below are siblings, so they stay fully visible. */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            opacity: isAvailable ? 1 : OUT_OF_STOCK_OPACITY,
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
        </Box>

        <Chip
          label={isAvailable ? "Available" : "out of stock"}
          color={isAvailable ? "success" : "error"}
          size="small"
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 2,
            [mobile]: {
              // "Available" is the default state — dropped on phones;
              // "out of stock" stays (small).
              display: isAvailable ? "none" : "inline-flex",
              top: 6,
              right: 6,
              height: 20,
              "& .MuiChip-label": { px: 0.75, fontSize: "0.65rem" },
            },
          }}
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
              [mobile]: {
                bottom: 6,
                left: 6,
                height: 20,
                "& .MuiChip-label": { px: 0.75, fontSize: "0.65rem" },
              },
            }}
          />
        )}
      </Box>

      <Box
        sx={{
          pt: 1.5,
          px: 1,
          pb: 1.5,
          // Name, price, description and the add button all fade.
          opacity: isAvailable ? 1 : OUT_OF_STOCK_OPACITY,
          [mobile]: {
            // Column so the price can sit at the bottom, beside the "+".
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            position: "relative",
            pt: 1,
            px: 0.75,
            pb: 0.75,
          },
        }}
      >
        <Typography
          variant="body1"
          sx={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            // 14px / 600 — the theme's subtitle2.
            [mobile]: { ...theme.typography.subtitle2, order: 1 },
          }}
        >
          {item.name || "Dish name"}
        </Typography>
        <Typography
          variant="body1"
          sx={{
            fontWeight: 795,
            color: "primary.main",
            // Reads name → description → price on phones; the margins
            // line the price up with the centre of the 32px "+".
            [mobile]: {
              ...theme.typography.subtitle2,
              fontWeight: 700,
              color: "error.main",
              order: 3,
              mt: "auto",
              mb: "6px",
            },
          }}
        >
          {item.price.toLocaleString()} MMK
        </Typography>

        {item.description && (
          <Typography
            variant="body2"
            sx={{
              mt: 0.5,
              // Muted warm brown on every screen size (softer than the
              // neutral grey text.secondary).
              color: palette.decor.mutedText,
              [mobile]: {
                mt: 0,
                order: 2,
                // Phones only: clearly below the 14px name — 11px, regular.
                fontSize: "0.6875rem",
                fontWeight: 400,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              },
            }}
          >
            {descriptionPreview}
            {isDescriptionTruncated && (
              <Typography
                component="span"
                variant="body2"
                sx={{
                  color: "primary.main",
                  fontWeight: 600,
                  ml: 0.5,
                  [mobile]: { display: "none" },
                }}
              >
                See more
              </Typography>
            )}
          </Typography>
        )}

        <Button
          variant="contained"
          size="small"
          endIcon={<ShoppingCartOutlinedIcon sx={{ fontSize: 16 }} />}
          sx={{
            // Button shape
            borderRadius: "5px",
            mt: 1,

            // Button size
            minHeight: {
              xs: 32,
              sm: 36,
            },

            px: {
              xs: 1.25,
              sm: 1.5,
            },

            py: {
              xs: 0.4,
              sm: 0.5,
            },

            // Typography — fontFamily/fontWeight/textTransform already
            // come from sharedThemeTokens.ts's `button` variant + MuiButton
            // override.
            whiteSpace: "nowrap",

            // Color
            color: "primary.contrastText",
            backgroundColor: "primary.main",

            // Ink border
            border: `2px solid ${palette.decor.ink}`,

            // Printed paper offset shadow
            boxShadow: `3px 3px 0 ${palette.decor.ink}`,

            // Smooth interaction
            transition: "all 160ms ease-out",

            "&:hover": {
              backgroundColor: "primary.dark",
              boxShadow: `2px 2px 0 ${palette.decor.ink}`,
              transform: "translate(1px, 1px)",
            },

            "&:active": {
              boxShadow: `0 0 0 ${palette.decor.ink}`,
              transform: "translate(3px, 3px)",
            },

            "&:focus-visible": {
              outline: `3px solid ${alpha(palette.primary.main, 0.35)}`,
              outlineOffset: "3px",
            },

            "& .MuiButton-endIcon": {
              marginLeft: 0.8,
            },

            // Phones get the round "+" below instead.
            [mobile]: { display: "none" },
          }}
        >
          Add to order
        </Button>

        {/* Phones: just a round "+" (no label, no cart icon), bottom-right
           of the text area. Like the button above it has no onClick of its
           own — the card's onClick handles the tap. */}
        <IconButton
          aria-label="Add to order"
          size="small"
          sx={{
            display: "none",
            [mobile]: {
              display: "inline-flex",
              position: "absolute",
              right: 6,
              bottom: 6,
              width: 32,
              height: 32,
              color: "primary.contrastText",
              bgcolor: "primary.main",
              border: `2px solid ${palette.decor.ink}`,
              boxShadow: `2px 2px 0 ${palette.decor.ink}`,
              transition: "all 160ms ease-out",
              "&:hover": {
                bgcolor: "primary.dark",
                boxShadow: `1px 1px 0 ${palette.decor.ink}`,
                transform: "translate(1px, 1px)",
              },
              "&:active": {
                boxShadow: `0 0 0 ${palette.decor.ink}`,
                transform: "translate(2px, 2px)",
              },
              "&:focus-visible": {
                outline: `3px solid ${alpha(palette.primary.main, 0.35)}`,
                outlineOffset: "2px",
              },
            },
          }}
        >
          <AddIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Card>
  );
}
