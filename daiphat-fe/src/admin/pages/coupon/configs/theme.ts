import { createTheme, Theme } from "@mui/material";

export const getCouponTheme = (outerTheme: Theme) => createTheme(outerTheme, {
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundImage: "none !important",
                    backdropFilter: "none !important",
                    backgroundColor: "var(--palette-background-paper) !important",
                    boxShadow: "var(--customShadows-card)",
                    borderRadius: "var(--shape-borderRadius-lg)",
                    color: "var(--palette-text-primary)",
                },
            }
        },
        MuiFormLabel: {
            styleOverrides: {
                root: {
                    color: "var(--palette-text-disabled)",
                    fontSize: "0.9375rem",
                    '&.Mui-focused': {
                        color: "var(--palette-text-primary)",
                        fontWeight: "600",
                        fontSize: "0.9375rem"
                    }
                }
            }
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    color: "var(--palette-text-primary)",
                    borderRadius: "var(--shape-borderRadius)",
                    fontSize: "0.9375rem",
                    // Default: nearly invisible (matches ticket create page)
                    '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: "rgba(145, 158, 171, 0.2)",
                        transition: 'border-color 0.15s ease',
                    },
                    // Hover: visible gray
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: "rgba(145, 158, 171, 0.8)",
                    },
                    // Focus: thick dark border
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: "var(--palette-text-primary)",
                        borderWidth: "2px",
                    },
                },
                input: {
                    padding: "16px 14px",
                }
            }
        },
        MuiAutocomplete: {
            styleOverrides: {
                listbox: {
                    padding: 0,
                },
                option: {
                    fontSize: '0.875rem',
                    padding: '6px',
                    marginBottom: '4px',
                    borderRadius: "var(--shape-borderRadius-sm)",

                },
            },
        },
    }
});




