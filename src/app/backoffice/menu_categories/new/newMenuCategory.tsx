"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import { createMenuCategoryAction } from "../action";

export default function NewMenuCategories() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createMenuCategoryAction({ name });
      if (!result.success) {
        setError(result.error.message);
        return;
      }

      // Same pattern as NewMenu.tsx: show the success toast for a beat
      // before navigating away, using useRouter().push() rather than
      // next/navigation's redirect() (a Server Component/Action-only
      // primitive that doesn't work from Client Component code).
      setShowSuccess(true);
      setTimeout(() => {
        router.push("/backoffice/menu_categories");
      }, 1000);
    });
  }

  return (
    <>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          maxWidth: 480,
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
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1,
              pb: 2,
              mb: 2.5,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <CategoryOutlinedIcon color="primary" />
            <Box>
              <Typography variant="h6">New Menu Category</Typography>
              <Typography variant="caption" color="text.secondary">
                Categories group menu items — e.g. Burgers, Drinks, Dessert.
              </Typography>
            </Box>
          </Box>

          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Category Name"
              required
              autoFocus
              fullWidth
              value={name}
              onChange={(event) => setName(event.target.value)}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={isPending || !name.trim()}
              sx={{ alignSelf: "flex-start", px: 3 }}
            >
              {isPending ? "Creating..." : "Create Category"}
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
          Category created successfully!
        </Alert>
      </Snackbar>
    </>
  );
}
