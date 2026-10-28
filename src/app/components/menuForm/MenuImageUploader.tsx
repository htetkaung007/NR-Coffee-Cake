"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  ButtonBase,
  Chip,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { useTranslations } from "next-intl";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import { MAX_IMAGE_BYTES, MAX_MENU_IMAGES } from "@/app/lib/storage/uploadLimits";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** One photo in the form, in order (position 0 = the main photo): one
 *  the menu already has (its MenuImage id) or a file picked now. `key`
 *  is the form's own handle (React keys, focus after a move). */
export type FormPhoto = { key: string; url: string; position: number } & (
  | { kind: "keep"; imageId: number }
  | { kind: "new"; file: File }
);

interface MenuImageUploaderProps {
  photos: readonly FormPhoto[];
  onFilesAdded: (files: File[]) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  onError: (message: string) => void;
}

/**
 * The menu form's photos (DESIGN.md §18): up to MAX_MENU_IMAGES rows in
 * order — the thumbnail (the first one "Main"), then ← → (move) and
 * remove, each a labelled 44px button — and the add zone (browse or
 * drop; hidden when full). One layout at every width (it fits 375px).
 * Changes are only the form's until Save.
 */
export default function MenuImageUploader({
  photos,
  onFilesAdded,
  onMove,
  onRemove,
  onError,
}: MenuImageUploaderProps) {
  const t = useTranslations("bo.menuForm");
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  // After a move, focus follows the photo (its same button, or the other
  // arrow once it reached the end) — read once, on the next render.
  const focusAfterMove = useRef<{ key: string; direction: -1 | 1 } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const room = MAX_MENU_IMAGES - photos.length;

  useEffect(() => {
    const moved = focusAfterMove.current;
    if (!moved) return;
    focusAfterMove.current = null;
    const index = photos.findIndex((photo) => photo.key === moved.key);
    const atEnd = moved.direction === -1 ? index === 0 : index === photos.length - 1;
    const side = moved.direction === -1 ? "left" : "right";
    const otherSide = side === "left" ? "right" : "left";
    buttonRefs.current.get(`${moved.key}-${atEnd ? otherSide : side}`)?.focus();
  }, [photos]);

  function setButtonRef(name: string) {
    return (element: HTMLButtonElement | null) => {
      if (element) buttonRefs.current.set(name, element);
      else buttonRefs.current.delete(name);
    };
  }

  function addFiles(files: File[]) {
    if (files.some((file) => !IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES)) {
      onError(t("imageInvalid"));
      return;
    }
    if (files.length > room) {
      onError(t("tooManyPhotos", { max: MAX_MENU_IMAGES }));
    }
    const accepted = files.slice(0, room);
    if (accepted.length > 0) onFilesAdded(accepted);
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragOver(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  function move(index: number, direction: -1 | 1) {
    focusAfterMove.current = { key: photos[index].key, direction };
    onMove(index, direction);
  }

  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: "baseline", gap: 1, mb: 0.5 }}>
        <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
          {t("image")}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t("photoCount", { count: photos.length, max: MAX_MENU_IMAGES })}
        </Typography>
      </Stack>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mb: 1 }}
      >
        {t("photosHint")}
      </Typography>

      <Stack spacing={1}>
        {photos.map((photo, index) => {
          const number = index + 1;
          return (
            <Box
              key={photo.key}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                bgcolor: "background.paper",
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  width: 96,
                  aspectRatio: "4 / 3",
                  flexShrink: 0,
                  borderRadius: 1.5,
                  overflow: "hidden",
                }}
              >
                <Box
                  component="img"
                  src={photo.url}
                  alt={t("photoAlt", { index: number })}
                  sx={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                {index === 0 && (
                  <Chip
                    size="small"
                    color="primary"
                    label={
                      <Typography variant="caption" component="span">
                        {t("mainPhoto")}
                      </Typography>
                    }
                    sx={{ position: "absolute", top: 4, left: 4, maxWidth: "calc(100% - 8px)" }}
                  />
                )}
              </Box>

              <Box sx={{ flex: 1 }} />

              <Stack direction="row" sx={{ gap: 1, flexShrink: 0 }}>
                <IconButton
                  ref={setButtonRef(`${photo.key}-left`)}
                  aria-label={t("movePhotoLeft", { index: number })}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  sx={{ width: 44, height: 44 }}
                >
                  <ChevronLeftIcon />
                </IconButton>
                <IconButton
                  ref={setButtonRef(`${photo.key}-right`)}
                  aria-label={t("movePhotoRight", { index: number })}
                  disabled={index === photos.length - 1}
                  onClick={() => move(index, 1)}
                  sx={{ width: 44, height: 44 }}
                >
                  <ChevronRightIcon />
                </IconButton>
                <IconButton
                  aria-label={t("removePhoto", { index: number })}
                  color="error"
                  onClick={() => onRemove(index)}
                  sx={{ width: 44, height: 44 }}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Stack>
            </Box>
          );
        })}

        {room > 0 && (
          <ButtonBase
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              minHeight: 96,
              px: 2,
              py: 1.5,
              width: "100%",
              border: "2px dashed",
              borderColor: isDragOver ? "primary.dark" : "primary.main",
              borderRadius: 2,
              bgcolor: "background.paper",
              textAlign: "center",
              [hoverCapableMedia]: {
                "&:hover": { borderColor: "primary.dark" },
              },
              "&:focus-visible": {
                outline: "2px solid",
                outlineColor: "primary.main",
                outlineOffset: 2,
              },
            }}
          >
            <CloudUploadIcon color="primary" aria-hidden />
            <Typography variant="body2">
              {t("addPhoto", { max: MAX_MENU_IMAGES })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("imageFormats")}
            </Typography>
          </ButtonBase>
        )}
      </Stack>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        hidden
        onChange={handleInputChange}
      />
    </Box>
  );
}
