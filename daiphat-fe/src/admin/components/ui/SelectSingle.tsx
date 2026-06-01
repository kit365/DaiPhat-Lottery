import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { memo, useCallback, useState } from 'react';

// Types
interface Option {
    value: string;
    label: string;
    disabled?: boolean;
}

interface SelectSingleProps {
    label: string;
    options: Option[];
    sx?: any;
    value?: string;
    onChange?: (value: string) => void;
    disabled?: boolean;
    showClear?: boolean;
}

// CSS
const FORM_CONTROL_STYLE = { width: "200px" };

const LABEL_STYLE = {
    fontSize: "0.9375rem",
    color: "#637381",

    "&.MuiInputLabel-shrink": {
        color: "#919eab",
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

export const SelectSingle = memo(({ label, options, sx, value, onChange, disabled, showClear }: SelectSingleProps) => {
    const [internalValue, setInternalValue] = useState<string>('');

    // Use controlled value if provided, otherwise use internal state
    const selectedValue = value !== undefined ? value : internalValue;

    const handleChange = useCallback((event: SelectChangeEvent<string>) => {
        const newValue = event.target.value;

        if (onChange) {
            onChange(newValue);
        } else {
            setInternalValue(newValue);
        }
    }, [onChange]);

    const handleClose = useCallback(() => {
        setTimeout(() => {
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        }, 0);
    }, []);

    return (
        <FormControl
            sx={{ ...FORM_CONTROL_STYLE, ...sx }}
            disabled={disabled}
        >
            {!!selectedValue && (
                <InputLabel
                    id="select-single-label"
                    shrink
                    sx={LABEL_STYLE}
                >
                    {label}
                </InputLabel>
            )}
            <Select
                value={selectedValue}
                label={selectedValue ? label : undefined}
                onChange={handleChange}
                onClose={handleClose}
                displayEmpty
                notched={!!selectedValue}
                renderValue={(selected) => {
                    if (!selected) {
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
                    return options.find(o => o.value === selected)?.label ?? selected;
                }}
                sx={{
                    ...SELECT_SX,
                    '& .MuiSelect-select': {
                        display: 'flex',
                        alignItems: 'center',
                    },
                }}
                MenuProps={MENU_PROPS}
            >
                {showClear && (
                    <MenuItem value="">
                        <em>Tất cả</em>
                    </MenuItem>
                )}
                {options.map((option) => (
                    <MenuItem
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                        sx={{
                            fontWeight: selectedValue === option.value ? 550 : 400,
                            fontSize: '0.875rem'
                        }}
                    >
                        {option.label}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    )
})

