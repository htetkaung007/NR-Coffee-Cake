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
import { useLocale, useTranslations } from "next-intl";
import { localizedText } from "@/app/lib/i18n/localizedText";
import { useStaffMoney } from "@/app/lib/hooks/useStaffWords";

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
  const t = useTranslations("bo.menuForm");
  const locale = useLocale();
  const money = useStaffMoney();
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

  const openConnect = () => setDialogOpen(true);

  // Phones: title + hint, the groups, then "Connect add-on group" LAST,
  // full width (its words may wrap). From sm: the button top-right in the
  // header row; the title side shrinks first (minWidth 0), never the
  // button. One button per layout, the other display: none.
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2.5,
        p: { xs: 1.5, sm: 2 },
        display: "grid",
        gridTemplateColumns: {
          xs: "minmax(0, 1fr)",
          sm: "minmax(0, 1fr) auto",
        },
        gridTemplateAreas: {
          xs: '"header" "content" "button"',
          sm: '"header button" "content content"',
        },
        columnGap: 2,
        rowGap: 1.5,
        alignItems: "start",
      }}
    >
      <Box sx={{ gridArea: "header", minWidth: 0 }}>
        <Typography variant="body2">{t("addonsTitle")}</Typography>
        <Typography variant="caption" color="text.secondary">
          {t("addonsHint")}
        </Typography>
      </Box>
      <Button
        size="small"
        variant="contained"
        startIcon={<AddIcon />}
        onClick={openConnect}
        sx={{
          gridArea: "button",
          display: { xs: "none", sm: "inline-flex" },
          whiteSpace: "nowrap",
        }}
      >
        {t("connectGroup")}
      </Button>
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={openConnect}
        fullWidth
        sx={{
          gridArea: "button",
          display: { xs: "inline-flex", sm: "none" },
          minHeight: 44,
        }}
      >
        {t("connectGroup")}
      </Button>

      <Box sx={{ gridArea: "content", minWidth: 0 }}>
        {connectedCategories.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            {t("noGroups")}
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
                        {localizedText(locale, category.name, category.nameMy)}
                      </Typography>
                      <Chip
                        label={t("connected")}
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
                        aria-label={t("editGroup", { name: category.name })}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => disconnect(category.id)}
                        aria-label={t("disconnectGroup", {
                          name: category.name,
                        })}
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
                            ? localizedText(locale, addon.name, addon.nameMy)
                            : t("optionWithPrice", {
                                name: localizedText(
                                  locale,
                                  addon.name,
                                  addon.nameMy,
                                ),
                                price: money.delta(addon.price),
                              })
                        }
                        variant="outlined"
                        sx={{
                          bgcolor: "background.paper",
                          borderColor: "divider",
                        }}
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
                {showAll
                  ? t("showLess")
                  : t("showMore", { count: hiddenCount })}
              </Button>
            )}
          </>
        )}
      </Box>

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
