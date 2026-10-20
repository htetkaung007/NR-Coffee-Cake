import Link from "next/link";
import { Box, Button, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

/** The top of a Backoffice list page (Tables, Locations): the page
 *  title (h1) and its "New …" button. */
export default function ListPageHeader({
  title,
  newHref,
  newLabel,
}: {
  title: string;
  newHref: string;
  newLabel: string;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        mb: 3,
      }}
    >
      <Typography variant="h6" component="h1">
        {title}
      </Typography>
      <Link href={newHref} passHref>
        <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }}>
          {newLabel}
        </Button>
      </Link>
    </Box>
  );
}
