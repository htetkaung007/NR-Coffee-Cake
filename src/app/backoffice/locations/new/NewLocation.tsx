"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddBusinessOutlinedIcon from "@mui/icons-material/AddBusinessOutlined";
import { createLocationAction } from "../action";

type StartingMenus = "ALL" | "EMPTY";

/** The new location's starting menus — required (ALL by default). */
const STARTING_MENU_OPTIONS: {
  value: StartingMenus;
  label: string;
  helper: string;
}[] = [
  {
    value: "ALL",
    label: "All current menus",
    helper: "Every menu shows here. Stock starts at 0 — set it before opening.",
  },
  {
    value: "EMPTY",
    label: "Empty",
    helper:
      "Nothing shows yet. Turn menus on for this location from each menu's form.",
  },
];

export default function NewLocation() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startingMenus, setStartingMenus] = useState<StartingMenus>("ALL");
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("startingMenus", startingMenus);

    startTransition(async () => {
      const result = await createLocationAction(formData);
      if (!result.success) {
        setError(result.error.message);
        return;
      }

      setShowSuccess(true);
      setTimeout(() => {
        router.push("/backoffice/locations");
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
            <AddBusinessOutlinedIcon color="primary" />
            <Typography variant="h6">New Location</Typography>
          </Box>

          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Location Name"
              required
              autoFocus
              fullWidth
              value={name}
              onChange={(event) => setName(event.target.value)}
            />

            <FormControl component="fieldset" required>
              <FormLabel component="legend">Starting menus</FormLabel>
              <RadioGroup
                name="startingMenus"
                value={startingMenus}
                onChange={(event) =>
                  setStartingMenus(event.target.value as StartingMenus)
                }
              >
                {STARTING_MENU_OPTIONS.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    value={option.value}
                    control={<Radio />}
                    sx={{ alignItems: "flex-start", mr: 0, mt: 1 }}
                    label={
                      <Box sx={{ pt: 1 }}>
                        <Typography variant="body2">{option.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.helper}
                        </Typography>
                      </Box>
                    }
                  />
                ))}
              </RadioGroup>
            </FormControl>

            <Button
              type="submit"
              variant="contained"
              disabled={isPending || !name.trim()}
              sx={{ alignSelf: "flex-start", px: 3 }}
            >
              {isPending ? "Creating..." : "Create Location"}
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
          Location created successfully!
        </Alert>
      </Snackbar>
    </>
  );
}
