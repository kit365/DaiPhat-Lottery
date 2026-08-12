"use client";

import { Toolbar, Box, TextField, Chip, Button, Badge, SvgIcon, Popover, Divider, List, ListItem, ListItemButton, ListItemText, Radio, InputAdornment } from "@mui/material";
import { type Dispatch, type SetStateAction, useState } from "react";
import dayjs from "dayjs";
import SearchIcon from '@mui/icons-material/Search';
import { Search } from '../../../../components/ui/Search';
import { Columns } from '../../../../components/ui/Columns';
import { ExportButton } from '../../../../components/ui/ExportButton';
import { SettingsList } from '../../../../components/ui/SettingsList';
import { AdminDatePicker } from '../../../../components/ui/AdminDatePicker';
import { adminCountBadgeSx, getMetricChipSx } from '@/admin/utils/badge';

interface IGridSettings {
    density: "compact" | "standard" | "comfortable";
    showColumnBorders: boolean;
    showCellBorders: boolean;
}

interface ToolbarProps {
    settings: IGridSettings;
    onSettingsChange: Dispatch<SetStateAction<IGridSettings>>;
    onSearch: (search: string) => void;
    region: string;
    dateMode: 'single' | 'range';
    drawDate: string;
    fromDate: string;
    toDate: string;
    source: 'MINH_NGOC' | 'XOSO_VN';
    onRegionChange: (region: string) => void;
    onDateModeChange: (mode: 'single' | 'range') => void;
    onDrawDateChange: (drawDate: string) => void;
    onFromDateChange: (drawDate: string) => void;
    onToDateChange: (drawDate: string) => void;
    onSourceChange: (source: 'MINH_NGOC' | 'XOSO_VN') => void;
    isLoading: boolean;
    isRefreshing: boolean;
}

export const DrawResultToolbar = ({
    settings,
    onSettingsChange,
    onSearch,
    region,
    dateMode,
    drawDate,
    fromDate,
    toDate,
    source,
    onRegionChange,
    onDateModeChange,
    onDrawDateChange,
    onFromDateChange,
    onToDateChange,
    onSourceChange,
    isLoading,
    isRefreshing
}: ToolbarProps) => {
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [activeTab, setActiveTab] = useState<'region' | 'source' | 'dateMode' | 'date'>('region');

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);
    const id = open ? 'filter-popover' : undefined;

    // Lấy ngày hiện tại format YYYY-MM-DD
    const todayStr = dayjs().format('YYYY-MM-DD');
    const tomorrowStr = dayjs().add(1, 'day').format('YYYY-MM-DD');
    
    // Tính ngày tiếp theo từ fromDate (khoảng cách tối thiểu 1 ngày)
    const getMinToDate = (from: string) => {
        if (!from) return '';
        const d = dayjs(from);
        if (!d.isValid()) return '';
        return d.add(1, 'day').format('YYYY-MM-DD');
    };
    const minToDate = getMinToDate(fromDate);

    // We can count how many non-default filters are active.
    // Default: region=MIEN_NAM, dateMode=single, source=MINH_NGOC
    let filterCount = 0;
    if (region !== 'MIEN_NAM') filterCount++;
    if (source !== 'MINH_NGOC') filterCount++;
    if (dateMode !== 'single' || drawDate !== todayStr || fromDate !== todayStr || toDate !== todayStr) filterCount++;

    return (
        <Toolbar className="admin-list-toolbar">
            <Box className="admin-list-toolbar__search">
                <Search
                    maxWidth="100%"
                    placeholder="Tìm kiếm đài quay..."
                    onChange={onSearch}
                />
            </Box>
            <Box className="admin-list-toolbar__actions">
                {isRefreshing && (
                    <Chip
                        size="small"
                        label="Đang đồng bộ dữ liệu..."
                        sx={getMetricChipSx('info')}
                    />
                )}
                
                <Button
                    aria-describedby={id}
                    variant="text"
                    size="small"
                    disableElevation
                    onClick={handleClick}
                    startIcon={
                        <Badge
                            badgeContent={filterCount}
                            color="primary"
                            variant="dot"
                            sx={adminCountBadgeSx}
                        >
                            <SvgIcon sx={{ fontSize: '1.125rem !important' }} viewBox="0 0 24 24">
                                <g fill="none" fillRule="evenodd">
                                    <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                                    <path
                                        fill="#1C252E"
                                        d="M3 4.5A1.5 1.5 0 0 1 4.5 3h15A1.5 1.5 0 0 1 21 4.5v2.086A2 2 0 0 1 20.414 8L15 13.414v7.424a1.1 1.1 0 0 1-1.592.984l-3.717-1.858A1.25 1.25 0 0 1 9 18.846v-5.432L3.586 8A2 2 0 0 1 3 6.586z"
                                    />
                                </g>
                            </SvgIcon>
                        </Badge>
                    }
                    className="admin-list-action-button"
                >
                    Bộ lọc
                </Button>

                <Popover
                    id={id}
                    open={open}
                    anchorEl={anchorEl}
                    onClose={handleClose}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                    PaperProps={{
                        sx: {
                            mt: 1,
                            width: 500,
                            boxShadow: '0 8px 16px -4px rgba(9, 30, 66, 0.25), 0 0 0 1px rgba(9, 30, 66, 0.08)',
                            borderRadius: '3px',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }
                    }}
                >
                    <Box sx={{ display: 'flex', height: 350 }}>
                        {/* Left Sidebar */}
                        <Box sx={{ width: 160, borderRight: '1px solid #DFE1E6', bgcolor: '#FAFBFC', display: 'flex', flexDirection: 'column' }}>
                            <List disablePadding sx={{ pt: 1 }}>
                                {[
                                    { id: 'region', label: 'Khu vực' },
                                    { id: 'source', label: 'Nguồn' },
                                    { id: 'date', label: 'Thời gian' }
                                ].map((tab) => (
                                    <ListItem disablePadding key={tab.id}>
                                        <ListItemButton 
                                            selected={activeTab === tab.id}
                                            onClick={() => setActiveTab(tab.id as 'region' | 'source' | 'date')}
                                            sx={{
                                                borderLeft: activeTab === tab.id ? '3px solid #FF3030' : '3px solid transparent',
                                                backgroundColor: activeTab === tab.id ? 'rgba(255, 48, 48, 0.08)' : 'transparent',
                                                py: 0.75,
                                                px: 2,
                                                '&.Mui-selected': {
                                                    backgroundColor: 'rgba(255, 48, 48, 0.08)',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(255, 48, 48, 0.12)',
                                                    }
                                                }
                                            }}
                                        >
                                            <ListItemText 
                                                primary={tab.label} 
                                                primaryTypographyProps={{ 
                                                    fontSize: '14px', 
                                                    fontWeight: activeTab === tab.id ? 600 : 400,
                                                    color: activeTab === tab.id ? '#FF3030' : '#42526E'
                                                }} 
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </List>
                        </Box>

                        {/* Right Content */}
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1.5, overflowY: 'auto' }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder={`Tìm kiếm ${activeTab === 'region' ? 'khu vực' : activeTab === 'source' ? 'nguồn' : 'thời gian'}`}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: '#6B778C', fontSize: '20px' }} />
                                        </InputAdornment>
                                    ),
                                    sx: {
                                        fontSize: '14px',
                                        height: '36px',
                                        bgcolor: 'transparent',
                                        '& fieldset': {
                                            borderColor: '#DFE1E6',
                                        },
                                        '&:hover fieldset': {
                                            borderColor: '#B3BAC5 !important',
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: '#FF3030 !important',
                                            borderWidth: '2px !important',
                                        }
                                    }
                                }}
                            />

                            {activeTab === 'region' && (
                                <List sx={{ mt: 1 }}>
                                    {[
                                        { value: 'MIEN_NAM', label: 'Miền Nam' },
                                        { value: 'MIEN_TRUNG', label: 'Miền Trung' },
                                        { value: 'MIEN_BAC', label: 'Miền Bắc' }
                                    ].map(opt => (
                                        <ListItem key={opt.value} disablePadding>
                                            <ListItemButton onClick={() => onRegionChange(opt.value)} sx={{ py: 0.5, px: 1, borderRadius: '3px' }}>
                                                <Radio
                                                    checked={region === opt.value}
                                                    size="small"
                                                    sx={{ p: 0.5, mr: 1, '&.Mui-checked': { color: '#FF3030' } }}
                                                />
                                                <Box sx={{ fontSize: '14px', color: '#172B4D', py: 0.25 }}>{opt.label}</Box>
                                            </ListItemButton>
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                            
                            {activeTab === 'source' && (
                                <List sx={{ mt: 1 }}>
                                    {[
                                        { value: 'MINH_NGOC', label: 'Minh Ngọc' },
                                        { value: 'XOSO_VN', label: 'Xoso.vn' }
                                    ].map(opt => (
                                        <ListItem key={opt.value} disablePadding>
                                            <ListItemButton onClick={() => onSourceChange(opt.value as any)} sx={{ py: 0.5, px: 1, borderRadius: '3px' }}>
                                                <Radio
                                                    checked={source === opt.value}
                                                    size="small"
                                                    sx={{ p: 0.5, mr: 1, '&.Mui-checked': { color: '#FF3030' } }}
                                                />
                                                <Box sx={{ fontSize: '14px', color: '#172B4D', py: 0.25 }}>{opt.label}</Box>
                                            </ListItemButton>
                                        </ListItem>
                                    ))}
                                </List>
                            )}

                            {activeTab === 'date' && (
                                <Box sx={{ mt: 2, px: 1 }}>
                                    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                                        {[
                                            { value: 'single', label: 'Một ngày' },
                                            { value: 'range', label: 'Khoảng ngày' }
                                        ].map(opt => (
                                            <Button
                                                key={opt.value}
                                                variant="outlined"
                                                onClick={() => onDateModeChange(opt.value as 'single' | 'range')}
                                                size="small"
                                                sx={{
                                                    textTransform: 'none',
                                                    boxShadow: 'none',
                                                    bgcolor: dateMode === opt.value ? 'rgba(255, 48, 48, 0.08)' : 'transparent',
                                                    color: dateMode === opt.value ? '#FF3030' : '#42526E',
                                                    borderColor: dateMode === opt.value ? '#FF3030' : '#DFE1E6',
                                                    '&:hover': {
                                                        bgcolor: dateMode === opt.value ? 'rgba(255, 48, 48, 0.12)' : 'rgba(9, 30, 66, 0.04)',
                                                        borderColor: dateMode === opt.value ? '#FF3030' : '#B3BAC5',
                                                        boxShadow: 'none'
                                                    }
                                                }}
                                            >
                                                {opt.label}
                                            </Button>
                                        ))}
                                    </Box>

                                    {dateMode === 'single' ? (
                                        <Box>
                                            <AdminDatePicker
                                                label="Ngày quay"
                                                value={drawDate}
                                                onChange={onDrawDateChange}
                                                max={tomorrowStr}
                                                disabled={isLoading}
                                            />
                                            {drawDate !== todayStr && (
                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                                    <Button 
                                                        size="small" 
                                                        onClick={() => onDrawDateChange(todayStr)}
                                                        sx={{ 
                                                            textTransform: 'none', 
                                                            color: '#FF3030', 
                                                            fontSize: '12px', 
                                                            minWidth: 'auto', 
                                                            p: '2px 8px',
                                                            borderRadius: '4px',
                                                            fontWeight: 600,
                                                            bgcolor: 'rgba(255, 48, 48, 0.08)',
                                                            '&:hover': { bgcolor: 'rgba(255, 48, 48, 0.16)' } 
                                                        }}
                                                    >
                                                        Chọn hôm nay
                                                    </Button>
                                                </Box>
                                            )}
                                        </Box>
                                    ) : (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            <AdminDatePicker
                                                label="Từ ngày"
                                                value={fromDate}
                                                onChange={onFromDateChange}
                                                max={tomorrowStr}
                                                disabled={isLoading}
                                            />
                                            <AdminDatePicker
                                                label="Đến ngày"
                                                value={toDate}
                                                onChange={onToDateChange}
                                                min={minToDate || undefined}
                                                max={tomorrowStr}
                                                disabled={isLoading}
                                            />
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </Box>

                    <Divider sx={{ borderColor: '#DFE1E6' }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: '#fff' }}>
                        <Button 
                            variant="text" 
                            onClick={() => {
                                const today = dayjs().format('YYYY-MM-DD');
                                onRegionChange('MIEN_NAM');
                                onDateModeChange('single');
                                onSourceChange('MINH_NGOC');
                                onDrawDateChange(today);
                                onFromDateChange(today);
                                onToDateChange(today);
                            }}
                            sx={{ textTransform: 'none', color: '#42526E', fontWeight: 500, minWidth: 'auto', p: '4px 8px', '&:hover': { bgcolor: '#091E420F' } }}
                        >
                            Xóa tất cả
                        </Button>
                    </Box>
                </Popover>

                <Columns />
                <ExportButton />
                <SettingsList
                    settings={settings}
                    onSettingsChange={onSettingsChange as any}
                />
            </Box>
        </Toolbar>
    );
};
