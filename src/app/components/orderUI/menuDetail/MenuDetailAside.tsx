"use client";

import { Box, Stack, Typography } from "@mui/material";
import MenuThumb from "@/app/components/MenuThumb";
import { localizedText } from "@/app/lib/i18n/localizedText";
import type { MenuDetail } from "./types";
import { useOrderUiLabels } from "../OrderUiLabels";

/**
 * The tablet / desktop dialog's LEFT column (it doesn't scroll): the
 * photo in a fixed 4:3 box at the top (MenuThumb's letter tile, centred,
 * when there's none), then name, description, price and the picks so
 * far ("Your choice: Hot · Large", hidden while nothing is picked). Any
 * extra height is plain space under the info, in the same tint.
 */
export default function MenuDetailAside({
  detail,
  choices,
}: {
  detail: MenuDetail;
  /** choiceSummary's text — "" when nothing is picked. */
  choices: string;
}) {
  const { locale, price, menuDetail: labels } = useOrderUiLabels();
  const name = localizedText(locale, detail.name, detail.nameMy);
  const description = localizedText(
    locale,
    detail.description,
    detail.descriptionMy,
  );

  return (
    <Box
      sx={{
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          aspectRatio: "4 / 3",
          width: "100%",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <MenuThumb name={name} imageUrl={detail.imageUrl} alt={name} />
      </Box>

      <Stack
        spacing={1}
        sx={{ p: 3, flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}
      >
        <Typography
          variant="h5"
          component="h2"
          sx={{ overflowWrap: "anywhere" }}
        >
          {name}
        </Typography>
        {description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              // The column never scrolls: a long description stops at
              // six lines.
              display: "-webkit-box",
              WebkitLineClamp: 6,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {description}
          </Typography>
        )}
        <Typography
          variant="subtitle1"
          component="p"
          sx={{ fontWeight: 700, color: "decor.price" }}
        >
          {price(detail.price)}
        </Typography>
        {choices !== "" && (
          <Typography
            variant="caption"
            component="p"
            color="text.secondary"
            sx={{ overflowWrap: "anywhere" }}
          >
            {labels.yourChoice(choices)}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
