import { Box, Typography } from "@mui/material";

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
            component="img"
            src={detail.imageUrl}
            alt={detail.name}
            sx={{
              display: "block",
              width: "100%",
              height: 160,
              borderRadius: 3,
              objectFit: "cover",
              mb: 1.5,
            }}
          />
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
            color: "error.main",
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
            component="img"
            src={detail.imageUrl}
            alt={detail.name}
            sx={{
              width: 120,
              height: 120,
              borderRadius: 2,
              objectFit: "cover",
              mx: "auto",
              mb: 1,
            }}
          />
        )}
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {detail.name}
        </Typography>
      </Box>

      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
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
