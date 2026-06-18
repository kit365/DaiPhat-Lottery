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
    '& .MuiDataGrid-columnHeaders': {
        borderRadius: "0",
        position: 'sticky',
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
    '& .MuiDataGrid-footerContainer': {
        borderTop: "1px dashed",
        minHeight: "auto",
        fontSize: "0.875rem",
    },
    '& .MuiDataGrid-cell': {
        color: 'inherit',
        fontSize: "0.875rem",
        display: 'flex',
        alignItems: 'center',
        borderRightStyle: "dashed",
        borderBottomStyle: "dashed",
    },
    '& .MuiDataGrid-toolbarContainer': {
        position: 'sticky',
        top: 0,
        zIndex: 4,
        background: COLORS.background,
    },
    borderWidth: "0"
};
