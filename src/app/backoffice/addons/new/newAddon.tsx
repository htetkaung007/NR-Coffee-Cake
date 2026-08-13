"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { createAddonGroupAction, updateAddonGroupAction } from "../action";

interface OptionRow {
  id?: number; // present only for options that already exist (edit mode)
  name: string;
  price: string; // blank string = Free
}

function emptyRow(): OptionRow {
  return { name: "", price: "" };
}

export interface NewAddonInitialData {
  id: number;
  groupName: string;
  isRequired: boolean;
  options: { id: number; name: string; price: number }[];
}

interface NewAddonProps {
  initialData?: NewAddonInitialData;
}

export default function NewAddon({ initialData }: NewAddonProps) {
  const router = useRouter();
  const isEditMode = Boolean(initialData);

  const [groupName, setGroupName] = useState(initialData?.groupName ?? "");
  const [options, setOptions] = useState<OptionRow[]>(() =>
    initialData
      ? initialData.options.map((option) => ({
          id: option.id,
          name: option.name,
          price: option.price === 0 ? "" : String(option.price),
        }))
      : [emptyRow(), emptyRow()],
  );
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = {
      groupName,
      isRequired: initialData?.isRequired ?? false,
      options: options
        .filter((row) => row.name.trim() !== "")
        .map((row) => ({
          id: row.id,
          name: row.name,
          price: row.price,
        })),
    };

    startTransition(async () => {
      const result =
        isEditMode && initialData
          ? await updateAddonGroupAction(initialData.id, payload)
          : await createAddonGroupAction(payload);

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      setShowSuccess(true);
      setTimeout(() => {
        router.push("/backoffice/addons");
      }, 1000);
    });
  }

  return (
    <>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          maxWidth: 560,
          mx: "auto",
          p: { xs: 2, sm: 3, md: 4 },
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
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="h6" sx={{ mb: 2 }}>
            {isEditMode
              ? "Edit Custom Add-On Option"
              : "Or Create Custom Add-On Option"}
          </Typography>

          <Typography variant="body2" sx={{ mb: 1 }}>
            Group Title
          </Typography>
          <TextField
            placeholder="Group Name (e.g., Dipping Sauces)"
            required
            fullWidth
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            sx={{
              mb: 3,
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
            <Typography variant="body2">Add-on Options & Pricing</Typography>
            <Button
              size="small"
              onClick={addOption}
              startIcon={<AddIcon sx={{ fontSize: "1rem !important" }} />}
              sx={{ color: "primary.main", fontWeight: 700 }}
            >
              Add Option
            </Button>
          </Stack>

          <Stack spacing={1.5} sx={{ mb: 3 }}>
            {options.map((row, index) => (
              <Stack
                key={index}
                direction="row"
                spacing={1}
                sx={{ alignItems: "center" }}
              >
                <TextField
                  placeholder="Option Name (e.g. Extra Sauce)"
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
                  value={row.price}
                  onChange={(event) => {
                    // Keep only digits — avoids native type="number" quirks
                    // (blocked keys, scroll-wheel changes, mobile keypad
                    // differences) while still guaranteeing a clean integer.
                    const digitsOnly = event.target.value.replace(
                      /[^0-9]/g,
                      "",
                    );
                    updateOption(index, "price", digitsOnly);
                  }}
                  slotProps={{
                    htmlInput: { inputMode: "numeric", pattern: "[0-9]*" },
                  }}
                  sx={{
                    flex: 1,
                    minWidth: 140,
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

          <Stack
            direction="row"
            spacing={1.5}
            sx={{ justifyContent: "flex-end" }}
          >
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => router.back()}
              sx={{ borderRadius: 2.5, px: 3 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isPending || !groupName.trim()}
              sx={{ borderRadius: 2.5, px: 3 }}
            >
              {isPending
                ? "Saving..."
                : isEditMode
                  ? "Update Add-on"
                  : "Save Add-on"}
            </Button>
          </Stack>
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
            ? "Add-on group updated successfully!"
            : "Add-on group created successfully!"}
        </Alert>
      </Snackbar>
    </>
  );
}
