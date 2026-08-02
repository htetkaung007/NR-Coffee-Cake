import { Card, Box, Typography } from "@mui/material";

export interface MenuCategoryCardData {
  id: number;
  name: string;
  menuCount: number;
}

interface MenuCategoryCardProps {
  category: MenuCategoryCardData;
}

export default function MenuCategoryCard({ category }: MenuCategoryCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: { xs: 2, md: 2.5 },
        bgcolor: "background.paper",
        p: { xs: 1.5, sm: 2 },
        textAlign: "center",
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
    </Card>
  );
}
