"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ConnectAddonGroupDialog from "../ConnectAddonGroupDialog";
import { AddonGroupOption } from "../ConnectAddonGroupDialog";

interface ConnectedAddonsSectionProps {
  addonCategories: AddonGroupOption[];
  selectedAddonCategoryIds: number[];
  onChangeSelectedAddonCategoryIds: (ids: number[]) => void;
}

const VISIBLE_LIMIT = 3;
const SCROLL_MAX_HEIGHT = 320;

export default function ConnectedAddonsSection({
  addonCategories,
  selectedAddonCategoryIds,
  onChangeSelectedAddonCategoryIds,
}: ConnectedAddonsSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const connectedCategories = addonCategories.filter((category) =>
    selectedAddonCategoryIds.includes(category.id),
  );
  const visibleCategories = showAll
    ? connectedCategories
    : connectedCategories.slice(0, VISIBLE_LIMIT);
  const hiddenCount = connectedCategories.length - visibleCategories.length;

  function disconnect(id: number) {
    onChangeSelectedAddonCategoryIds(
      selectedAddonCategoryIds.filter((existingId) => existingId !== id),
    );
  }

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2.5,
        p: { xs: 1.5, sm: 2 },
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: "flex-start",
          justifyContent: "space-between",
          mb: 1.5,
        }}
      >
        <Box>
          <Typography variant="body2">Connected Add-ons & Modifiers</Typography>
          <Typography variant="caption" color="text.secondary">
            Link extra toppings, sauces, or sides to this item.
          </Typography>
        </Box>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ whiteSpace: "nowrap" }}
        >
          Add New Group
        </Button>
      </Stack>

      {connectedCategories.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          No add-on groups connected yet.
        </Typography>
      ) : (
        <>
          <Stack
            spacing={1.5}
            sx={{
              maxHeight: showAll ? SCROLL_MAX_HEIGHT : "none",
              overflowY: showAll ? "auto" : "visible",
              pr: showAll ? 0.5 : 0,
            }}
          >
            {visibleCategories.map((category) => (
              <Box
                key={category.id}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 1.5,
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {category.name}
                    </Typography>
                    <Chip
                      label="Connected"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Stack>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton
                      component={Link}
                      href={`/backoffice/addons/${category.id}`}
                      size="small"
                      aria-label={`Edit ${category.name}`}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => disconnect(category.id)}
                      aria-label={`Disconnect ${category.name}`}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flexWrap: "wrap", gap: 1 }}
                >
                  {category.addons.map((addon) => (
                    <Chip
                      key={addon.id}
                      size="small"
                      label={
                        addon.price === 0
                          ? addon.name
                          : `${addon.name} (+${addon.price.toLocaleString()} MMK)`
                      }
                      sx={{ bgcolor: "background.default" }}
                    />
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>

          {connectedCategories.length > VISIBLE_LIMIT && (
            <Button
              size="small"
              onClick={() => setShowAll((current) => !current)}
              sx={{ mt: 1 }}
            >
              {showAll ? "Show Less" : `Show More (${hiddenCount})`}
            </Button>
          )}
        </>
      )}

      <ConnectAddonGroupDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        addonCategories={addonCategories}
        selectedIds={selectedAddonCategoryIds}
        onChangeSelectedIds={onChangeSelectedAddonCategoryIds}
      />
    </Box>
  );
}
