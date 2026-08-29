"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Drawer,
  Toolbar,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
} from "@mui/material";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import CategoryIcon from "@mui/icons-material/Category";
import FastfoodIcon from "@mui/icons-material/Fastfood";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import TableRestaurantIcon from "@mui/icons-material/TableRestaurant";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import SettingsIcon from "@mui/icons-material/Settings";

export const SIDEBAR_WIDTH = 260;

const TOPBAR_HEIGHT_DESKTOP = 64;

const navItems = [
  { label: "Orders", href: "/backoffice/order", icon: ReceiptLongIcon },
  {
    label: "New Order",
    href: "/backoffice/order/new",
    icon: AddShoppingCartIcon,
  },
  {
    label: "Menu Categories",
    href: "/backoffice/menu_categories",
    icon: CategoryIcon,
  },
  { label: "Menus", href: "/backoffice/menus", icon: RestaurantMenuIcon },
  { label: "Add-ons", href: "/backoffice/addons", icon: FastfoodIcon },

  { label: "Tables", href: "/backoffice/tables", icon: TableRestaurantIcon },
  { label: "Locations", href: "/backoffice/locations", icon: LocationOnIcon },
  { label: "Settings", href: "/backoffice/setting", icon: SettingsIcon },
];

function SidebarContent() {
  const pathname = usePathname();

  return (
    <Box sx={{ bgcolor: "background.paper", height: "100%" }}>
      <Toolbar>
        <Typography
          sx={{
            fontWeight: 70,
            color: "text.primary",
            fontSize: 15,
            opacity: 0.7,
          }}
        >
          Management Tabs
        </Typography>
      </Toolbar>

      <List sx={{ px: 1 }}>
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive =
            pathname === href || pathname?.startsWith(`${href}/`);

          return (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <ListItemButton
                selected={isActive}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  color: isActive ? "primary.main" : "text.primary",
                  bgcolor: isActive ? "background.default" : "transparent",
                  "&:hover": { bgcolor: "background.default" },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? "primary.main" : "text.primary",
                    minWidth: 40,
                  }}
                >
                  <Icon />
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  sx={{
                    "& .MuiListItemText-primary": {
                      fontWeight: isActive ? 600 : 400,
                    },
                  }}
                />
              </ListItemButton>
            </Link>
          );
        })}
      </List>
    </Box>
  );
}

type BackofficeSideBarProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

export function BackofficeSideBar({
  mobileOpen,
  onClose,
}: BackofficeSideBarProps) {
  return (
    <Box
      component="nav"
      sx={{ width: { sm: SIDEBAR_WIDTH }, flexShrink: { sm: 0 } }}
    >
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": {
            width: SIDEBAR_WIDTH,
            borderRight: 1,
            borderColor: "divider",
          },
        }}
      >
        <SidebarContent />
      </Drawer>

      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", sm: "block" },
          "& .MuiDrawer-paper": {
            width: SIDEBAR_WIDTH,
            boxSizing: "border-box",
            borderRight: 1,
            borderColor: "divider",
            top: TOPBAR_HEIGHT_DESKTOP,
            height: `calc(100% - ${TOPBAR_HEIGHT_DESKTOP}px)`,
          },
        }}
      >
        <SidebarContent />
      </Drawer>
    </Box>
  );
}
