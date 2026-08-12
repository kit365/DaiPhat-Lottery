import { SxProps, Theme } from '@mui/material/styles';
import { COLORS } from './constants';

export const dataGridStyles: SxProps<Theme> = {
    color: COLORS.primary,
    borderWidth: "0",

    '& .MuiDataGrid-columnHeaders': {
        borderRadius: "0",
        position: 'sticky',
        top: 0,
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
        borderColor: COLORS.border
    },

    '& .MuiDataGrid-cell': {
        color: 'inherit',
        fontSize: "0.875rem",
        display: 'flex',
        alignItems: 'center',
        padding: '12px',
    },
};

export const dataGridCardStyles = {
    background: COLORS.background,
    color: COLORS.primary,
    borderRadius: 'var(--shape-borderRadius-lg)',
    minHeight: '600px',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: COLORS.shadow,
    padding: '16px'
};

export const dataGridContainerStyles = {
    width: '100%',
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden' as const,
};
