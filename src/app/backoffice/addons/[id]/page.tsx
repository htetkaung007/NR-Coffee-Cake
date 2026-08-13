import { Box, Typography } from "@mui/material";
import { AddonService } from "@/app/services";
import NewAddon from "../new/newAddon";

export default async function EditAddonGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const addonCategoryId = Number(id);

  const category =
    await AddonService.getAddonCategoryWithAddons(addonCategoryId);

  if (!category) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Addon category not found.
        </Typography>
      </Box>
    );
  }

  return (
    <NewAddon
      initialData={{
        id: category.id,
        groupName: category.name,
        isRequired: category.isRequired,
        options: category.addons.map((addon) => ({
          id: addon.id,
          name: addon.name,
          price: addon.price,
        })),
      }}
    />
  );
}
