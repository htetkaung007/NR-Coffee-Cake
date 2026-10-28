"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Divider,
  InputAdornment,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import AdjustIcon from "@mui/icons-material/Adjust";
import {
  updateMenuAction,
  createMenuAction,
  deleteMenuAction,
} from "@/app/backoffice/menus/action";
import ConfirmDialog from "../ConfirmDialog";
import { useStaffErrorMessage, useStaffGenericError, useStaffMoney } from "@/app/lib/hooks/useStaffWords";
import { useSubmitLock } from "@/app/lib/hooks/useSubmitLock";
import type { MenuDeletionMode } from "@/app/lib/menu/menuDeletion";
import { AddonGroupOption } from "../ConnectAddonGroupDialog";
import MenuCard, { MenuCardData } from "../MenuCard";
import { SurfaceThemeScope } from "@/app/lib/theme/ThemeModeProvider";
import ConnectedAddonsSection from "./ConnectedAddonsSection";
import MenuCategoryChips, { MenuCategoryOption } from "./MenuCategoryChips";
import MenuImageUploader, { type FormPhoto } from "./MenuImageUploader";
import type { MenuImageView } from "@/app/lib/storage/assetUrl";
import { moveImage, removeImage } from "@/app/lib/menu/menuImagePlan";
import { toImageSlots } from "@/app/lib/menu/menuImageSlots";
import StockQuantityStepper from "./StockQuantityStepper";
import LocationChecklist, { type LocationOption } from "./LocationChecklist";
import CreateMenuCategoryDialog, {
  type CreatedMenuCategory,
} from "../menuCategory/CreateMenuCategoryDialog";
import StatusSnackbar, { type StatusMessage } from "../StatusSnackbar";
import FormCard, { SuccessSnackbar } from "../FormCard";
import PageHeader from "../PageHeader";
import { useSaveThenNavigate } from "@/app/lib/hooks/useSaveThenNavigate";
import SubmitButton from "@/app/components/SubmitButton";
import { useLocale, useTranslations } from "next-intl";
import { localizedText } from "@/app/lib/i18n/localizedText";
import { langAttr } from "@/app/lib/i18n/locale";
import { myanmarWordsOrNull } from "@/app/lib/i18n/customerWords";
import {
  MENU_DESCRIPTION_MAX,
  MENU_NAME_MAX,
} from "@/app/lib/schemas/menu_menuCategorySchema";
import CharacterCount from "../CharacterCount";
import {
  menuFormProblems,
  type MenuFormProblem,
} from "@/app/lib/menu/menuFormProblems";


interface MenuFormInitialData {
  id: number;
  name: string;
  /** Shown to customers who choose Myanmar (null: the English name). */
  nameMy: string | null;
  description: string | null;
  descriptionMy: string | null;
  price: number;
  quantity: number;
  isAvailable: boolean;
  categoryIds: number[];
  addonCategoryIds: number[];
  /** Its photos now, in order (0 = the main one). */
  images: MenuImageView[];
  /** The active locations it shows at now. */
  shownLocationIds: number[];
}

interface MenuFormProps {
  categories: MenuCategoryOption[];
  addonCategories: AddonGroupOption[];
  /** Omitted for create; passed for edit, to pre-fill the form with
   *  the menu's current values instead of starting from a blank slate. */
  initialData?: MenuFormInitialData;
  /** The company's active locations, for "Show at locations". */
  locations: LocationOption[];
  /** The selected location — pre-ticked on create, and the one whose
   *  stock the edit form changes. */
  currentLocation: LocationOption;
}

export default function MenuForm({
  categories,
  addonCategories,
  initialData,
  locations,
  currentLocation,
}: MenuFormProps) {
  const t = useTranslations("bo.menuForm");
  const tCommon = useTranslations("bo.common");
  const locale = useLocale();
  const money = useStaffMoney();
  const { error, setError, status, showSuccess, closeSuccess, save } =
    useSaveThenNavigate();
  const isEditMode = Boolean(initialData);
  const router = useRouter();
  const errorText = useStaffErrorMessage();
  const genericError = useStaffGenericError();
  // "Delete menu" (edit only): deleted for good if never ordered, else
  // hidden (archived) — MenuService.deleteMenu says which.
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletedMode, setDeletedMode] = useState<MenuDeletionMode | null>(null);
  // Locked from the first tap, and kept locked once deleted until the
  // page leaves — nothing may be sent for a menu that is gone.
  const deleteLock = useSubmitLock();
  const isDeleting = deleteLock.isLocked;
  // Saving or saved: the menu is about to change or the page to leave.
  const isSaving = status !== "idle";

  function handleDelete() {
    if (!initialData || isSaving) return;
    const menuId = initialData.id;
    void deleteLock.run(async () => {
      setDeleteError(null);
      const result = await deleteMenuAction(menuId);
      if (!result.success) {
        setDeleteError(errorText(result.error));
        return;
      }
      deleteLock.keepLocked();
      setIsDeleteOpen(false);
      // The outcome for a beat, then back to the list (as a save does).
      setDeletedMode(result.data.mode);
      setTimeout(() => router.push("/backoffice/menus"), 1000);
    }, () => setDeleteError(genericError));
  }
  // One active location: no choice to make — it shows there (as before
  // locations could be picked), and the section is hidden.
  const hasLocationChoice = locations.length > 1;
  const [shownLocationIds, setShownLocationIds] = useState<number[]>(
    initialData?.shownLocationIds ??
      locations
        .filter(
          (location) => location.locationId === currentLocation.locationId,
        )
        .map((location) => location.locationId),
  );
  const submittedLocationIds = hasLocationChoice
    ? shownLocationIds
    : locations.map((location) => location.locationId);
  const [name, setName] = useState(initialData?.name ?? "");
  const [nameMy, setNameMy] = useState(initialData?.nameMy ?? "");
  const [descriptionMy, setDescriptionMy] = useState(
    initialData?.descriptionMy ?? "",
  );
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
  // The photos, in order — the menu's own (kept by id) and files picked
  // now; nothing reaches the server until Save sends the whole list.
  const [photos, setPhotos] = useState<FormPhoto[]>(() =>
    (initialData?.images ?? []).map((image) => ({
      kind: "keep",
      key: `keep-${image.id}`,
      imageId: image.id,
      url: image.url,
      position: image.position,
    })),
  );
  // The picked files' preview URLs, freed when removed or on leaving.
  const objectUrls = useRef(new Set<string>());
  // "+ New category" creates in a dialog: the new one joins the chips
  // and is selected, and nothing typed in the form is touched. Kept
  // apart from the server's list so a refresh can't show it twice.
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [createdCategories, setCreatedCategories] = useState<
    CreatedMenuCategory[]
  >([]);
  const [categoryMessage, setCategoryMessage] = useState<StatusMessage | null>(
    null,
  );
  const categoryOptions = [
    ...categories,
    ...createdCategories.filter(
      (created) => !categories.some((category) => category.id === created.id),
    ),
  ];

  // What's still missing (lib/menu/menuFormProblems — the schema's own
  // words; the action's Zod check stays the real one). Nothing is shown
  // until the first Create / Save; after that the list follows every
  // change, so each message goes away as soon as it's fixed.
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
  const problems = menuFormProblems({
    name,
    price,
    categoryIds: selectedCategoryIds,
    requiresLocation: hasLocationChoice,
    shownLocationIds,
  });
  const shownProblems = hasTriedSubmit ? problems : [];
  /** A problem in the staff's words (bo.menuForm.problems). */
  const problemText = (problem: MenuFormProblem) =>
    t(`problems.${problem.code}`, { currency: money.currency });
  const problemFor = (field: MenuFormProblem["field"]) => {
    const problem = shownProblems.find((entry) => entry.field === field);
    return problem ? problemText(problem) : undefined;
  };
  const nameInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const locationsRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  function toggleCategory(id: number) {
    setSelectedCategoryIds((previous) =>
      previous.includes(id)
        ? previous.filter((categoryId) => categoryId !== id)
        : [...previous, id],
    );
  }

  function handleCategoryCreated(created: CreatedMenuCategory) {
    setCreatedCategories((current) => [...current, created]);
    setSelectedCategoryIds((current) =>
      current.includes(created.id) ? current : [...current, created.id],
    );
    setCategoryMessage({
      text: t("categoryCreated", {
        name: localizedText(locale, created.name, created.nameMy),
      }),
      severity: "success",
    });
  }

  /** Picked files join the end (the uploader already capped how many). */
  function handlePhotosAdded(files: File[]) {
    setError(null);
    const added: FormPhoto[] = files.map((file, index) => {
      const url = URL.createObjectURL(file);
      objectUrls.current.add(url);
      return { kind: "new", key: url, url, file, position: photos.length + index };
    });
    setPhotos([...photos, ...added]);
  }

  function handleRemovePhoto(index: number) {
    const removed = photos[index];
    if (removed?.kind === "new") {
      URL.revokeObjectURL(removed.url);
      objectUrls.current.delete(removed.url);
    }
    setPhotos(removeImage(photos, index));
  }

  /** Brings the first problem's field into view and focuses it when it
   *  can take focus (the input; the first category chip, else "New
   *  category"; the first location checkbox). */
  function showProblem(field: MenuFormProblem["field"]) {
    const target =
      field === "name"
        ? nameInputRef.current
        : field === "price"
          ? priceInputRef.current
          : field === "categories"
            ? (categoriesRef.current?.querySelector<HTMLElement>(
                ".MuiChip-clickable",
              ) ??
              categoriesRef.current?.querySelector<HTMLElement>("button") ??
              null)
            : (locationsRef.current?.querySelector<HTMLElement>(
                'input[type="checkbox"]',
              ) ?? null);
    const container =
      field === "categories"
        ? categoriesRef.current
        : field === "locations"
          ? locationsRef.current
          : target;
    container?.scrollIntoView({ block: "center" });
    target?.focus({ preventScroll: true });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isDeleting) return;
    setError(null);
    if (problems.length > 0) {
      setHasTriedSubmit(true);
      showProblem(problems[0].field);
      return;
    }

    const formData = new FormData();
    formData.set("name", name);
    formData.set("nameMy", nameMy);
    formData.set("description", description);
    formData.set("descriptionMy", descriptionMy);
    formData.set("price", price);
    formData.set("quantity", String(quantity));
    formData.set("isAvailable", String(isAvailable));
    selectedCategoryIds.forEach((id) =>
      formData.append("categoryIds", String(id)),
    );
    selectedAddonCategoryIds.forEach((id) =>
      formData.append("addonCategoryIds", String(id)),
    );
    submittedLocationIds.forEach((id) =>
      formData.append("shownLocationIds", String(id)),
    );
    // The full photo list, in order (lib/menu/menuImageSlots).
    const { slots, files } = toImageSlots(photos);
    slots.forEach((slot) => formData.append("imageSlots", slot));
    files.forEach((file) => formData.append("newImages", file));

    save(
      () =>
        isEditMode
          ? updateMenuAction(initialData!.id, formData)
          : createMenuAction(formData),
      "/backoffice/menus",
    );
  }

  // The preview speaks the Backoffice language: in Myanmar, the
  // customer's Myanmar card (its words and the Myanmar names).
  const previewWords = myanmarWordsOrNull(locale);
  const previewCategory = categoryOptions.find((category) =>
    selectedCategoryIds.includes(category.id),
  );
  const previewData: MenuCardData = {
    name: localizedText(locale, name || t("dishPlaceholder"), nameMy),
    description: localizedText(locale, description || "", descriptionMy),
    price: Number(price) || 0,
    category: previewCategory
      ? localizedText(locale, previewCategory.name, previewCategory.nameMy)
      : tCommon("uncategorized"),
    imageUrl: photos[0]?.url ?? null,
    stockQuantity: quantity,
    isAvailable,
  };

  return (
    <>
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 2, sm: 3, md: 4 } }}>
        <PageHeader
          title={isEditMode ? t("editTitle") : t("newTitle")}
          backHref="/backoffice/menus"
          backLabel={t("backToMenus")}
        />
      </Box>
      <Box
        component="form"
        // Our own messages (above the button) replace the browser's.
        noValidate
        onSubmit={handleSubmit}
        sx={{
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          gap: { xs: 3, lg: 4 },
          width: "100%",
          justifyContent: "center",
          // The page's top padding is above PageHeader.
          px: { xs: 2, sm: 3, md: 4 },
          pb: { xs: 2, sm: 3, md: 4 },
          // Compact buttons; their text is the theme's button variant.
          "& .MuiButton-root": { minHeight: { xs: 34, sm: 36 } },
        }}
      >
        <FormCard
          header={{
            icon: <EditOutlinedIcon color="primary" />,
            title: t("detailsTitle"),
            subtitle: isEditMode ? t("detailsEdit") : t("detailsNew"),
          }}
        >
          <TextField
            label={t("name")}
            required
            fullWidth
            value={name}
            onChange={(event) => setName(event.target.value)}
            inputRef={nameInputRef}
            slotProps={{
              htmlInput: { maxLength: MENU_NAME_MAX },
              formHelperText: { component: "div" },
            }}
            error={Boolean(problemFor("name"))}
            helperText={
              problemFor("name") ?? (
                // Editing: a rename is for typos only — old orders show
                // the menu by its current name (it isn't snapshotted).
                <CharacterCount
                  count={name.length}
                  max={MENU_NAME_MAX}
                  hint={isEditMode ? t("renameHint") : undefined}
                />
              )
            }
          />
          <TextField
            label={tCommon("myanmarName")}
            fullWidth
            value={nameMy}
            onChange={(event) => setNameMy(event.target.value)}
            slotProps={{
              htmlInput: { maxLength: MENU_NAME_MAX, lang: "my" },
              formHelperText: { component: "div" },
            }}
            helperText={
              <CharacterCount
                count={nameMy.length}
                max={MENU_NAME_MAX}
                hint={tCommon("myanmarHelper")}
              />
            }
          />
          <TextField
            label={t("description")}
            multiline
            minRows={2}
            maxRows={3}
            fullWidth
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            slotProps={{
              htmlInput: { maxLength: MENU_DESCRIPTION_MAX },
            }}
            helperText={tCommon("characters", {
              count: description.length,
              max: MENU_DESCRIPTION_MAX,
            })}
          />
          <TextField
            label={t("descriptionMy")}
            multiline
            minRows={2}
            maxRows={3}
            fullWidth
            value={descriptionMy}
            onChange={(event) => setDescriptionMy(event.target.value)}
            slotProps={{
              htmlInput: { maxLength: MENU_DESCRIPTION_MAX, lang: "my" },
              formHelperText: { component: "div" },
            }}
            helperText={
              <CharacterCount
                count={descriptionMy.length}
                max={MENU_DESCRIPTION_MAX}
                hint={tCommon("myanmarHelper")}
              />
            }
          />

          <Box ref={categoriesRef}>
            <MenuCategoryChips
              categories={categoryOptions}
              selectedCategoryIds={selectedCategoryIds}
              onToggle={toggleCategory}
              onCreateCategory={() => setIsCreatingCategory(true)}
              error={problemFor("categories")}
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label={t("price")}
              required
              type="number"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              inputRef={priceInputRef}
              error={Boolean(problemFor("price"))}
              helperText={problemFor("price")}
              slotProps={{
                htmlInput: { min: 1, step: 1 },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      {money.currency}
                    </InputAdornment>
                  ),
                },
              }}
            />
            <StockQuantityStepper
              quantity={quantity}
              onChange={setQuantity}
              label={
                isEditMode
                  ? t("stockAt", { location: currentLocation.name })
                  : hasLocationChoice
                    ? t("startingStockEach")
                    : t("startingStock")
              }
            />
          </Box>

          {/* LocationChecklist shows its own "Choose at least one
              location." as soon as nothing is ticked. */}
          {hasLocationChoice && (
            <Box ref={locationsRef}>
              <LocationChecklist
                locations={locations}
                currentLocationId={currentLocation.locationId}
                selectedIds={shownLocationIds}
                onChange={setShownLocationIds}
              />
            </Box>
          )}

          <MenuImageUploader
            photos={photos}
            onFilesAdded={handlePhotosAdded}
            onMove={(index, direction) =>
              setPhotos((current) => moveImage(current, index, direction))
            }
            onRemove={handleRemovePhoto}
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
              <Typography variant="body2">{t("isAvailable")}</Typography>
              <Typography variant="caption" color="text.secondary">
                {t("isAvailableHint")}
              </Typography>
            </Box>
            <Switch
              checked={isAvailable}
              onChange={(event) => setIsAvailable(event.target.checked)}
              slotProps={{
                input: { "aria-label": t("isAvailableLabel") },
              }}
            />
          </Box>

          {/* The form's ONE error area, right above the button: what's
              still missing (after a Create / Save), and any server or
              image error. MUI's Alert is role="alert", so it's announced. */}
          {(shownProblems.length > 0 || error) && (
            <Alert severity="error">
              {shownProblems.length > 0 && (
                <>
                  <AlertTitle>
                    {isEditMode ? t("toSave") : t("toCreate")}
                  </AlertTitle>
                  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {shownProblems.map((problem) => (
                      <li key={problem.field}>{problemText(problem)}</li>
                    ))}
                  </Box>
                </>
              )}
              {error && (
                <Box sx={{ mt: shownProblems.length > 0 ? 1 : 0 }}>{error}</Box>
              )}
            </Alert>
          )}

          <SubmitButton
            type="submit"
            variant="contained"
            status={status}
            disabled={isDeleting}
            busyLabel={isEditMode ? tCommon("saving") : t("creating")}
            doneLabel={isEditMode ? tCommon("saved") : tCommon("created")}
            sx={{ alignSelf: "flex-start", px: 3 }}
          >
            {isEditMode ? tCommon("saveChanges") : t("create")}
          </SubmitButton>

          {/* Away from Save, under a rule: the one destructive action. */}
          {isEditMode && (
            <>
              <Divider />
              <Button
                variant="outlined"
                color="error"
                disabled={isDeleting || isSaving}
                onClick={() => {
                  setDeleteError(null);
                  setIsDeleteOpen(true);
                }}
                sx={{ alignSelf: "flex-start" }}
              >
                {t("deleteMenu")}
              </Button>
            </>
          )}
        </FormCard>

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
            {t("livePreview")}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {/* Backoffice runs the Bo theme, but this card must look exactly
              like the customer's — render it under the Od theme. */}
          <SurfaceThemeScope surface="od">
            {/* The card fills whatever width it's given; the preview
                keeps the customer grid's typical card size. */}
            <Box sx={{ maxWidth: 360, mx: "auto" }} lang={langAttr(locale)}>
              <MenuCard item={previewData} labels={previewWords?.cardLabels} />
            </Box>
          </SurfaceThemeScope>
        </Box>
      </Box>

      <SuccessSnackbar
        open={showSuccess}
        onClose={closeSuccess}
        message={
          isEditMode ? t("updated") : t("created")
        }
      />

      {initialData && (
        <ConfirmDialog
          open={isDeleteOpen}
          title={t("deleteTitle", { name: initialData.name })}
          message={
            <>
              {t("deleteBody")}
              {deleteError && (
                <Box component="span" sx={{ display: "block", mt: 1 }}>
                  <Typography variant="body2" component="span" color="error" role="alert">
                    {deleteError}
                  </Typography>
                </Box>
              )}
            </>
          }
          confirmLabel={tCommon("delete")}
          cancelLabel={tCommon("cancel")}
          destructive
          pending={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteOpen(false)}
        />
      )}
      <SuccessSnackbar
        open={deletedMode !== null}
        onClose={() => {}}
        message={deletedMode === "archive" ? t("archived") : t("deleted")}
      />

      <CreateMenuCategoryDialog
        open={isCreatingCategory}
        onClose={() => setIsCreatingCategory(false)}
        onCreated={handleCategoryCreated}
      />
      <StatusSnackbar
        message={categoryMessage}
        onClose={() => setCategoryMessage(null)}
      />
    </>
  );
}
