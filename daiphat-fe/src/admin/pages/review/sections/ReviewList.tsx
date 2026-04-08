import React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Card, Box, Typography, Tabs, Tab } from '@mui/material';
import { useReviews } from '../hooks/useReviews';
import { useReviewColumns } from '../hooks/useReviewColumns';
import { dataGridContainerStyles, dataGridStyles } from '../configs/styles.config';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../../assets/icons';
import { Search } from '../../../components/ui/Search';
import { ExportImport } from '../../../components/ui/ExportImport';
import { DATA_GRID_LOCALE_VN } from '../../account-admin/configs/localeText.config';

const STATUS_OPTIONS = [
    { value: 'all', label: 'Tất cả' },
    { value: 'pending', label: 'Chờ duyệt' },
    { value: 'approved', label: 'Đã duyệt' },
    { value: 'rejected', label: 'Đã ẩn' },
];

export const ReviewList = () => {
    const {
        reviews,
        pagination,
        isLoading,
        error,
        filters,
        setStatusFilter,
        setSearchFilter,
        setPage,
        setLimit,
    } = useReviews();
    const columns = useReviewColumns();

    if (error) {
        return (
            <Box p={4} textAlign="center">
                <Typography color="error">Lỗi khi tải danh sách đánh giá. Vui lòng thử lại.</Typography>
            </Box>
        );
    }

    const handleStatusChange = (_event: React.SyntheticEvent, newValue: string) => {
        setStatusFilter(newValue);
    };

    return (
        <Card elevation={0} sx={{
            borderRadius: 'var(--shape-borderRadius-lg)',
            bgcolor: 'var(--palette-background-paper)',
            boxShadow: 'var(--customShadows-card)',
        }}>
            <Tabs
                value={filters.status}
                onChange={handleStatusChange}
                variant="scrollable"
                scrollButtons={false}
                sx={{
                    px: '20px',
                    minHeight: "48px",
                    borderBottom: '1px solid var(--palette-background-neutral)',
                    '& .MuiTabs-flexContainer': { gap: "calc(5 * var(--spacing))" },
                    '& .MuiTabs-indicator': { backgroundColor: 'var(--palette-text-primary)', height: 2 },
                }}
            >
                {STATUS_OPTIONS.map((option) => (
                    <Tab
                        key={option.value}
                        value={option.value}
                        disableRipple
                        label={option.label}
                        iconPosition="end"
                        sx={{
                            minWidth: 0,
                            padding: '0',
                            minHeight: '48px',
                            textTransform: 'none',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: 'var(--palette-text-secondary)',
                            flexDirection: 'row',
                            '&.Mui-selected': {
                                color: 'var(--palette-text-primary)',
                                fontWeight: 600,
                            },
                        }}
                    />
                ))}
            </Tabs>

            <Box sx={{ p: "calc(2 * var(--spacing))", display: 'flex', gap: 2, alignItems: 'center', borderBottom: '1px dashed var(--palette-text-disabled)33' }}>
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Search
                        maxWidth="100%"
                        placeholder="Tìm kiếm đánh giá..."
                        value={filters.search}
                        onChange={(val) => setSearchFilter(val)}
                    />
                </Box>
                <ExportImport />
            </Box>

            <Box sx={dataGridContainerStyles}>
                <DataGrid
                    rows={reviews}
                    loading={isLoading}
                    columns={columns}
                    density="comfortable"
                    slots={{
                        columnSortedAscendingIcon: SortAscendingIcon,
                        columnSortedDescendingIcon: SortDescendingIcon,
                        columnUnsortedIcon: UnsortedIcon,
                        noRowsOverlay: () => (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <Typography sx={{ fontSize: '0.875rem', color: 'var(--palette-text-secondary)' }}>
                                    Không có dữ liệu để hiển thị
                                </Typography>
                            </Box>
                        )
                    }}
                    localeText={DATA_GRID_LOCALE_VN}
                    pagination
                    paginationMode="server"
                    rowCount={pagination.totalRecords || 0}
                    paginationModel={{
                        page: pagination.currentPage - 1,
                        pageSize: pagination.limit,
                    }}
                    onPaginationModelChange={(model) => {
                        if (model.pageSize !== pagination.limit) {
                            setLimit(model.pageSize);
                        } else if (model.page + 1 !== pagination.currentPage) {
                            setPage(model.page + 1);
                        }
                    }}
                    pageSizeOptions={[5, 10, 20]}
                    getRowHeight={() => 'auto'}
                    checkboxSelection
                    disableRowSelectionOnClick
                    sx={{
                        ...dataGridStyles,
                        border: 'none',
                        '& .MuiDataGrid-columnHeaders': {
                            bgcolor: 'var(--palette-background-neutral)',
                            borderBottom: '1px solid var(--palette-divider)',
                        },
                        '& .MuiDataGrid-columnHeader': {
                            bgcolor: 'var(--palette-background-neutral)',
                            color: 'var(--palette-text-secondary)',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                        },
                        '& .MuiDataGrid-columnHeaderTitleContainer': {
                            paddingX: '16px',
                        },
                        '& .MuiDataGrid-columnHeaderCheckbox .MuiDataGrid-columnHeaderTitleContainer': {
                            padding: 0,
                        },
                        '& .MuiDataGrid-cell': {
                            borderBottom: '1px dashed var(--palette-background-neutral)',
                        },
                        '& .MuiDataGrid-row:hover': {
                            bgcolor: 'var(--palette-action-hover)'
                        }
                    }}
                />
            </Box>
        </Card>
    );
};
