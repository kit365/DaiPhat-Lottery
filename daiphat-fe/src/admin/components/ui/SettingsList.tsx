"use client";

import { type Dispatch, type SetStateAction, type ReactNode, useState, useRef } from 'react';
import { GridDensity } from '@mui/x-data-grid';
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import { Button } from "@mui/material";
import { CompactIcon, StandardIcon, ComfortableIcon, EyeIcon, NoEyeIcon, SettingsIcon } from '../../assets/icons/index';

const DENISTY_OPTIONS: { label: string; value: GridDensity }[] = [
    { label: 'Mật độ gọn', value: 'compact' },
    { label: 'Mật độ tiêu chuẩn', value: 'standard' },
    { label: 'Mật độ thoải mái', value: 'comfortable' },
];

interface Settings {
    density?: GridDensity;
    showCellBorders?: boolean;
    showColumnBorders?: boolean;
}

type ToolbarProps = {
    settings: Settings;
    onSettingsChange: Dispatch<SetStateAction<Settings>>;
};

const DENSITY_ICON_MAP: Record<GridDensity, ReactNode> = {
    compact: <CompactIcon />,
    standard: <StandardIcon />,
    comfortable: <ComfortableIcon />,
};

export const SettingsList = ({ settings, onSettingsChange }: ToolbarProps) => {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef<HTMLButtonElement>(null);

    return (
        <>
            <Tooltip title="Cài đặt">
                <Button
                    ref={anchorRef}
                    id="settings-menu-trigger"
                    aria-controls={open ? 'settings-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                    onClick={() => setOpen(true)}

                    sx={{
                        textTransform: 'none',
                        minWidth: '64px',
                        minHeight: '30px',
                        fontSize: '0.8125rem',
                        padding: '4px 8px',
                        fontWeight: 700,
                        borderRadius: '8px',
                        gap: '6px',
                        color: '#1C252E',
                        display: 'inline-flex',
                        alignItems: 'center',

                        '&:hover': {
                            backgroundColor: '#919eab14',
                        },

                        '& .MuiSvgIcon-root': {
                            mt: "-2px !important"
                        }
                    }}
                >
                    <SettingsIcon sx={{ fontSize: '1.125rem' }} />
                    Cài đặt
                </Button>
            </Tooltip>

            <Menu
                id="settings-menu"
                anchorEl={anchorRef.current}
                open={open}
                onClose={() => setOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                sx={{
                    "& .MuiPaper-root": {
                        "& .MuiList-root": {
                            "& .MuiMenuItem-root:hover": {
                                backgroundColor: "#919eab29"
                            }
                        }
                    }
                }}
                slotProps={{
                    paper: {
                        className: 'background-popup',
                    },
                    list: {
                        'aria-labelledby': 'settings-menu-trigger',
                    },
                }}
            >
                {DENISTY_OPTIONS.map((option) => {
                    const isSelected = settings.density === option.value;

                    return (
                        <MenuItem
                            key={option.value}
                            onClick={() =>
                                onSettingsChange((currentSettings) => ({
                                    ...currentSettings,
                                    density: option.value,
                                }))
                            }
                            sx={{
                                fontWeight: isSelected ? 600 : 400,
                                backgroundColor: isSelected ? '#919eab29' : 'transparent',
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 32 }}>
                                {DENSITY_ICON_MAP[option.value]}
                            </ListItemIcon>
                            {option.label}
                        </MenuItem>
                    )
                })}
                <Divider />
                <MenuItem
                    onClick={() =>
                        onSettingsChange((currentSettings) => ({
                            ...currentSettings,
                            showColumnBorders: !currentSettings.showColumnBorders,
                        }))
                    }
                >
                    <ListItemIcon>
                        {settings.showColumnBorders ? <EyeIcon /> : <NoEyeIcon />}
                    </ListItemIcon>
                    Hiển thị đường viền cột
                </MenuItem>
                <MenuItem
                    onClick={() =>
                        onSettingsChange((currentSettings) => ({
                            ...currentSettings,
                            showCellBorders: !currentSettings.showCellBorders,
                        }))
                    }
                >
                    <ListItemIcon>
                        {settings.showCellBorders ? <EyeIcon /> : <NoEyeIcon />}
                    </ListItemIcon>
                    Hiển thị đường viền ô
                </MenuItem>
            </Menu>
        </>
    )
}
