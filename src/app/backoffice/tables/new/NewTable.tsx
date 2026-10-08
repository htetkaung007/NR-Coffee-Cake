"use client";

import { useState } from "react";
import {
  Box,
  Button,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import TableRestaurantOutlinedIcon from "@mui/icons-material/TableRestaurantOutlined";
import PointOfSaleOutlinedIcon from "@mui/icons-material/PointOfSaleOutlined";
import UploadOutlinedIcon from "@mui/icons-material/UploadOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FormCard, { SuccessSnackbar } from "@/app/components/FormCard";
import { useSaveThenNavigate } from "@/app/lib/hooks/useSaveThenNavigate";
import { createTableAction } from "../action";

const COUNTER_NAME = "Counter QR code";

export default function NewTable() {
  const { error, setError, isPending, showSuccess, closeSuccess, save } =
    useSaveThenNavigate();
  const [name, setName] = useState("");
  const [isCounter, setIsCounter] = useState(false);
  const [logo, setLogo] = useState<File | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("isCounter", String(isCounter));
    if (logo) formData.set("logo", logo);

    save(() => createTableAction(formData), "/backoffice/tables");
  }

  return (
    <>
      <Box sx={{ maxWidth: 480, mx: "auto", p: { xs: 2, sm: 3, md: 4 } }}>
        <FormCard
          onSubmit={handleSubmit}
          header={{
            icon: <TableRestaurantOutlinedIcon color="primary" />,
            title: "New Table",
          }}
          error={error}
        >
          {/* Prominent on purpose (own bordered box, filled icon,
                bold label) — this single switch changes what the rest
                of the form means (name becomes fixed/disabled), so it
                needs to be seen before the Name field, not blend in
                with the other options below it. */}
          <Box
            sx={{
              border: "1px solid",
              borderColor: isCounter ? "primary.main" : "divider",
              borderRadius: 2,
              p: 1.5,
              bgcolor: isCounter ? "primary.50" : "transparent",
              transition: "border-color 0.15s, background-color 0.15s",
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={isCounter}
                  onChange={(event) => setIsCounter(event.target.checked)}
                />
              }
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <PointOfSaleOutlinedIcon
                    fontSize="small"
                    color={isCounter ? "primary" : "action"}
                  />
                  <Typography sx={{ fontWeight: 700 }}>Counter</Typography>
                </Box>
              }
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", ml: 5.5 }}
            >
              {isCounter
                ? `This creates the walk-in counter QR code, not a seated table. Its name is fixed as "${COUNTER_NAME}".`
                : "Turn on if this QR code is for the walk-in counter instead of a seated table."}
            </Typography>
          </Box>

          <TextField
            label="Table Name"
            required={!isCounter}
            autoFocus
            fullWidth
            disabled={isCounter}
            value={isCounter ? COUNTER_NAME : name}
            onChange={(event) => setName(event.target.value)}
            helperText={
              isCounter
                ? "Locked while Counter is on."
                : "e.g. Table 1, Patio A — a QR code will be generated automatically."
            }
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
                Shown in the center of the QR code. If skipped, a default table
                icon is used instead. PNG, JPEG, or WEBP, up to 5MB.
              </Typography>
            )}
          </Box>

          <Button
            type="submit"
            variant="contained"
            disabled={isPending || (!isCounter && !name.trim())}
            sx={{ alignSelf: "flex-start", px: 3 }}
          >
            {isPending ? "Creating..." : "Create Table"}
          </Button>
        </FormCard>
      </Box>

      <SuccessSnackbar
        open={showSuccess}
        onClose={closeSuccess}
        message="Table created successfully!"
      />
    </>
  );
}
