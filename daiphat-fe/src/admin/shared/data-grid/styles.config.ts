import { SxProps, Theme } from '@mui/material/styles';
import { DATA_GRID_COLORS as COLORS } from './colors';

/** Chiều cao hàng chuẩn cho admin DataGrid (đồng bộ các trang list). */
export const ADMIN_DATAGRID_ROW_HEIGHT = 56;
export const ADMIN_DATAGRID_ROW_MIN_HEIGHT = 52;

export const adminDataGridRowHeightProps = {
    getRowHeight: () => 'auto' as const,
    getEstimatedRowHeight: () => ADMIN_DATAGRID_ROW_HEIGHT,
};

export const adminDataGridRowHeightSx: SxProps<Theme> = {
    '& .MuiDataGrid-cell': {
        py: 1.5,
    },
    '& .MuiDataGrid-row': {
        minHeight: `${ADMIN_DATAGRID_ROW_MIN_HEIGHT}px !important`,
    },
};

/**
 * Layout-only leftovers for MUI `sx`.
 * Font / color / typography live in `admin/styles/index.css` under `.admin-datagrid`.
 * Always pass `className="admin-datagrid"` on DataGrid.
 */
export const dataGridStyles: SxProps<Theme> = {
    borderWidth: 0,
};

export const ADMIN_DATAGRID_CLASS = 'admin-datagrid';

export const toolbarStyles = {
    root: {
        padding: '16px',
        gap: 'calc(2 * var(--spacing))',
        display: 'flex',
        justifyContent: 'space-between',
        minHeight: 'auto',
    } as const,
};

/** Prefer class `admin-datagrid-card` from global CSS when possible. */
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

export const columnsPanelStyles: SxProps<Theme> = {
    '& .MuiDataGrid-columnsManagement .MuiCheckbox-root.Mui-disabled': {
        color: COLORS.borderDisabled,
    },
    '& .MuiDataGrid-columnsManagement .MuiTypography-root.Mui-disabled': {
        color: COLORS.disabled,
    },
    '& .MuiDataGrid-columnsManagementHeader': {
        padding: '20px 16px',
        borderBottom: `1px solid ${COLORS.border}`,
    },
    '& .MuiDataGrid-columnsManagementSearchInput .MuiOutlinedInput-root': {
        fontSize: '1rem',
        padding: '0 14px',
        color: COLORS.primary,
        borderRadius: 'var(--shape-borderRadius)',
        lineHeight: '24px',
        height: '56px',
    },
    '& fieldset': {
        borderColor: COLORS.borderLight,
    },
    '&:hover fieldset': {
        borderColor: COLORS.borderMedium,
    },
    '& .MuiDataGrid-columnsManagementSearchInput .MuiOutlinedInput-root.Mui-focused fieldset': {
        borderColor: COLORS.primary,
        borderWidth: '2px',
    },
    '& .MuiDataGrid-columnsManagementSearchInput .MuiSvgIcon-root': {
        fontSize: '1.25rem',
        color: COLORS.secondary,
    },
    '& .MuiDataGrid-columnsManagement': {
        padding: '4px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    '& .MuiTypography-root': {
        fontSize: '0.875rem !important',
    },
    '& .MuiDataGrid-columnsManagementFooter': {
        padding: '12px 8px 12px 12px',
        '& .MuiButton-text': {
            padding: '6px 8px',
            fontWeight: '700',
            fontSize: '0.875rem',
            textTransform: 'none',
            borderRadius: 'var(--shape-borderRadius)',
            color: COLORS.primary,
            '&:hover': {
                background: COLORS.borderHover,
            },
            '&.Mui-disabled': {
                color: COLORS.disabled,
                opacity: 0.48,
            },
        },
    },
};

export const filterPanelStyles: SxProps<Theme> = {
    '& .MuiDataGrid-panelContent': {
        padding: '24px 20px 24px 16px',
    },
    '& .MuiButtonBase-root': {
        color: COLORS.secondary,
        fontSize: '1.125rem',
        borderRadius: '50%',
        backgroundColor: COLORS.borderHover,
        padding: '5px',
    },
    '& .MuiFormLabel-root': {
        color: COLORS.secondary,
        fontSize: '1rem',
        fontWeight: '600',
        '&.Mui-focused': {
            color: COLORS.primary,
        },
    },
    '& .MuiInputBase-root': {
        color: COLORS.primary,
        fontSize: '1rem',
        borderRadius: 'var(--shape-borderRadius)',
    },
};
