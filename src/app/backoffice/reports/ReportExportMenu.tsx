"use client";

import { useId, useState } from "react";
import { Box, Button, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import type { SvgIconComponent } from "@mui/icons-material";

/** One way out of the Reports page — a real link either way: the
 *  printable report opens in a new tab (so this page stays where it
 *  is); a CSV downloads. */
interface ExportItem {
  label: string;
  /** A muted second line (what's inside the file). */
  hint?: string;
  href: string;
  icon: SvgIconComponent;
  /** A file to download rather than a page to open. */
  isDownload?: boolean;
}

interface ReportExportMenuProps {
  /** All for the period on screen right now. */
  printHref: string;
  linesCsvHref: string;
  cancelledCsvHref: string;
}

/**
 * The Reports header's "Export" button and its small menu. From md the
 * button reads "Export"; on phones it's the download icon alone — the
 * same accessible name ("Export") either way, ≥ 44px.
 */
export default function ReportExportMenu({
  printHref,
  linesCsvHref,
  cancelledCsvHref,
}: ReportExportMenuProps) {
  const buttonId = useId();
  const menuId = useId();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const isOpen = anchorEl !== null;

  const items: ExportItem[] = [
    { label: "Report (print / PDF)", href: printHref, icon: PrintOutlinedIcon },
    {
      label: "Order lines (CSV)",
      hint: "Includes customer notes.",
      href: linesCsvHref,
      icon: TableChartOutlinedIcon,
      isDownload: true,
    },
    {
      label: "Cancelled orders (CSV)",
      hint: "Includes customer and staff notes.",
      href: cancelledCsvHref,
      icon: TableChartOutlinedIcon,
      isDownload: true,
    },
  ];

  return (
    <>
      <Button
        id={buttonId}
        variant="outlined"
        aria-label="Export"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{ minHeight: 44, minWidth: 44, px: { xs: 1, md: 2 } }}
      >
        <DownloadIcon fontSize="small" />
        <Box component="span" sx={{ display: { xs: "none", md: "inline" }, ml: 1 }}>
          Export
        </Box>
      </Button>
      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={isOpen}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ list: { "aria-labelledby": buttonId } }}
      >
        {items.map(({ label, hint, href, icon: Icon, isDownload }) => (
          <MenuItem
            key={href}
            component="a"
            href={href}
            // The file's own name comes from the server
            // (Content-Disposition), so `download` takes no value.
            {...(isDownload
              ? { download: true }
              : { target: "_blank", rel: "noopener" })}
            onClick={() => setAnchorEl(null)}
            sx={{ minHeight: 44 }}
          >
            <ListItemIcon>
              <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={label}
              secondary={hint}
              slotProps={{ secondary: { color: "text.secondary" } }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
