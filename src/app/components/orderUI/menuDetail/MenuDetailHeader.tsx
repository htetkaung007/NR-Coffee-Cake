import { Box, Typography } from "@mui/material";
import MenuPhotos from "./MenuPhotos";

import type { MenuDetail } from "./types";
import { localizedText } from "@/app/lib/i18n/localizedText";
import { useOrderUiLabels } from "../OrderUiLabels";

interface MenuDetailHeaderProps {
  detail: MenuDetail;
}

/** The phone sheet's top: a full-width rounded photo band (MenuPhotos —
 *  swipe + dots for 2–3 photos; nothing when there's none), then name / price
 *  (the card's price tone) / description left-aligned, in the theme's
 *  own variants (the same as the dialog). (Tablet / desktop: MenuDetailAside, the dialog's left column.) */
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
      {/* The whole picture — never cropped (fit contain). */}
      {detail.images.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <MenuPhotos
            images={detail.images}
            name={name}
            placeholder={false}
            frameSx={{
              width: "100%",
              height: 160,
              borderRadius: 3,
              overflow: "hidden",
            }}
          />
        </Box>
      )}
      <Typography
        variant="h6"
        sx={{ fontWeight: 700, overflowWrap: "anywhere" }}
      >
        {name}
      </Typography>
      <Typography
        variant="subtitle1"
        sx={{
          // 8px under the name.
          mt: 1,
          fontWeight: 700,
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
          sx={{ mt: 0.5 }}
        >
          {description}
        </Typography>
      )}
    </Box>
  );
}
