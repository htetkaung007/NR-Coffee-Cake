"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import RemoveIcon from "@mui/icons-material/Remove";
import OdMenuCard, { type OdMenuCardData } from "@/app/components/OdMenuCard";
import { createMenuAction } from "../action";
import { useRouter } from "next/navigation";
interface MenuCategoryOption {
  id: number;
  name: string;
}

interface NewMenuProps {
  categories: MenuCategoryOption[];
}

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function NewMenu({ categories }: NewMenuProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imagePreviewRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isAvailable, setIsAvailable] = useState(true);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [showImageActions, setShowImageActions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();

  const MAX_DESCRIPTION_LENGTH = 100;

  useEffect(
    () => () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    },
    [imagePreviewUrl],
  );

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

  function toggleCategory(id: number) {
    setSelectedCategoryIds((previous) =>
      previous.includes(id)
        ? previous.filter((categoryId) => categoryId !== id)
        : [...previous, id],
    );
  }

  function setImage(file: File) {
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setError("Choose a PNG, JPEG, or WEBP image no larger than 5MB.");
      return;
    }

    setError(null);
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    // Controls stay hidden after an upload; tap/click the image to reveal them.
    setShowImageActions(false);
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setImage(file);
    event.target.value = "";
  }

  function removeImage() {
    setImageFile(null);
    setImagePreviewUrl(null);
    setShowImageActions(false);
  }

  function updateQuantity(change: number) {
    setQuantity((current) => Math.max(0, current + change));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("description", description);
    formData.set("price", price);
    formData.set("quantity", String(quantity));
    formData.set("isAvailable", String(isAvailable));
    selectedCategoryIds.forEach((id) =>
      formData.append("categoryIds", String(id)),
    );
    if (imageFile) formData.set("image", imageFile);

    startTransition(async () => {
      const result = await createMenuAction(formData);
      if (!result.success) {
        setError(result.error.message);
        return;
      }

      // Show the success toast for a beat before navigating away — an
      // instant redirect would cut the Snackbar off before anyone reads
      // it. useRouter().push() (not next/navigation's redirect()) is the
      // correct tool here: redirect() is a Server Component/Server
      // Action primitive and doesn't work from Client Component code.
      setShowSuccess(true);
      setTimeout(() => {
        router.push("/backoffice/menus");
      }, 1000);
    });
  }

  const previewData: OdMenuCardData = {
    name: name || "Dish name",
    description,
    price: Number(price) || 0,
    category:
      categories.find((category) => selectedCategoryIds.includes(category.id))
        ?.name ?? "Uncategorized",
    imageUrl: imagePreviewUrl,
    stockQuantity: quantity,
    isAvailable,
  };

  return (
    <>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          gap: { xs: 3, lg: 4 },
          width: "100%",

          justifyContent: "center",
          p: { xs: 2, sm: 3, md: 4 },
          "& .MuiInputBase-input": { fontSize: { xs: "0.875rem", sm: "1rem" } },
          "& .MuiInputLabel-root": { fontSize: { xs: "0.8rem", sm: "0.9rem" } },
          "& .MuiButton-root": {
            fontSize: { xs: "0.72rem", sm: "0.8rem" },
            minHeight: { xs: 34, sm: 36 },
          },
        }}
      >
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            p: { xs: 2, sm: 3 },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1,
              pb: 2,
              mb: 2.5,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <EditOutlinedIcon color="primary" />
            <Box>
              <Typography variant="h6">Create Menu Item Details</Typography>
              <Typography variant="caption" color="text.secondary">
                Configure item information, price, category, and stock.
              </Typography>
            </Box>
          </Box>

          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Dish / Item Name"
              required
              fullWidth
              value={name}
              onChange={(event) => setName(event.target.value)}
            />

            <TextField
              label="Description"
              multiline
              minRows={3}
              maxRows={3}
              fullWidth
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              slotProps={{
                htmlInput: {
                  maxLength: MAX_DESCRIPTION_LENGTH,
                },
              }}
              helperText={`${description.length}/${MAX_DESCRIPTION_LENGTH} characters`}
            />

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                Menu Category *
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ flexWrap: "wrap" }}
              >
                {categories.map((category) => {
                  const selected = selectedCategoryIds.includes(category.id);
                  return (
                    <Chip
                      key={category.id}
                      label={category.name}
                      onClick={() => toggleCategory(category.id)}
                      color={selected ? "primary" : "default"}
                      variant={selected ? "filled" : "outlined"}
                      sx={{
                        fontWeight: 700,
                        fontSize: { xs: "0.72rem", sm: "0.8rem" },
                      }}
                    />
                  );
                })}
              </Stack>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                label="Selling Price"
                required
                type="number"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                slotProps={{
                  htmlInput: { min: 1, step: 1 },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">MMK</InputAdornment>
                    ),
                  },
                }}
              />
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  px: 1.5,
                  py: 1,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontSize: "0.8rem", fontWeight: 700 }}
                >
                  <Inventory2OutlinedIcon
                    sx={{ verticalAlign: "text-bottom", mr: 0.5 }}
                  />
                  Stock quantity
                </Typography>
                <Stack
                  direction="row"
                  sx={{
                    alignItems: "center",
                    justifyContent: "space-between",
                    mt: 0.75,
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={() => updateQuantity(-1)}
                    disabled={quantity === 0}
                  >
                    <RemoveIcon />
                  </IconButton>
                  <TextField
                    aria-label="Stock quantity"
                    type="number"
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(Math.max(0, Number(event.target.value) || 0))
                    }
                    slotProps={{
                      htmlInput: { min: 0, style: { textAlign: "center" } },
                    }}
                    sx={{ width: 92 }}
                  />
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => updateQuantity(1)}
                  >
                    <AddIcon />
                  </IconButton>
                </Stack>
                <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                  {[5, 10, 25].map((amount) => (
                    <Button
                      key={amount}
                      size="small"
                      onClick={() => updateQuantity(amount)}
                    >
                      +{amount}
                    </Button>
                  ))}
                </Stack>
              </Box>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", mb: 1 }}>
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
                            justifyContent: "space-around",
                            gap: { xs: 1, sm: 2 },

                            width: {
                              xs: "65%",
                              sm: "85%",
                              md: "80%",
                            },
                          }}
                        >
                          <Button
                            variant="contained"
                            color="inherit"
                            startIcon={<CloudUploadIcon />}
                            onClick={() => inputRef.current?.click()}
                            sx={{
                              flex: 1,

                              fontSize: {
                                xs: "0.75rem",
                                sm: "0.875rem",
                                md: "1rem",
                              },

                              py: {
                                xs: 0.8,
                                sm: 1,
                              },

                              minHeight: {
                                xs: 36,
                                sm: 42,
                              },

                              "&:hover": {
                                transform: "scale(1.05)",
                              },
                            }}
                          >
                            Replace
                          </Button>

                          <Button
                            variant="contained"
                            color="error"
                            startIcon={<DeleteOutlineIcon />}
                            onClick={removeImage}
                            sx={{
                              flex: 1,

                              fontSize: {
                                xs: "0.75rem",
                                sm: "0.875rem",
                                md: "1rem",
                              },

                              py: {
                                xs: 0.8,
                                sm: 1,
                              },

                              minHeight: {
                                xs: 36,
                                sm: 42,
                              },
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
                    <Typography
                      variant="body2"
                      sx={{
                        textAlign: "center",
                      }}
                    >
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

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                p: 1.5,
              }}
            >
              <Box>
                <Typography variant="body2">Is Available</Typography>
                <Typography variant="caption" color="text.secondary">
                  Show this item in the digital menu for customer ordering.
                </Typography>
              </Box>
              <Switch
                checked={isAvailable}
                onChange={(event) => setIsAvailable(event.target.checked)}
                slotProps={{
                  input: { "aria-label": "Make menu item available" },
                }}
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              disabled={isPending}
              sx={{
                alignSelf: "flex-start",
                textTransform: "none",
                fontWeight: 700,
                px: 3,
              }}
            >
              {isPending ? "Creating..." : "Create Menu"}
            </Button>
          </Stack>
        </Box>

        <Box sx={{ position: { lg: "sticky" }, top: { lg: 24 } }}>
          <Typography sx={{ fontWeight: 800, fontSize: ".8rem", mb: 1.25 }}>
            • LIVE CUSTOMER PREVIEW
          </Typography>
          <OdMenuCard item={previewData} />
        </Box>
      </Box>
      <Snackbar
        open={showSuccess}
        autoHideDuration={1000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" sx={{ width: "100%" }}>
          Menu created successfully!
        </Alert>
      </Snackbar>
    </>
  );
}
