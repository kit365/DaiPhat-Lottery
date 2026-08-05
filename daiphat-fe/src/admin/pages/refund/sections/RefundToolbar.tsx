"use client";

import { Toolbar, Box, Button, SvgIcon, Tooltip, Menu, MenuItem } from "@mui/material";
import { type Dispatch, type SetStateAction, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Search } from "../../../components/ui/Search";
import { SettingsList } from "../../../components/ui/SettingsList";
import { toolbarStyles } from "../../../shared/data-grid";
import { IGridSettings } from "../../../shared/data-grid";

const CustomExportIcon = (props: any) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
        <g fill="none" fillRule="evenodd">
            <path fill="#1C252E" d="M12 1.25a.75.75 0 0 0-.75.75v10.973l-1.68-1.961a.75.75 0 1 0-1.14.976l3 3.5a.75.75 0 0 0 1.14 0l3-3.5a.75.75 0 1 0-1.14-.976l-1.68 1.96V2a.75.75 0 0 0-.75-.75" />
            <path
                fill="#1C252E"
                d="M14.25 9v.378a2.249 2.249 0 0 1 2.458 3.586l-3 3.5a2.25 2.25 0 0 1-3.416 0l-3-3.5A2.25 2.25 0 0 1 9.75 9.378V9H8c-2.828 0-4.243 0-5.121.879C2 10.757 2 12.172 2 15v1c0 2.828 0 4.243.879 5.121C3.757 22 5.172 22 8 22h8c2.828 0 4.243 0 5.121-.879C22 20.243 22 18.828 22 16v-1c0-2.828 0-4.243-.879-5.121C20.243 9 18.828 9 16 9z"
            />
        </g>
    </SvgIcon>
);

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

const DummyExportButton = () => {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef<HTMLButtonElement>(null);

    return (
        <>
            <Tooltip title="Tải dữ liệu">
                <Button
                    ref={anchorRef}
                    variant="text"
                    size="small"
                    disableElevation
                    startIcon={<CustomExportIcon sx={{ fontSize: "1.125rem !important" }} />}
                    onClick={() => setOpen(true)}
                    sx={actionButtonSx}
                >
                    Tải về
                </Button>
            </Tooltip>
            <Menu
                anchorEl={anchorRef.current}
                open={open}
                onClose={() => setOpen(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <MenuItem
                    onClick={() => {
                        setOpen(false);
                        toast.success("Đang chuẩn bị trang in...");
                    }}
                >
                    In
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setOpen(false);
                        toast.success("Đang xuất file CSV...");
                    }}
                >
                    Tải xuống (CSV)
                </MenuItem>
            </Menu>
        </>
    );
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
                <DummyExportButton />
                <SettingsList settings={settings} onSettingsChange={onSettingsChange} />
            </Box>
        </Toolbar>
    );
};
