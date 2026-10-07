"use client";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  Stack,
} from "@mui/material";
import { NO_LOCATION_MESSAGE } from "@/app/lib/menuLocations";

export interface LocationOption {
  locationId: number;
  name: string;
}

/** Above this many locations, "Select all" / "Clear" links appear. */
const BULK_LINKS_FROM = 5;

/**
 * The menu form's "Show at locations" — one checkbox per active location
 * (create and edit share it). The menu is company-wide; unticking a
 * location hides it there (its stock is kept). The parent hides this
 * whole section when the company has only one active location.
 */
export default function LocationChecklist({
  locations,
  currentLocationId,
  selectedIds,
  onChange,
}: {
  locations: readonly LocationOption[];
  /** Where the owner is working now — tagged "(current)". */
  currentLocationId: number;
  selectedIds: readonly number[];
  onChange: (nextIds: number[]) => void;
}) {
  const selected = new Set(selectedIds);
  const current = locations.find(
    (location) => location.locationId === currentLocationId,
  );
  const isNoneSelected = selected.size === 0;
  const isCurrentUnticked = current !== undefined && !selected.has(current.locationId);

  function toggle(locationId: number, isChecked: boolean) {
    onChange(
      isChecked
        ? [...selectedIds, locationId]
        : selectedIds.filter((id) => id !== locationId),
    );
  }

  return (
    <FormControl
      component="fieldset"
      error={isNoneSelected}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 1.5,
      }}
    >
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", gap: 1 }}
      >
        <FormLabel component="legend" sx={{ float: "left" }}>
          Show at locations
        </FormLabel>
        {locations.length >= BULK_LINKS_FROM && (
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              onClick={() => onChange(locations.map((location) => location.locationId))}
              sx={{ minHeight: 44 }}
            >
              Select all
            </Button>
            <Button size="small" onClick={() => onChange([])} sx={{ minHeight: 44 }}>
              Clear
            </Button>
          </Stack>
        )}
      </Stack>

      <FormGroup sx={{ clear: "both" }}>
        {locations.map((location) => (
          <FormControlLabel
            key={location.locationId}
            label={
              location.locationId === currentLocationId
                ? `${location.name} (current)`
                : location.name
            }
            control={
              <Checkbox
                checked={selected.has(location.locationId)}
                onChange={(event) => toggle(location.locationId, event.target.checked)}
              />
            }
            sx={{ minHeight: 44, mr: 0 }}
          />
        ))}
      </FormGroup>

      {isNoneSelected && <FormHelperText>{NO_LOCATION_MESSAGE}</FormHelperText>}
      {!isNoneSelected && isCurrentUnticked && (
        <Box sx={{ mt: 1 }}>
          <Alert severity="warning">
            This menu won&apos;t show at {current.name} (where you are now).
          </Alert>
        </Box>
      )}
    </FormControl>
  );
}
