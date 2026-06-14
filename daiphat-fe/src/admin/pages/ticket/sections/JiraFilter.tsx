import React, { useState, useMemo } from 'react';
import { Popover, Button, Box, Typography, Divider, List, ListItem, ListItemButton, ListItemText, Checkbox, TextField, InputAdornment } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';

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
}

interface JiraFilterProps {
    fields: FilterField[];
    selectedFilters: Record<string, string[]>;
    onFilterChange: (fieldId: string, values: string[]) => void;
    onClearAll: () => void;
}

export const JiraFilter: React.FC<JiraFilterProps> = ({ fields, selectedFilters, onFilterChange, onClearAll }) => {
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

    const activeField = fields.find(f => f.id === activeTabId) || fields[0];
    const activeSelected = selectedFilters[activeTabId] || [];

    const filteredOptions = useMemo(() => {
        if (!activeField) return [];
        if (!searchQuery) return activeField.options;
        return activeField.options.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [searchQuery, activeField]);

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Button
                    aria-describedby={id}
                    variant={totalFilterCount > 0 ? "contained" : "outlined"}
                    onClick={handleClick}
                    startIcon={<FilterListIcon sx={{ fontSize: '1.25rem', mr: '-4px' }} />}
                    sx={{
                        textTransform: 'none',
                        color: totalFilterCount > 0 ? '#fff' : '#42526E',
                        backgroundColor: totalFilterCount > 0 ? '#0052CC' : '#091E420F',
                        borderColor: totalFilterCount > 0 ? '#0052CC' : 'transparent',
                        fontWeight: 500,
                        height: '32px',
                        padding: '0 12px',
                        '&:hover': {
                            backgroundColor: totalFilterCount > 0 ? '#0065FF' : '#091E4224',
                            borderColor: totalFilterCount > 0 ? '#0065FF' : 'transparent',
                        },
                        boxShadow: 'none',
                        borderRadius: '3px'
                    }}
                >
                    Bộ lọc {totalFilterCount > 0 && <span style={{ marginLeft: '6px', background: '#fff', color: '#0052CC', borderRadius: '10px', padding: '0 6px', fontSize: '11px', fontWeight: 700 }}>{totalFilterCount}</span>}
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
                                                borderLeft: activeTabId === field.id ? '3px solid #0052CC' : '3px solid transparent',
                                                backgroundColor: activeTabId === field.id ? '#E6EFFC' : 'transparent',
                                                py: 0.75,
                                                px: 2,
                                                '&.Mui-selected': {
                                                    backgroundColor: '#E6EFFC',
                                                    '&:hover': {
                                                        backgroundColor: '#E6EFFC',
                                                    }
                                                }
                                            }}
                                        >
                                            <ListItemText 
                                                primary={field.label} 
                                                primaryTypographyProps={{ 
                                                    fontSize: '14px', 
                                                    fontWeight: activeTabId === field.id ? 600 : 400,
                                                    color: activeTabId === field.id ? '#0052CC' : '#42526E'
                                                }} 
                                            />
                                            {fieldCount > 0 && (
                                                <Box sx={{ bgcolor: '#0052CC', color: 'white', borderRadius: '10px', px: 1, py: 0.2, fontSize: '11px', fontWeight: 600 }}>
                                                    {fieldCount}
                                                </Box>
                                            )}
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </List>
                        <Box sx={{ mt: 'auto', p: 1 }}>
                            <Button 
                                startIcon={<span style={{ fontSize: '18px', fontWeight: 300, lineHeight: 1 }}>+</span>}
                                sx={{ textTransform: 'none', color: '#42526E', fontSize: '14px', fontWeight: 500, width: '100%', justifyContent: 'flex-start' }}
                            >
                                Thêm trường
                            </Button>
                        </Box>
                    </Box>

                    {/* Right Content */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1.5 }}>
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
                                        borderColor: '#4C9AFF !important',
                                        borderWidth: '2px !important',
                                    }
                                }
                            }}
                        />

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
                                                    color: '#0052CC',
                                                }
                                            }}
                                        />
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
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
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
