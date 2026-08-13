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
import TableRestaurantOutlinedIcon from "@mui/icons-material/TableRestaurantOutlined";
import UploadOutlinedIcon from "@mui/icons-material/UploadOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { createTableAction } from "../action";

export default function NewTable() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("name", name);
    if (logo) formData.set("logo", logo);

    startTransition(async () => {
      const result = await createTableAction(formData);
      if (!result.success) {
        setError(result.error.message);
        return;
      }

      setShowSuccess(true);
      setTimeout(() => {
        router.push("/backoffice/tables");
      }, 1000);
    });
  }

  return (
    <>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ maxWidth: 480, mx: "auto", p: { xs: 2, sm: 3, md: 4 } }}
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
            <TableRestaurantOutlinedIcon color="primary" />
            <Typography variant="h6">New Table</Typography>
          </Box>

          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Table Name"
              required
              autoFocus
              fullWidth
              value={name}
              onChange={(event) => setName(event.target.value)}
              helperText="e.g. Table 1, Patio A — a QR code will be generated automatically."
            />

            <Box>
              <Button
                component="label"
                variant="outlined"
                startIcon={<UploadOutlinedIcon />}
                sx={{ fontSize: "0.8rem" }}
              >
                {logo ? "Change Logo" : "Upload Logo (optional)"}
                <input
                  type="file"
                  hidden
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setLogo(event.target.files?.[0] ?? null)}
                />
              </Button>

              {logo ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    mt: 0.5,
                    color: "success.main",
                  }}
                >
                  <CheckCircleIcon sx={{ fontSize: 16 }} />
                  <Typography variant="caption">
                    Image uploaded — {logo.name}
                  </Typography>
                </Box>
              ) : (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.5 }}
                >
                  Shown in the center of the QR code. If skipped, a default
                  table icon is used instead. PNG, JPEG, or WEBP, up to 5MB.
                </Typography>
              )}
            </Box>

            <Button
              type="submit"
              variant="contained"
              disabled={isPending || !name.trim()}
              sx={{ alignSelf: "flex-start", px: 3 }}
            >
              {isPending ? "Creating..." : "Create Table"}
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
          Table created successfully!
        </Alert>
      </Snackbar>
    </>
  );
}
