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
            const parsed = dayjs(d, ['YYYY-MM-DD', 'DD/MM/YYYY'], true);
            if (parsed.isValid()) return parsed.toDate();
            const parts = d.split('/');
            if (parts.length === 3) {
                return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
            return undefined;
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

    const formatDisplay = (d?: string) => {
        if (!d) return "";
        const parsed = dayjs(d, ['YYYY-MM-DD', 'DD/MM/YYYY']);
        return parsed.isValid() ? parsed.format('DD/MM/YYYY') : d;
    };

    const displayValue = useMemo(() => {
        if (!startDate && !endDate) return "";
        const startDisplay = formatDisplay(startDate);
        const endDisplay = formatDisplay(endDate);
        if (startDisplay === endDisplay) return startDisplay;
        if (startDisplay && !endDisplay) return startDisplay;
        return `${startDisplay} → ${endDisplay}`;
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
                        p: 2,
                    }}
                >
                    <style>{`
                        .custom-date-range .rdp-root {
                            --rdp-accent-color: #FF3030 !important;
                            --rdp-accent-background-color: rgba(255, 48, 48, 0.14) !important;
                            --rdp-range_middle-background-color: rgba(255, 48, 48, 0.14) !important;
                            --rdp-range_middle-color: #C62828 !important;
                            --rdp-day-height: 36px !important;
                            --rdp-day-width: 36px !important;
                            margin: 0 !important;
                        }
                        /* Disable pseudo-elements that cause number offset */
                        .custom-date-range .rdp-day_button::before,
                        .custom-date-range .rdp-day_button::after,
                        .custom-date-range .rdp-day::before,
                        .custom-date-range .rdp-day::after {
                            content: none !important;
                            display: none !important;
                        }
                        /* Base Day Button */
                        .custom-date-range .rdp-day_button {
                            width: 36px !important;
                            height: 36px !important;
                            min-width: 36px !important;
                            min-height: 36px !important;
                            line-height: 36px !important;
                            border-radius: 50% !important;
                            font-size: 0.875rem !important;
                            font-weight: 500 !important;
                            text-align: center !important;
                            padding: 0 !important;
                            margin: 0 auto !important;
                            position: relative !important;
                            box-sizing: border-box !important;
                            color: var(--palette-text-primary) !important;
                        }
                        .custom-date-range .rdp-day_button:focus, 
                        .custom-date-range .rdp-day:focus {
                            outline: none !important;
                        }
                        .custom-date-range .rdp-day_button:hover {
                            background-color: rgba(255, 48, 48, 0.12) !important;
                            border-radius: 50% !important;
                        }
                        /* Start & End selected day circle */
                        .custom-date-range .rdp-range_start .rdp-day_button,
                        .custom-date-range .rdp-range_end .rdp-day_button,
                        .custom-date-range .rdp-selected .rdp-day_button,
                        .custom-date-range .rdp-day_selected .rdp-day_button,
                        .custom-date-range .rdp-day_button[aria-selected="true"],
                        .custom-date-range button[aria-selected="true"].rdp-day_button {
                            background-color: #FF3030 !important;
                            color: #ffffff !important;
                            font-weight: 700 !important;
                            border-radius: 50% !important;
                        }
                        /* Range Middle band */
                        .custom-date-range .rdp-range_middle {
                            background-color: rgba(255, 48, 48, 0.14) !important;
                        }
                        .custom-date-range .rdp-range_middle .rdp-day_button {
                            background-color: transparent !important;
                            color: #C62828 !important;
                            font-weight: 600 !important;
                            border-radius: 0 !important;
                        }
                        /* Navigation Arrows & Icons */
                        .custom-date-range .rdp-nav button,
                        .custom-date-range .rdp-nav_button,
                        .custom-date-range .rdp-chevron {
                            color: #FF3030 !important;
                            fill: #FF3030 !important;
                        }
                        .custom-date-range .rdp-nav button:hover,
                        .custom-date-range .rdp-nav_button:hover {
                            background-color: rgba(255, 48, 48, 0.1) !important;
                            border-radius: 50% !important;
                        }
                        /* Today Indicator - không áp dụng khi đã được chọn */
                        .custom-date-range .rdp-today:not(.rdp-range_start):not(.rdp-range_end):not(.rdp-selected):not(.rdp-day_selected) .rdp-day_button {
                            font-weight: 700 !important;
                            color: #FF3030 !important;
                        }
                        /* Weekday Header */
                        .custom-date-range .rdp-weekday {
                            color: var(--palette-text-secondary) !important;
                            font-size: 0.75rem !important;
                            font-weight: 600 !important;
                        }
                        /* Month Title */
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
                                bgcolor: '#FF3030',
                                color: '#ffffff',
                                fontWeight: 700,
                                borderRadius: '8px',
                                textTransform: 'none',
                                px: 2.5,
                                '&:hover': {
                                    bgcolor: '#E02828',
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
