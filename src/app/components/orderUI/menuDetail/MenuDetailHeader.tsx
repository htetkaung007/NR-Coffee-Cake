import { Box, Typography } from "@mui/material";
import MenuThumb from "@/app/components/MenuThumb";

import { SHEET_TEXT } from "./sheetText";
import type { MenuDetail, MenuDetailVariant } from "./types";

interface MenuDetailHeaderProps {
  detail: MenuDetail;
  variant: MenuDetailVariant;
}

/** The item's photo, name, price and description.
 *  - sheet (phone): a full-width rounded photo, then name / red price /
 *    description left-aligned, in the compact sizes.
 *  - dialog (tablet / desktop): the small centered photo + centered name,
 *    then price and description — as it always was. */
export default function MenuDetailHeader({
  detail,
  variant,
}: MenuDetailHeaderProps) {
  if (variant === "sheet") {
    return (
      <Box>
        {detail.imageUrl && (
          <Box
            sx={{
              width: "100%",
              height: 160,
              borderRadius: 3,
              overflow: "hidden",
              mb: 1.5,
            }}
          >
            <MenuThumb
              name={detail.name}
              imageUrl={detail.imageUrl}
              alt={detail.name}
            />
          </Box>
        )}
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, fontSize: SHEET_TEXT.title }}
        >
          {detail.name}
        </Typography>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            fontSize: SHEET_TEXT.price,
            // The theme's menu price color: the storefront's red, or
            // text.primary under the Backoffice theme (staff New Order).
            color: "decor.price",
          }}
        >
          {detail.price.toLocaleString()} MMK
        </Typography>
        {detail.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, fontSize: SHEET_TEXT.small, lineHeight: 1.5 }}
          >
            {detail.description}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ textAlign: "center" }}>
        {detail.imageUrl && (
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: 2,
              overflow: "hidden",
              mx: "auto",
              mb: 1,
            }}
          >
            <MenuThumb
              name={detail.name}
              imageUrl={detail.imageUrl}
              alt={detail.name}
            />
          </Box>
        )}
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {detail.name}
        </Typography>
      </Box>

      {/* subtitle2, not subtitle1: subtitle1 is now a bold title size
         (1.2rem from md) and would rival the item name above it. */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {detail.price.toLocaleString()} MMK
      </Typography>
      {detail.description && (
        <Typography variant="body2" color="text.secondary">
          {detail.description}
        </Typography>
      )}
    </>
  );
}
