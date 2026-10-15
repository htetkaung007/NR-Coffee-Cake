"use client";

import { Box, ButtonBase, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useOrderUiLabels } from "../OrderUiLabels";

/**
 * Above a disabled Add: WHY it's off — "Please choose: Size, Spicy
 * level". Tapping it brings the first missing group into view. It keeps
 * its space while the item has required groups (empty once all are
 * answered), so the button below never jumps; a status region, so the
 * change is read out.
 */
export default function MissingChoiceNotice({
  missingNames,
  hasRequiredGroups,
  onShowFirst,
}: {
  /** The unanswered required groups' names, in the customer's language;
   *  [] when all are answered. */
  missingNames: string[];
  /** Whether to keep the line's space at all. */
  hasRequiredGroups: boolean;
  onShowFirst: () => void;
}) {
  const labels = useOrderUiLabels().menuDetail;
  if (!hasRequiredGroups) return null;
  const isMissing = missingNames.length > 0;
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        minHeight: 44,
        mb: 1,
        opacity: isMissing ? 1 : 0,
        transition: "opacity 150ms ease-out",
      }}
    >
      {isMissing && (
        <ButtonBase
          onClick={onShowFirst}
          sx={(theme) => ({
            minHeight: 44,
            width: "100%",
            justifyContent: "flex-start",
            gap: 0.75,
            px: 1,
            mx: -1,
            borderRadius: 1,
            textAlign: "left",
            color: theme.palette.warningText ?? theme.palette.text.primary,
            "&.Mui-focusVisible": {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: -2,
            },
          })}
        >
          <InfoOutlinedIcon fontSize="small" aria-hidden />
          <Typography
            variant="body2"
            component="span"
            sx={{ fontWeight: 600, overflowWrap: "anywhere" }}
          >
            {labels.pleaseChoose(missingNames.join(", "))}
          </Typography>
        </ButtonBase>
      )}
    </Box>
  );
}
