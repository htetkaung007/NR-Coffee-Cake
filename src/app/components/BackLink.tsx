"use client";

import Link from "next/link";
import { IconButton } from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";

/** The Backoffice back button: an icon-only link (44×44) to a list
 *  page — always a real link, never history back (that breaks after a
 *  refresh or when the page was opened directly). Used by PageHeader
 *  and the order detail's EntryHeader. */
export default function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <IconButton
      component={Link}
      href={href}
      aria-label={label}
      sx={{ width: 44, height: 44 }}
    >
      <ArrowBackIosNewIcon fontSize="small" />
    </IconButton>
  );
}
