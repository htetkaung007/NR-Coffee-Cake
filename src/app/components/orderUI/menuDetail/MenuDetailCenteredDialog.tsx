"use client";

import { Box, Dialog, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useOrderUiLabels } from "../OrderUiLabels";
import { langAttr } from "@/app/lib/i18n/locale";

interface MenuDetailCenteredDialogProps {
  open: boolean;
  onClose: () => void;
  /** The left column (MenuDetailAside) once the item is loaded; null
   *  while loading / when it couldn't load — the content then takes the
   *  whole dialog. */
  aside: React.ReactNode;
  /** The pinned action area (MenuDetailFooter), or null. */
  footer: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The item detail from sm up — a two-column dialog, centred by MUI's own
 * flex container. Sizes come from that container (%), never from 100vw
 * (which also counts a page scrollbar / a widened layout viewport and
 * pushed the dialog off-centre):
 * - tablet (sm–md): min(720px, 100% − 32px) wide, columns 280px | 1fr;
 * - desktop (md+): min(880px, 100% − 64px) wide, columns 360px | 1fr;
 * - height: at least 480px (a proper frame even with few options), at
 *   most min(640px, 90dvh); both columns stretch to it.
 * LEFT never scrolls; RIGHT scrolls its groups with the footer pinned.
 * The close button sits on the dialog's top-right corner. MUI's own
 * transition only.
 */
export default function MenuDetailCenteredDialog({
  open,
  onClose,
  aside,
  footer,
  children,
}: MenuDetailCenteredDialogProps) {
  const { locale, menuDetail: labels } = useOrderUiLabels();
  const hasAside = aside !== null;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      // Portalled to <body>, outside any page's lang: say it here, so
      // Myanmar text gets the `:lang(my)` sizes (staff New Order's မြန်မာ
      // view; the customer's Myanmar). English adds nothing.
      lang={langAttr(locale)}
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            m: 0,
            width: {
              xs: "min(720px, calc(100% - 32px))",
              md: "min(880px, calc(100% - 64px))",
            },
            maxWidth: "none",
            minHeight: 480,
            maxHeight: "min(640px, 90dvh)",
            borderRadius: 2,
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: hasAside
              ? { xs: "280px minmax(0, 1fr)", md: "360px minmax(0, 1fr)" }
              : "minmax(0, 1fr)",
            // One row that fills the paper; both columns stretch to it.
            gridTemplateRows: "minmax(0, 1fr)",
          },
        },
      }}
    >
      {aside}
      <Box
        sx={{
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            px: 3,
            pt: 3,
            pb: 3,
            // The option tiles go to 2 columns by THIS column's width.
            containerType: "inline-size",
          }}
        >
          {children}
        </Box>
        {footer}
      </Box>

      {/* Top-right of the whole dialog: a 44px tap area around a 40px
         round paper button with a hairline edge. The first block of the
         right column keeps clear of it (MenuDetailBody). */}
      <IconButton
        aria-label={labels.close}
        onClick={onClose}
        sx={(theme) => ({
          position: "absolute",
          top: 12,
          right: 12,
          width: 44,
          height: 44,
          isolation: "isolate",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 2,
            zIndex: -1,
            borderRadius: "50%",
            bgcolor: "background.paper",
            border: `1px solid ${theme.palette.divider}`,
          },
        })}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Dialog>
  );
}
