"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { localizedText } from "@/app/lib/i18n/localizedText";
import { useStaffErrorMessage } from "@/app/lib/hooks/useStaffWords";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Grid,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import NewItemFab, { NewItemFabSpacer } from "@/app/components/NewItemFab";
import CreateMenuCategoryDialog from "@/app/components/menuCategory/CreateMenuCategoryDialog";
import StatusSnackbar, {
  type StatusMessage,
} from "@/app/components/StatusSnackbar";
import EditMenuCategoryDialog, {
  type EditableMenuCategory,
} from "./EditMenuCategoryDialog";
import {
  hoverCapableMedia,
  topBarHeight,
  reducedMotionQuery,
  visuallyHiddenSx,
} from "@/app/lib/theme/sharedThemeTokens";
import {
  reorderMenuCategoriesAction,
  sortMenuCategoriesAlphabeticallyAction,
} from "./action";
import SortableCategoryRow, {
  CategoryMenusPreview,
  type CategoryItem,
} from "./SortableCategoryRow";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import CategoryTabsPreview from "./CategoryTabsPreview";

interface MenuCategoryOrderViewProps {
  /** Visible at the selected location, in the company order. */
  categories: CategoryItem[];
  /** Hidden at the selected location — not reorderable here. */
  hiddenCategories: CategoryItem[];
  shopName: string | null;
}

/**
 * The Backoffice "Menu categories" page: the company-wide category order
 * as it applies to the selected location. Only categories visible here
 * are listed and reordered (MenuCategoryService.reorder keeps the hidden
 * ones in their slots); the hidden ones sit in a collapsed list below,
 * reachable only to re-enable them.
 *
 * Every change — a drop, ↑ / ↓, Sort A → Z — saves once, optimistically,
 * through one path (commitOrder), and rolls back on error.
 */
export default function MenuCategoryOrderView({
  categories,
  hiddenCategories,
  shopName,
}: MenuCategoryOrderViewProps) {
  const t = useTranslations("bo.categories");
  const tCommon = useTranslations("bo.common");
  const locale = useLocale();
  const errorText = useStaffErrorMessage();
  const router = useRouter();
  const dndId = useId();
  const hiddenListId = useId();
  const reduceMotion = useMediaQuery(reducedMotionQuery);

  const [items, setItems] = useState(categories);
  // Fresh server data (after a save revalidates, or an edit refreshes)
  // replaces the local order — adjusted during render, not remounted,
  // so keyboard focus survives a save.
  const [serverCategories, setServerCategories] = useState(categories);
  if (categories !== serverCategories) {
    setServerCategories(categories);
    setItems(categories);
  }

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSortConfirmOpen, setIsSortConfirmOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [editing, setEditing] = useState<EditableMenuCategory | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdMessage, setCreatedMessage] = useState<StatusMessage | null>(
    null,
  );

  // ↑ / ↓: after the row moves, put focus back on the same arrow (or
  // the other one, if the row reached an end and this one is disabled)
  // so repeated presses keep moving it.
  const arrowRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<{ id: number; direction: "up" | "down" } | null>(
    null,
  );
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const same = arrowRefs.current.get(`${target.id}:${target.direction}`);
    const other = arrowRefs.current.get(
      `${target.id}:${target.direction === "up" ? "down" : "up"}`,
    );
    (same && !same.disabled ? same : other)?.focus();
  }, [items]);

  function registerArrow(key: string, element: HTMLButtonElement | null) {
    if (element) arrowRefs.current.set(key, element);
    else arrowRefs.current.delete(key);
  }

  // Mouse: a 6px move starts a drag (a click never does). Touch: hold the
  // handle ~150ms — a quick swipe scrolls instead. MouseSensor rather
  // than PointerSensor: PointerSensor also captures touch pointers, which
  // would start a drag on a 6px swipe and bypass the touch delay.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const nameOf = (id: UniqueIdentifier) => {
    const category = items.find((entry) => entry.id === id);
    return category
      ? localizedText(locale, category.name, category.nameMy)
      : t("theCategory");
  };
  const positionOf = (id: UniqueIdentifier) =>
    items.findIndex((category) => category.id === id) + 1;
  const total = items.length;

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      t("pickedUp", { name: nameOf(active.id), position: positionOf(active.id), total }),
    onDragOver: ({ active, over }) =>
      over
        ? t("movedOver", { name: nameOf(active.id), position: positionOf(over.id), total })
        : t("notOver", { name: nameOf(active.id) }),
    onDragEnd: ({ active, over }) =>
      over
        ? t("droppedAt", { name: nameOf(active.id), position: positionOf(over.id), total })
        : t("dropped", { name: nameOf(active.id) }),
    onDragCancel: ({ active }) =>
      t("cancelled", { name: nameOf(active.id), position: positionOf(active.id), total }),
  };

  /** The one save path: show the new order right away, save it once,
   *  put the old order back if the save fails. */
  async function commitOrder(next: CategoryItem[], announcement?: string) {
    const previous = items;
    setItems(next);
    setError(null);
    if (announcement) setStatusMessage(announcement);
    setIsSaving(true);
    const result = await reorderMenuCategoriesAction({
      orderedIds: next.map((category) => category.id),
    });
    setIsSaving(false);
    if (!result.success) {
      setItems(previous);
      setError(t("saveFailed", { error: errorText(result.error) }));
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    // Dropped outside the list, or back where it started: nothing to save.
    if (!over || active.id === over.id) return;
    const from = positionOf(active.id) - 1;
    const to = positionOf(over.id) - 1;
    void commitOrder(arrayMove(items, from, to));
  }

  function handleMove(id: number, direction: "up" | "down") {
    if (isSaving) return;
    const from = items.findIndex((category) => category.id === id);
    const to = direction === "up" ? from - 1 : from + 1;
    if (from < 0 || to < 0 || to >= items.length) return;
    pendingFocus.current = { id, direction };
    void commitOrder(
      arrayMove(items, from, to),
      t("moved", { name: nameOf(id), position: to + 1, total: items.length }),
    );
  }

  /** Optimistic like every other change: sort here right away (same
   *  rule as MenuCategoryService.sortAlphabetically), then adopt the
   *  server's saved order — which only differs if its locale sorts a
   *  name differently — or put the old order back on error. */
  async function handleSortConfirmed() {
    setIsSortConfirmOpen(false);
    const previous = items;
    const collator = new Intl.Collator(undefined, { sensitivity: "base" });
    setItems(
      [...items].sort(
        (a, b) => collator.compare(a.name, b.name) || a.id - b.id,
      ),
    );
    setError(null);
    setStatusMessage(t("sorted"));
    setIsSaving(true);
    const result = await sortMenuCategoriesAlphabeticallyAction();
    setIsSaving(false);
    if (!result.success) {
      setItems(previous);
      setError(t("sortFailed", { error: errorText(result.error) }));
      return;
    }
    const byId = new Map(previous.map((category) => [category.id, category]));
    setItems(
      result.data.flatMap((id) => {
        const category = byId.get(id);
        return category ? [category] : [];
      }),
    );
  }

  return (
    <>
      <Box sx={{ px: { xs: 0, sm: 2, md: 3 }, py: { xs: 1.5, sm: 2, md: 3 } }}>
        <Stack
          direction="row"
          useFlexGap
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1.5,
            mb: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h1" variant="h6">
              {t("title")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("subtitle")}
            </Typography>
          </Box>
          <Button
            onClick={() => setIsCreateOpen(true)}
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ display: { xs: "none", sm: "inline-flex" }, minHeight: 44 }}
          >
            {t("newCategory")}
          </Button>
        </Stack>

        {/* Phones: header → preview → toolbar → list. md+ shows the
            full preview in the right-hand column instead (below). */}
        <Box sx={{ display: { xs: "block", md: "none" }, mb: 2 }}>
          <CategoryTabsPreview
            variant="compact"
            shopName={shopName}
            categories={items}
          />
        </Box>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7, lg: 8 }}>
            <Stack
              direction="row"
              useFlexGap
              sx={{
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1.5,
                mb: 1.5,
              }}
            >
              <Stack
                direction="row"
                spacing={0.5}
                sx={{ alignItems: "center", color: "text.secondary" }}
              >
                <DragIndicatorIcon fontSize="small" aria-hidden />
                <Typography variant="body2">
                  {t("dragHint")}
                </Typography>
              </Stack>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<SortByAlphaIcon />}
                disabled={isSaving || items.length < 2}
                onClick={() => setIsSortConfirmOpen(true)}
                sx={{ minHeight: 44 }}
              >
                {t("sortAz")}
              </Button>
            </Stack>

            {error && (
              <Alert
                severity="error"
                onClose={() => setError(null)}
                sx={{ mb: 1.5 }}
              >
                {error}
              </Alert>
            )}

            {items.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                {t("noneShown")}
              </Typography>
            ) : (
              <DndContext
                id={dndId}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                accessibility={{
                  announcements,
                  screenReaderInstructions: {
                    draggable: t("srInstructions"),
                  },
                }}
              >
                <SortableContext
                  items={items.map((category) => category.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <Stack
                    component="ol"
                    aria-label={t("orderLabel")}
                    spacing={1}
                    sx={{ listStyle: "none", m: 0, p: 0 }}
                  >
                    {items.map((category, index) => (
                      <SortableCategoryRow
                        key={category.id}
                        category={category}
                        index={index}
                        total={items.length}
                        isSaving={isSaving}
                        reduceMotion={reduceMotion}
                        onMove={handleMove}
                        onOpen={(opened) =>
                          setEditing({ ...opened, isEnabledAtLocation: true })
                        }
                        registerArrow={registerArrow}
                      />
                    ))}
                  </Stack>
                </SortableContext>
              </DndContext>
            )}

            {/* ↑ / ↓ and Sort A → Z results, read out politely. */}
            <Box role="status" aria-live="polite" sx={visuallyHiddenSx}>
              {statusMessage}
            </Box>

            {hiddenCategories.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Stack
                  direction="row"
                  useFlexGap
                  sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {t("hiddenCount", { count: hiddenCategories.length })}
                  </Typography>
                  <Button
                    size="small"
                    aria-expanded={showHidden}
                    aria-controls={hiddenListId}
                    onClick={() => setShowHidden((shown) => !shown)}
                    sx={{ minHeight: 44 }}
                  >
                    {showHidden ? t("hide") : t("show")}
                  </Button>
                </Stack>
                {showHidden && (
                  <Stack
                    id={hiddenListId}
                    component="ul"
                    aria-label={t("hiddenLabel")}
                    spacing={1}
                    sx={{ listStyle: "none", m: 0, p: 0, mt: 1 }}
                  >
                    {hiddenCategories.map((category) => (
                      <Box component="li" key={category.id}>
                        <ButtonBase
                          onClick={() =>
                            setEditing({
                              ...category,
                              isEnabledAtLocation: false,
                            })
                          }
                          aria-label={t("editHidden", {
                            name: localizedText(locale, category.name, category.nameMy),
                          })}
                          sx={(theme) => ({
                            width: "100%",
                            minHeight: 44,
                            justifyContent: "space-between",
                            gap: 1.5,
                            px: 2,
                            py: 1,
                            textAlign: "left",
                            bgcolor: "background.paper",
                            border: 1,
                            borderColor: "divider",
                            borderRadius: 2,
                            [hoverCapableMedia]: {
                              "&:hover": {
                                bgcolor: theme.palette.action.hover,
                              },
                            },
                            "&.Mui-focusVisible": {
                              outline: `2px solid ${theme.palette.primary.main}`,
                              outlineOffset: 2,
                            },
                          })}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body1" noWrap>
                              {localizedText(locale, category.name, category.nameMy)}
                            </Typography>
                            <CategoryMenusPreview menus={category.menus} />
                          </Box>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ flexShrink: 0 }}
                          >
                            {t("hiddenHere")}
                          </Typography>
                        </ButtonBase>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            )}
          </Grid>

          {/* md+: the sticky right-hand preview (phones get the compact
              one above the toolbar instead). */}
          <Grid
            size={{ md: 5, lg: 4 }}
            sx={{ display: { xs: "none", md: "block" } }}
          >
            <Box
              sx={(theme) => ({
                position: "sticky",
                top: `calc(${topBarHeight(theme)}px + ${theme.spacing(2)})`,
              })}
            >
              <CategoryTabsPreview
                variant="full"
                shopName={shopName}
                categories={items}
              />
            </Box>
          </Grid>
        </Grid>

        <NewItemFabSpacer hideFrom="sm" />
      </Box>

      <NewItemFab
        onClick={() => setIsCreateOpen(true)}
        label={t("newCategory")}
        hideFrom="sm"
      />

      {/* New categories go last in the company order (the service
          appends them); refresh brings the list up to date in place. */}
      <CreateMenuCategoryDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(created) => {
          setCreatedMessage({
            text: t("created", {
              name: localizedText(locale, created.name, created.nameMy),
            }),
            severity: "success",
          });
          router.refresh();
        }}
      />
      <StatusSnackbar
        message={createdMessage}
        onClose={() => setCreatedMessage(null)}
      />

      <ConfirmDialog
        open={isSortConfirmOpen}
        title={t("sortTitle")}
        message={t("sortMessage")}
        confirmLabel={t("sortAz")}
        cancelLabel={tCommon("cancel")}
        onConfirm={() => void handleSortConfirmed()}
        onCancel={() => setIsSortConfirmOpen(false)}
      />

      <EditMenuCategoryDialog
        open={editing !== null}
        category={editing}
        onClose={() => setEditing(null)}
        onSaved={() => router.refresh()}
      />
    </>
  );
}
