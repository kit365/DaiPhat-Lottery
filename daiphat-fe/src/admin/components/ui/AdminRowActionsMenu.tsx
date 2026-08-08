"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { Box, IconButton, ListItemIcon, Menu, MenuItem } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { CanAccess } from "../auth/CanAccess";
import {
    resolveAdminRowActionIcon,
    type AdminRowActionIconKey,
} from "./adminRowActionIcons";

export type { AdminRowActionIconKey } from "./adminRowActionIcons";

export type AdminRowActionsMenuItem = {
    id: string;
    label: ReactNode;
    icon?: AdminRowActionIconKey | ReactNode;
    onClick: () => void;
    hidden?: boolean;
    danger?: boolean;
    disabled?: boolean;
    permission?: string;
    anyOf?: string[];
    sx?: SxProps<Theme>;
};

export type AdminRowActionsMenuProps = {
    items?: AdminRowActionsMenuItem[];
    children?: ReactNode;
    ariaLabel?: string;
    stopPropagation?: boolean;
    disabled?: boolean;
    minWidth?: number;
};

const MENU_ITEM_ICON_SX = {
    minWidth: "28px !important",
    mr: 0,
    color: "inherit",
    "& .MuiSvgIcon-root": {
        fontSize: "1.25rem",
        marginRight: "0 !important",
    },
} as const;

const MENU_ITEM_SX: SxProps<Theme> = {
    gap: 1,
    py: 0.75,
    px: 1,
    fontWeight: 700,
    fontSize: "0.8125rem",
    lineHeight: 1.5,
    color: "#1C252E",
};

const getMenuItemSx = (itemSx?: SxProps<Theme>): SxProps<Theme> =>
    itemSx ? ([MENU_ITEM_SX, itemSx] as SxProps<Theme>) : MENU_ITEM_SX;

export const AdminRowActionsMenu = ({
    items = [],
    children,
    ariaLabel = "Thao tác",
    stopPropagation = true,
    disabled = false,
    minWidth = 140,
}: AdminRowActionsMenuProps) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);
    const visibleItems = items.filter((item) => !item.hidden);

    if (visibleItems.length === 0 && !children) {
        return null;
    }

    const handleOpen = (event: MouseEvent<HTMLElement>) => {
        if (stopPropagation) {
            event.stopPropagation();
        }
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleItemClick = (onClick: () => void) => {
        onClick();
        handleClose();
    };

    const menuContent =
        children ??
        visibleItems.map((item) => {
            const menuItem = (
                <MenuItem
                    key={item.id}
                    className={
                        item.danger
                            ? "admin-menu-item admin-menu-item--danger"
                            : "admin-menu-item"
                    }
                    disabled={item.disabled}
                    sx={getMenuItemSx(item.sx)}
                    onClick={() => handleItemClick(item.onClick)}
                >
                    {item.icon ? (
                        <ListItemIcon sx={MENU_ITEM_ICON_SX}>
                            {resolveAdminRowActionIcon(item.icon)}
                        </ListItemIcon>
                    ) : null}
                    <Box
                        component="span"
                        className="admin-row-actions-menu__label"
                        sx={{ whiteSpace: "nowrap" }}
                    >
                        {item.label}
                    </Box>
                </MenuItem>
            );

            if (item.permission || item.anyOf) {
                return (
                    <CanAccess key={item.id} permission={item.permission} anyOf={item.anyOf}>
                        {menuItem}
                    </CanAccess>
                );
            }

            return menuItem;
        });

    return (
        <Box
            component="span"
            onClick={stopPropagation ? (event) => event.stopPropagation() : undefined}
        >
            <IconButton
                size="small"
                aria-label={ariaLabel}
                aria-haspopup="true"
                aria-expanded={open ? "true" : undefined}
                disabled={disabled}
                onClick={handleOpen}
                className="admin-row-actions-trigger"
            >
                <MoreVertIcon fontSize="small" />
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{
                    paper: {
                        className: "background-popup admin-row-actions-menu__paper",
                        sx: {
                            width: "max-content",
                            minWidth,
                            maxWidth: 280,
                            py: 0.5,
                        },
                    },
                    list: {
                        sx: {
                            py: 0,
                        },
                    },
                }}
            >
                {menuContent}
            </Menu>
        </Box>
    );
};
