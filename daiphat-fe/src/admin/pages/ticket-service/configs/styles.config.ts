import { COLORS } from './constants';
import { SxProps, Theme } from '@mui/material';

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

export const dataGridCardStyles = {
    background: COLORS.background,
    color: COLORS.primary,
    borderRadius: 'var(--shape-borderRadius-lg)',
    height: '640px',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: COLORS.shadow,
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
        borderRadius: "0", position: 'sticky',
        top: 70,
        zIndex: 3,
        background: COLORS.backgroundLight,
        '& .MuiDataGrid-columnHeader': {
            color: COLORS.secondary,
            fontSize: "0.875rem",
            border: "none",
            borderBottom: `1px solid ${COLORS.border}`,
            backgroundColor: COLORS.backgroundLight
        },
    },

    // Footer
    '& .MuiDataGrid-footerContainer': {
        borderTop: "1px dashed",
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
        borderRightStyle: "dashed"
    },

    '&.MuiDataGrid-root': {
        '--DataGrid-t-color-border-base': COLORS.border,
        borderWidth: "0"
    },
};





