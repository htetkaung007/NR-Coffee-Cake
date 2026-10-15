import { Box, Typography } from "@mui/material";
import MenuThumb from "@/app/components/MenuThumb";

import { SHEET_TEXT } from "./sheetText";
import type { MenuDetail } from "./types";
import { localizedText } from "@/app/lib/i18n/localizedText";
import { useOrderUiLabels } from "../OrderUiLabels";

interface MenuDetailHeaderProps {
  detail: MenuDetail;
}

/** The phone sheet's top: a full-width rounded photo, then name / price
 *  (the card's price tone) / description left-aligned, in the compact
 *  sizes. (Tablet / desktop: MenuDetailAside, the dialog's left column.) */
export default function MenuDetailHeader({ detail }: MenuDetailHeaderProps) {
  // Shop data in the surface's language (English in the Backoffice).
  const { locale, price } = useOrderUiLabels();
  const name = localizedText(locale, detail.name, detail.nameMy);
  const description = localizedText(
    locale,
    detail.description,
    detail.descriptionMy,
  );
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
          <MenuThumb name={name} imageUrl={detail.imageUrl} alt={name} />
        </Box>
      )}
      <Typography
        variant="h6"
        sx={{ fontWeight: 700, fontSize: SHEET_TEXT.title }}
      >
        {name}
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
        {price(detail.price)}
      </Typography>
      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, fontSize: SHEET_TEXT.small, lineHeight: 1.5 }}
        >
          {description}
        </Typography>
      )}
    </Box>
  );
}
