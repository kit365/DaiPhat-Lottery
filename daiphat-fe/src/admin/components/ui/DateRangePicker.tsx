"use client";

import { useState, useMemo } from 'react';
import { Popover, Box, FormControl, FormHelperText, Typography, Button } from '@mui/material';
import { CalendarMonth } from '@mui/icons-material';
import { DayPicker, DateRange } from 'react-day-picker';
import dayjs from 'dayjs';
import { vi } from 'date-fns/locale';
import 'react-day-picker/style.css';

interface DateRangePickerProps {
    startDate?: string;
    endDate?: string;
    onChange: (range: { startDate: string; endDate: string }) => void;
    label?: string;
    error?: boolean;
    helperText?: string;
}

export const DateRangePicker = ({
    startDate,
    endDate,
    onChange,
    label = "Thời gian hiệu lực",
    error,
    helperText
}: DateRangePickerProps) => {
    const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
    const [focused, setFocused] = useState(false);
    const [tempRange, setTempRange] = useState<DateRange | undefined>(undefined);

    const selectedRange: DateRange | undefined = useMemo(() => {
        if (!startDate && !endDate) return undefined;
        const parseDate = (d?: string) => {
            if (!d) return undefined;
            const parts = d.split('/');
            if (parts.length !== 3) return undefined;
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        };
        return { from: parseDate(startDate), to: parseDate(endDate) };
    }, [startDate, endDate]);

    const handleOpen = (event: React.MouseEvent<HTMLDivElement>) => {
        setTempRange(selectedRange);
        setAnchorEl(event.currentTarget);
        setFocused(true);
    };

    const handleClose = () => {
        setAnchorEl(null);
        setFocused(false);
        if (!tempRange || !tempRange.from) {
            const today = dayjs().format("DD/MM/YYYY");
            setTempRange({ from: new Date(), to: new Date() });
            onChange({ startDate: today, endDate: today });
        }
    };

    const handleSelect = (range: DateRange | undefined) => {
        setTempRange(range);
        if (!range || !range.from) {
            onChange({ startDate: "", endDate: "" });
        } else {
            const start = dayjs(range.from).format("DD/MM/YYYY");
            const end = range.to ? dayjs(range.to).format("DD/MM/YYYY") : start;
            onChange({ startDate: start, endDate: end });
        }
    };

    const handleConfirm = () => {
        handleClose();
    };

    const displayValue = useMemo(() => {
        if (!startDate && !endDate) return "";
        if (startDate === endDate) return startDate;
        if (startDate && !endDate) return startDate;
        return `${startDate} → ${endDate}`;
    }, [startDate, endDate]);

    const open = Boolean(anchorEl);
    const hasValue = !!(startDate || endDate);

    return (
        <Box>
            <FormControl fullWidth error={error}>
                <Box
                    onClick={handleOpen}
                    sx={{
                        position: 'relative',
                        cursor: 'pointer',
                        borderRadius: 'var(--shape-borderRadius)',
                        outline: focused
                            ? '2px solid var(--palette-text-primary)'
                            : '1px solid transparent',
                        outlineOffset: focused ? '-2px' : '-1px',
                        boxShadow: focused
                            ? undefined
                            : 'inset 0 0 0 1px rgba(145, 158, 171, 0.2)',
                        transition: 'box-shadow 0.15s ease, outline 0.15s ease',
                        '&:hover': {
                            boxShadow: focused ? undefined : 'inset 0 0 0 1px rgba(145, 158, 171, 0.8)',
                        },
                        backgroundColor: 'var(--palette-background-paper)',
                        px: '14px',
                        py: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        minHeight: '56px',
                    }}
                >
                    <Typography
                        component="label"
                        sx={{
                            position: 'absolute',
                            top: hasValue || focused ? '-9px' : '50%',
                            left: '10px',
                            transform: hasValue || focused ? 'translateY(0)' : 'translateY(-50%)',
                            fontSize: hasValue || focused ? '0.75rem' : '0.9375rem',
                            fontWeight: focused ? 600 : 400,
                            color: focused
                                ? 'var(--palette-text-primary)'
                                : 'var(--palette-text-disabled)',
                            transition: 'all 0.15s',
                            background: 'var(--palette-background-paper)',
                            px: '4px',
                            pointerEvents: 'none',
                            lineHeight: 1,
                        }}
                    >
                        {label}
                    </Typography>
                    <CalendarMonth sx={{ fontSize: '1.25rem', color: 'var(--palette-text-disabled)', flexShrink: 0 }} />
                    <Typography
                        sx={{
                            fontSize: '0.9375rem',
                            color: hasValue ? 'var(--palette-text-primary)' : 'var(--palette-text-disabled)',
                            userSelect: 'none',
                        }}
                    >
                        {displayValue || '\u00A0'}
                    </Typography>
                </Box>
                {helperText && <FormHelperText>{helperText}</FormHelperText>}
            </FormControl>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                sx={{
                    mt: 0.5,
                    '& .MuiPaper-root': {
                        borderRadius: '16px',
                        boxShadow: 'var(--customShadows-z24)',
                        border: '1px solid var(--palette-divider)',
                        overflow: 'hidden',
                    }
                }}
            >
                <Box
                    className="custom-date-range"
                    sx={{
                        backgroundColor: 'var(--palette-background-paper)',
                        p: 1.5,
                    }}
                >
                    <style>{`
                        .custom-date-range .rdp-root {
                            --rdp-accent-color: #00A76F !important;
                            --rdp-accent-background-color: rgba(0, 167, 111, 0.14) !important;
                            --rdp-range_middle-background-color: rgba(0, 167, 111, 0.14) !important;
                            --rdp-range_middle-color: #006C45 !important;
                            --rdp-range_start-background-color: #00A76F !important;
                            --rdp-range_start-color: #ffffff !important;
                            --rdp-range_end-background-color: #00A76F !important;
                            --rdp-range_end-color: #ffffff !important;
                            margin: 0 !important;
                        }
                        .custom-date-range .rdp-day_button:focus, 
                        .custom-date-range .rdp-day:focus {
                            outline: none !important;
                        }
                        .custom-date-range .rdp-day_button:hover {
                            background-color: rgba(0, 167, 111, 0.12) !important;
                            border-radius: 50% !important;
                        }
                        /* Start & End Day styling */
                        .custom-date-range .rdp-day_selected,
                        .custom-date-range .rdp-selected,
                        .custom-date-range .rdp-range_start,
                        .custom-date-range .rdp-range_end,
                        .custom-date-range .rdp-day_selected .rdp-day_button,
                        .custom-date-range [aria-selected="true"] {
                            background-color: #00A76F !important;
                            color: #ffffff !important;
                            font-weight: 700 !important;
                        }
                        .custom-date-range .rdp-range_start,
                        .custom-date-range .rdp-range_start .rdp-day_button,
                        .custom-date-range td:has(.rdp-range_start) {
                            border-top-left-radius: 50% !important;
                            border-bottom-left-radius: 50% !important;
                        }
                        .custom-date-range .rdp-range_end,
                        .custom-date-range .rdp-range_end .rdp-day_button,
                        .custom-date-range td:has(.rdp-range_end) {
                            border-top-right-radius: 50% !important;
                            border-bottom-right-radius: 50% !important;
                        }
                        /* Range Middle styling */
                        .custom-date-range .rdp-range_middle,
                        .custom-date-range .rdp-range_middle .rdp-day_button,
                        .custom-date-range td:has(.rdp-range_middle) {
                            background-color: rgba(0, 167, 111, 0.14) !important;
                            color: #006C45 !important;
                            font-weight: 600 !important;
                            border-radius: 0 !important;
                        }
                        /* Navigation Arrows & Icons */
                        .custom-date-range .rdp-nav button,
                        .custom-date-range .rdp-nav_button,
                        .custom-date-range .rdp-chevron,
                        .custom-date-range .rdp-button_next,
                        .custom-date-range .rdp-button_previous {
                            color: #00A76F !important;
                            fill: #00A76F !important;
                        }
                        .custom-date-range .rdp-nav button:hover,
                        .custom-date-range .rdp-nav_button:hover {
                            background-color: rgba(0, 167, 111, 0.1) !important;
                            border-radius: 50% !important;
                        }
                        /* Today Indicator */
                        .custom-date-range .rdp-today {
                            font-weight: 700 !important;
                            color: #00A76F !important;
                        }
                        /* Weekday Labels (Th 2, Th 3...) */
                        .custom-date-range .rdp-weekday {
                            color: var(--palette-text-secondary) !important;
                            font-size: 0.75rem !important;
                            font-weight: 600 !important;
                        }
                        /* Month Header (Tháng Tám 2026...) */
                        .custom-date-range .rdp-month_caption, 
                        .custom-date-range .rdp-caption_label {
                            font-size: 0.9375rem !important;
                            font-weight: 700 !important;
                            color: var(--palette-text-primary) !important;
                        }
                    `}</style>
                    <DayPicker
                        mode="range"
                        selected={tempRange}
                        onSelect={handleSelect}
                        numberOfMonths={2}
                        locale={vi}
                        min={1}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pt: 1.5, borderTop: '1px solid var(--palette-divider)' }}>
                        <Button
                            variant="text"
                            onClick={handleClose}
                            sx={{
                                mr: 1,
                                color: 'var(--palette-text-secondary)',
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: '8px',
                            }}
                        >
                            Hủy
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleConfirm}
                            sx={{
                                bgcolor: '#00A76F',
                                color: '#ffffff',
                                fontWeight: 700,
                                borderRadius: '8px',
                                textTransform: 'none',
                                px: 2.5,
                                '&:hover': {
                                    bgcolor: '#00875A',
                                },
                            }}
                        >
                            Xác nhận
                        </Button>
                    </Box>
                </Box>
            </Popover>
        </Box>
    );
};
