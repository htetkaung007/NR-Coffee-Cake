"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface MenuImageUploaderProps {
  imagePreviewUrl: string | null;
  onFileSelected: (file: File) => void;
  onRemove: () => void;
  onError: (message: string) => void;
}

export default function MenuImageUploader({
  imagePreviewUrl,
  onFileSelected,
  onRemove,
  onError,
}: MenuImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imagePreviewRef = useRef<HTMLDivElement>(null);
  const [showImageActions, setShowImageActions] = useState(false);

  useEffect(() => {
    if (!showImageActions) return;

    function closeActionsWhenClickingOutside(event: PointerEvent) {
      if (!imagePreviewRef.current?.contains(event.target as Node)) {
        setShowImageActions(false);
      }
    }

    document.addEventListener("pointerdown", closeActionsWhenClickingOutside);
    return () => {
      document.removeEventListener(
        "pointerdown",
        closeActionsWhenClickingOutside,
      );
    };
  }, [showImageActions]);

  function handleFile(file: File) {
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      onError("Choose a PNG, JPEG, or WEBP image no larger than 5MB.");
      return;
    }

    onFileSelected(file);
    setShowImageActions(false);
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
    event.target.value = "";
  }

  function handleRemove() {
    onRemove();
    setShowImageActions(false);
  }

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Item Image / Photo Upload
      </Typography>
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          minHeight: { xs: 160, sm: 190 },
          border: "2px dashed",
          borderColor: imagePreviewUrl ? "divider" : "primary.main",
          borderRadius: { xs: 2.5, sm: 3 },
          bgcolor: "background.default",
        }}
      >
        {imagePreviewUrl ? (
          <Box
            ref={imagePreviewRef}
            onClick={() => setShowImageActions((visible) => !visible)}
            sx={{
              position: "relative",
              height: { xs: 190, sm: 250 },
              cursor: "pointer",
              p: { xs: 1, sm: 2 },
            }}
          >
            <Box
              component="img"
              src={imagePreviewUrl}
              alt="Selected menu item"
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: { xs: 1.5, sm: 2 },
              }}
            />
            {showImageActions && (
              <Stack
                direction="row"
                spacing={{ xs: 1, sm: 2 }}
                sx={{
                  position: "absolute",
                  inset: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "rgba(0, 0, 0, 0.34)",
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-around",
                    gap: { xs: 1, sm: 2, lg: 4 },
                    width: { xs: "65%", sm: "65%", md: "65%" },
                  }}
                >
                  <Button
                    variant="contained"
                    color="inherit"
                    startIcon={<CloudUploadIcon />}
                    onClick={() => inputRef.current?.click()}
                    sx={{
                      minWidth: { xs: 80, sm: 120 },
                      flex: 1,
                      minHeight: { xs: 36, sm: 42 },
                      "&:hover": { transform: "scale(1.05)" },
                    }}
                  >
                    Replace
                  </Button>

                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={handleRemove}
                    sx={{
                      minWidth: { xs: 80, sm: 120 },
                      flex: 1,
                      py: { xs: 0.8, sm: 1 },
                      minHeight: { xs: 36, sm: 42 },
                      "&:hover": { transform: "scale(1.05)" },
                    }}
                  >
                    Remove
                  </Button>
                </Box>
              </Stack>
            )}
          </Box>
        ) : (
          <Box
            onClick={() => inputRef.current?.click()}
            sx={{
              minHeight: { xs: 160, sm: 190 },
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              cursor: "pointer",
              px: 2,
            }}
          >
            <CloudUploadIcon
              color="primary"
              sx={{ fontSize: { xs: 28, sm: 32 } }}
            />
            <Typography variant="body2" sx={{ textAlign: "center" }}>
              Drag & drop photo here, or browse
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Supports PNG, JPG, WEBP up to 5MB
            </Typography>
          </Box>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={handleImageChange}
        />
      </Box>
    </Box>
  );
}
