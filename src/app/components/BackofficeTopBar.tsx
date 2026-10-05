"use client";

import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
} from "@mui/material";
import Link from "next/link";
import { alpha } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { signOut, useSession } from "next-auth/react";
import { useThemeMode } from "../lib/theme/ThemeModeProvider";
import { hoverCapableMedia } from "../lib/theme/sharedThemeTokens";

const LOCATIONS_HREF = "/backoffice/locations";

/** The selected location as a pill (pin + name, cut with an ellipsis):
 *  a link to Locations for an Admin, who can switch; plain text for a
 *  Manager, whose location is fixed. With no name it's a muted "Select a
 *  location" (a Manager's: "No location assigned"). The link's hit area is 44px high; the visible pill is
 *  smaller inside it. */
function LocationPill({
  name,
  isLink,
  maxWidth,
}: {
  name: string | null;
  isLink: boolean;
  maxWidth: number | string;
}) {
  // A Manager can't pick one — theirs is assigned by an Admin.
  const label = name ?? (isLink ? "Select a location" : "No location assigned");
  const pill = (
    <Box
      sx={(theme) => ({
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        minWidth: 0,
        height: 32,
        px: 1.5,
        borderRadius: 999,
        border: 1,
        borderColor: name ? "divider" : "inputBorder",
        borderStyle: name ? "solid" : "dashed",
        bgcolor: name ? alpha(theme.palette.primary.main, 0.06) : "transparent",
        color: "text.secondary",
        transition: "background-color 150ms ease",
      })}
    >
      <LocationOnOutlinedIcon aria-hidden fontSize="small" />
      <Typography variant="body2" noWrap color="text.secondary">
        {label}
      </Typography>
    </Box>
  );

  const wrapperSx = {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
    maxWidth,
    minHeight: 44,
  } as const;

  if (!isLink) {
    return (
      <Box title={label} sx={wrapperSx}>
        {pill}
      </Box>
    );
  }
  return (
    <Box
      component={Link}
      href={LOCATIONS_HREF}
      title={label}
      aria-label={name ? `Location: ${name}` : "Select a location"}
      sx={(theme) => ({
        ...wrapperSx,
        textDecoration: "none",
        borderRadius: 999,
        "&:focus-visible": {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2,
        },
        [hoverCapableMedia]: {
          "&:hover > *": { bgcolor: "action.hover" },
        },
      })}
    >
      {pill}
    </Box>
  );
}

type BackofficeTopBarProps = {
  onMenuClick: () => void;
  companyName?: string;
  /** The selected location's name; null when none is selected. */
  locationName: string | null;
  /** Admins can switch location, so the pill links to Locations. */
  canChangeLocation: boolean;
};

export function BackofficeTopBar({
  onMenuClick,
  companyName,
  locationName,
  canChangeLocation,
}: BackofficeTopBarProps) {
  const { data: session } = useSession();
  const { mode, toggleMode } = useThemeMode();

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        bgcolor: "background.paper",
        color: "text.primary",
        borderBottom: 1,
        borderColor: "divider",
        zIndex: (theme) => theme.zIndex.drawer + 1, // side bar ရဲ့ အပေါ်ကို လွှမ်းမိုးအောင်
      }}
    >
      <Toolbar
        sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* Burger tab — mobile မှာပဲ ပေါ်, side bar ကို ဖွင့်/ပိတ် */}
          <IconButton
            edge="start"
            onClick={onMenuClick}
            sx={{ display: { sm: "none" }, color: "text.primary" }}
          >
            <MenuIcon />
          </IconButton>
          {/* Phones: the location instead of the company (the company
             name only when no location is selected). */}
          {locationName && (
            <Box sx={{ display: { xs: "flex", sm: "none" }, minWidth: 0 }}>
              <LocationPill
                name={locationName}
                isLink={canChangeLocation}
                maxWidth="100%"
              />
            </Box>
          )}
          <Typography
            variant="h6"
            noWrap
            sx={{
              fontWeight: 600,
              minWidth: 0,
              display: { xs: locationName ? "none" : "block", sm: "block" },
            }}
          >
            {companyName}
          </Typography>
          {/* sm and up: the location pill after the company name. */}
          <Box
            sx={{ display: { xs: "none", sm: "flex" }, minWidth: 0, flexShrink: 0 }}
          >
            <LocationPill
              name={locationName}
              isLink={canChangeLocation}
              maxWidth={240}
            />
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexShrink: 0,
          }}
        >
          {session?.user?.name && (
            <Typography
              variant="body2"
              sx={{ display: { xs: "none", sm: "block" } }}
            >
              {session.user.name}
            </Typography>
          )}
          <IconButton
            onClick={toggleMode}
            sx={{ color: "text.primary" }}
            aria-label="Toggle theme"
          >
            {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: "primary.main",
              fontSize: 14,
            }}
          >
            {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
          </Avatar>
          <IconButton
            onClick={() => signOut({ callbackUrl: "/auth/signIn" })}
            sx={{ color: "text.primary" }}
            aria-label="Sign out"
          >
            <LogoutIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
