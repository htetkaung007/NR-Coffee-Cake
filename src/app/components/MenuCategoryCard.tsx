import { Card, Box, Chip, Typography } from "@mui/material";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";

export interface MenuCategoryCardData {
  id: number;
  name: string;
  menuCount: number;
  isEnabledAtLocation: boolean;
}

interface MenuCategoryCardProps {
  category: MenuCategoryCardData;
  onClick?: () => void;
}

export default function MenuCategoryCard({
  category,
  onClick,
}: MenuCategoryCardProps) {
  return (
    <Card
      elevation={0}
      onClick={onClick}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: { xs: 2, md: 2.5 },
        bgcolor: "background.paper",
        p: { xs: 1.5, sm: 2 },
        textAlign: "center",
        cursor: onClick ? "pointer" : "default",
        opacity: category.isEnabledAtLocation ? 1 : 0.6,
        transition: "border-color 0.15s ease",
        ...(onClick && {
          [hoverCapableMedia]: {
            "&:hover": { borderColor: "primary.main" },
          },
        }),
      }}
    >
      <Typography variant="body1" sx={{ color: "text.primary" }}>
        {category.name}
      </Typography>
      <Box sx={{ mt: 0.5 }}>
        <Typography
          component="span"
          variant="body1"
          sx={{ fontWeight: 800, color: "primary.main" }}
        >
          {category.menuCount}
        </Typography>
        <Typography
          component="span"
          variant="caption"
          sx={{ color: "text.secondary", ml: 0.5 }}
        >
          {category.menuCount === 1 ? "item" : "items"}
        </Typography>
      </Box>
      {!category.isEnabledAtLocation && (
        <Chip
          label="Hidden here"
          size="small"
          color="default"
          variant="outlined"
          sx={{ mt: 1, fontSize: "0.65rem" }}
        />
      )}
    </Card>
  );
}
