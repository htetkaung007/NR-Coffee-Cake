"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { createAddonGroupAction } from "../backoffice/addons/action";

export interface AddonGroupOption {
  id: number;
  name: string;
  addons: { id: number; name: string; price: number }[];
}

interface OptionRow {
  name: string;
  price: string; // blank string = Free
}

function emptyRow(): OptionRow {
  return { name: "", price: "" };
}

interface ConnectAddonGroupDialogProps {
  open: boolean;
  onClose: () => void;
  addonCategories: AddonGroupOption[];
  selectedIds: number[];
  onChangeSelectedIds: (ids: number[]) => void;
}

export default function ConnectAddonGroupDialog({
  open,
  onClose,
  addonCategories,
  selectedIds,
  onChangeSelectedIds,
}: ConnectAddonGroupDialogProps) {
  const router = useRouter();
  const [draftIds, setDraftIds] = useState<number[]>(selectedIds);
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [options, setOptions] = useState<OptionRow[]>([emptyRow(), emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);

  // Reset the draft (and clear the custom-create fields) every time the
  // dialog transitions to open, so a Cancel never leaks a half-filled
  // form into next time. Adjusting state during render (React's
  // documented pattern for "reset state when a prop changes") instead of
  // in an effect avoids an extra render pass.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDraftIds(selectedIds);
      setSearch("");
      setGroupName("");
      setOptions([emptyRow(), emptyRow()]);
      setError(null);
    }
  }

  function toggleDraft(id: number) {
    setDraftIds((current) =>
      current.includes(id)
        ? current.filter((existingId) => existingId !== id)
        : [...current, id],
    );
  }

  function updateOption(index: number, field: "name" | "price", value: string) {
    setOptions((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  function addOption() {
    setOptions((rows) => [...rows, emptyRow()]);
  }

  function removeOption(index: number) {
    setOptions((rows) => rows.filter((_, i) => i !== index));
  }

  const filteredCategories = addonCategories.filter((category) =>
    category.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  async function handleSave() {
    setError(null);
    const hasCustomGroup =
      groupName.trim() !== "" && options.some((row) => row.name.trim() !== "");

    let finalIds = draftIds;

    if (hasCustomGroup) {
      setIsSaving(true);
      const result = await createAddonGroupAction({
        groupName,
        isRequired: false,
        options: options
          .filter((row) => row.name.trim() !== "")
          .map((row) => ({ name: row.name, price: row.price })),
      });
      setIsSaving(false);

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      finalIds = [...draftIds, result.data.id];
      // The freshly created group isn't in `addonCategories` yet (that
      // prop came from the server at page-load time) — refresh so the
      // parent Server Component re-fetches it and it shows up connected.
      router.refresh();
    }

    onChangeSelectedIds(finalIds);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        Connect Add-On Group
        <IconButton size="small" onClick={onClose} aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" sx={{ mb: 1 }}>
          Quick Select Existing Add-on Group
        </Typography>

        <TextField
          placeholder="Search groups..."
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
          sx={{ mb: 2 }}
        />

        {filteredCategories.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            {addonCategories.length === 0
              ? "No addon groups yet — create one below."
              : "No groups match your search."}
          </Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 1.5,
              mb: 3,
              maxHeight: 232,
              overflowY: "auto",
              pr: 0.5,
            }}
          >
            {filteredCategories.map((category) => {
              const isSelected = draftIds.includes(category.id);
              return (
                <Box
                  key={category.id}
                  sx={{
                    border: "1px solid",
                    borderColor: isSelected ? "primary.main" : "divider",
                    bgcolor: isSelected ? "primary.50" : "background.default",
                    borderRadius: 2,
                    p: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {category.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {category.addons.length}{" "}
                      {category.addons.length === 1 ? "choice" : "choices"}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant={isSelected ? "text" : "contained"}
                    color={isSelected ? "inherit" : "primary"}
                    onClick={() => toggleDraft(category.id)}
                    sx={
                      isSelected
                        ? { color: "primary.main", fontWeight: 700 }
                        : {}
                    }
                  >
                    {isSelected ? "Disconnect" : "Connect"}
                  </Button>
                </Box>
              );
            })}
          </Box>
        )}

        <Divider sx={{ mb: 2.5 }} />

        <Typography variant="body2" sx={{ mb: 2 }}>
          Or Create Custom Add-On Option
        </Typography>

        <Typography variant="caption" color="text.secondary">
          Group Title
        </Typography>
        <TextField
          placeholder="Group Name (e.g., Dipping Sauces)"
          fullWidth
          value={groupName}
          onChange={(event) => setGroupName(event.target.value)}
          sx={{
            mt: 0.5,
            mb: 2,
            "& .MuiOutlinedInput-root": {
              bgcolor: "background.default",
              borderRadius: 2.5,
            },
            "& .MuiOutlinedInput-notchedOutline": { border: "none" },
          }}
        />

        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1.5,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Add-on Options & Pricing
          </Typography>
          <Button
            size="small"
            onClick={addOption}
            startIcon={<AddIcon sx={{ fontSize: "1rem !important" }} />}
            sx={{ color: "primary.main", fontWeight: 700 }}
          >
            Add Option
          </Button>
        </Stack>

        <Stack spacing={1.5}>
          {options.map((row, index) => (
            <Stack
              key={index}
              direction="row"
              spacing={1}
              sx={{ alignItems: "center" }}
            >
              <TextField
                placeholder="Option Name (e.g. Extra Sauce)"
                size="small"
                fullWidth
                value={row.name}
                onChange={(event) =>
                  updateOption(index, "name", event.target.value)
                }
                sx={{
                  flex: 2,
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "background.default",
                    borderRadius: 2.5,
                  },
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                }}
              />
              <TextField
                placeholder="Price (Blank = Free)"
                size="small"
                value={row.price}
                onChange={(event) => {
                  const digitsOnly = event.target.value.replace(/[^0-9]/g, "");
                  updateOption(index, "price", digitsOnly);
                }}
                slotProps={{
                  htmlInput: { inputMode: "numeric", pattern: "[0-9]*" },
                }}
                sx={{
                  flex: 1,
                  minWidth: 120,
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "background.default",
                    borderRadius: 2.5,
                  },
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                }}
              />
              <IconButton
                size="small"
                onClick={() => removeOption(index)}
                disabled={options.length === 1}
                aria-label="Remove option"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      </DialogContent>

      <Stack
        direction="row"
        spacing={1.5}
        sx={{ justifyContent: "flex-end", p: 2 }}
      >
        <Button
          variant="outlined"
          color="inherit"
          onClick={onClose}
          sx={{ borderRadius: 2.5, px: 3 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
          sx={{ borderRadius: 2.5, px: 3 }}
        >
          {isSaving ? "Saving..." : "Save Add-on"}
        </Button>
      </Stack>
    </Dialog>
  );
}
