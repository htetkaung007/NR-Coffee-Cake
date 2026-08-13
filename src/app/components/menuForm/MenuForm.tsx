"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Divider,
  InputAdornment,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import AdjustIcon from "@mui/icons-material/Adjust";
import {
  updateMenuAction,
  createMenuAction,
} from "@/app/backoffice/menus/action";
import { AddonGroupOption } from "../ConnectAddonGroupDialog";
import OdMenuCard, { OdMenuCardData } from "../OdMenuCard";
import ConnectedAddonsSection from "./Connectedaddonssection";
import MenuCategoryChips, { MenuCategoryOption } from "./Menucategorychips";
import MenuImageUploader from "./Menuimageuploader";
import StockQuantityStepper from "./Stockquantitystepper";

interface MenuFormInitialData {
  id: number;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  isAvailable: boolean;
  categoryIds: number[];
  addonCategoryIds: number[];
  imageUrl: string | null;
}

interface MenuFormProps {
  categories: MenuCategoryOption[];
  addonCategories: AddonGroupOption[];
  /** Omitted for create; passed for edit, to pre-fill the form with
   *  the menu's current values instead of starting from a blank slate. */
  initialData?: MenuFormInitialData;
}

export default function MenuForm({
  categories,
  addonCategories,
  initialData,
}: MenuFormProps) {
  const router = useRouter();
  const isEditMode = Boolean(initialData);
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [price, setPrice] = useState(initialData?.price.toString() ?? "");
  const [quantity, setQuantity] = useState(initialData?.quantity ?? 1);
  const [isAvailable, setIsAvailable] = useState(
    initialData?.isAvailable ?? true,
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(
    initialData?.categoryIds ?? [],
  );
  const [selectedAddonCategoryIds, setSelectedAddonCategoryIds] = useState<
    number[]
  >(initialData?.addonCategoryIds ?? []);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(
    initialData?.imageUrl ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const MAX_DESCRIPTION_LENGTH = 100;

  useEffect(
    () => () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    },
    [imagePreviewUrl],
  );

  function toggleCategory(id: number) {
    setSelectedCategoryIds((previous) =>
      previous.includes(id)
        ? previous.filter((categoryId) => categoryId !== id)
        : [...previous, id],
    );
  }

  function handleFileSelected(file: File) {
    setError(null);
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImagePreviewUrl(null);
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
    selectedAddonCategoryIds.forEach((id) =>
      formData.append("addonCategoryIds", String(id)),
    );
    if (imageFile) formData.set("image", imageFile);

    startTransition(async () => {
      const result = isEditMode
        ? await updateMenuAction(initialData!.id, formData)
        : await createMenuAction(formData);

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      setShowSuccess(true);
      setTimeout(() => {
        router.push("/backoffice/menus");
      }, 1000);
    });
  }

  const previewData: OdMenuCardData = {
    name: name || "Dish name",
    description: description || "",
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
              <Typography variant="h6">
                {isEditMode ? "Edit Menu Item" : "Menu Item Details"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isEditMode
                  ? "Update this item's information, price, category, and stock."
                  : "Configure item information, price, category, and stock."}
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
              minRows={2}
              maxRows={3}
              fullWidth
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              slotProps={{
                htmlInput: { maxLength: MAX_DESCRIPTION_LENGTH },
              }}
              helperText={`${description.length}/${MAX_DESCRIPTION_LENGTH} characters`}
              sx={{
                "& .MuiInputBase-input": {
                  fontSize: "0.775rem",
                  fontWeight: 560,
                },
              }}
            />

            <MenuCategoryChips
              categories={categories}
              selectedCategoryIds={selectedCategoryIds}
              onToggle={toggleCategory}
            />

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
              <StockQuantityStepper
                quantity={quantity}
                onChange={setQuantity}
              />
            </Box>

            <MenuImageUploader
              imagePreviewUrl={imagePreviewUrl}
              onFileSelected={handleFileSelected}
              onRemove={handleRemoveImage}
              onError={setError}
            />

            <ConnectedAddonsSection
              addonCategories={addonCategories}
              selectedAddonCategoryIds={selectedAddonCategoryIds}
              onChangeSelectedAddonCategoryIds={setSelectedAddonCategoryIds}
            />

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
              sx={{ alignSelf: "flex-start", px: 3 }}
            >
              {isPending
                ? isEditMode
                  ? "Saving..."
                  : "Creating..."
                : isEditMode
                  ? "Save Changes"
                  : "Create Menu"}
            </Button>
          </Stack>
        </Box>

        <Box
          sx={{ position: { lg: "sticky" }, top: { lg: 24 }, minWidth: 360 }}
        >
          <Typography variant="body2" sx={{ mb: 1.25 }}>
            <AdjustIcon
              sx={{
                verticalAlign: "middle",
                mr: 1,
                color: "primary.main",
                animation: "pulse 2.5s infinite ease-in-out",
                "@keyframes pulse": {
                  "30%": { opacity: 1 },
                  "50%": { opacity: 0.2 },
                  "100%": { opacity: 1 },
                },
              }}
            />
            LIVE CUSTOMER PREVIEW
          </Typography>
          <Divider sx={{ mb: 2 }} />
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
          {isEditMode
            ? "Menu updated successfully!"
            : "Menu created successfully!"}
        </Alert>
      </Snackbar>
    </>
  );
}
