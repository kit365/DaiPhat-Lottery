import { createTheme, Theme } from "@mui/material";

export const getTicketCategoryTheme = (outerTheme: Theme) => createTheme(outerTheme, {
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
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    fontSize: "1rem",
                }
            }
        },
    }
});
