import { createTheme, Theme } from "@mui/material";

export const getTicketAttributeTheme = (outerTheme: Theme) => createTheme(outerTheme, {
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
                    '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: "var(--palette-text-disabled)33",
                        transition: 'border-color 0.2s',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: "var(--palette-text-primary)",
                    },
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
        MuiChip: {
            styleOverrides: {
                root: {
                    backgroundColor: "rgba(0, 184, 217, 0.16)",
                    color: "#006C9C",
                    fontSize: "0.8125rem",
                    height: "24px",
                    borderRadius: "var(--shape-borderRadius)",
                },
                label: {
                    paddingLeft: "8px",
                    paddingRight: "8px",
                    fontWeight: "600"
                },
                deleteIcon: {
                    color: "rgb(0, 108, 156)",
                    opacity: "0.48",
                    fontSize: "0.9375rem",
                    marginRight: "4px",
                    marginLeft: "-4px",
                    '&:hover': {
                        color: "rgb(0, 108, 156)",
                        opacity: "0.8"
                    }
                }
            }
        }
    }
});
