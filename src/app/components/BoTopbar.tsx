"use client";

import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import { signOut, useSession } from "next-auth/react";

export default function BoTopbar() {
  const { data: session, status } = useSession();

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" elevation={0}>
        <Toolbar
          sx={{
            bgcolor: "#2d1b10",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Typography variant="h6" component="div">
            NR Cafe
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              {status === "loading"
                ? "Loading..."
                : (session?.user?.email ?? "Staff")}
            </Typography>
            {session ? (
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                onClick={() => signOut({ callbackUrl: "/auth/signIn" })}
                sx={{ borderColor: "rgba(255,255,255,0.4)" }}
              >
                Sign out
              </Button>
            ) : null}
          </Box>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
