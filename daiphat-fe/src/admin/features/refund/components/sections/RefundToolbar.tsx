"use client";

import { Button } from '@/admin/components/ui/Button';

import { Toolbar, Box, SvgIcon, Tooltip, Menu, MenuItem } from '@mui/material';
import { type Dispatch, type SetStateAction, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Search } from "@/admin/components/ui/Search";
import { SettingsList } from "@/admin/components/ui/SettingsList";
import { toolbarStyles, IGridSettings } from '@/admin/shared/data-grid';



const actionButtonSx = {
    textTransform: "none" as const,
    minWidth: "64px",
    minHeight: "30px",
    fontSize: "0.8125rem",
    padding: "4px",
    fontWeight: 700,
    borderRadius: "8px",
    gap: "6px",
    color: "#1C252E",
    "& .MuiButton-startIcon": { margin: 0 },
    "&:hover": { backgroundColor: "#919eab14" },
    "& .MuiButton-icon": { mt: "-2px !important" },
};



interface RefundToolbarProps {
    settings: IGridSettings;
    onSettingsChange: Dispatch<SetStateAction<IGridSettings>>;
    search: string;
    onSearchChange: (search: string) => void;
}

export const RefundToolbar = ({
    settings,
    onSettingsChange,
    search,
    onSearchChange,
}: RefundToolbarProps) => {
    return (
        <Toolbar
            style={toolbarStyles.root}
            sx={{
                justifyContent: "space-between",
                padding: "20px !important",
                gap: 2,
            }}
        >
            <Box sx={{ flex: 1 }}>
                <Search
                    maxWidth="100%"
                    placeholder="Tìm theo mã đơn, khách hàng, lý do hoàn tiền..."
                    value={search}
                    onChange={onSearchChange}
                />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>

                <SettingsList settings={settings} onSettingsChange={onSettingsChange} />
            </Box>
        </Toolbar>
    );
};
