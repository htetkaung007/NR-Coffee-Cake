"use client";

import { useId, useState } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Switch,
} from "@mui/material";
import Link from "next/link";
import { alpha } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { signOut, useSession } from "next-auth/react";
import { clearStaffCarts } from "@/app/lib/hooks/useStaffCart";
import { useThemeMode } from "../lib/theme/ThemeModeProvider";
import { hoverCapableMedia } from "../lib/theme/sharedThemeTokens";
import OnlineMenuStatus, { type TopBarLocation } from "./OnlineMenuStatus";

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

/** The account button (the avatar) and its menu: who's signed in (name +
 *  role in words), Dark mode — this device's setting
 *  (ThemeModeProvider) — and Sign out. Every role gets it. The Dark mode
 *  item is ONE control (a menuitemcheckbox) that keeps the menu open so
 *  the change shows; its Switch is only the visual. */
function AccountMenu() {
  const { data: session } = useSession();
  const { mode, toggleMode } = useThemeMode();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const buttonId = useId();
  const menuId = useId();

  const name = session?.user?.name || session?.user?.email || "Account";
  const roleLabel = session?.user?.role === "ADMIN" ? "Owner" : "Manager";
  const isDark = mode === "dark";
  const open = anchor !== null;

  return (
    <>
      <IconButton
        id={buttonId}
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-label={`Account menu, ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        sx={{ width: 44, height: 44, p: 0.75 }}
      >
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
      </IconButton>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          list: { "aria-labelledby": buttonId },
          paper: { sx: { minWidth: 240, maxWidth: "calc(100vw - 32px)" } },
        }}
      >
        {/* Not a menu item (MenuList only focuses MenuItems): who's
           signed in. */}
        <Box component="li" role="presentation" sx={{ px: 2, pt: 1, pb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ overflowWrap: "anywhere" }}>
            {name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {roleLabel}
          </Typography>
        </Box>
        <Divider />
        <MenuItem
          role="menuitemcheckbox"
          aria-checked={isDark}
          // Stays open, so the new mode shows straight away.
          onClick={toggleMode}
          sx={{ minHeight: 44 }}
        >
          <ListItemIcon>
            {isDark ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>Dark mode</ListItemText>
          <Switch
            edge="end"
            size="small"
            checked={isDark}
            tabIndex={-1}
            aria-hidden
            sx={{ pointerEvents: "none" }}
          />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            // An unsent New Order stays on this device until Send —
            // never for the next person who signs in here.
            clearStaffCarts(session?.user?.id ?? null);
            void signOut({ callbackUrl: "/auth/signIn" });
          }}
          sx={{ minHeight: 44 }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Sign out</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

type BackofficeTopBarProps = {
  onMenuClick: () => void;
  companyName?: string;
  /** The selected location (name + online menu switch); null when none
   *  is selected. */
  location: TopBarLocation | null;
  /** Admins can switch location (the pill links to Locations) and switch
   *  its online menu (the status chip) — the owner. */
  canChangeLocation: boolean;
};

export function BackofficeTopBar({
  onMenuClick,
  companyName,
  location,
  canChangeLocation,
}: BackofficeTopBarProps) {
  const locationName = location?.name ?? null;

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        bgcolor: "background.paper",
        color: "text.primary",
        borderBottom: 1,
        borderColor: "divider",
        zIndex: (theme) => theme.zIndex.drawer + 1, // above the side bar
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
          {/* Phones only: opens / closes the side bar. */}
          <IconButton
            edge="start"
            onClick={onMenuClick}
            aria-label="Open menu"
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
          {/* sm and up: the location pill after the company name. When
             the row is tight the pill gives way first (ellipsis), down to
             a short stub, before the company name does. */}
          <Box
            sx={{ display: { xs: "none", sm: "flex" }, minWidth: 96, flexShrink: 10 }}
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
          {/* The selected location's online menu status (hidden with no
             selected location), then the account menu. */}
          {location && (
            <OnlineMenuStatus location={location} canChange={canChangeLocation} />
          )}
          <AccountMenu />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
