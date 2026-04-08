import React, { useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import {
    Card,
    Box,
    CircularProgress,
    Tabs,
    Tab,
    Typography,
    styled
} from '@mui/material';
// import { Icon } from '@iconify/react';
import {
    SortAscendingIcon,
    SortDescendingIcon,
    UnsortedIcon
} from '../../../assets/icons';
import { getColumnsConfig, columnsInitialState } from '../configs/column.config';
import { DATA_GRID_LOCALE_VN } from '../configs/localeText.config';
import {
    dataGridContainerStyles,
    dataGridStyles
} from '../configs/styles.config';
import { useAccounts, useDeleteAccount } from '../hooks/useAccountAdmin';
import { useRoles } from '../../role/hooks/useRole';
import { useNavigate } from 'react-router-dom';
import { prefixAdmin } from '../../../constants/routes';
import { toast } from 'react-toastify';
import { STATUS_OPTIONS } from '../configs/constants';
import { SelectMulti } from '../../../components/ui/SelectMulti';
import { Search } from '../../../components/ui/Search';
import { ExportImport } from '../../../components/ui/ExportImport';
import { confirmDelete } from "../../../utils/swal";

// Styled component cho con số (Badge nhãn) - Tham khảo từ blog
const TabBadge = styled('span')(() => ({
    height: "24px",
    minWidth: "24px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: '8px',
    padding: '0px 6px',
    borderRadius: "var(--shape-borderRadius-sm)",
    fontSize: '0.75rem',
    fontWeight: 700,
    transition: 'all 0.2s',
}));

export const AccountAdminList = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [roleIds, setRoleIds] = useState<string[]>([]);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const filters = {
        ...(status !== 'all' && { status }),
        ...(search && { q: search }),
        ...(roleIds.length > 0 && { roleIds: roleIds.join(',') }),
        page: page + 1,
        limit: pageSize,
    };

    const { data: res, isLoading } = useAccounts(filters);
    const { data: roles = [] } = useRoles();
    const { mutate: deleteAccount } = useDeleteAccount();

    const accounts = res?.data?.recordList || [];
    const pagination = res?.data?.pagination || { totalRecords: 0 };

    const roleOptions = Array.isArray(roles) ? roles.map((role: any) => ({
        value: role._id,
        label: role.name
    })) : [];

    const handleDelete = (id: string) => {
        confirmDelete("Bạn có chắc chắn muốn xóa tài khoản này?", () => {
            deleteAccount(id, {
                onSuccess: () => {
                    toast.success("Xóa tài khoản thành công!");
                }
            });
        });
    };

    const handleEdit = (id: string) => {
        navigate(`/${prefixAdmin}/account-admin/edit/${id}`);
    };

    const handleViewDetail = (id: string) => {
        navigate(`/${prefixAdmin}/account-admin/detail/${id}`);
    };

    const columns = getColumnsConfig(handleEdit, handleDelete, handleViewDetail);

    const handleStatusChange = (_event: React.SyntheticEvent, newValue: string) => {
        setStatus(newValue);
        setPage(0);
    };

    // Calculate counts for badges - Note: This is local counts on current page OR we need another API for totals.
    // For simplicity, I'll use the recordList length or total from pagination if available.
    const counts = res?.data?.statusCounts || {
        all: 0,
        active: 0,
        inactive: 0,
    };

    return (
        <Card elevation={0} sx={{
            borderRadius: 'var(--shape-borderRadius-lg)',
            bgcolor: 'var(--palette-background-paper)',
            boxShadow: 'var(--customShadows-card)',
        }}>
            <Tabs
                value={status}
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
                        icon={
                            <TabBadge
                                sx={{
                                    bgcolor: status === option.value
                                        ? (option.value === 'active' ? 'var(--palette-success-main)' : (option.value === 'inactive' ? 'var(--palette-error-main)' : 'var(--palette-grey-800)'))
                                        : (option.value === 'active' ? 'var(--palette-success-lighter)' : (option.value === 'inactive' ? 'var(--palette-error-lighter)' : 'var(--palette-background-neutral)')),
                                    color: status === option.value
                                        ? 'var(--palette-common-white)'
                                        : (option.value === 'all' ? 'var(--palette-text-secondary)' : (option.value === 'active' ? 'var(--palette-success-dark)' : 'var(--palette-error-dark)')),
                                }}
                            >
                                {option.value === 'all' ? (pagination.totalRecords || 0) : counts[option.value as keyof typeof counts]}
                            </TabBadge>
                        }
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
                <SelectMulti
                    label="Vai trò"
                    options={roleOptions}
                    value={roleIds}
                    onChange={(val) => { setRoleIds(val); setPage(0); }}
                    sx={{ minWidth: 160 }}
                />
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Search
                        maxWidth="100%"
                        placeholder="Tìm kiếm tài khoản..."
                        value={search}
                        onChange={(val) => { setSearch(val); setPage(0); }}
                    />
                    <ExportImport />
                </Box>
            </Box>
            <Box sx={dataGridContainerStyles}>
                <DataGrid
                    rows={accounts}
                    getRowId={(row) => row._id}
                    loading={isLoading}
                    columns={columns}
                    density="comfortable"
                    slots={{
                        columnSortedAscendingIcon: SortAscendingIcon,
                        columnSortedDescendingIcon: SortDescendingIcon,
                        columnUnsortedIcon: UnsortedIcon,
                        noRowsOverlay: () => (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                {isLoading ? <CircularProgress size={32} /> : <Typography sx={{ fontSize: '1rem' }}>Không có dữ liệu để hiển thị</Typography>}
                            </Box>
                        )
                    }}
                    localeText={DATA_GRID_LOCALE_VN}
                    pagination
                    paginationMode="server"
                    rowCount={pagination.totalRecords || 0}
                    paginationModel={{
                        page,
                        pageSize,
                    }}
                    onPaginationModelChange={(model) => {
                        setPage(model.page);
                        setPageSize(model.pageSize);
                    }}
                    pageSizeOptions={[5, 10, 20]}
                    initialState={columnsInitialState}
                    getRowHeight={() => 'auto'}
                    checkboxSelection
                    disableRowSelectionOnClick
                    sx={{
                        ...dataGridStyles,
                        border: 'none',
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




