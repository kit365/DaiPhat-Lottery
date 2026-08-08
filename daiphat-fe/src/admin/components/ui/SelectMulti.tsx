"use client";

import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import { memo, useCallback, useMemo, useState } from 'react';

// Types
interface Option {
    value: string;
    label: string;
    disabled?: boolean;
}

interface SelectMultiProps {
    label: string;
    options: Option[];
    sx?: any;
    value?: string[];
    onChange?: (value: string[]) => void;
    disabled?: boolean;
}

// CSS
const FORM_CONTROL_STYLE = { width: "200px" };

const LABEL_STYLE = {
    fontSize: "0.9375rem",
    color: "#637381",

    "&.MuiInputLabel-shrink": {
        color: "#919eab", // Màu của chữ khi đã nằm trên viền
        fontWeight: 600,
    },
};

const SELECT_SX = {
    fontSize: "0.9375rem",
    borderRadius: "8px"
};

const MENU_PROPS = {
    PaperProps: {
        sx: {
            borderRadius: '10px',
            boxShadow:
                '0px 5px 5px -3px rgba(145 158 171 / 20%), ' +
                '0px 8px 10px 1px rgba(145 158 171 / 14%), ' +
                '0px 3px 14px 2px rgba(145 158 171 / 12%)',
            color: "#1C252E",
            backgroundImage: "url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSJ1cmwoI3BhaW50MF9yYWRpYWxfNDQ2NF81NTMzOCkiIGZpbGwtb3BhY2l0eT0iMC4xIi8+CjxkZWZzPgo8cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50MF9yYWRpYWxfNDQ2NF81NTMzOCIgY3g9IjAiIGN5PSIwIiByPSIxIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSgxMjAgMS44MTgxMmUtMDUpIHJvdGF0ZSgtNDUpIHNjYWxlKDEyMy4yNSkiPgo8c3RvcCBzdG9wLWNvbG9yPSIjMDBCOEQ5Ii8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAwQjhEOSIgc3RvcC1vcGFjaXR5PSIwIi8+CjwvcmFkaWFsR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+Cg==), url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSJ1cmwoI3BhaW50MF9yYWRpYWxfNDQ2NF81NTMzNykiIGZpbGwtb3BhY2l0eT0iMC4xIi8+CjxkZWZzPgo8cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50MF9yYWRpYWxfNDQ2NF81NTMzNyIgY3g9IjAiIGN5PSIwIiByPSIxIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSgwIDEyMCkgcm90YXRlKDEzNSkgc2NhbGUoMTIzLjI1KSI+CjxzdG9wIHN0b3AtY29sb3I9IiNGRjU2MzAiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjRkY1NjMwIiBzdG9wLW9wYWNpdHk9IjAiLz4KPC9yYWRpYWxHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4K)",
            backgroundSize: '50%, 50%',
            backgroundRepeat: 'no-repeat',
            backdropFilter: 'blur(20px)',
            backgroundColor: '#ffffffe6',
            backgroundPosition: 'right top, left bottom',
        },
    },
};

const APPLY_BUTTON = {
    marginBottom: "0px",
    backgroundColor: "#919eab14",
    fontWeight: "600",
    justifyContent: "center",
    border: "1px solid #919eab29"
}

const CHECKBOX_STYLE = {
    marginLeft: '-4px',
    marginRight: '4px',
    color: '#919EAB',
    '&.Mui-checked': {
        color: 'var(--palette-primary-main, #FF3030)',
    },
};

export const SelectMulti = memo(({ label, options, sx, value, onChange, disabled }: SelectMultiProps) => {
    const [internalValues, setInternalValues] = useState<string[]>([]);

    // Use controlled value if provided, otherwise use internal state
    const selectedValues = value !== undefined ? value : internalValues;

    const handleChange = useCallback((event: SelectChangeEvent<string[]>) => {
        const { target: { value: newValue } } = event;
        const result = typeof newValue === 'string' ? newValue.split(',') : newValue;

        // Chỉ giữ lại các giá trị hợp lệ nằm trong danh sách options
        const validValues = result.filter(v => options.some(opt => opt.value === v));

        if (onChange) {
            onChange(validValues);
        } else {
            setInternalValues(validValues);
        }
    }, [onChange, options]);

    const handleClose = useCallback(() => {
        setTimeout(() => {
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        }, 0);
    }, []);

    const displayValue = useMemo(() => (selected: string[]) =>
        options
            .filter(opt => selected.includes(opt.value))
            .map(opt => opt.label)
            .join(', ')
        , [options]);

    return (
        <FormControl
            sx={{ ...FORM_CONTROL_STYLE, ...sx }}
            disabled={disabled}
        >
            {selectedValues.length > 0 && (
                <InputLabel
                    id="select-multi-label"
                    shrink
                    sx={LABEL_STYLE}
                >
                    {label}
                </InputLabel>
            )}
            <Select
                multiple
                value={selectedValues}
                label={selectedValues.length > 0 ? label : undefined}
                onChange={handleChange}
                onClose={handleClose}
                displayEmpty
                renderValue={(selected) => {
                    const sel = selected as string[];
                    if (sel.length === 0) {
                        return (
                            <span style={{
                                color: '#637381',
                                fontSize: '0.9375rem',
                                display: 'flex',
                                alignItems: 'center',
                                height: '100%',
                            }}>
                                {label}
                            </span>
                        );
                    }
                    return (
                        <span
                            style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block',
                                width: '100%',
                            }}
                        >
                            {displayValue(sel)}
                        </span>
                    );
                }}
                sx={{
                    ...SELECT_SX,
                    '& .MuiSelect-select': {
                        display: 'flex',
                        alignItems: 'center',
                    }
                }}
                MenuProps={MENU_PROPS}
                notched={selectedValues.length > 0}
            >
                {options.map((option) => (
                    <MenuItem
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                        sx={{
                            fontWeight: selectedValues.includes(option.value) ? 550 : 400,
                        }}
                    >
                        <Checkbox
                            size="small"
                            color="primary"
                            checked={selectedValues.includes(option.value)}
                            sx={CHECKBOX_STYLE}
                        />
                        {option.label}
                    </MenuItem>
                ))}
                <MenuItem
                    sx={APPLY_BUTTON}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur();
                        }
                    }}
                >
                    Áp dụng
                </MenuItem>
            </Select>
        </FormControl>
    )
})
