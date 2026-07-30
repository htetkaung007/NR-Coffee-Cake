import Link from "next/link";
import {
  Card,
  CardMedia,
  CardContent,
  Box,
  Typography,
  Chip,
  Button,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";

/** Shape returned by MenuService.getMenusWithDetails — the only fields
 *  that actually exist across Menu + MenuCategory + MenuStock. */
export interface MenuCardData {
  id: number;
  name: string;
  price: number;
  category: string;
  imageUrl: string | null;
  stockQuantity: number;
  isManuallyDisabled: boolean;
}

interface MenuCardProps {
  item: MenuCardData;
}

const FALLBACK_IMAGE =
  "https://5ez9pz51cl93qmhn.public.blob.vercel-storage.com/Default%20MenuIcon-8J6xP2FAGf6AoosGMi7w7Lg6nUi4zx.png";

export default function BOMenuCard({ item }: MenuCardProps) {
  const isAvailable = item.stockQuantity > 0 && !item.isManuallyDisabled;

  return (
    <Card
      elevation={0}
      sx={{
        width: "100%",
        // Mobile: compact enough that 2 columns x 2 rows fit one screen.
        // Tablet/desktop: grow, but cap so cards don't sprawl on wide screens.
        maxWidth: { xs: "100%", sm: 260, md: 280, lg: 300 },
        borderRadius: { xs: 2, md: 2.5 },
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Image */}
      <Box
        sx={{
          position: "relative",
          // Fixed aspect ratio keeps the grid tidy at every breakpoint
          // instead of a fixed pixel height that fights small screens.
          pt: "75%",
          bgcolor: "background.default",
        }}
      >
        <CardMedia
          component="img"
          image={item.imageUrl || FALLBACK_IMAGE}
          alt={item.name}
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: isAvailable ? "none" : "grayscale(60%)",
          }}
        />
        <Chip
          label={
            <Typography variant="caption" component="span">
              {item.category}
            </Typography>
          }
          size="small"
          sx={{
            position: "absolute",
            top: { xs: 6, sm: 8 },
            left: { xs: 6, sm: 8 },
            height: { xs: 20, sm: 22 },
            bgcolor: "background.paper",
            color: "text.primary",
          }}
        />
        {!isAvailable && (
          <Chip
            label={
              <Typography variant="caption" component="span">
                Unavailable
              </Typography>
            }
            size="small"
            color="error"
            sx={{
              position: "absolute",
              top: { xs: 6, sm: 8 },
              right: { xs: 6, sm: 8 },
              height: { xs: 20, sm: 22 },
            }}
          />
        )}
      </Box>

      {/* Body */}
      <CardContent
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          gap: { xs: 0.5, sm: 0.75 },
          p: { xs: 1, sm: 1.5, md: 2 },
          "&:last-child": { pb: { xs: 1, sm: 1.5, md: 2 } },
        }}
      >
        <Typography
          variant="body1"
          sx={{
            lineHeight: 1.3,
            color: "text.primary",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.name}
        </Typography>

        <Typography
          variant="body1"
          sx={{
            fontWeight: 800,
            fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
            color: "primary.main",
          }}
        >
          {item.price.toLocaleString()} MMK
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        <Button
          component={Link}
          href={`/backoffice/menus/${item.id}`}
          size="small"
          variant="outlined"
          startIcon={<EditIcon sx={{ fontSize: { xs: 12, sm: 14 } }} />}
          sx={{
            mt: { xs: 0.5, sm: 0.75 },
            alignSelf: "flex-start",
            fontSize: { xs: "0.65rem", sm: "0.75rem" },
            borderColor: "divider",
            color: "text.primary",
            py: { xs: 0.25, sm: 0.5 },
            px: { xs: 1, sm: 1.5 },
            "&:hover": {
              borderColor: "primary.main",
              bgcolor: "primary.main",
              color: "#fff",
            },
          }}
        >
          Edit
        </Button>
      </CardContent>
    </Card>
  );
}
