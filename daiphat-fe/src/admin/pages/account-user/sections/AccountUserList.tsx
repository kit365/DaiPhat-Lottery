import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import {
    Card,
    Box,
    CircularProgress,
    MenuItem,
    Popover,
    TextField,
    Typography,
    styled,
    Button,
    Stack
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
} from '../configs/styles.config';
import { useUsers, useDeleteUser, useUserStatuses } from '../hooks/useAccountUser';
import { ROUTES } from '../../../constants/routes';
import { AppToast as toast } from '../../../../client/utils/toast.util';
import { STATUS_LABELS, RoleEnum } from '../configs/constants';
import { Search } from '../../../components/ui/Search';
import { AccountSortField, SortDirection, createSortValue } from '../../../constants/sort';
import { User } from '../../../../types/user.type';
import { ExportImport } from '../../../components/ui/ExportImport';
import { confirmDelete } from "../../../utils/swal";
import FilterListIcon from '@mui/icons-material/FilterList';
import { AccountResetPasswordModal } from './AccountResetPasswordModal';
import { StaffInviteModal } from './StaffInviteModal';

// Styled component cho con số (Badge nhãn)
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

export const AccountUserList = ({ createdBy, assignedStaffId }: { createdBy?: string; assignedStaffId?: string }) => {
    const navigate = useNavigate();
    const [status, setStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [sortBy, setSortBy] = useState('createdAt');
    const [direction, setDirection] = useState('desc');
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [selectedUser, setSelectedUser] = useState<{ id: string; fullName: string; email: string } | null>(null);
    const [openResetModal, setOpenResetModal] = useState(false);
    const [openInviteStaffModal, setOpenInviteStaffModal] = useState(false);

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
        navigate(`${ROUTES.ADMIN.ACCOUNTS.USER.EDIT}/${id}`);
    }, [navigate]);

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

    const handleStatusChange = (newStatus: string) => {
        setStatus(newStatus);
        setPage(0);
    };

    const handleSortChange = (val: string) => {
        const [field, dir] = val.split(':');
        setSortBy(field);
        setDirection(dir);
        setPage(0);
    };

    const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleFilterClose = () => {
        setAnchorEl(null);
    };

    const openFilter = Boolean(anchorEl);



    return (
        <Card elevation={0} sx={{
            borderRadius: 'var(--shape-borderRadius-lg)',
            bgcolor: 'var(--palette-background-paper)',
            boxShadow: 'var(--customShadows-card)',
            overflow: 'visible'
        }}>
            <Box sx={{ 
                p: { xs: 2, md: 2.5 }, 
                display: 'flex', 
                flexDirection: { xs: 'column', md: 'row' },
                gap: { xs: 2.5, md: 2 }, 
                alignItems: { xs: 'stretch', md: 'center' }, 
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--palette-background-neutral)',
            }}>
                <Box sx={{ 
                    display: 'flex', 
                    gap: 1, 
                    alignItems: 'center',
                    overflowX: 'auto',
                    pb: { xs: 1, md: 0 },
                    mx: { xs: -2, md: 0 },
                    px: { xs: 2, md: 0 },
                    '&::-webkit-scrollbar': { display: 'none' },
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none',
                }}>
                    {statusOptions.map((option) => {
                        const isActive = status === option.value;
                        return (
                            <Button
                                key={option.value}
                                onClick={() => handleStatusChange(option.value)}
                                sx={{
                                    height: 38,
                                    px: 2,
                                    borderRadius: '10px',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                    bgcolor: isActive ? 'rgba(0, 167, 111, 0.08)' : 'transparent',
                                    color: isActive ? 'var(--palette-primary-main)' : 'var(--palette-text-secondary)',
                                    '&:hover': {
                                        bgcolor: isActive ? 'rgba(0, 167, 111, 0.16)' : 'rgba(145, 158, 171, 0.08)',
                                    }
                                }}
                            >
                                {option.label}
                                {isActive && (
                                    <TabBadge
                                        sx={{
                                            bgcolor: 'var(--palette-primary-main)',
                                            color: 'var(--palette-common-white)',
                                            ml: 1.25
                                        }}
                                    >
                                        {pagination.totalRecords || 0}
                                    </TabBadge>
                                )}
                            </Button>
                        );
                    })}
                </Box>

                <Box sx={{ 
                    display: 'flex', 
                    gap: 1.5, 
                    alignItems: 'center', 
                    justifyContent: 'flex-end',
                    flexDirection: { xs: 'row', sm: 'row' },
                    width: { xs: '100%', md: 'auto' }
                }}>
                <Box sx={{ flex: 1, maxWidth: { md: 320 } }}>
                        <Search
                            placeholder="Tìm kiếm khách hàng..."
                            value={search}
                            onChange={(val) => {
                                setSearch(val);
                                setPage(0);
                            }}
                            maxWidth={260}
                        />
                </Box>
                    
                    <Button
                        variant="outlined"
                        onClick={handleFilterClick}
                        startIcon={<FilterListIcon />}
                        sx={{ 
                            height: 48, 
                            borderRadius: "12px",
                            borderColor: 'var(--palette-background-neutral)',
                            bgcolor: anchorEl ? 'var(--palette-background-neutral)' : 'transparent',
                            color: 'var(--palette-text-primary)',
                            textTransform: 'none',
                            fontWeight: 700,
                            px: 2,
                            whiteSpace: 'nowrap',
                            minWidth: 'fit-content',
                            '&:hover': { 
                                bgcolor: 'var(--palette-background-neutral)',
                                borderColor: 'var(--palette-background-neutral)',
                            }
                        }}
                    >
                        Bộ lọc
                    </Button>

                    <ExportImport />

                    <Popover
                        open={openFilter}
                        anchorEl={anchorEl}
                        onClose={handleFilterClose}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        PaperProps={{
                            sx: {
                                p: 2.5,
                                mt: 1,
                                width: 280,
                                borderRadius: '12px',
                                boxShadow: 'var(--customShadows-z20)',
                                border: '1px solid var(--palette-background-neutral)',
                            }
                        }}
                    >
                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
                            Sắp xếp
                        </Typography>
                        <TextField
                            select
                            fullWidth
                            value={`${sortBy}:${direction}`}
                            onChange={(e) => handleSortChange(e.target.value)}
                            sx={{ 
                                mb: 2,
                                '& .MuiOutlinedInput-root': { height: 48, borderRadius: '8px' }
                            }}
                        >
                            {sortOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Popover>
                </Box>
            </Box>

            <Box sx={dataGridContainerStyles}>
                <DataGrid
                    rows={users}
                    getRowId={(row) => row.id || row._id}
                    loading={isLoading}
                    columns={columns}
                    rowHeight={72}
                    columnHeaderHeight={56}
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
                    pageSizeOptions={[5, 10, 20, 50]}
                    initialState={columnsInitialState}
                    checkboxSelection
                    disableRowSelectionOnClick
                    autoHeight
                    sx={{
                        border: 'none',
                        '& .MuiDataGrid-cell': {
                            borderBottom: '1px dashed var(--palette-background-neutral)',
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '0.9375rem',
                            '&:focus': { outline: 'none' },
                        },
                        '& .MuiDataGrid-columnHeaders': {
                            bgcolor: 'var(--palette-background-neutral)',
                            borderRadius: '12px 12px 0 0',
                            borderBottom: '1px solid var(--palette-divider)',
                        },
                        '& .MuiDataGrid-columnHeader': {
                            bgcolor: 'transparent !important',
                            '&:focus': { outline: 'none' },
                        },
                        '& .MuiDataGrid-columnSeparator': {
                            display: 'none',
                        },
                        '& .MuiDataGrid-columnHeaderTitle': {
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            color: 'var(--palette-text-primary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05rem',
                        },
                        '& .MuiDataGrid-footerContainer': {
                            borderTop: 'none',
                            px: 2,
                        },
                        '& .MuiDataGrid-row': {
                            '&:hover': {
                                bgcolor: 'rgba(145, 158, 171, 0.04)',
                            },
                        },
                        '& .MuiCheckbox-root': {
                            color: 'var(--palette-text-disabled)',
                            '&.Mui-checked': {
                                color: 'var(--palette-primary-main)',
                            }
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
        </Card>
    );
};

export default AccountUserList;

