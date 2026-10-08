"use client";

import { Box, ButtonBase, IconButton, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import {
  categoryPreviewLine,
  NO_MENUS_TEXT,
  type CategoryMenu,
} from "@/app/lib/menu/categoryMenus";

/** ↑ / ↓: outlined squares (1px divider border, theme radius), 44px;
 *  the disabled end fades out. */
const arrowButtonSx = {
  width: 44,
  height: 44,
  border: 1,
  borderColor: "divider",
  borderRadius: 1,
  [hoverCapableMedia]: { "&:hover": { borderColor: "text.secondary" } },
  "&.Mui-disabled": { opacity: 0.4 },
} as const;

export interface CategoryItem {
  id: number;
  name: string;
  /** Always menus.length. */
  itemCount: number;
  /** Its menus, by name (MenuCategoryService.getCategoryMenus). */
  menus: CategoryMenu[];
}

/** The line under a category's name: "N items · A, B, C +K more" — one
 *  line, ellipsis (works for Myanmar names too), full text in title. */
export function CategoryMenusPreview({ menus }: { menus: CategoryMenu[] }) {
  const text = menus.length === 0 ? NO_MENUS_TEXT : categoryPreviewLine(menus);
  return (
    <Typography variant="body2" color="text.secondary" noWrap title={text}>
      {text}
    </Typography>
  );
}

interface SortableCategoryRowProps {
  category: CategoryItem;
  /** 0-based position in the visible list. */
  index: number;
  total: number;
  /** A save is in flight — dragging and the arrows are paused. */
  isSaving: boolean;
  reduceMotion: boolean;
  onMove: (id: number, direction: "up" | "down") => void;
  onOpen: (category: CategoryItem) => void;
  /** Lets the parent re-focus an arrow after its row has moved. */
  registerArrow: (key: string, element: HTMLButtonElement | null) => void;
}

/**
 * One category in the reorder list: drag handle, position badge, the
 * info area (opens the edit dialog) and ↑ / ↓. The handle and the
 * arrows are siblings of the info button, never inside it (DESIGN.md
 * Rule 10: no nested interactive elements).
 *
 * Dragging starts only from the handle (setActivatorNodeRef + the
 * listeners on it), and only the handle has `touch-action: none` — so
 * a swipe anywhere else on the row still scrolls the page on phones.
 */
export default function SortableCategoryRow({
  category,
  index,
  total,
  isSaving,
  reduceMotion,
  onMove,
  onOpen,
  registerArrow,
}: SortableCategoryRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: category.id,
    disabled: isSaving,
    // null = no shifting animation under prefers-reduced-motion.
    transition: reduceMotion ? null : undefined,
  });

  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <Box
      component="li"
      ref={setNodeRef}
      // dnd-kit's transform/transition (transform only — never
      // `transition: all`).
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? undefined,
      }}
      sx={(theme) => ({
        position: "relative",
        zIndex: isDragging ? 1 : "auto",
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1,
        py: 0.5,
        bgcolor: "background.paper",
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        // Only the row being dragged lifts.
        boxShadow: isDragging ? theme.shadows[4] : "none",
      })}
    >
      <IconButton
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${category.name}`}
        sx={{
          width: 44,
          height: 44,
          flexShrink: 0,
          color: "text.secondary",
          touchAction: "none",
          [hoverCapableMedia]: { cursor: isDragging ? "grabbing" : "grab" },
        }}
      >
        <DragIndicatorIcon />
      </IconButton>

      <ButtonBase
        onClick={() => onOpen(category)}
        aria-label={`Edit ${category.name}`}
        sx={(theme) => ({
          flex: 1,
          minWidth: 0,
          minHeight: 44,
          justifyContent: "flex-start",
          gap: 1.5,
          px: 1,
          py: 1,
          borderRadius: 1.5,
          textAlign: "left",
          [hoverCapableMedia]: {
            "&:hover": { bgcolor: theme.palette.action.hover },
          },
          "&.Mui-focusVisible": {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
        })}
      >
        <Box
          aria-hidden
          sx={(theme) => ({
            flexShrink: 0,
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 1,
            color: "primary.main",
            bgcolor: alpha(theme.palette.primary.main, 0.08),
          })}
        >
          <Typography variant="body2" component="span">
            {index + 1}
          </Typography>
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body1" noWrap>
            {category.name}
          </Typography>
          <CategoryMenusPreview menus={category.menus} />
        </Box>
      </ButtonBase>

      {/* While saving the arrows stay focusable (aria-disabled, clicks
          ignored) so a keyboard user's focus isn't dropped mid-move;
          only the true ends are really disabled. */}
      <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
        <IconButton
          ref={(element) => registerArrow(`${category.id}:up`, element)}
          aria-label={`Move ${category.name} up`}
          disabled={isFirst}
          aria-disabled={isFirst || isSaving}
          onClick={() => onMove(category.id, "up")}
          sx={arrowButtonSx}
        >
          <ArrowUpwardIcon fontSize="small" />
        </IconButton>
        <IconButton
          ref={(element) => registerArrow(`${category.id}:down`, element)}
          aria-label={`Move ${category.name} down`}
          disabled={isLast}
          aria-disabled={isLast || isSaving}
          onClick={() => onMove(category.id, "down")}
          sx={arrowButtonSx}
        >
          <ArrowDownwardIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
}
