"use client";

import { isOrderableOnCard } from "@/app/lib/menu/orderableFirst";
import {
  Box,
  Card,
  CardActionArea,
  Chip,
  Typography,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {
  hoverCapableMedia,
  touchTabletMedia,
} from "@/app/lib/theme/sharedThemeTokens";
import { formatAmount } from "@/app/lib/orderFormat";
import { stockBadge } from "@/app/lib/menu/stockLevel";
import MenuThumb from "./MenuThumb";

export interface MenuCardData {
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string | null;
  stockQuantity: number;
  isAvailable: boolean;
}

/** The card's own words. The customer grid passes them translated
 *  (MenuBrowser, next-intl); the Backoffice (staff New Order, the menu
 *  preview) leaves them out and gets the English defaults below. */
export interface MenuCardLabels {
  outOfStock: string;
  onlyLeft: (count: number) => string;
  seeMore: string;
  /** The card button's accessible name, orderable / not. */
  viewDetails: (name: string, price: string) => string;
  outOfStockLabel: (name: string, price: string) => string;
  /** The price as shown: "4,500 MMK" (default — staff) or the
   *  customer's "4,500 Kyats" / "4,500 ကျပ်". */
  price: (amount: number) => string;
  /** The Add affordance's words — given (customer Myanmar: "ထည့်မယ်")
   *  it shows them; null (English, staff New Order) shows the + icon. */
  addText: string | null;
}

const ENGLISH_LABELS: MenuCardLabels = {
  outOfStock: "out of stock",
  onlyLeft: (count) => `Only ${count} left`,
  seeMore: "See more",
  viewDetails: (name, price) => `${name}, ${price} — view details`,
  outOfStockLabel: (name, price) => `${name}, ${price} — out of stock`,
  price: formatAmount,
  addText: null,
};

interface MenuCardProps {
  item: MenuCardData;
  /** Optional — tapping the card opens the caller's own flow (e.g.
   *  MenuDetailDialog for addon selection). Left undefined in MenuForm's
   *  live-preview usage, where the card is just a static preview: with
   *  no handler it renders as a plain, non-interactive card (no button
   *  semantics, no hover or pressed effects). */
  onAddToCart?: () => void;
  /** Show the description + "See more" row (default). The staff New
   *  Order page turns it off for a denser grid; the price + "+" row
   *  stays either way. */
  showDescription?: boolean;
  /** COMPACT on touch tablets (touchTabletMedia) only, so 4 columns
   *  show two rows there: a 16:9 photo (instead of 1.45:1), no
   *  description + "See more" row (display none — the detail still shows
   *  it) and tighter padding around the name and price. Phones, laptops
   *  and desktops always get the normal card, and so does MenuForm's
   *  live preview (never passes it). The customer grid and staff New
   *  Order pass it. */
  compact?: boolean;
  /** Translated words (customer side); English when left out. */
  labels?: MenuCardLabels;
}

/** How faded an unavailable (out-of-stock) card's photo and text are. */
const OUT_OF_STOCK_OPACITY = 0.5;

/** Watercolor & Scribbles aesthetic — a couple of soft, blurred color
 *  blobs plus a light scribble line sitting behind the image, with colors
 *  read from palette.decor (the Bo theme sets them transparent, so the
 *  staff page gets a plain image). Purely decorative:
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
          radial-gradient(circle at 12% 18%, ${palette.decor.blob} 0%, transparent 40%),
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
 * The menu card — ONE compact layout at every width, top to bottom:
 * image (1.45:1, space always reserved; a first-letter tile when there's
 * no image or it fails to load) → name (one line) → description + "See
 * more" on one line → price with a round "+" on the right. With
 * `compact`, touch tablets (only) get a denser one: 16:9 image, no
 * description row. Used by the
 * customer order grid and the staff New Order page (the whole card is
 * ONE button — onAddToCart) and by the backoffice's new-menu live
 * preview (no onAddToCart — a static, non-interactive card). Its colors
 * come from whichever theme it renders under (see DecorPalette).
 *
 * The card fills its grid cell's height and its text area grows to
 * fill, so the price row sits at the bottom and lines up across a row.
 * Everything inside the button is a <span> (phrasing content) so the
 * markup stays valid, and the "+" is decoration only — never a second
 * interactive element inside the card's own.
 */
export default function MenuCard({
  item,
  onAddToCart,
  showDescription = true,
  compact = false,
  labels = ENGLISH_LABELS,
}: MenuCardProps) {
  const { palette } = useTheme();
  // The compact card's overrides, applied on touch tablets only.
  const onTouchTablet = (styles: Record<string, unknown>) =>
    compact ? { [touchTabletMedia]: styles } : {};
  const isAvailable = isOrderableOnCard(item);
  // Only worth saying "Only 3 left" about something that can still be
  // ordered — a switched-off or sold-out item already reads "out of stock".
  // "Low" is the shared rule (lib/menu/stockLevel): 1 to 4 left.
  const showLowStock =
    isAvailable && stockBadge(item.stockQuantity).kind === "low";
  // Interactive only when there's something to open AND the item can be
  // ordered; the hover/pressed feedback follows the same condition.
  const isInteractive = Boolean(onAddToCart) && isAvailable;
  const hasDescription = item.description.trim().length > 0;
  const priceLabel = labels.price(item.price);

  const content = (
    <>
      {/* Photo + watercolor overlay fade together when out of stock; the
         status chips are siblings, so they stay fully visible. The
         1.45:1 box (16:9 when compact) reserves the image's space before
         it loads. */}
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
          ...onTouchTablet({ aspectRatio: "16 / 9" }),
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
          <MenuThumb
            name={item.name}
            imageUrl={item.imageUrl}
            alt={item.name}
            imageClassName="menucard-image"
            imageSx={{
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
                {labels.outOfStock}
              </Typography>
            }
            sx={{
              position: "absolute",
              top: 6,
              right: 6,
              zIndex: 2,
              // Grows with its text (never a fixed height).
              height: "auto",
              minHeight: 20,
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
                {labels.onlyLeft(item.stockQuantity)}
              </Typography>
            }
            sx={{
              position: "absolute",
              bottom: 6,
              left: 6,
              zIndex: 2,
              height: "auto",
              minHeight: 20,
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
          ...onTouchTablet({ pt: 0.5, pb: 0.5 }),
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
        {showDescription && (
          <Box
            component="span"
            sx={{
              display: "flex",
              alignItems: "baseline",
              columnGap: 0.5,
              // Out of the layout when compact (text only, not focusable).
              ...onTouchTablet({ display: "none" }),
            }}
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
                visibility:
                  isAvailable && hasDescription ? "visible" : "hidden",
              }}
            >
              {labels.seeMore}
            </Typography>
          </Box>
        )}

        {/* Price + Add: side by side, and when they don't fit (Myanmar
           on a 375px screen) the Add square wraps under the price — the
           price itself never wraps. */}
        <Box
          component="span"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
            mt: "auto",
            pt: 0.5,
            // 4px padding (none when compact) + the 32px square: same
            // height whether or not the Add square is shown.
            minHeight: 36,
            ...onTouchTablet({ pt: 0, minHeight: 32 }),
          }}
        >
          <Typography
            component="span"
            variant="subtitle2"
            sx={{
              minWidth: 0,
              fontWeight: 700,
              color: palette.decor.price,
              // Never wraps; only a price wider than the whole card
              // would give way (ellipsis).
              maxWidth: "100%",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {priceLabel}
          </Typography>
          {/* The Add affordance — a rounded square, the + icon or (customer
             Myanmar) "ထည့်မယ်". Look only: not a button, no handler, not
             focusable, hidden from assistive tech; tapping it lands on the
             card's own action. Not drawn at all for an item that can't be
             ordered (no disabled-looking square). */}
          {isAvailable && (
            <Box
              component="span"
              aria-hidden="true"
              className="menucard-plus"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                // Grows with "ထည့်မယ်" (never a fixed height).
                minHeight: 32,
                minWidth: 32,
                px: labels.addText ? 1.25 : 0,
                py: labels.addText ? 0.25 : 0,
                borderRadius: 1,
                color: "primary.contrastText",
                bgcolor: "primary.main",
                transition: "background-color 160ms ease-out",
              }}
            >
              {labels.addText ? (
                <Typography
                  component="span"
                  variant="body2"
                  sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                >
                  {labels.addText}
                </Typography>
              ) : (
                <AddIcon fontSize="small" />
              )}
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
        // the theme it renders under (odTheme.ts / theme.ts).
        ...(isInteractive && {
          // Explicit properties only. Pressed feedback is quick and
          // applies on touch too; the hover lift (and the "+" reacting
          // to the card being hovered) is for real hover devices only.
          transition: "transform 120ms ease-out, box-shadow 200ms ease-out",
          [hoverCapableMedia]: {
            "&:hover": { transform: "translateY(-2px)", boxShadow: 3 },
            "&:hover .menucard-image": { transform: "scale(1.08)" },
            "&:hover .menucard-plus": { bgcolor: "primary.dark" },
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
              ? labels.viewDetails(item.name, priceLabel)
              : labels.outOfStockLabel(item.name, priceLabel)
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
