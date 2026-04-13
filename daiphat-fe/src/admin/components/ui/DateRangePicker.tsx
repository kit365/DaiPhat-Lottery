import { useState, useMemo } from 'react';
import { Popover, Box, FormControl, FormHelperText, Typography } from '@mui/material';
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
        setAnchorEl(event.currentTarget);
        setFocused(true);
    };

    const handleClose = () => {
        setAnchorEl(null);
        setFocused(false);
    };

    const handleSelect = (range: DateRange | undefined) => {
        if (!range) {
            onChange({ startDate: "", endDate: "" });
            return;
        }
        const start = range.from ? dayjs(range.from).format("DD/MM/YYYY") : "";
        const end = range.to ? dayjs(range.to).format("DD/MM/YYYY") : "";
        onChange({ startDate: start, endDate: end });
        // Close after selecting both
        if (range.from && range.to) {
            setTimeout(() => handleClose(), 200);
        }
    };

    const displayValue = useMemo(() => {
        if (!startDate && !endDate) return "";
        if (startDate && !endDate) return `${startDate} → ...`;
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
                        // Mimics MUI OutlinedInput exactly: transparent → hover gray → focus dark
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
                    {/* Floating label */}
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
                    sx={{
                        backgroundColor: 'var(--palette-background-paper)',
                        p: 1,
                    }}
                >
                    <style>{`
                        .rdp-root {
                            --rdp-accent-color: var(--palette-primary-main) !important;
                            --rdp-accent-background-color: var(--palette-primary-lighter) !important;
                            --rdp-today-color: var(--palette-primary-main) !important;
                            --rdp-range-start-color: #fff !important;
                            --rdp-range-end-color: #fff !important;
                            --rdp-range-start-background: var(--palette-primary-main) !important;
                            --rdp-range-end-background: var(--palette-primary-main) !important;
                            --rdp-range-middle-background-color: var(--palette-primary-lighter) !important;
                            --rdp-range-middle-color: var(--palette-primary-dark) !important;
                            margin: 0 !important;
                        }
                        .rdp-day_button:focus {
                            outline: none !important;
                        }
                        .rdp-weekday {
                            color: var(--palette-text-secondary) !important;
                            font-size: 0.75rem !important;
                            font-weight: 600 !important;
                        }
                        .rdp-month_caption {
                            font-size: 0.9375rem !important;
                            font-weight: 700 !important;
                            color: var(--palette-text-primary) !important;
                        }
                        .rdp-nav button {
                            color: var(--palette-primary-main) !important;
                        }
                        .rdp-day_button {
                            font-size: 0.8125rem !important;
                            font-weight: 400 !important;
                            border-radius: 50% !important;
                        }
                        .rdp-today .rdp-day_button {
                            font-weight: 700 !important;
                        }
                    `}</style>
                    <DayPicker
                        mode="range"
                        selected={selectedRange}
                        onSelect={handleSelect}
                        numberOfMonths={2}
                        locale={vi}
                    />
                </Box>
            </Popover>
        </Box>
    );
};
