import { AppBar, Box, Toolbar } from "@mui/material";

import { Typography } from "@mui/material";

export default function BoTopbar() {
  return (
    <Box>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar sx={{ bgcolor: "secondary.main" }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <Box>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                  "NR Cafe"
                </Typography>
              </Box>
              <Typography variant="h6">"Location 1"</Typography>
            </Box>
          </Toolbar>
        </AppBar>
      </Box>
    </Box>
  );
}
