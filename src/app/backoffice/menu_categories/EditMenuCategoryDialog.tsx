"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { updateMenuCategoryAction } from "./action";
import { useLocale, useTranslations } from "next-intl";
import type { CategoryMenu } from "@/app/lib/menu/categoryMenus";
import { localizedText } from "@/app/lib/i18n/localizedText";
import { useStaffErrorMessage } from "@/app/lib/hooks/useStaffWords";
import MenuThumb from "@/app/components/MenuThumb";
import MenuStatusChip from "@/app/components/MenuStatusChip";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import MenuCategoryFields from "@/app/components/menuCategory/MenuCategoryFields";

export interface EditableMenuCategory {
  id: number;
  name: string;
  nameMy: string | null;
  isEnabledAtLocation: boolean;
  /** Its menus, by name (MenuCategoryService.getCategoryMenus). */
  menus: CategoryMenu[];
}

interface EditMenuCategoryDialogProps {
  open: boolean;
  category: EditableMenuCategory | null;
  onClose: () => void;
  onSaved: () => void;
}

/** More menus than this → a search field above the list. */
const SEARCH_FROM = 9;

/** One menu in the dialog's list: thumbnail, name, status, and ✕ to
 *  stage its removal (+ to undo). A staged row dims and strikes through
 *  its name — nothing is removed until Save. */
function CategoryMenuRow({
  menu,
  categoryName,
  isStaged,
  onToggle,
}: {
  menu: CategoryMenu;
  categoryName: string;
  isStaged: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("bo.categories");
  const locale = useLocale();
  const name = localizedText(locale, menu.name, menu.nameMy);
  const isOnlyCategory = menu.otherCategoryCount === 0;
  const hintId = `category-menu-${menu.id}-hint`;
  const hint = isOnlyCategory
    ? t("onlyCategory")
    : isStaged && menu.otherVisibleCategoryCount === 0
      ? t("hiddenAfterSave")
      : null;

  return (
    <Box component="li" sx={{ py: 0.5 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", minWidth: 0 }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{
            flex: 1,
            minWidth: 0,
            alignItems: "center",
            opacity: isStaged ? 0.5 : 1,
            transition: "opacity 150ms ease-out",
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: 1,
              overflow: "hidden",
              bgcolor: "background.default",
            }}
          >
            <MenuThumb name={name} imageUrl={menu.imageUrl} />
          </Box>
          <Typography
            variant="body2"
            noWrap
            title={name}
            sx={{
              flex: 1,
              minWidth: 0,
              textDecoration: isStaged ? "line-through" : "none",
            }}
          >
            {name}
          </Typography>
          <MenuStatusChip status={menu.status} />
        </Stack>
        {isStaged ? (
          <IconButton
            onClick={onToggle}
            aria-label={t("keepIn", { name, category: categoryName })}
            sx={{ width: 44, height: 44, flexShrink: 0 }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        ) : (
          <IconButton
            onClick={onToggle}
            disabled={isOnlyCategory}
            aria-label={t("removeFrom", { name, category: categoryName })}
            aria-describedby={hint ? hintId : undefined}
            sx={{ width: 44, height: 44, flexShrink: 0 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>
      {hint && (
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ alignItems: "flex-start", pl: 6, pr: 6.5 }}
        >
          {!isOnlyCategory && (
            <WarningAmberIcon
              fontSize="small"
              aria-hidden
              sx={{ color: "warning.main", mt: 0.25 }}
            />
          )}
          <Typography id={hintId} variant="caption" color="text.secondary">
            {hint}
          </Typography>
        </Stack>
      )}
    </Box>
  );
}

/**
 * Edit a category: rename, "Show at this location", and its menus — each
 * can be staged for removal from this category (never its last one).
 * Save sends everything at once (updateMenuCategoryAction, one
 * transaction); Cancel / close discards it, asking first when anything
 * changed. Full-screen on phones; the menu list scrolls inside the
 * dialog so Save / Cancel stay visible.
 */
export default function EditMenuCategoryDialog({
  open,
  category,
  onClose,
  onSaved,
}: EditMenuCategoryDialogProps) {
  const t = useTranslations("bo.categories");
  const tCommon = useTranslations("bo.common");
  const locale = useLocale();
  const errorText = useStaffErrorMessage();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const [name, setName] = useState(category?.name ?? "");
  const [nameMy, setNameMy] = useState(category?.nameMy ?? "");
  const [isEnabled, setIsEnabled] = useState(
    category?.isEnabledAtLocation ?? true,
  );
  const [stagedIds, setStagedIds] = useState<ReadonlySet<number>>(new Set());
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);

  // Re-seed everything each time the dialog opens (the parent passes a
  // fresh object per open) — adjusting state during render, per React's
  // documented pattern, instead of an effect. So Cancel always discards.
  const [seededFor, setSeededFor] = useState(category);
  if (category && category !== seededFor) {
    setSeededFor(category);
    setName(category.name);
    setNameMy(category.nameMy ?? "");
    setIsEnabled(category.isEnabledAtLocation);
    setStagedIds(new Set());
    setQuery("");
    setError(null);
  }

  const menus = category?.menus ?? [];
  const isDirty =
    category !== null &&
    (name !== category.name ||
      nameMy !== (category.nameMy ?? "") ||
      isEnabled !== category.isEnabledAtLocation ||
      stagedIds.size > 0);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const shownMenus = normalizedQuery
    ? // Both names match, whatever the language shown.
      menus.filter(
        (menu) =>
          menu.name.toLocaleLowerCase().includes(normalizedQuery) ||
          (menu.nameMy ?? "").toLocaleLowerCase().includes(normalizedQuery),
      )
    : menus;

  function requestClose() {
    if (isSaving) return;
    if (isDirty) setIsConfirmingDiscard(true);
    else onClose();
  }

  function toggleStaged(menuId: number) {
    setStagedIds((current) => {
      const next = new Set(current);
      if (!next.delete(menuId)) next.add(menuId);
      return next;
    });
  }

  async function handleSave() {
    if (!category) return;
    setError(null);
    setIsSaving(true);

    const result = await updateMenuCategoryAction(category.id, {
      name,
      nameMy,
      isEnabled,
      removeMenuIds: [...stagedIds],
    });

    setIsSaving(false);

    if (!result.success) {
      setError(errorText(result.error));
      return;
    }

    onSaved();
    onClose();
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={requestClose}
        fullScreen={isPhone}
        maxWidth="sm"
        fullWidth
        aria-labelledby="edit-category-title"
      >
        <DialogTitle
          id="edit-category-title"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {t("editTitle")}
          <IconButton
            onClick={requestClose}
            aria-label={tCommon("close")}
            sx={{ width: 44, height: 44 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <MenuCategoryFields
            name={name}
            onNameChange={setName}
            nameMy={nameMy}
            onNameMyChange={setNameMy}
            isEnabled={isEnabled}
            onEnabledChange={setIsEnabled}
          />

          <Typography
            variant="subtitle2"
            component="h3"
            id="category-menus-title"
            sx={{ mt: 3, mb: 1 }}
          >
            {t("menusIn", { count: menus.length })}
          </Typography>

          {menus.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("noMenus")}
            </Typography>
          ) : (
            <>
              {menus.length >= SEARCH_FROM && (
                <TextField
                  label={t("searchMenus")}
                  size="small"
                  fullWidth
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  sx={{ mb: 1 }}
                  slotProps={{
                    input: {
                      endAdornment: query ? (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={t("clearSearch")}
                            onClick={() => setQuery("")}
                            edge="end"
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    },
                  }}
                />
              )}
              {shownMenus.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ py: 1 }}
                >
                  {t("noMatch")}
                </Typography>
              ) : (
                <Box
                  component="ul"
                  aria-labelledby="category-menus-title"
                  sx={{
                    listStyle: "none",
                    m: 0,
                    p: 0,
                    maxHeight: { xs: "40vh", sm: 320 },
                    overflowY: "auto",
                  }}
                >
                  {shownMenus.map((menu) => (
                    <CategoryMenuRow
                      key={menu.id}
                      menu={menu}
                      categoryName={
                        category ? localizedText(locale, category.name, category.nameMy) : ""
                      }
                      isStaged={stagedIds.has(menu.id)}
                      onToggle={() => toggleStaged(menu.id)}
                    />
                  ))}
                </Box>
              )}
              {stagedIds.size > 0 && (
                <Typography variant="body2" sx={{ mt: 1 }} role="status">
                  {t("willRemove", { count: stagedIds.size })}
                </Typography>
              )}
            </>
          )}
        </DialogContent>

        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            justifyContent: "flex-end",
            p: 2,
            pb: isPhone ? "calc(16px + env(safe-area-inset-bottom, 0px))" : 2,
          }}
        >
          <Button variant="outlined" color="inherit" onClick={requestClose}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
          >
            {isSaving ? tCommon("saving") : tCommon("saveChanges")}
          </Button>
        </Stack>
      </Dialog>

      <ConfirmDialog
        open={isConfirmingDiscard}
        title={t("discardTitle")}
        message={t("discardMessage")}
        confirmLabel={t("discard")}
        cancelLabel={t("keepEditing")}
        destructive
        onConfirm={() => {
          setIsConfirmingDiscard(false);
          onClose();
        }}
        onCancel={() => setIsConfirmingDiscard(false)}
      />
    </>
  );
}
