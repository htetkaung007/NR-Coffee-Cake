import { Box, Typography } from "@mui/material";

/** The sign-in / sign-up card's heading: a small eyebrow line, the page
 *  title (the page's h1) and one line of intro. */
export default function AuthHeading({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro: string;
}) {
  return (
    <Box sx={{ mb: 4, textAlign: "center" }}>
      <Typography
        variant="overline"
        sx={{ letterSpacing: 4, fontWeight: "bold", color: "primary.main" }}
      >
        {eyebrow}
      </Typography>
      <Typography variant="h4" component="h1" sx={{ mt: 1, fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {intro}
      </Typography>
    </Box>
  );
}
