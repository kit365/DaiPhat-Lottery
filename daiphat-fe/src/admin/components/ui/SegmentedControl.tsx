import { Box, BoxProps } from '@mui/material';

export interface SegmentedControlOption<T extends string = string> {
    value: T;
    label: React.ReactNode;
}

export interface SegmentedControlProps<T extends string = string> extends Omit<BoxProps, 'onChange'> {
    value: T;
    onChange: (value: T) => void;
    options: SegmentedControlOption<T>[];
    disabled?: boolean;
}

export const SegmentedControl = <T extends string = string>({
    value,
    onChange,
    options,
    disabled,
    sx,
    ...rest
}: SegmentedControlProps<T>) => {
    return (
        <Box
            role="group"
            sx={{
                display: "inline-flex",
                p: 0,
                borderRadius: "10px",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                opacity: disabled ? 0.6 : 1,
                ...sx,
            }}
            {...rest}
        >
            {options.map((option) => {
                const selected = value === option.value;
                return (
                    <Box
                        key={option.value}
                        component="button"
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                            if (!disabled && option.value !== value) {
                                onChange(option.value);
                            }
                        }}
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            border: 0,
                            borderRadius: "8px",
                            py: 0.75,
                            px: 1,
                            fontSize: "0.875rem",
                            fontWeight: selected ? 700 : 500,
                            cursor: disabled ? "not-allowed" : "pointer",
                            bgcolor: selected ? "var(--palette-primary-lighter)" : "transparent",
                            color: selected ? "var(--palette-primary-dark)" : "text.primary",
                            transition: "all 0.2s ease",
                            "&:hover": disabled
                                ? undefined
                                : {
                                      bgcolor: selected ? "var(--palette-primary-lighter)" : "action.hover",
                                  },
                        }}
                    >
                        {option.label}
                    </Box>
                );
            })}
        </Box>
    );
};
