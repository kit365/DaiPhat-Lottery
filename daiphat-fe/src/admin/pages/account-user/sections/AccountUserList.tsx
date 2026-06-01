import React, { useState, useMemo, useCallback } from 'react';
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
import { useUsers, useDeleteUser, useUserStatuses } from '../hooks/useAccountUser';
import { ROUTES } from '../../../constants/routes';
import { AppToast as toast } from '../../../../client/utils/toast.util';
import { STATUS_LABELS, RoleEnum } from '../configs/constants';
import { SelectSingle } from '../../../components/ui/SelectSingle';
import { Search } from '../../../components/ui/Search';
import { AccountSortField, SortDirection, createSortValue } from '../../../constants/sort';
import { User } from '../../../../types/user.type';
import { ExportImport } from '../../../components/ui/ExportImport';
import { confirmDelete } from "../../../utils/swal";
import { getTabBadgeStyles } from "../../../utils/badge";
import { AccountResetPasswordModal } from './AccountResetPasswordModal';
import { StaffInviteModal } from './StaffInviteModal';
import { AccountUserQuickUpdateModal } from './AccountUserQuickUpdateModal';

// Styled component cho con số (Badge nhãn)
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

export const AccountUserList = ({ createdBy, assignedStaffId }: { createdBy?: string; assignedStaffId?: string }) => {
    const navigate = useNavigate();
    const [status, setStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [sortBy, setSortBy] = useState('createdAt');
    const [direction, setDirection] = useState('desc');
    const [selectedUser, setSelectedUser] = useState<{ id: string; fullName: string; email: string } | null>(null);
    const [openResetModal, setOpenResetModal] = useState(false);
    const [openInviteStaffModal, setOpenInviteStaffModal] = useState(false);
    const [quickUpdateId, setQuickUpdateId] = useState<string | null>(null);

    // Fetch dynamic statuses
    const { data: dynamicStatuses } = useUserStatuses();
    const statusOptions = useMemo(() => {
        const options = [{ value: 'all', label: 'Tất cả' }];
        if (dynamicStatuses && Array.isArray(dynamicStatuses)) {
            dynamicStatuses.forEach((st: string) => {
                options.push({
                    value: st,
                    label: STATUS_LABELS[st] || st
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
        roleIds: [RoleEnum.MEMBER],
        sortBy,
        direction,
        ...(createdBy && { createdBy }),
        ...(assignedStaffId && { assignedStaffId }),
    }), [page, pageSize, search, status, sortBy, direction, createdBy, assignedStaffId]);

    const { data: res, isLoading } = useUsers(params, {
        placeholderData: (prev: any) => prev,
    });

    const { mutate: deleteUser } = useDeleteUser();

    const users: User[] = res?.data?.recordList || [];
    const pagination = res?.data?.pagination || { totalRecords: 0 };

    const sortOptions = [
        { value: createSortValue(AccountSortField.CREATED_AT, SortDirection.DESC), label: 'Mới nhất' },
        { value: createSortValue(AccountSortField.CREATED_AT, SortDirection.ASC), label: 'Cũ nhất' },
        { value: createSortValue(AccountSortField.FIRST_NAME, SortDirection.ASC), label: 'Tên A-Z' },
        { value: createSortValue(AccountSortField.FIRST_NAME, SortDirection.DESC), label: 'Tên Z-A' },
    ];

    const handleDelete = useCallback((id: string) => {
        confirmDelete("Bạn có chắc chắn muốn xóa tài khoản khách hàng này?", () => {
            deleteUser(id, {
                onSuccess: () => {
                    toast.success("Xóa tài khoản thành công!");
                }
            });
        });
    }, [deleteUser]);

    const handleEdit = useCallback((id: string) => {
        setQuickUpdateId(id);
    }, []);

    const handleViewDetail = useCallback((id: string) => {
        navigate(`${ROUTES.ADMIN.ACCOUNTS.USER.DETAIL}/${id}`);
    }, [navigate]);

    const handleChangePassword = useCallback((id: string) => {
        const user = users.find(u => (u.id || u._id) === id);
        if (user) {
            setSelectedUser({ 
                id: (user.id || user._id)!, 
                fullName: user.fullName || user.username || "", 
                email: user.email 
            });
            setOpenResetModal(true);
        }
    }, [users]);

    const handleInviteStaff = useCallback((id: string) => {
        const user = users.find(u => (u.id || u._id) === id);
        if (user) {
            setSelectedUser({ 
                id: (user.id || user._id)!, 
                fullName: user.fullName || user.username || "", 
                email: user.email 
            });
            setOpenInviteStaffModal(true);
        }
    }, [users]);

    const columns = useMemo(() => getColumnsConfig(handleEdit, handleDelete, handleChangePassword, handleViewDetail, handleInviteStaff), [handleEdit, handleDelete, handleChangePassword, handleViewDetail, handleInviteStaff]);

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

            <Box sx={{ p: "calc(2 * var(--spacing))", display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', borderBottom: '1px dashed var(--palette-text-disabled)33' }}>
                <SelectSingle
                    label="Sắp xếp"
                    options={sortOptions}
                    value={createSortValue(sortBy, direction)}
                    onChange={handleSortChange}
                    sx={{ minWidth: 140 }}
                />
                
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                        <Search
                            placeholder="Tìm kiếm khách hàng..."
                            value={search}
                            onChange={(val) => { setSearch(val); setPage(0); }}
                            maxWidth="100%"
                        />
                    </Box>
                    <ExportImport />
                </Box>
            </Box>

            <Box sx={dataGridContainerStyles}>
                <DataGrid
                    rows={users}
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

            <AccountResetPasswordModal
                open={openResetModal}
                onClose={() => setOpenResetModal(false)}
                user={selectedUser}
            />

            <StaffInviteModal
                open={openInviteStaffModal}
                onClose={() => setOpenInviteStaffModal(false)}
                user={selectedUser}
            />

            <AccountUserQuickUpdateModal
                open={!!quickUpdateId}
                onClose={() => setQuickUpdateId(null)}
                id={quickUpdateId}
            />
        </Card>
    );
};

export default AccountUserList;

