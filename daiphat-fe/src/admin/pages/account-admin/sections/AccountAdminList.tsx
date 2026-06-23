import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import {
    Card,
    Box,
    CircularProgress,
    MenuItem,
    TextField,
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
import { ROUTES } from '../../../constants/routes';
import { toast } from 'react-toastify';
import { STATUS_LABELS, RoleEnum } from '../configs/constants';
import { useUserStatuses } from '../../account-user/hooks/useAccountUser';
import { AccountSortField, SortDirection, createSortValue } from '../../../constants/sort';
import { User } from '../../../../types/user.type';
import { Role } from '../../../../types/role.type';
import { SelectMulti } from '../../../components/ui/SelectMulti';
import { SelectSingle } from '../../../components/ui/SelectSingle';
import { Search } from '../../../components/ui/Search';
import { ExportImport } from '../../../components/ui/ExportImport';
import { confirmDelete } from "../../../utils/swal";
import { getTabBadgeStyles } from "../../../utils/badge";
import { AccountAdminQuickUpdateModal } from './AccountAdminQuickUpdateModal';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { PERMISSIONS } from '../../../constants/permission.constants';

// Styled component cho con số (Badge nhãn) - Tham khảo từ blog
const TabBadge = styled('span')(() => ({
    height: "24px",
    minWidth: "24px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: '8px',
    padding: '0px 6px',
    borderRadius: "var(--shape-borderRadius-sm, 6px)",
    fontSize: '0.75rem',
    fontWeight: 700,
    transition: 'all 0.2s',
}));

const STAFF_ACCOUNT_ROLE_CODES = [RoleEnum.ADMIN, RoleEnum.STAFF_OPERATOR];

export const AccountAdminList = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const roleCode = typeof user?.role === 'string' ? user.role : (user?.role?.code || "");
    const isAdmin = roleCode === RoleEnum.ADMIN || roleCode === "SUPER_ADMIN";
    
    const canEdit = isAdmin || Boolean(user?.permissions?.includes(PERMISSIONS.ACCOUNT.EDIT));
    const canDelete = isAdmin || Boolean(user?.permissions?.includes(PERMISSIONS.ACCOUNT.DELETE));
    const canView = isAdmin || Boolean(user?.permissions?.includes(PERMISSIONS.ACCOUNT.VIEW));
    const [status, setStatus] = useState('all');
    const [roleIds, setRoleIds] = useState<string[]>([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [sortBy, setSortBy] = useState('createdAt');
    const [direction, setDirection] = useState('desc');
    const [quickUpdateId, setQuickUpdateId] = useState<string | null>(null);

    const { data: dynamicStatuses } = useUserStatuses();
    const statusOptions = useMemo(() => {
        const options = [{ value: 'all', label: 'Tất cả' }];
        if (dynamicStatuses && Array.isArray(dynamicStatuses)) {
            dynamicStatuses.forEach((st) => {
                const value = typeof st === 'string' ? st : st.value;
                const label = typeof st === 'string' ? (STATUS_LABELS[st] || st) : st.label;
                if (!value || value === 'DELETED') {
                    return;
                }
                options.push({
                    value,
                    label
                });
            });
        }
        return options;
    }, [dynamicStatuses]);

    const params = useMemo(() => ({
        page: page + 1,
        limit: pageSize,
        q: search || undefined,
        status: status === 'all' ? undefined : status,
        roleIds: roleIds.length > 0 ? roleIds : STAFF_ACCOUNT_ROLE_CODES,
        sortBy,
        direction,
    }), [page, pageSize, search, status, roleIds, sortBy, direction]);

    const { data: res, isLoading } = useAccounts(params, {
        placeholderData: (prev: any) => prev,
    });

    const { data: roles } = useRoles();
    const { mutate: deleteAccount } = useDeleteAccount();

    const accounts: User[] = res?.data?.recordList || [];
    const pagination = res?.data?.pagination || { totalRecords: 0 };

    const roleRecords = Array.isArray(roles) ? roles : (roles as any)?.data || [];
    const roleOptions = Array.isArray(roleRecords) ? roleRecords
        .filter((role: Role) => STAFF_ACCOUNT_ROLE_CODES.includes(role.code as RoleEnum))
        .map((role: Role) => ({
        value: role.id,
        label: role.name
    })) : [];

    const sortOptions = [
        { value: createSortValue(AccountSortField.CREATED_AT, SortDirection.DESC), label: 'Mới nhất' },
        { value: createSortValue(AccountSortField.CREATED_AT, SortDirection.ASC), label: 'Cũ nhất' },
        { value: createSortValue(AccountSortField.FIRST_NAME, SortDirection.ASC), label: 'Tên A-Z' },
        { value: createSortValue(AccountSortField.FIRST_NAME, SortDirection.DESC), label: 'Tên Z-A' },
    ];

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
        setQuickUpdateId(id);
    };

    const handleViewDetail = (id: string) => {
        navigate(`${ROUTES.ADMIN.ACCOUNTS.ADMIN.DETAIL}/${id}`);
    };

    const handleStatusChange = (_event: React.SyntheticEvent, newValue: string) => {
        setStatus(newValue);
        setPage(0);
    };

    const handleSortChange = (val: string) => {
        const [field, dir] = val.split(':');
        setSortBy(field);
        setDirection(dir);
        setPage(0);
    };

    const columns = useMemo(() => getColumnsConfig(handleEdit, handleDelete, handleViewDetail, { canEdit, canDelete, canView }, page, pageSize), [page, pageSize, canEdit, canDelete, canView]);

    const counts = useMemo(() => res?.data?.statusCounts || {
        all: 0,
        ACTIVE: 0,
        PENDING: 0,
        BANNED: 0,
        LOCKED: 0,
        DELETED: 0
    }, [res]);

    return (
        <Card elevation={0} sx={{
            borderRadius: 'var(--shape-borderRadius-lg)',
            bgcolor: 'var(--palette-background-paper)',
            boxShadow: 'var(--customShadows-card)',
            overflow: 'visible'
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
                {statusOptions.map((option) => (
                    <Tab
                        key={option.value}
                        value={option.value}
                        disableRipple
                        label={option.label}
                        icon={
                            <TabBadge
                                sx={getTabBadgeStyles(option.value, status === option.value)}
                            >
                                {option.value === 'all' ? (pagination.totalRecords || 0) : (counts[option.value as keyof typeof counts] || 0)}
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

            <Box sx={{ p: "calc(2 * var(--spacing))", display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px dashed var(--palette-text-disabled)33' }}>
                <Box sx={{ flex: 1, minWidth: 240 }}>
                    <Search
                        placeholder="Tìm kiếm nhân viên..."
                        value={search}
                        onChange={(val) => { setSearch(val); setPage(0); }}
                        maxWidth="100%"
                    />
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <SelectMulti
                        label="Vai trò"
                        options={roleOptions}
                        value={roleIds}
                        onChange={(val) => { setRoleIds(val); setPage(0); }}
                        sx={{ minWidth: 160 }}
                    />
                    <SelectSingle
                        label="Sắp xếp"
                        options={sortOptions}
                        value={createSortValue(sortBy, direction)}
                        onChange={handleSortChange}
                        sx={{ minWidth: 140 }}
                    />
                    <ExportImport />
                </Box>
            </Box>

            <Box sx={dataGridContainerStyles}>
                <DataGrid
                    rows={accounts}
                    getRowId={(row) => row.id || row._id}
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
                            px: '16px',
                        },
                        '& .MuiDataGrid-row:hover': {
                            bgcolor: 'var(--palette-action-hover)'
                        }
                    }}
                />
            </Box>
            <AccountAdminQuickUpdateModal
                open={!!quickUpdateId}
                onClose={() => setQuickUpdateId(null)}
                id={quickUpdateId}
            />
        </Card>
    );
};

export default AccountAdminList;


