"use client";

import Link from "next/link";
import { IconButton, type SxProps, type Theme } from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";

interface BackCircleButtonProps {
  ariaLabel: string;
  /** Navigate with a link (server pages) … */
  href?: string;
  /** … or run a handler (client pages that push + refresh themselves). */
  onClick?: () => void;
  sx?: SxProps<Theme>;
}

/** The customer-facing "back" control: a bordered circle holding a thin
 *  "<" chevron. Every back arrow in the order flow uses this, so its look
 *  is defined in one place. */
export default function BackCircleButton({
  ariaLabel,
  href,
  onClick,
  sx,
}: BackCircleButtonProps) {
  const styles = [
    {
      width: 40,
      height: 40,
      flexShrink: 0,
      color: "text.primary",
      bgcolor: "background.paper",
      border: "1px solid",
      borderColor: "divider",
      "&:hover": { bgcolor: "action.hover" },
    },
    ...(Array.isArray(sx) ? sx : [sx]),
  ];
  const icon = <ArrowBackIosNewIcon sx={{ fontSize: 16 }} />;

  if (href) {
    return (
      <IconButton component={Link} href={href} aria-label={ariaLabel} sx={styles}>
        {icon}
      </IconButton>
    );
  }

  return (
    <IconButton onClick={onClick} aria-label={ariaLabel} sx={styles}>
      {icon}
    </IconButton>
  );
}
