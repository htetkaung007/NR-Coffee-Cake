"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, Box, Button, Stack } from "@mui/material";
import { createAddonGroupAction, updateAddonGroupAction } from "../action";
import { SuccessSnackbar } from "@/app/components/FormCard";
import PageHeader from "@/app/components/PageHeader";
import { useSaveThenNavigate } from "@/app/lib/hooks/useSaveThenNavigate";
import MenuMultiSelect, { MenuOption } from "../MenuMultiSelect";
import { emptyOptionRow, useOptionRows } from "@/app/lib/hooks/useOptionRows";
import { topBarHeight } from "@/app/lib/theme/sharedThemeTokens";
import GroupNameFields from "@/app/components/addonForm/GroupNameFields";
import OptionRowsEditor from "@/app/components/addonForm/OptionRowsEditor";
import AddonGroupPreview from "./AddonGroupPreview";

/** One form section's card. */
const cardSx = {
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 3,
  p: { xs: 2, sm: 3 },
} as const;

interface NewAddonInitialData {
  id: number;
  groupName: string;
  groupNameMy: string | null;
  isRequired: boolean;
  options: { id: number; name: string; nameMy: string | null; price: number }[];
  menuIds: number[];
}

interface NewAddonProps {
  menus: MenuOption[];
  initialData?: NewAddonInitialData;
}

export default function NewAddon({ menus, initialData }: NewAddonProps) {
  const { error, setError, isPending, showSuccess, closeSuccess, save } =
    useSaveThenNavigate();
  const isEditMode = Boolean(initialData);

  const [groupName, setGroupName] = useState(initialData?.groupName ?? "");
  const [groupNameMy, setGroupNameMy] = useState(
    initialData?.groupNameMy ?? "",
  );
  const [isRequired, setIsRequired] = useState(
    initialData?.isRequired ?? false,
  );
  const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>(
    initialData?.menuIds ?? [],
  );
  const { options, updateOption, addOption, removeOption } = useOptionRows(
    () =>
      initialData
        ? initialData.options.map((option) => ({
            id: option.id,
            name: option.name,
            nameMy: option.nameMy ?? "",
            price: option.price === 0 ? "" : String(option.price),
          }))
        : [emptyOptionRow(), emptyOptionRow()],
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = {
      groupName,
      groupNameMy,
      isRequired,
      options: options
        .filter((row) => row.name.trim() !== "")
        .map((row) => ({
          id: row.id,
          name: row.name,
          nameMy: row.nameMy,
          price: row.price,
        })),
      menuIds: selectedMenuIds,
    };

    save(
      () =>
        isEditMode && initialData
          ? updateAddonGroupAction(initialData.id, payload)
          : createAddonGroupAction(payload),
      "/backoffice/addons",
    );
  }

  const preview = (
    <AddonGroupPreview
      groupName={groupName}
      groupNameMy={groupNameMy}
      isRequired={isRequired}
      options={options}
    />
  );

  return (
    <>
      {/* Full width, so the back link sits at the page's left corner (as
          on the menu form), and both columns start level below it. */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 2, sm: 3, md: 4 } }}>
        <PageHeader
          title={isEditMode ? "Edit add-on group" : "New add-on group"}
          backHref="/backoffice/addons"
          backLabel="Back to add-ons"
        />
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 3,
          // The page's top padding is above PageHeader.
          px: { xs: 2, sm: 3, md: 4 },
          pb: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ flex: "1 1 auto", minWidth: 0, maxWidth: 560 }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2}>
            <Box sx={cardSx}>
              <GroupNameFields
                groupName={groupName}
                onGroupNameChange={setGroupName}
                groupNameMy={groupNameMy}
                onGroupNameMyChange={setGroupNameMy}
                isRequired={isRequired}
                onRequiredChange={setIsRequired}
              />
            </Box>

            <Box sx={cardSx}>
              <OptionRowsEditor
                options={options}
                updateOption={updateOption}
                addOption={addOption}
                removeOption={removeOption}
              />
            </Box>

            {/* Below lg the preview follows the Options card. */}
            <Box sx={{ display: { xs: "block", lg: "none" } }}>{preview}</Box>

            <Box sx={cardSx}>
              <MenuMultiSelect
                menus={menus}
                selectedMenuIds={selectedMenuIds}
                onChange={setSelectedMenuIds}
              />

              <Stack
                direction="row"
                spacing={1.5}
                sx={{ justifyContent: "flex-end", mt: 3 }}
              >
                <Button
                  component={Link}
                  href="/backoffice/addons"
                  variant="outlined"
                  color="inherit"
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
          </Stack>
        </Box>

        {/* lg and up: beside the form, sticky under the top bar. */}
        <Box
          sx={(theme) => ({
            display: { xs: "none", lg: "block" },
            flex: { lg: "0 0 360px", xl: "0 0 400px" },
            position: "sticky",
            top: `calc(${topBarHeight(theme)}px + ${theme.spacing(2)})`,
          })}
        >
          {preview}
        </Box>
      </Box>

      <SuccessSnackbar
        open={showSuccess}
        onClose={closeSuccess}
        message={
          isEditMode
            ? "Add-on group updated successfully!"
            : "Add-on group created successfully!"
        }
      />
    </>
  );
}
