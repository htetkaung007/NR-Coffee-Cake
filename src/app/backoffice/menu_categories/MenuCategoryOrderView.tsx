"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

const SCREEN_READER_INSTRUCTIONS =
  "To reorder, press Space to pick up the category. Use the Up and Down " +
  "arrow keys to move it, press Space again to drop it, or press Escape " +
  "to cancel.";

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
  const router = useRouter();
  const dndId = useId();
  const hiddenListId = useId();
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

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

  const nameOf = (id: UniqueIdentifier) =>
    items.find((category) => category.id === id)?.name ?? "The category";
  const positionOf = (id: UniqueIdentifier) =>
    items.findIndex((category) => category.id === id) + 1;
  const total = items.length;

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${nameOf(active.id)}. Position ${positionOf(active.id)} of ${total}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${nameOf(active.id)} was moved to position ${positionOf(over.id)} of ${total}.`
        : `${nameOf(active.id)} is no longer over the list.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${nameOf(active.id)} was dropped at position ${positionOf(over.id)} of ${total}.`
        : `${nameOf(active.id)} was dropped.`,
    onDragCancel: ({ active }) =>
      `Reordering cancelled. ${nameOf(active.id)} stays at position ${positionOf(active.id)} of ${total}.`,
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
      setError(`Couldn't save the new order — ${result.error.message}`);
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
      `${items[from].name} moved to position ${to + 1} of ${items.length}.`,
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
    setStatusMessage("Categories sorted A to Z.");
    setIsSaving(true);
    const result = await sortMenuCategoriesAlphabeticallyAction();
    setIsSaving(false);
    if (!result.success) {
      setItems(previous);
      setError(`Couldn't sort the categories — ${result.error.message}`);
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
              Menu categories
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The order customers and staff see the category tabs in
            </Typography>
          </Box>
          <Button
            onClick={() => setIsCreateOpen(true)}
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ display: { xs: "none", sm: "inline-flex" }, minHeight: 44 }}
          >
            New menu category
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
                  Drag to reorder, or use the arrows
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
                Sort A → Z
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
                No categories are shown at this location yet.
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
                    draggable: SCREEN_READER_INSTRUCTIONS,
                  },
                }}
              >
                <SortableContext
                  items={items.map((category) => category.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <Stack
                    component="ol"
                    aria-label="Category order"
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
            <Box role="status" aria-live="polite" sx={visuallyHidden}>
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
                    {hiddenCategories.length === 1
                      ? "1 category hidden at this location isn't shown"
                      : `${hiddenCategories.length} categories hidden at this location aren't shown`}
                  </Typography>
                  <Button
                    size="small"
                    aria-expanded={showHidden}
                    aria-controls={hiddenListId}
                    onClick={() => setShowHidden((shown) => !shown)}
                    sx={{ minHeight: 44 }}
                  >
                    {showHidden ? "Hide" : "Show"}
                  </Button>
                </Stack>
                {showHidden && (
                  <Stack
                    id={hiddenListId}
                    component="ul"
                    aria-label="Hidden at this location"
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
                          aria-label={`Edit ${category.name} (hidden here)`}
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
                              {category.name}
                            </Typography>
                            <CategoryMenusPreview menus={category.menus} />
                          </Box>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ flexShrink: 0 }}
                          >
                            Hidden here
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
        label="New menu category"
        hideFrom="sm"
      />

      {/* New categories go last in the company order (the service
          appends them); refresh brings the list up to date in place. */}
      <CreateMenuCategoryDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(created) => {
          setCreatedMessage({
            text: `${created.name} created`,
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
        title="Sort categories A → Z?"
        message="Your custom order will be replaced. This can't be undone."
        confirmLabel="Sort A → Z"
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

/** Screen-reader-only text (the live status region). */
const visuallyHidden = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;
