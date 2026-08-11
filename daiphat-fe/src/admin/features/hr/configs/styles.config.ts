import { Button } from '@/admin/components/ui/Button';
import { SxProps, Theme } from '@mui/material';
import { COLORS } from './constants';

// Toolbar
export const toolbarStyles = {
    root: {
        padding: '16px',
        paddingRight: "8px",
        gap: "calc(2 * var(--spacing))",
        display: 'flex',
        justifyContent: 'space-between',
        minHeight: 'auto',
    } as const,
};

// DataGrid Card
export const dataGridCardStyles = {
    background: COLORS.background,
    color: COLORS.primary,
    borderRadius: 'var(--shape-borderRadius-lg)',
    height: '640px',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: COLORS.shadow,
    border: `1px solid ${COLORS.border}`,
};

export const dataGridContainerStyles = {
    width: '100%',
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden' as const,
};

export const dataGridStyles: SxProps<Theme> = {
    color: COLORS.primary,

    // HEADER
    '& .MuiDataGrid-columnHeaders': {
        borderRadius: "0",
        position: 'sticky',
        top: 0,
        zIndex: 3,
        background: COLORS.backgroundLight,
        '& .MuiDataGrid-columnHeader': {
            color: COLORS.secondary,
            fontSize: "0.875rem",
            fontWeight: 600,
            border: "none",
            borderBottom: `1px solid ${COLORS.border}`,
            backgroundColor: COLORS.backgroundLight
        },
        '& .MuiDataGrid-columnHeader--withRightBorder': {
            borderRight: `1px solid ${COLORS.border}`
        },
        '& .MuiDataGrid-menuIcon': {
            '& .MuiButtonBase-root': {
                color: "var(--palette-text-secondary)",
                rotate: '90deg'
            }
        },
        '& .MuiButtonBase-root': {
            fontSize: "1.125rem"
        }
    },

    // Footer
    '& .MuiDataGrid-footerContainer': {
        borderTop: `1px dashed ${COLORS.border}`,
        minHeight: "auto",
        fontSize: "0.875rem",
        color: "inherit",
        '& .MuiTablePagination-selectLabel': {
            fontSize: "0.875rem",
            color: "inherit",
            marginBottom: "-2px"
        },
        '& .MuiSelect-select': {
            minHeight: "21.5625px",
            lineHeight: "1.5rem",
            fontSize: "0.9375rem",
        },
        '& .MuiSelect-icon': {
            top: "6px"
        },
        '& .MuiTablePagination-displayedRows': {
            fontSize: "0.875rem",
            color: "inherit"
        },
        '& .MuiTablePaginationActions-root': {
            marginRight: "8px",
            '& .MuiButtonBase-root': {
                padding: "5px",
                '& .MuiSvgIcon-root': {
                    width: "1.5rem",
                    height: "1.5rem",
                }
            }
        },
    },

    '& .MuiDataGrid-withBorderColor': {
        borderColor: COLORS.border
    },

    // CELL
    '& .MuiDataGrid-cell': {
        color: 'inherit',
        fontSize: "0.875rem",
        display: 'flex',
        alignItems: 'center',
        borderBottom: `1px dashed ${COLORS.border}`,
        borderRightStyle: "dashed"
    },

    // TOOLBAR
    '& .MuiDataGrid-toolbarContainer': {
        color: 'inherit',
        position: 'sticky',
        top: 0,
        zIndex: 4,
        background: COLORS.background,
        borderBottom: `none`,
    },

    // CHECKBOX
    '& .MuiCheckbox-root': {
        color: 'var(--palette-text-disabled)',
        '&.Mui-checked, &.Mui-indeterminate': {
            color: 'var(--palette-primary-main)',
        },
    },

    // SELECT / INPUT trong toolbar
    '& .MuiFormControl-root': {
        color: 'inherit',
    },

    '& .MuiInputLabel-root': {
        color: COLORS.secondary,
    },

    '& .MuiInputLabel-root.Mui-focused': {
        color: COLORS.primary,
    },

    '& .MuiOutlinedInput-root': {
        color: COLORS.primary,
        '& fieldset': {
            borderColor: COLORS.borderLight,
        },
        '&:hover fieldset': {
            borderColor: COLORS.borderMedium,
        },
        '&.Mui-focused fieldset': {
            borderColor: COLORS.primary,
        },
    },

    '& .MuiDataGrid-actionsCell .MuiIconButton-root': {
        color: 'var(--palette-text-secondary)',
    },

    '& .MuiDataGrid-actionsCell .MuiSvgIcon-root': {
        fontSize: '1.25rem',
    },

    '&.MuiDataGrid-root': {
        '--DataGrid-t-color-interactive-focus': COLORS.success,
        '--DataGrid-t-color-border-base': COLORS.border,
        overflow: 'auto',
        borderWidth: "0",
    },
};

export const primaryButtonStyles = {
    background: COLORS.primary,
    minHeight: "2.25rem",
    minWidth: "4rem",
    fontWeight: 700,
    fontSize: "0.875rem",
    padding: "6px 12px",
    borderRadius: "var(--shape-borderRadius)",
    textTransform: "none" as const,
    boxShadow: "none",
    "&:hover": {
        background: "var(--palette-grey-700)",
        boxShadow: "var(--customShadows-z8)"
    }
};

export const dialogStyles = {
    '& .MuiDialogTitle-root': {
        fontWeight: 700,
        fontSize: '1.25rem',
        padding: '24px',
    },
    '& .MuiDialogContent-root': {
        padding: '24px',
        paddingTop: '8px !important',
    },
    '& .MuiDialogActions-root': {
        padding: '16px 24px',
    },
    '& .MuiPaper-root': {
        borderRadius: 'var(--shape-borderRadius-lg)',
        boxShadow: '0 0 2px 0 rgba(145, 158, 171, 0.24), 0 20px 40px -4px rgba(145, 158, 171, 0.24)',
    }
};





