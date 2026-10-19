"use client";

import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { alpha, type SxProps, type Theme } from "@mui/material/styles";

/**
 * A menu's picture, or — when it has no image URL, or the image fails to
 * load — a neutral tile with the menu's first letter, never the
 * browser's broken-image icon. The one implementation behind every menu
 * image (MenuCard, the Backoffice menu cards, round thumbnails). Fills
 * its box; the caller's box reserves the space (aspect ratio / size).
 * `fit="cover"` (default — cards keep equal heights) crops to the box;
 * `fit="contain"` (the menu detail) shows the WHOLE picture, never
 * cropped or zoomed, on a faint tint.
 */
export default function MenuThumb({
  name,
  imageUrl,
  alt = "",
  imageClassName,
  imageSx,
  fit = "cover",
}: {
  name: string;
  imageUrl: string | null | undefined;
  /** The item's name when the image carries meaning; "" (default) when
   *  the name is already right next to it. */
  alt?: string;
  /** Lets a parent style the <img> on hover (e.g. MenuCard's zoom). */
  imageClassName?: string;
  imageSx?: SxProps<Theme>;
  fit?: "cover" | "contain";
}) {
  // The URL that failed — a new URL gets a fresh try.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (imageUrl && failedUrl !== imageUrl) {
    return (
      <Box
        component="img"
        src={imageUrl}
        alt={alt}
        loading="lazy"
        className={imageClassName}
        onError={() => setFailedUrl(imageUrl)}
        // A server-rendered image can fail BEFORE hydration attaches
        // onError — the browser's broken icon and alt text would stay.
        // So it's checked once it's in the page too: loaded with no
        // pixels means it failed.
        ref={(element: HTMLImageElement | null) => {
          if (element?.complete && element.naturalWidth === 0) {
            setFailedUrl(imageUrl);
          }
        }}
        sx={[
          { display: "block", width: "100%", height: "100%", objectFit: fit },
          fit === "contain" &&
            ((theme: Theme) => ({
              bgcolor: alpha(theme.palette.text.primary, 0.04),
            })),
          ...(Array.isArray(imageSx) ? imageSx : [imageSx]),
        ]}
      />
    );
  }

  return (
    <Box
      component="span"
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      sx={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "action.hover",
        color: "text.secondary",
      }}
    >
      <Typography variant="h6" component="span" aria-hidden>
        {name.trim().charAt(0).toUpperCase() || "?"}
      </Typography>
    </Box>
  );
}
