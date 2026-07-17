import React, { useState, useMemo } from 'react';
import { Popover, Button, Box, Typography, Divider, List, ListItem, ListItemButton, ListItemText, Checkbox, TextField, InputAdornment, IconButton } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from "dayjs";
import "dayjs/locale/en-gb";

export interface Option {
    value: string;
    label: string;
    color?: string;
    bgColor?: string;
}

export interface FilterField {
    id: string;
    label: string;
    options: Option[];
    type?: 'date';
}

interface JiraFilterProps {
    fields: FilterField[];
    selectedFilters: Record<string, string[]>;
    onFilterChange: (fieldId: string, values: string[]) => void;
    onClearAll: () => void;
    trigger?: (props: { onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; totalFilterCount: number }) => React.ReactNode;
}

export const JiraFilter: React.FC<JiraFilterProps> = ({ fields, selectedFilters, onFilterChange, onClearAll, trigger }) => {
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [activeTabId, setActiveTabId] = useState<string>(fields[0]?.id || '');
    const [searchQuery, setSearchQuery] = useState('');

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
        setSearchQuery('');
    };

    const open = Boolean(anchorEl);
    const id = open ? 'jira-filter-popover' : undefined;

    const activeField = fields.find(f => f.id === activeTabId);
    const isDate = activeField?.type === 'date';
    const activeSelected = selectedFilters[activeTabId] || [];

    const filteredOptions = useMemo(() => {
        if (!activeField) return [];
        let baseOptions = activeField.options;
        if (searchQuery) {
            baseOptions = baseOptions.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        if (activeField.type === 'date') {
            const customSelected = activeSelected.filter(d => !activeField.options.find(o => o.value === d));
            const customOptions = customSelected.map(d => ({
                value: d,
                label: `Đã chọn: ${dayjs(d).format('DD/MM/YYYY')}`,
                color: '#00A76F',
                bgColor: 'rgba(0, 167, 111, 0.08)'
            }));
            return [...customOptions, ...baseOptions];
        }

        return baseOptions;
    }, [searchQuery, activeField, activeSelected]);

    const handleToggle = (value: string) => {
        const currentIndex = activeSelected.indexOf(value);
        const newSelected = [...activeSelected];

        if (currentIndex === -1) {
            newSelected.push(value);
        } else {
            newSelected.splice(currentIndex, 1);
        }

        onFilterChange(activeTabId, newSelected);
    };

    const totalFilterCount = Object.values(selectedFilters).reduce((acc, curr) => acc + curr.length, 0);

    return (
        <>
            {trigger ? trigger({ onClick: handleClick, totalFilterCount }) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Button
                        aria-describedby={id}
                        variant={totalFilterCount > 0 ? "contained" : "outlined"}
                        onClick={handleClick}
                        startIcon={<FilterListIcon sx={{ fontSize: '1.25rem', mr: '-4px' }} />}
                        sx={{
                            textTransform: 'none',
                            color: totalFilterCount > 0 ? '#fff' : '#42526E',
                            backgroundColor: totalFilterCount > 0 ? '#00A76F' : '#091E420F',
                            borderColor: totalFilterCount > 0 ? '#00A76F' : 'transparent',
                            fontWeight: 500,
                            height: '32px',
                            padding: '0 12px',
                            '&:hover': {
                                backgroundColor: totalFilterCount > 0 ? '#007851' : '#091E4224',
                                borderColor: totalFilterCount > 0 ? '#007851' : 'transparent',
                            },
                            boxShadow: 'none',
                            borderRadius: '3px'
                        }}
                    >
                        Bộ lọc {totalFilterCount > 0 && <span style={{ marginLeft: '6px', background: '#fff', color: '#00A76F', borderRadius: '10px', padding: '0 6px', fontSize: '11px', fontWeight: 700 }}>{totalFilterCount}</span>}
                    </Button>
                    {totalFilterCount > 0 && (
                        <Button 
                            variant="text" 
                            onClick={onClearAll}
                            sx={{ 
                                textTransform: 'none', 
                                color: '#42526E', 
                                fontWeight: 500,
                                '&:hover': { background: 'transparent', textDecoration: 'underline' } 
                            }}
                        >
                            Xóa tất cả bộ lọc
                        </Button>
                    )}
                </div>
            )}

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
                            {fields.length === 0 && (
                                <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', fontStyle: 'italic', p: 1.5, textAlign: 'center' }}>
                                    Không có bộ lọc
                                </Typography>
                            )}
                            {fields.map((field) => {
                                const fieldCount = (selectedFilters[field.id] || []).length;
                                return (
                                    <ListItem disablePadding key={field.id}>
                                        <ListItemButton 
                                            selected={activeTabId === field.id}
                                            onClick={() => {
                                                setActiveTabId(field.id);
                                                setSearchQuery('');
                                            }}
                                            sx={{
                                                borderLeft: activeTabId === field.id ? '3px solid #00A76F' : '3px solid transparent',
                                                backgroundColor: activeTabId === field.id ? 'rgba(0, 167, 111, 0.08)' : 'transparent',
                                                py: 0.75,
                                                px: 2,
                                                '&.Mui-selected': {
                                                    backgroundColor: 'rgba(0, 167, 111, 0.08)',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(0, 167, 111, 0.12)',
                                                    }
                                                }
                                            }}
                                        >
                                            <ListItemText 
                                                primary={field.label} 
                                                primaryTypographyProps={{ 
                                                    fontSize: '14px', 
                                                    fontWeight: activeTabId === field.id ? 600 : 400,
                                                    color: activeTabId === field.id ? '#00A76F' : '#42526E'
                                                }} 
                                            />
                                            {fieldCount > 0 && (
                                                <Box sx={{ bgcolor: '#00A76F', color: 'white', borderRadius: '10px', px: 1, py: 0.2, fontSize: '11px', fontWeight: 600 }}>
                                                    {fieldCount}
                                                </Box>
                                            )}
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Box>

                    {/* Right Content */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1.5 }}>
                        {activeField && (
                        <TextField
                            fullWidth
                            size="small"
                            placeholder={`Tìm kiếm ${activeField?.label.toLowerCase() || ''}`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
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
                                        borderColor: '#00A76F !important',
                                        borderWidth: '2px !important',
                                    }
                                }
                            }}
                        />
                        )}

                        <List sx={{ mt: 1, overflowY: 'auto', flex: 1 }}>
                            {filteredOptions.map((option) => (
                                <ListItem key={option.value} disablePadding>
                                    <ListItemButton 
                                        role={undefined} 
                                        onClick={() => handleToggle(option.value)} 
                                        dense 
                                        sx={{ py: 0.5, px: 1, borderRadius: '3px' }}
                                    >
                                        <Checkbox
                                            edge="start"
                                            checked={activeSelected.indexOf(option.value) !== -1}
                                            tabIndex={-1}
                                            disableRipple
                                            size="small"
                                            sx={{
                                                p: 0.5,
                                                mr: 1,
                                                '&.Mui-checked': {
                                                    color: '#00A76F',
                                                }
                                            }}
                                        />
                                        {option.bgColor || option.color ? (
                                            <Box 
                                                sx={{ 
                                                    bgcolor: option.bgColor || '#DFE1E6', 
                                                    color: option.color || '#42526E', 
                                                    fontSize: '11px', 
                                                    fontWeight: 700, 
                                                    px: 1, 
                                                    py: 0.25, 
                                                    borderRadius: '3px',
                                                    textTransform: 'uppercase'
                                                }}
                                            >
                                                {option.label}
                                            </Box>
                                        ) : (
                                            <Box sx={{ fontSize: '14px', color: '#172B4D', py: 0.25 }}>
                                                {option.label}
                                            </Box>
                                        )}
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>

                        {activeField && activeField.type === 'date' && (
                            <Box sx={{ mt: 1, borderTop: '1px solid #DFE1E6', pt: 1.5 }}>
                                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
                                    <DatePicker
                                        label="Chọn ngày cụ thể"
                                        slotProps={{
                                            textField: { 
                                                size: 'small', 
                                                fullWidth: true,
                                                sx: {
                                                    '& fieldset': { borderColor: '#DFE1E6' },
                                                    '&:hover fieldset': { borderColor: '#B3BAC5 !important' },
                                                    '&.Mui-focused fieldset': { borderColor: '#00A76F !important', borderWidth: '2px !important' }
                                                }
                                            }
                                        }}
                                        onChange={(newValue) => {
                                            if (newValue) {
                                                const dateStr = newValue.format('YYYY-MM-DD');
                                                if (!activeSelected.includes(dateStr)) {
                                                    onFilterChange(activeTabId, [...activeSelected, dateStr]);
                                                }
                                            }
                                        }}
                                    />
                                </LocalizationProvider>
                            </Box>
                        )}
                    </Box>
                </Box>

                <Divider sx={{ borderColor: '#DFE1E6' }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: '#fff' }}>
                    <Button 
                        variant="text" 
                        onClick={onClearAll}
                        disabled={totalFilterCount === 0}
                        sx={{ textTransform: 'none', color: '#42526E', fontWeight: 500, minWidth: 'auto', p: '4px 8px', '&:hover': { bgcolor: '#091E420F' } }}
                    >
                        Xóa tất cả
                    </Button>
                </Box>
            </Popover>
        </>
    );
};
