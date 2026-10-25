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
import { alpha } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { createAddonGroupAction } from "../backoffice/addons/action";
import { emptyOptionRow, useOptionRows } from "../lib/hooks/useOptionRows";
import GroupNameFields from "./addonForm/GroupNameFields";
import OptionRowsEditor from "./addonForm/OptionRowsEditor";
import { useLocale, useTranslations } from "next-intl";
import { localizedText } from "@/app/lib/i18n/localizedText";
import { useStaffErrorMessage, useStaffGenericError } from "@/app/lib/hooks/useStaffWords";
import { useSubmitLock } from "@/app/lib/hooks/useSubmitLock";
import SubmitButton from "./SubmitButton";

export interface AddonGroupOption {
  id: number;
  name: string;
  /** The shop's Myanmar names — shown in the Myanmar Backoffice. */
  nameMy?: string | null;
  addons: { id: number; name: string; nameMy?: string | null; price: number }[];
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
  const t = useTranslations("bo.connectAddon");
  const tCommon = useTranslations("bo.common");
  const locale = useLocale();
  const errorText = useStaffErrorMessage();
  const genericError = useStaffGenericError();
  const router = useRouter();
  const [draftIds, setDraftIds] = useState<number[]>(selectedIds);
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupNameMy, setGroupNameMy] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const { options, setOptions, updateOption, addOption, removeOption } =
    useOptionRows([emptyOptionRow(), emptyOptionRow()]);
  const [error, setError] = useState<string | null>(null);
  const submitLock = useSubmitLock();

  const [prevOpen, setPrevOpen] = useState(open);

  // Reset the draft (and clear the custom-create fields) every time the
  // dialog transitions to open, so a Cancel never leaks a half-filled
  // form into next time. Adjusting state during render (React's
  // documented pattern for "reset state when a prop changes") instead of
  // in an effect avoids an extra render pass.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      // The last create's lock (kept while the dialog closed) opens again.
      submitLock.unlock();
      setDraftIds(selectedIds);
      setSearch("");
      setGroupName("");
      setGroupNameMy("");
      setIsRequired(false);
      setOptions([emptyOptionRow(), emptyOptionRow()]);
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

  // Both names match, whatever the language shown.
  const term = search.trim().toLowerCase();
  const filteredCategories = addonCategories.filter(
    (category) =>
      category.name.toLowerCase().includes(term) ||
      (category.nameMy ?? "").toLowerCase().includes(term),
  );

  function handleSave() {
    // Locked from the first tap: a double tap must not create the custom
    // group twice.
    void submitLock.run(saveDraft, () => setError(genericError));
  }

  async function saveDraft() {
    setError(null);
    const hasCustomGroup =
      groupName.trim() !== "" && options.some((row) => row.name.trim() !== "");

    let finalIds = draftIds;

    if (hasCustomGroup) {
      const result = await createAddonGroupAction({
        groupName,
        groupNameMy,
        isRequired,
        options: options
          .filter((row) => row.name.trim() !== "")
          .map((row) => ({
            name: row.name,
            nameMy: row.nameMy,
            price: row.price,
          })),
      });

      if (!result.success) {
        setError(errorText(result.error));
        return;
      }

      finalIds = [...draftIds, result.data.id];
      // The freshly created group isn't in `addonCategories` yet (that
      // prop came from the server at page-load time) — refresh so the
      // parent Server Component re-fetches it and it shows up connected.
      router.refresh();
      // "Created ✓" (disabled) while the dialog closes.
      submitLock.keepLocked();
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
        {t("title")}
        <IconButton size="small" onClick={onClose} aria-label={tCommon("close")}>
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
          {t("quickSelect")}
        </Typography>

        <TextField
          placeholder={t("search")}
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
              ? t("noGroupsYet")
              : t("noMatch")}
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
                  sx={(theme) => ({
                    border: "1px solid",
                    borderColor: isSelected ? "primary.main" : "divider",
                    // Selected: a pale tint derived from primary (the old
                    // "primary.50" isn't a palette shade, so it painted
                    // nothing).
                    bgcolor: isSelected
                      ? alpha(theme.palette.primary.main, 0.08)
                      : "background.paper",
                    borderRadius: 2,
                    p: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                  })}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {localizedText(locale, category.name, category.nameMy)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("choices", { count: category.addons.length })}
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
                    {isSelected ? t("disconnect") : t("connect")}
                  </Button>
                </Box>
              );
            })}
          </Box>
        )}

        <Divider sx={{ mb: 2.5 }} />

        <Typography variant="body2" sx={{ mb: 2 }}>
          {t("orCreate")}
        </Typography>

        <Stack spacing={3}>
          <GroupNameFields
            groupName={groupName}
            onGroupNameChange={setGroupName}
            groupNameMy={groupNameMy}
            onGroupNameMyChange={setGroupNameMy}
            isRequired={isRequired}
            onRequiredChange={setIsRequired}
          />
          <OptionRowsEditor
            options={options}
            updateOption={updateOption}
            addOption={addOption}
            removeOption={removeOption}
          />
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
          {tCommon("cancel")}
        </Button>
        <SubmitButton
          variant="contained"
          onClick={handleSave}
          status={submitLock.status}
          busyLabel={t("creating")}
          doneLabel={tCommon("created")}
          sx={{ borderRadius: 2.5, px: 3 }}
        >
          {t("save")}
        </SubmitButton>
      </Stack>
    </Dialog>
  );
}
