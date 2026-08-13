"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

export interface MenuOption {
  id: number;
  name: string;
}

interface MenuMultiSelectProps {
  menus: MenuOption[];
  selectedMenuIds: number[];
  onChange: (ids: number[]) => void;
}

const VISIBLE_LIMIT = 3;
const SCROLL_MAX_HEIGHT = 220; // fits ~5 rows before it starts scrolling
// ~3 chip rows (24px chip + 8px gap per row) before the picker itself
// scrolls instead of growing the page.
const PICKER_MAX_HEIGHT = 120;

export default function MenuMultiSelect({
  menus,
  selectedMenuIds,
  onChange,
}: MenuMultiSelectProps) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  function toggle(id: number) {
    onChange(
      selectedMenuIds.includes(id)
        ? selectedMenuIds.filter((existingId) => existingId !== id)
        : [...selectedMenuIds, id],
    );
  }

  const filteredMenus = menus.filter((menu) =>
    menu.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const selectedMenus = menus.filter((menu) =>
    selectedMenuIds.includes(menu.id),
  );
  const visibleSelected = showAll
    ? selectedMenus
    : selectedMenus.slice(0, VISIBLE_LIMIT);
  const hiddenCount = selectedMenus.length - visibleSelected.length;

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Connect to Menus
      </Typography>

      <TextField
        placeholder="Search menu items..."
        size="small"
        fullWidth
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
        sx={{ mb: 1.5 }}
      />

      {filteredMenus.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          {menus.length === 0
            ? "No menu items yet."
            : "No menu items match your search."}
        </Typography>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            maxHeight: PICKER_MAX_HEIGHT,
            overflowY: "auto",
            p: 1,
            mb: 2,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          {filteredMenus.map((menu) => {
            const isSelected = selectedMenuIds.includes(menu.id);
            return (
              <Chip
                key={menu.id}
                label={menu.name}
                onClick={() => toggle(menu.id)}
                color={isSelected ? "primary" : "default"}
                variant={isSelected ? "filled" : "outlined"}
                size="small"
              />
            );
          })}
        </Box>
      )}

      {selectedMenus.length > 0 && (
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 0.75 }}
          >
            Connected to {selectedMenus.length}{" "}
            {selectedMenus.length === 1 ? "menu item" : "menu items"}
          </Typography>
          <Stack
            spacing={0.75}
            sx={{
              maxHeight: showAll ? SCROLL_MAX_HEIGHT : "none",
              overflowY: showAll ? "auto" : "visible",
              pr: showAll ? 0.5 : 0,
            }}
          >
            {visibleSelected.map((menu) => (
              <Stack
                key={menu.id}
                direction="row"
                sx={{
                  alignItems: "center",
                  justifyContent: "space-between",
                  bgcolor: "background.default",
                  borderRadius: 1.5,
                  px: 1.25,
                  py: 0.5,
                }}
              >
                <Typography variant="body2">{menu.name}</Typography>
                <Chip
                  label="Remove"
                  size="small"
                  onClick={() => toggle(menu.id)}
                  variant="outlined"
                  sx={{ cursor: "pointer" }}
                />
              </Stack>
            ))}
          </Stack>

          {selectedMenus.length > VISIBLE_LIMIT && (
            <Button
              size="small"
              onClick={() => setShowAll((current) => !current)}
              sx={{ mt: 0.5 }}
            >
              {showAll ? "Show Less" : `Show More (${hiddenCount})`}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
}
