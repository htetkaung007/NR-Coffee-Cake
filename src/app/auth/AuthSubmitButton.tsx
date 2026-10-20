import { Button, CircularProgress } from "@mui/material";
import { authButtonSx } from "./authButtonSx";

/** The sign-in / sign-up form's submit — full width, large, with a
 *  spinner (and disabled) while the request runs. */
export default function AuthSubmitButton({
  isBusy,
  children,
}: {
  isBusy: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="submit"
      fullWidth
      variant="contained"
      disabled={isBusy}
      size="large"
      sx={{ ...authButtonSx, mt: 4 }}
    >
      {isBusy ? <CircularProgress size={24} color="inherit" /> : children}
    </Button>
  );
}
