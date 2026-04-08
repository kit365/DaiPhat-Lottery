import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import debounce from 'lodash/debounce';

interface SearchProps {
    maxWidth?: string | number;
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
}

export const Search = ({ maxWidth = 260, placeholder, value, onChange }: SearchProps) => {
    const { t } = useTranslation();
    const [internalValue, setInternalValue] = useState(value || '');
    const displayPlaceholder = placeholder || t("admin.common.search");

    // Sync internal value with prop value (e.g. when cleared from outside)
    useEffect(() => {
        setInternalValue(value || '');
    }, [value]);

    // Create a debounced version of the onChange callback
    const debouncedOnChange = useCallback(
        debounce((val: string) => {
            onChange?.(val);
        }, 500),
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
                        bgcolor: 'white',
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
