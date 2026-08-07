"use client";

import { useMemo, useState } from 'react';
import { Box, Button, FormControl, FormHelperText, Popover, Typography } from '@mui/material';
import { CalendarMonth } from '@mui/icons-material';
import { DayPicker } from 'react-day-picker';
import dayjs from 'dayjs';
import { vi } from 'date-fns/locale';
import 'react-day-picker/style.css';

const CALENDAR_STYLES = `
    .admin-date-picker .rdp-root {
        --rdp-accent-color: #FF3030 !important;
        --rdp-accent-background-color: rgba(255, 48, 48, 0.14) !important;
        --rdp-day-height: 36px !important;
        --rdp-day-width: 36px !important;
        margin: 0 !important;
    }
    .admin-date-picker .rdp-day_button::before,
    .admin-date-picker .rdp-day_button::after,
    .admin-date-picker .rdp-day::before,
    .admin-date-picker .rdp-day::after {
        content: none !important;
        display: none !important;
    }
    .admin-date-picker .rdp-day_button {
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
    .admin-date-picker .rdp-day_button:focus,
    .admin-date-picker .rdp-day:focus {
        outline: none !important;
    }
    .admin-date-picker .rdp-day_button:hover {
        background-color: rgba(255, 48, 48, 0.12) !important;
        border-radius: 50% !important;
    }
    .admin-date-picker .rdp-selected .rdp-day_button,
    .admin-date-picker .rdp-day_selected .rdp-day_button,
    .admin-date-picker .rdp-day_button[aria-selected="true"],
    .admin-date-picker button[aria-selected="true"].rdp-day_button {
        background-color: #FF3030 !important;
        color: #ffffff !important;
        font-weight: 700 !important;
        border-radius: 50% !important;
    }
    .admin-date-picker .rdp-nav button,
    .admin-date-picker .rdp-nav_button,
    .admin-date-picker .rdp-chevron {
        color: #FF3030 !important;
        fill: #FF3030 !important;
    }
    .admin-date-picker .rdp-nav button:hover,
    .admin-date-picker .rdp-nav_button:hover {
        background-color: rgba(255, 48, 48, 0.1) !important;
        border-radius: 50% !important;
    }
    .admin-date-picker .rdp-today:not(.rdp-selected):not(.rdp-day_selected) .rdp-day_button {
        font-weight: 700 !important;
        color: #FF3030 !important;
    }
    .admin-date-picker .rdp-weekday {
        color: var(--palette-text-secondary) !important;
        font-size: 0.75rem !important;
        font-weight: 600 !important;
    }
    .admin-date-picker .rdp-month_caption,
    .admin-date-picker .rdp-caption_label {
        font-size: 0.9375rem !important;
        font-weight: 700 !important;
        color: var(--palette-text-primary) !important;
    }
`;

const parseYmd = (value?: string) => {
    if (!value) return undefined;
    const parsed = dayjs(value, 'YYYY-MM-DD', true);
    return parsed.isValid() ? parsed.toDate() : undefined;
};

const formatDisplay = (value?: string) => {
    if (!value) return '';
    const parsed = dayjs(value, 'YYYY-MM-DD', true);
    return parsed.isValid() ? parsed.format('DD/MM/YYYY') : '';
};

export interface AdminDatePickerProps {
    value?: string;
    onChange: (value: string) => void;
    label?: string;
    min?: string;
    max?: string;
    error?: boolean;
    helperText?: string;
    helperTextColor?: 'error' | 'warning' | 'default';
    disabled?: boolean;
}

export const AdminDatePicker = ({
    value,
    onChange,
    label = 'Chọn ngày',
    min,
    max,
    error,
    helperText,
    helperTextColor = 'default',
    disabled = false,
}: AdminDatePickerProps) => {
    const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
    const [focused, setFocused] = useState(false);
    const [tempDate, setTempDate] = useState<Date | undefined>(undefined);

    const selectedDate = useMemo(() => parseYmd(value), [value]);
    const minDate = useMemo(() => parseYmd(min), [min]);
    const maxDate = useMemo(() => parseYmd(max), [max]);
    const displayValue = formatDisplay(value);
    const open = Boolean(anchorEl);
    const hasValue = !!value;

    const handleOpen = (event: React.MouseEvent<HTMLDivElement>) => {
        if (disabled) return;
        setTempDate(selectedDate);
        setAnchorEl(event.currentTarget);
        setFocused(true);
    };

    const handleClose = () => {
        setAnchorEl(null);
        setFocused(false);
    };

    const handleSelect = (date?: Date) => {
        setTempDate(date);
        if (!date) {
            onChange('');
            return;
        }
        onChange(dayjs(date).format('YYYY-MM-DD'));
        handleClose();
    };

    return (
        <Box>
            <FormControl fullWidth error={error} disabled={disabled}>
                <Box
                    onClick={handleOpen}
                    sx={{
                        position: 'relative',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        borderRadius: 'var(--shape-borderRadius)',
                        outline: focused
                            ? '2px solid var(--palette-text-primary)'
                            : '1px solid transparent',
                        outlineOffset: focused ? '-2px' : '-1px',
                        boxShadow: focused
                            ? undefined
                            : 'inset 0 0 0 1px rgba(145, 158, 171, 0.2)',
                        transition: 'box-shadow 0.15s ease, outline 0.15s ease',
                        opacity: disabled ? 0.6 : 1,
                        '&:hover': disabled
                            ? undefined
                            : {
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
                            color: error
                                ? 'error.main'
                                : focused
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
                {helperText ? (
                    <FormHelperText
                        sx={
                            helperTextColor === 'warning'
                                ? { color: 'warning.main' }
                                : helperTextColor === 'error'
                                  ? { color: 'error.main' }
                                  : undefined
                        }
                    >
                        {helperText}
                    </FormHelperText>
                ) : null}
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
                    },
                }}
            >
                <Box
                    className="admin-date-picker"
                    sx={{
                        backgroundColor: 'var(--palette-background-paper)',
                        p: 2,
                    }}
                >
                    <style>{CALENDAR_STYLES}</style>
                    <DayPicker
                        mode="single"
                        selected={tempDate}
                        onSelect={handleSelect}
                        locale={vi}
                        disabled={[
                            ...(minDate ? [{ before: minDate }] : []),
                            ...(maxDate ? [{ after: maxDate }] : []),
                        ]}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5, pt: 1.5, borderTop: '1px solid var(--palette-divider)' }}>
                        <Button
                            variant="text"
                            onClick={handleClose}
                            sx={{
                                color: 'var(--palette-text-secondary)',
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: '8px',
                            }}
                        >
                            Đóng
                        </Button>
                    </Box>
                </Box>
            </Popover>
        </Box>
    );
};
