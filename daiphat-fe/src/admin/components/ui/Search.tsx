"use client";

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import { Icon } from '@/admin/components/ui/AdminIcon';
import { useState, useEffect, useCallback, useRef } from 'react';

interface SearchProps {
    maxWidth?: string | number;
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
}

export const Search = ({ maxWidth = 260, placeholder, value, onChange }: SearchProps) => {
    const [internalValue, setInternalValue] = useState(value || '');
    const displayPlaceholder = placeholder || 'Tìm kiếm...';

    // Sync internal value with prop value (e.g. when cleared from outside)
    useEffect(() => {
        setInternalValue(value || '');
    }, [value]);

    // Create a debounced version of the onChange callback
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const debouncedOnChange = useCallback(
        (val: string) => {
            clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => {
                onChange?.(val);
            }, 500);
        },
        [onChange]
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setInternalValue(newVal);
        debouncedOnChange(newVal);
    };

    return (
        <Box sx={{ width: '100%', maxWidth: maxWidth }}>
            <TextField
                fullWidth
                variant="outlined"
                placeholder={displayPlaceholder}
                value={internalValue}
                onChange={handleInputChange}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <Icon icon="eva:search-fill" width="20" height="20" color="#637381" />
                            </InputAdornment>
                        ),
                    },
                }}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        fontSize: "0.9375rem",
                        paddingLeft: "14px",
                        paddingRight: "14px",
                        bgcolor: 'var(--palette-background-paper)',
                        '& fieldset': {
                            borderColor: 'rgba(145, 158, 171, 0.2)',
                        },
                        '&:hover fieldset': {
                            borderColor: 'rgba(145, 158, 171, 0.4)',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: '#1C252E',
                            borderWidth: '1px',
                        },
                    },
                    '& .MuiOutlinedInput-input': {
                        py: '16px',
                        '&::placeholder': {
                            color: '#919EAB',
                            opacity: 1,
                        },
                    },
                }}
            />
        </Box>
    )
}
