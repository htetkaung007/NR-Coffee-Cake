"use client";

import { useEffect, useRef, useState } from "react";
import { Box, ButtonBase, Chip, IconButton, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { useTranslations } from "next-intl";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import { MAX_IMAGE_BYTES, MAX_MENU_IMAGES } from "@/app/lib/storage/uploadLimits";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** The card never grows wider than this — a 4:3 main photo in a wide
 *  laptop column would otherwise be very tall. */
const PHOTOS_MAX_WIDTH = 520;

/** One photo in the form, in order (position 0 = the main photo): one
 *  the menu already has (its MenuImage id) or a file picked now. `key`
 *  is the form's own handle (React keys, focus after "make main"). */
export type FormPhoto = { key: string; url: string; position: number } & (
  | { kind: "keep"; imageId: number }
  | { kind: "new"; file: File }
);

interface MenuImageUploaderProps {
  photos: readonly FormPhoto[];
  onFilesAdded: (files: File[]) => void;
  onReplace: (index: number, file: File) => void;
  onMakeMain: (index: number) => void;
  onRemove: (index: number) => void;
  onError: (message: string) => void;
}

/** What the hidden file input is picking for right now. */
type PickTarget = { mode: "add" } | { mode: "replace"; index: number };

/** Buttons on a photo sit on paper so they read on any picture. */
const paperOnPhotoSx = {
  bgcolor: "background.paper",
  boxShadow: 2,
} as const;

const photoBoxSx: SxProps<Theme> = {
  position: "relative",
  aspectRatio: "4 / 3",
  minWidth: 0,
  borderRadius: 2,
  overflow: "hidden",
  bgcolor: "action.hover",
};

/**
 * The menu form's Photos card (DESIGN.md §18): the MAIN photo (position
 * 0) large, with "★ Main" and Remove on it; photos 2–3 in two columns
 * under it, each with ☆ make main, ⇄ replace and 🗑 remove on a paper
 * strip along its bottom; every empty slot a dashed "+ Add photo" tile
 * (the big one when there's no photo). Every button is a labelled 44px
 * button naming its photo. Nothing is saved until the form's Save.
 */
export default function MenuImageUploader({
  photos,
  onFilesAdded,
  onReplace,
  onMakeMain,
  onRemove,
  onError,
}: MenuImageUploaderProps) {
  const t = useTranslations("bo.menuForm");
  const inputRef = useRef<HTMLInputElement>(null);
  const pickTarget = useRef<PickTarget>({ mode: "add" });
  const mainRemoveRef = useRef<HTMLButtonElement>(null);
  // After "make main", focus moves with the photo — onto the main
  // photo's Remove (the ☆ it was on is gone). Read once, next render.
  const focusMainAfterChange = useRef(false);
  const room = MAX_MENU_IMAGES - photos.length;

  useEffect(() => {
    if (!focusMainAfterChange.current) return;
    focusMainAfterChange.current = false;
    mainRemoveRef.current?.focus();
  }, [photos]);

  function pick(target: PickTarget) {
    const input = inputRef.current;
    if (!input) return;
    pickTarget.current = target;
    input.multiple = target.mode === "add";
    input.click();
  }

  /** The same check for added and replacing files: type and size here,
   *  the content (and the resize) on the server. */
  function isAcceptable(files: File[]) {
    if (files.some((file) => !IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES)) {
      onError(t("imageInvalid"));
      return false;
    }
    return true;
  }

  function addFiles(files: File[]) {
    if (files.length === 0 || !isAcceptable(files)) return;
    if (files.length > room) onError(t("tooManyPhotos", { max: MAX_MENU_IMAGES }));
    const accepted = files.slice(0, room);
    if (accepted.length > 0) onFilesAdded(accepted);
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const target = pickTarget.current;
    if (target.mode === "replace") {
      if (files[0] && isAcceptable([files[0]])) onReplace(target.index, files[0]);
      return;
    }
    addFiles(files);
  }

  function makeMain(index: number) {
    focusMainAfterChange.current = true;
    onMakeMain(index);
  }

  const main = photos[0];
  // Photos 2–3 (or their empty slots) — once there's a main photo.
  const smallSlots = photos.length > 0 ? [1, 2] : [];

  return (
    <Box sx={{ maxWidth: PHOTOS_MAX_WIDTH }}>
      <Stack direction="row" sx={{ alignItems: "baseline", gap: 1, mb: 0.5 }}>
        <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
          {t("photosTitle")}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
          {t("photoCount", { count: photos.length, max: MAX_MENU_IMAGES })}
        </Typography>
      </Stack>
      <Typography
        variant="caption"
        color="text.secondary"
        component="p"
        sx={{ mb: 1 }}
      >
        {t("photosHint")}
      </Typography>

      {main ? (
        <Box sx={photoBoxSx}>
          <PhotoImage url={main.url} alt={t("photoAlt", { index: 1 })} />
          <Chip
            icon={<StarIcon aria-hidden />}
            label={
              <Typography variant="caption" component="span">
                {t("mainPhoto")}
              </Typography>
            }
            sx={{
              ...paperOnPhotoSx,
              position: "absolute",
              top: 8,
              left: 8,
              maxWidth: "calc(100% - 16px)",
              color: "text.primary",
              "& .MuiChip-icon": { color: "text.primary" },
            }}
          />
          <IconButton
            ref={mainRemoveRef}
            aria-label={t("removePhoto", { index: 1 })}
            onClick={() => onRemove(0)}
            sx={{
              ...paperOnPhotoSx,
              position: "absolute",
              right: 8,
              bottom: 8,
              width: 44,
              height: 44,
            }}
          >
            <DeleteOutlineIcon />
          </IconButton>
        </Box>
      ) : (
        <AddPhotoTile
          label={t("addPhoto")}
          onClick={() => pick({ mode: "add" })}
          onFiles={addFiles}
        />
      )}

      {smallSlots.length > 0 && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 1,
            mt: 1,
          }}
        >
          {smallSlots.map((index) => {
            const photo = photos[index];
            if (!photo) {
              return (
                <AddPhotoTile
                  key={`empty-${index}`}
                  label={t("addPhoto")}
                  onClick={() => pick({ mode: "add" })}
                  onFiles={addFiles}
                />
              );
            }
            const number = index + 1;
            return (
              <Box key={photo.key} sx={photoBoxSx}>
                <PhotoImage url={photo.url} alt={t("photoAlt", { index: number })} />
                {/* A paper strip along the bottom edge: the three 44px
                    buttons spread across it (they fit a 375px phone's
                    ~154px tile with ≥ 8px between them). */}
                <Box
                  sx={{
                    ...paperOnPhotoSx,
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <IconButton
                    aria-label={t("makeMainPhoto", { index: number })}
                    onClick={() => makeMain(index)}
                    sx={{ width: 44, height: 44 }}
                  >
                    <StarBorderIcon />
                  </IconButton>
                  <IconButton
                    aria-label={t("replacePhoto", { index: number })}
                    onClick={() => pick({ mode: "replace", index })}
                    sx={{ width: 44, height: 44 }}
                  >
                    <SwapHorizIcon />
                  </IconButton>
                  <IconButton
                    aria-label={t("removePhoto", { index: number })}
                    onClick={() => onRemove(index)}
                    sx={{ width: 44, height: 44 }}
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      <Typography
        variant="caption"
        color="text.secondary"
        component="p"
        sx={{ mt: 1 }}
      >
        {t("photoFormats")}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="p">
        {t("photoResize")}
      </Typography>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={handleInputChange}
      />
    </Box>
  );
}

function PhotoImage({ url, alt }: { url: string; alt: string }) {
  return (
    <Box
      component="img"
      src={url}
      alt={alt}
      sx={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}

/** An empty slot: a dashed "+ Add photo" tile — tap to browse (several
 *  at once), or drop files on it (laptops). */
function AddPhotoTile({
  label,
  onClick,
  onFiles,
}: {
  label: string;
  onClick: () => void;
  onFiles: (files: File[]) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  return (
    <ButtonBase
      onClick={onClick}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        onFiles(Array.from(event.dataTransfer.files));
      }}
      sx={{
        aspectRatio: "4 / 3",
        minWidth: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        px: 1,
        border: "2px dashed",
        borderColor: isDragOver ? "primary.dark" : "primary.main",
        borderRadius: 2,
        bgcolor: "background.paper",
        color: "primary.main",
        textAlign: "center",
        [hoverCapableMedia]: { "&:hover": { borderColor: "primary.dark" } },
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: 2,
        },
      }}
    >
      <AddIcon aria-hidden />
      <Typography variant="body2" color="text.primary">
        {label}
      </Typography>
    </ButtonBase>
  );
}
