"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Card, Box, Typography, Chip, Button } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import TaskAltIcon from "@mui/icons-material/TaskAlt";

import { selectLocationAction } from "@/app/backoffice/locations/action";

export interface LocationCardData {
  id: number;
  name: string;
  isArchived: boolean;
}

interface LocationCardProps {
  location: LocationCardData;
  isSelected: boolean;
  /** Only Admins get the switcher — Managers have a fixed location and
   *  never see this control (enforced by the page that renders this card,
   *  not here, but the prop exists so the card doesn't assume). */
  canSwitch: boolean;
}

export default function LocationCard({
  location,
  isSelected,
  canSwitch,
}: LocationCardProps) {
  const [isPending, startTransition] = useTransition();

  function handleSwitch() {
    startTransition(async () => {
      await selectLocationAction(location.id);
    });
  }

  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: { xs: 2, md: 2.5 },
        bgcolor: "background.paper",
        p: { xs: 1.5, sm: 2 },
        opacity: location.isArchived ? 0.6 : 1,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Typography variant="body1">{location.name}</Typography>
        {location.isArchived && (
          <Chip
            label={
              <Typography variant="caption" component="span">
                Archived
              </Typography>
            }
            size="small"
            color="default"
          />
        )}
      </Box>

      {isSelected && !location.isArchived && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            color: "primary.main",
          }}
        >
          <TaskAltIcon sx={{ fontSize: 16 }} />
          <Typography variant="caption">Currently selected</Typography>
        </Box>
      )}

      {canSwitch && !location.isArchived && !isSelected && (
        <Button
          size="small"
          variant="text"
          disabled={isPending}
          onClick={handleSwitch}
          sx={{ alignSelf: "flex-start", fontSize: "0.75rem", px: 0 }}
        >
          {isPending ? "Switching..." : "Switch to this location"}
        </Button>
      )}

      <Button
        component={Link}
        href={`/backoffice/locations/${location.id}`}
        size="small"
        variant="outlined"
        startIcon={<EditIcon sx={{ fontSize: 14 }} />}
        sx={{ alignSelf: "flex-start", fontSize: "0.75rem" }}
      >
        Edit
      </Button>
    </Card>
  );
}
