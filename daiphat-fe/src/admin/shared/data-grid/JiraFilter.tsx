"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Popover, Button, Box, Typography, Divider, List, ListItem, ListItemButton, ListItemText, Checkbox, TextField, InputAdornment, CircularProgress } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import dayjs from "dayjs";
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { AdminDatePicker } from '@/admin/components/ui/AdminDatePicker';
import { DateRangePicker } from '@/admin/components/ui/DateRangePicker';

dayjs.extend(customParseFormat);

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
    /** `date` = AdminDatePicker; `dateRange` = DateRangePicker (shared admin calendar utils). */
    type?: 'date' | 'dateRange';
    /** YYYY-MM-DD — chặn chọn ngày trước mốc này (AdminDatePicker). */
    minDate?: string;
    /** false → ẩn ô tìm kiếm trong tab này (mặc định hiện). */
    searchable?: boolean;
    /**
     * Server-driven options: skip local label filter; parent updates `options`
     * from {@link JiraFilterProps.onFieldSearch} / {@link JiraFilterProps.onFieldLoadMore}.
     */
    asyncSearch?: boolean;
    loading?: boolean;
    hasMore?: boolean;
}

interface JiraFilterProps {
    fields: FilterField[];
    selectedFilters: Record<string, string[]>;
    onFilterChange: (fieldId: string, values: string[]) => void;
    onClearAll: () => void;
    trigger?: (props: { onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; totalFilterCount: number }) => React.ReactNode;
    /** Debounced when the active field has `asyncSearch`. */
    onFieldSearch?: (fieldId: string, query: string) => void;
    onFieldLoadMore?: (fieldId: string) => void;
}

const isRangeToken = (value: string) =>
    value.startsWith('month:') || value.startsWith('quarter:') || value.startsWith('range:');

const isoToDisplay = (iso?: string) => {
    if (!iso) return '';
    const parsed = dayjs(iso, 'YYYY-MM-DD', true);
    return parsed.isValid() ? parsed.format('DD/MM/YYYY') : '';
};

const displayToIso = (display?: string) => {
    if (!display) return '';
    const parsed = dayjs(display, 'DD/MM/YYYY', true);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '';
};

const formatSelectedDateLabel = (value: string) => {
    if (isRangeToken(value)) {
        const [, from, to] = value.split(':');
        if (from && to) {
            return from === to
                ? `Đã chọn: ${isoToDisplay(from)}`
                : `Đã chọn: ${isoToDisplay(from)} – ${isoToDisplay(to)}`;
        }
    }
    return `Đã chọn: ${dayjs(value).format('DD/MM/YYYY')}`;
};

/** Chặn đóng JiraFilter khi đang tương tác lịch util (AdminDatePicker / DateRangePicker). */
const isInsideDatePickerPortal = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    return Boolean(
        target.closest(
            [
                '.admin-date-picker',
                '.custom-date-range',
                '.rdp-root',
                '.MuiPickersPopper-root',
                '.MuiPickersLayout-root',
                '.MuiDateCalendar-root',
            ].join(', '),
        ),
    );
};

export const JiraFilter: React.FC<JiraFilterProps> = ({
    fields,
    selectedFilters,
    onFilterChange,
    onClearAll,
    trigger,
    onFieldSearch,
    onFieldLoadMore,
}) => {
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [activeTabId, setActiveTabId] = useState<string>(fields[0]?.id || '');
    const [searchQuery, setSearchQuery] = useState('');
    const [customDateValue, setCustomDateValue] = useState('');

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (anchorEl) {
            handleClose();
            return;
        }
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
        setSearchQuery('');
        setCustomDateValue('');
    };

    const open = Boolean(anchorEl);
    const id = open ? 'jira-filter-popover' : undefined;

    const resolvedActiveTabId = fields.some((field) => field.id === activeTabId)
        ? activeTabId
        : (fields[0]?.id || '');
    const activeField = fields.find(f => f.id === resolvedActiveTabId);
    const activeSelected = selectedFilters[resolvedActiveTabId] || [];

    useEffect(() => {
        if (!activeField?.asyncSearch || !onFieldSearch) return;
        const timer = window.setTimeout(() => {
            onFieldSearch(activeField.id, searchQuery);
        }, 350);
        return () => window.clearTimeout(timer);
    }, [activeField?.asyncSearch, activeField?.id, onFieldSearch, searchQuery]);

    const filteredOptions = useMemo(() => {
        if (!activeField) return [];
        let baseOptions = activeField.options;
        if (searchQuery && !activeField.asyncSearch) {
            baseOptions = baseOptions.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        if (activeField.type === 'date' || activeField.type === 'dateRange') {
            const customSelected = activeSelected.filter(d => !activeField.options.find(o => o.value === d));
            const customOptions = customSelected.map(d => ({
                value: d,
                label: formatSelectedDateLabel(d),
                color: '#FF3030',
                bgColor: 'rgba(255, 48, 48, 0.08)'
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

        onFilterChange(resolvedActiveTabId, newSelected);
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
                            backgroundColor: totalFilterCount > 0 ? '#FF3030' : '#091E420F',
                            borderColor: totalFilterCount > 0 ? '#FF3030' : 'transparent',
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
                        Bộ lọc {totalFilterCount > 0 && <span style={{ marginLeft: '6px', background: '#fff', color: '#FF3030', borderRadius: '10px', padding: '0 6px', fontSize: '11px', fontWeight: 700 }}>{totalFilterCount}</span>}
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
                disableScrollLock
                onClose={(event, reason) => {
                    // Escape luôn đóng; click ngoài chỉ bỏ qua nếu đang tương tác với lịch util
                    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
                        if (reason === 'backdropClick' && isInsideDatePickerPortal(((event as { target?: Element })?.target as Element | null) ?? null)) {
                            return;
                        }
                        handleClose();
                        return;
                    }
                    handleClose();
                }}
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
                                const isActive = resolvedActiveTabId === field.id;
                                return (
                                    <ListItem disablePadding key={field.id}>
                                        <ListItemButton 
                                            selected={isActive}
                                            onClick={() => {
                                                setActiveTabId(field.id);
                                                setSearchQuery('');
                                            }}
                                            sx={{
                                                borderLeft: isActive ? '3px solid #FF3030' : '3px solid transparent',
                                                backgroundColor: isActive ? 'rgba(255, 48, 48, 0.08)' : 'transparent',
                                                py: 0.75,
                                                px: 2,
                                                '&:hover': {
                                                    backgroundColor: isActive ? 'rgba(255, 48, 48, 0.12)' : 'rgba(9, 30, 66, 0.04)',
                                                },
                                                '&.Mui-selected': {
                                                    backgroundColor: 'rgba(255, 48, 48, 0.08)',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(255, 48, 48, 0.12)',
                                                    }
                                                }
                                            }}
                                        >
                                            <ListItemText 
                                                primary={field.label} 
                                                primaryTypographyProps={{ 
                                                    fontSize: '14px', 
                                                    fontWeight: isActive ? 600 : 400,
                                                    color: isActive ? '#FF3030' : '#42526E'
                                                }} 
                                            />
                                            {fieldCount > 0 && (
                                                <Box sx={{ bgcolor: '#FF3030', color: 'white', borderRadius: '10px', px: 1, py: 0.2, fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>
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
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1.5, minWidth: 0, overflow: 'hidden' }}>
                        {activeField && activeField.searchable !== false && (
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
                                        borderColor: '#FF3030 !important',
                                        borderWidth: '2px !important',
                                    }
                                }
                            }}
                        />
                        )}

                        <List sx={{ mt: 1, overflowY: 'auto', flex: 1, minHeight: 0 }}>
                            {filteredOptions.map((option) => (
                                <ListItem key={option.value} disablePadding>
                                    <ListItemButton 
                                        role={undefined} 
                                        onClick={() => handleToggle(option.value)} 
                                        dense 
                                        sx={{
                                            py: 0.5,
                                            px: 1,
                                            borderRadius: '3px',
                                            '&:hover': {
                                                backgroundColor: 'rgba(9, 30, 66, 0.04)',
                                            },
                                        }}
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
                                                color: '#6B778C',
                                                '&.Mui-checked': {
                                                    color: '#FF3030',
                                                },
                                                '&:hover': {
                                                    backgroundColor: 'transparent',
                                                },
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

                            {activeField?.asyncSearch && activeField.loading && filteredOptions.length === 0 ? (
                                <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
                                    <CircularProgress size={22} />
                                </Box>
                            ) : null}

                            {activeField?.asyncSearch && !activeField.loading && filteredOptions.length === 0 ? (
                                <Typography variant="body2" sx={{ color: '#6B778C', textAlign: 'center', py: 2.5 }}>
                                    Không tìm thấy kết quả
                                </Typography>
                            ) : null}

                            {activeField?.asyncSearch && activeField.hasMore ? (
                                <Box sx={{ pt: 1, pb: 0.5, display: 'flex', justifyContent: 'center' }}>
                                    <Button
                                        size="small"
                                        variant="text"
                                        disabled={activeField.loading}
                                        onClick={() => onFieldLoadMore?.(activeField.id)}
                                        sx={{ textTransform: 'none', fontWeight: 600, color: '#42526E' }}
                                    >
                                        {activeField.loading ? 'Đang tải…' : 'Tải thêm'}
                                    </Button>
                                </Box>
                            ) : null}
                        </List>

                        {activeField && activeField.type === 'date' && (
                            <Box sx={{ mt: 1, borderTop: '1px solid #DFE1E6', pt: 1.5, flexShrink: 0 }}>
                                <AdminDatePicker
                                    label="Chọn ngày cụ thể"
                                    value={customDateValue || activeSelected.find((value) => !isRangeToken(value) && !activeField.options.some((opt) => opt.value === value)) || ''}
                                    min={activeField.minDate}
                                    onChange={(dateStr) => {
                                        setCustomDateValue(dateStr);
                                        if (!dateStr) return;
                                        if (activeField.minDate && dateStr < activeField.minDate) return;
                                        if (!activeSelected.includes(dateStr)) {
                                            onFilterChange(resolvedActiveTabId, [...activeSelected, dateStr]);
                                        }
                                    }}
                                />
                            </Box>
                        )}

                        {activeField && activeField.type === 'dateRange' && (() => {
                            const token = activeSelected.find(isRangeToken);
                            const plainDates = activeSelected.filter((value) => !isRangeToken(value)).sort();
                            let startDate = '';
                            let endDate = '';
                            if (token) {
                                const [, from, to] = token.split(':');
                                startDate = isoToDisplay(from);
                                endDate = isoToDisplay(to || from);
                            } else if (plainDates.length) {
                                startDate = isoToDisplay(plainDates[0]);
                                endDate = isoToDisplay(plainDates[plainDates.length - 1]);
                            }

                            return (
                                <Box sx={{ mt: 1, borderTop: '1px solid #DFE1E6', pt: 1.5, flexShrink: 0 }}>
                                    <DateRangePicker
                                        label="Khoảng thời gian"
                                        startDate={startDate}
                                        endDate={endDate}
                                        onChange={(range) => {
                                            const from = displayToIso(range.startDate);
                                            const to = displayToIso(range.endDate || range.startDate);
                                            if (!from || !to) {
                                                onFilterChange(resolvedActiveTabId, []);
                                                return;
                                            }
                                            onFilterChange(resolvedActiveTabId, [`range:${from}:${to}`]);
                                        }}
                                    />
                                </Box>
                            );
                        })()}
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
                    <Button
                        variant="text"
                        onClick={handleClose}
                        startIcon={<CloseIcon sx={{ fontSize: '16px !important' }} />}
                        sx={{ textTransform: 'none', color: '#42526E', fontWeight: 600, minWidth: 'auto', p: '4px 8px', '&:hover': { bgcolor: '#091E420F' } }}
                    >
                        Đóng
                    </Button>
                </Box>
            </Popover>
        </>
    );
};
