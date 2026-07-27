"use client";

import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { signOut, useSession } from "next-auth/react";
import { useThemeMode } from "../lib/theme/ThemeModeProvider";

type BackofficeTopBarProps = {
  onMenuClick: () => void;
  companyName?: string;
};

export function BackofficeTopBar({
  onMenuClick,
  companyName,
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
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Burger tab — mobile မှာပဲ ပေါ်, side bar ကို ဖွင့်/ပိတ် */}
          <IconButton
            edge="start"
            onClick={onMenuClick}
            sx={{ display: { sm: "none" }, color: "text.primary" }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {companyName}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
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
