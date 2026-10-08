"use client";

import { useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@mui/material";
import AddBusinessOutlinedIcon from "@mui/icons-material/AddBusinessOutlined";
import FormCard, { SuccessSnackbar } from "@/app/components/FormCard";
import { useSaveThenNavigate } from "@/app/lib/hooks/useSaveThenNavigate";
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
  const { error, setError, isPending, showSuccess, closeSuccess, save } =
    useSaveThenNavigate();
  const [name, setName] = useState("");
  const [startingMenus, setStartingMenus] = useState<StartingMenus>("ALL");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("startingMenus", startingMenus);

    save(() => createLocationAction(formData), "/backoffice/locations");
  }

  return (
    <>
      <Box sx={{ maxWidth: 480, mx: "auto", p: { xs: 2, sm: 3, md: 4 } }}>
        <FormCard
          onSubmit={handleSubmit}
          header={{
            icon: <AddBusinessOutlinedIcon color="primary" />,
            title: "New Location",
          }}
          error={error}
        >
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
        </FormCard>
      </Box>

      <SuccessSnackbar
        open={showSuccess}
        onClose={closeSuccess}
        message="Location created successfully!"
      />
    </>
  );
}
