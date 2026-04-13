import { Box } from '@mui/material';
import { GridToolbarQuickFilter, GridToolbarContainer } from '@mui/x-data-grid';
import { toolbarStyles } from '../configs/styles.config';

export const CouponToolbar = () => {
    return (
        <GridToolbarContainer>
            <Box sx={toolbarStyles.root}>
                <GridToolbarQuickFilter
                    {...({
                        placeholder: "Tìm kiếm...",
                        sx: {
                            minWidth: '240px',
                            '& .MuiInputBase-root': {
                                fontSize: '0.875rem',
                                height: '40px',
                                borderRadius: "var(--shape-borderRadius)",
                            },
                            '& .MuiSvgIcon-root': {
                                fontSize: '1.25rem',
                                color: 'var(--palette-text-secondary)'
                            }
                        }
                    } as any)}
                />
            </Box>
        </GridToolbarContainer>
    );
};




