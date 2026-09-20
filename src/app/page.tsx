import Box from "@mui/material/Box";
import { SurfaceThemeProvider } from "./lib/theme/ThemeModeProvider";

export default function landingpage() {
  return (
    <SurfaceThemeProvider surface="bo">
      <Box>Hello world!</Box>
    </SurfaceThemeProvider>
  );
}
