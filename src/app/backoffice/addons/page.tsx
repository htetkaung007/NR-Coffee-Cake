import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { AddonService } from "@/app/services";

export default async function AddonsPage() {
  const categories = await AddonService.getAddonCategoriesWithAddonsList();

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}
      >
        <Typography variant="h6">Add-ons</Typography>
        <Link href="/backoffice/addons/new">
          <Button variant="contained" size="small">
            + New Add-on Group
          </Button>
        </Link>
      </Stack>

      {categories.length === 0 ? (
        <Typography color="text.secondary">No addon groups yet.</Typography>
      ) : (
        <Stack spacing={2}>
          {categories.map((category) => (
            <Box
              key={category.id}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2.5,
                p: { xs: 1.5, sm: 2 },
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: category.addons.length ? 1.5 : 0,
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  <Typography variant="body1">{category.name}</Typography>
                  {category.isRequired && (
                    <Chip
                      label="Required"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {category.addons.length}{" "}
                    {category.addons.length === 1 ? "option" : "options"}
                  </Typography>
                </Stack>
                <Link href={`/backoffice/addons/${category.id}`}>
                  <IconButton size="small" aria-label={`Edit ${category.name}`}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </Link>
              </Stack>

              {category.addons.length > 0 && (
                <Stack spacing={1}>
                  {category.addons.map((addon) => (
                    <Box
                      key={addon.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        bgcolor: "background.default",
                        borderRadius: 2,
                        px: 1.5,
                        py: 1,
                      }}
                    >
                      <Typography variant="body2">
                        {addon.name}
                        {!addon.isAvailable && (
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                            sx={{ ml: 1 }}
                          >
                            · Unavailable
                          </Typography>
                        )}
                      </Typography>
                      {addon.price === 0 ? (
                        <Chip label="Free" size="small" color="success" />
                      ) : (
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {addon.price.toLocaleString()} MMK
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
