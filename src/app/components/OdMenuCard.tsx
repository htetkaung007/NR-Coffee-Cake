"use client";

import {
  Box,
  Card,
  CardActionArea,
  Chip,
  Typography,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";

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
  /** Optional — tapping the card opens the caller's own flow (e.g.
   *  MenuDetailDialog for addon selection). Left undefined in MenuForm's
   *  live-preview usage, where the card is just a static preview: with
   *  no handler it renders as a plain, non-interactive card (no button
   *  semantics, no hover or pressed effects). */
  onAddToCart?: () => void;
}

/** How faded an unavailable (out-of-stock) card's photo and text are. */
const OUT_OF_STOCK_OPACITY = 0.5;

/** A card shows the low-stock chip once this few (or fewer) are left. */
const LOW_STOCK_THRESHOLD = 5;

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
      component="span"
      aria-hidden
      sx={{
        display: "block",
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

/**
 * Customer-facing menu card — ONE compact layout at every width, top to
 * bottom: image (1.45:1, space always reserved) → name (one line) →
 * description + "See more" on one line → price with a round "+" on the
 * right. Used both for the backoffice's new-menu live preview (no
 * onAddToCart — a static, non-interactive card) and the customer-facing
 * order grid (the whole card is ONE button that opens MenuDetailDialog).
 *
 * The card fills its grid cell's height and its text area grows to
 * fill, so the price row sits at the bottom and lines up across a row.
 * Everything inside the button is a <span> (phrasing content) so the
 * markup stays valid, and the "+" is decoration only — never a second
 * interactive element inside the card's own.
 */
export default function OdMenuCard({ item, onAddToCart }: OdMenuCardProps) {
  const { palette } = useTheme();
  const isAvailable = item.stockQuantity > 0 && item.isAvailable;
  // Only worth saying "Only 3 left" about something that can still be
  // ordered — a switched-off or sold-out item already reads "out of stock".
  const showLowStock = isAvailable && item.stockQuantity <= LOW_STOCK_THRESHOLD;
  // Interactive only when there's something to open AND the item can be
  // ordered; the hover/pressed feedback follows the same condition.
  const isInteractive = Boolean(onAddToCart) && isAvailable;
  const hasDescription = item.description.trim().length > 0;
  const priceLabel = `${item.price.toLocaleString()} MMK`;

  const content = (
    <>
      {/* Photo + watercolor overlay fade together when out of stock; the
         status chips are siblings, so they stay fully visible. The
         1.45:1 box reserves the image's space before it loads. */}
      <Box
        component="span"
        sx={{
          display: "block",
          position: "relative",
          overflow: "hidden",
          borderRadius: 2,
          aspectRatio: "1.45 / 1",
          bgcolor: "grey.100",
          flexShrink: 0,
        }}
      >
        <Box
          component="span"
          sx={{
            display: "block",
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

        {/* "Available" is the default state, so only the exception gets
           a chip. Labels are wrapped in the caption variant instead of
           carrying their own font size. */}
        {!isAvailable && (
          <Chip
            component="span"
            color="error"
            size="small"
            label={
              <Typography component="span" variant="caption">
                out of stock
              </Typography>
            }
            sx={{
              position: "absolute",
              top: 6,
              right: 6,
              zIndex: 2,
              height: 20,
              "& .MuiChip-label": { px: 0.75 },
            }}
          />
        )}
        {showLowStock && (
          <Chip
            component="span"
            size="small"
            label={
              <Typography component="span" variant="caption">
                {`Only ${item.stockQuantity} left`}
              </Typography>
            }
            sx={{
              position: "absolute",
              bottom: 6,
              left: 6,
              zIndex: 2,
              height: 20,
              bgcolor: "background.paper",
              color: "text.primary",
              "& .MuiChip-label": { px: 0.75 },
            }}
          />
        )}
      </Box>

      <Box
        component="span"
        sx={{
          // Grows to fill the card, so the price row (pushed to the
          // bottom below) lines up across a row of cards.
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
          pt: 1,
          px: 1,
          pb: 1,
          // Name, description, price and "+" fade together.
          opacity: isAvailable ? 1 : OUT_OF_STOCK_OPACITY,
        }}
      >
        <Typography
          component="span"
          variant="subtitle2"
          sx={{
            display: "block",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.name || "Dish name"}
        </Typography>

        {/* Description and "See more" share one line. Only the
           description shrinks and gets the ellipsis; "See more" can't
           shrink, so it's always fully visible. The row is rendered
           even with no description, so every card is the same height. */}
        <Box
          component="span"
          sx={{ display: "flex", alignItems: "baseline", columnGap: 0.5 }}
        >
          <Typography
            component="span"
            variant="body2"
            sx={{
              flex: 1,
              minWidth: 0,
              // Muted warm brown (softer than the neutral grey
              // text.secondary), regular weight.
              color: palette.decor.mutedText,
              fontWeight: 400,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.description}
          </Typography>
          {/* A hint only — plain text, the whole card is the one
             button. Nothing more to see without a description, and
             nothing to open for an item that can't be ordered — in
             either case it's invisible but still takes its space, so
             the row is the same on every card. */}
          <Typography
            component="span"
            variant="body2"
            aria-hidden
            sx={{
              flexShrink: 0,
              color: "primary.main",
              fontWeight: 600,
              visibility: isAvailable && hasDescription ? "visible" : "hidden",
            }}
          >
            See more
          </Typography>
        </Box>

        <Box
          component="span"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            columnGap: 1,
            mt: "auto",
            pt: 0.5,
            // 4px padding + the 32px circle: same height whether or not
            // the "+" is shown.
            minHeight: 36,
          }}
        >
          <Typography
            component="span"
            variant="subtitle2"
            sx={{
              minWidth: 0,
              fontWeight: 700,
              color: "error.main",
              // A freak-long price gives way (ellipsis) before the "+"
              // could be pushed out of a narrow card.
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {priceLabel}
          </Typography>
          {/* Look only: not a button, no handler, not focusable, hidden
             from assistive tech. Tapping it lands on the card's own
             action. Not drawn at all for an item that can't be ordered
             (no disabled-looking circle). */}
          {isAvailable && (
            <Box
              component="span"
              aria-hidden="true"
              className="odmenucard-plus"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                width: 32,
                height: 32,
                borderRadius: "50%",
                color: "primary.contrastText",
                bgcolor: "primary.main",
                border: `2px solid ${palette.decor.ink}`,
                boxShadow: `2px 2px 0 ${palette.decor.ink}`,
                transition:
                  "background-color 160ms ease-out, box-shadow 160ms ease-out, transform 160ms ease-out",
              }}
            >
              <AddIcon fontSize="small" />
            </Box>
          )}
        </Box>
      </Box>
    </>
  );

  // Padding lives on this inner area (not the Card) so the focus ring
  // and the tap target cover the whole card.
  const areaSx = {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    flex: 1,
    p: 0.5,
  } as const;

  return (
    <Card
      elevation={0}
      sx={{
        width: "100%",
        // Fills its grid cell so every card in a row lines up.
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        // Rule 10 — no hardcoded hex in sx; every color here comes from
        // the Od theme (see odTheme.ts).
        ...(isInteractive && {
          // Explicit properties only. Pressed feedback is quick and
          // applies on touch too; the hover lift (and the "+" reacting
          // to the card being hovered) is for real hover devices only.
          transition: "transform 120ms ease-out, box-shadow 200ms ease-out",
          [hoverCapableMedia]: {
            "&:hover": { transform: "translateY(-2px)", boxShadow: 3 },
            "&:hover .odmenucard-image": { transform: "scale(1.08)" },
            "&:hover .odmenucard-plus": {
              bgcolor: "primary.dark",
              boxShadow: `1px 1px 0 ${palette.decor.ink}`,
              transform: "translate(1px, 1px)",
            },
          },
          "&:active": { transform: "scale(0.98)" },
        }),
      }}
    >
      {onAddToCart ? (
        <CardActionArea
          onClick={onAddToCart}
          disabled={!isAvailable}
          aria-label={
            isAvailable
              ? `${item.name}, ${priceLabel} — view details`
              : `${item.name}, ${priceLabel} — out of stock`
          }
          sx={{
            ...areaSx,
            // The built-in tint overlay is replaced by our own hover /
            // pressed / focus feedback.
            "& .MuiCardActionArea-focusHighlight": { display: "none" },
            // Inside the card edge: the Card clips overflow, so an
            // outside ring would be cut off.
            "&.Mui-focusVisible": {
              outline: `3px solid ${palette.primary.main}`,
              outlineOffset: "-3px",
            },
          }}
        >
          {content}
        </CardActionArea>
      ) : (
        <Box component="div" sx={areaSx}>
          {content}
        </Box>
      )}
    </Card>
  );
}
