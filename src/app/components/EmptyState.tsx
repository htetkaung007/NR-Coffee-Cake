import { Stack, Typography } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";

/** A muted icon and one line where a list or report would be — "No paid
 *  bills on this day" (DESIGN.md Rule 14: the page's controls stay
 *  visible around it). */
export default function EmptyState({
  Icon,
  message,
}: {
  Icon: SvgIconComponent;
  message: string;
}) {
  return (
    <Stack
      spacing={1}
      sx={{
        alignItems: "center",
        textAlign: "center",
        px: 2,
        py: 6,
        border: 1,
        borderStyle: "dashed",
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <Icon fontSize="large" sx={{ color: "text.secondary" }} />
      <Typography variant="body1">{message}</Typography>
    </Stack>
  );
}
