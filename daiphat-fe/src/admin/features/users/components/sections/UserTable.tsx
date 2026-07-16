import { RoleEnum } from "../../../../../types/role.type";
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import { Box, CircularProgress, styled } from '@mui/material';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import { PERMISSIONS } from '../../../../constants/permission.constants';
import { getColumnsConfig } from '../configs/column.config';
import { PaginationMetadata } from '../../../../../types/api.type';
import { dataGridStyles } from '../../../../pages/ticket/configs/styles.config';


interface UserTableProps {
    data: any[];
    isLoading: boolean;
    pagination?: PaginationMetadata;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
    onRefresh: () => void;
    isClient?: boolean;
}

import { DATA_GRID_LOCALE_VN } from "../../../../../shared/components/DataTable/localeText.config";
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon, ThreeDotsIcon, EyeIcon, EditIcon, DeleteIcon } from "../../../../assets/icons";
import { Popover, MenuItem, ListItemIcon, ListItemText, ButtonBase } from "@mui/material";

export const UserTable = ({
    data,
    isLoading,
    pagination,
    onPageChange,
    onLimitChange,
    onRefresh,
    isClient
}: UserTableProps) => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    
    // Check permissions
    const roleCode = typeof user?.role === 'string' ? user.role : (user?.role?.code || "");
    const isAdmin = roleCode === RoleEnum.ADMIN || roleCode === "SUPER_ADMIN";
    
    const accountOrUser = isClient ? PERMISSIONS.USER : PERMISSIONS.ACCOUNT;

    const canEdit = isAdmin || Boolean(user?.permissions?.includes(accountOrUser.EDIT));
    const canDelete = isAdmin || Boolean(user?.permissions?.includes(accountOrUser.DELETE));
    const canView = isAdmin || Boolean(user?.permissions?.includes(accountOrUser.VIEW));

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedUserId, setSelectedUserId] = useState<string>("");

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, id: string) => {
        setAnchorEl(event.currentTarget);
        setSelectedUserId(id);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedUserId("");
    };

    const handleEdit = () => {
        navigate(isClient ? `/admin/account-user/edit/${selectedUserId}` : `/admin/account-admin/edit/${selectedUserId}`);
        handleCloseMenu();
    };

    const handleDelete = () => {
        // Typically call delete mutation here or open confirm modal
        console.log("Delete", selectedUserId);
        handleCloseMenu();
    };

    const handleView = () => {
        navigate(isClient ? `/admin/account-user/detail/${selectedUserId}` : `/admin/account-admin/detail/${selectedUserId}`);
        handleCloseMenu();
    };

    const columns = useMemo(() => {
        const baseColumns = getColumnsConfig(
            () => {},
            () => {},
            () => {},
            { canEdit: false, canDelete: false, canView: false }, // disable internal actions
            pagination?.currentPage || 1,
            pagination?.limit || 10,
            isClient
        ).filter(c => c.field !== 'actions'); // remove old actions column

        return [
            ...baseColumns,
            {
                field: 'actions',
                headerName: '',
                width: 80,
                sortable: false,
                filterable: false,
                align: 'right' as const,
                renderCell: (params: any) => (
                    <ButtonBase
                        onClick={(e) => handleOpenMenu(e, params.row.id)}
                        sx={{
                            color: "var(--palette-text-secondary)",
                            p: "8px",
                            borderRadius: "50%",
                            rotate: "90deg",
                            transition: "background-color 150ms",
                            "&:hover": {
                                backgroundColor: "var(--palette-text-secondary)14",
                            },
                        }}
                    >
                        <ThreeDotsIcon />
                    </ButtonBase>
                )
            }
        ];
    }, [pagination?.currentPage, pagination?.limit, isClient]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' }}>
            <DataGrid
                rows={data || []}
                columns={columns}
                getRowId={(row) => row.id}
                loading={isLoading}
                paginationMode="server"
                rowCount={pagination?.totalRecords || 0}
                paginationModel={{
                    page: (pagination?.currentPage || 1) - 1,
                    pageSize: pagination?.limit || 10
                }}
                onPaginationModelChange={(newModel) => {
                    if (newModel.pageSize !== pagination?.limit) {
                        onLimitChange(newModel.pageSize);
                    } else {
                        onPageChange(newModel.page + 1);
                    }
                }}
                pageSizeOptions={[10, 25, 50]}
                disableRowSelectionOnClick
                density="comfortable"
                localeText={DATA_GRID_LOCALE_VN}
                className="admin-datagrid"
                    sx={dataGridStyles}
                slots={{
                    columnSortedAscendingIcon: SortAscendingIcon,
                    columnSortedDescendingIcon: SortDescendingIcon,
                    columnUnsortedIcon: UnsortedIcon,
                    loadingOverlay: () => <CircularProgress size={30} sx={{ margin: 'auto' }} />,
                    noRowsOverlay: () => (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            {isLoading
                                ? <CircularProgress size={32} />
                                : <span className="text-[1.125rem]">Không có dữ liệu</span>}
                        </Box>
                    )
                }}
            />
            
            <Popover
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                PaperProps={{
                    sx: {
                        marginTop: "-8px",
                        width: 180,
                        boxShadow: '0 0 2px 0 rgba(145, 158, 171, 0.24), 0 20px 40px -4px rgba(145, 158, 171, 0.24)',
                        padding: '4px',
                        borderRadius: '10px',
                        overflow: 'visible',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            bottom: -7,
                            right: 20,
                            width: 12,
                            height: 12,
                            backgroundColor: 'background.paper',
                            transform: 'rotate(45deg)',
                            borderRight: '1px solid rgba(145, 158, 171, 0.12)',
                            borderBottom: '1px solid rgba(145, 158, 171, 0.12)',
                            zIndex: 1,
                        }
                    },
                }}
            >
                <>
                    <MenuItem onClick={handleView} sx={{ borderRadius: "var(--shape-borderRadius-sm)", py: 1 }}>
                        <ListItemIcon sx={{ minWidth: '24px !important', mr: 1.5 }}>
                            <EyeIcon sx={{ width: 20, height: 20, mr: 0 }} />
                        </ListItemIcon>
                        <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}>Chi tiết</ListItemText>
                    </MenuItem>
                    {canEdit && (
                        <MenuItem onClick={handleEdit} sx={{ borderRadius: "var(--shape-borderRadius-sm)", py: 1 }}>
                            <ListItemIcon sx={{ minWidth: '24px !important', mr: 1.5 }}>
                                <EditIcon sx={{ width: 20, height: 20, mr: 0 }} />
                            </ListItemIcon>
                            <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}>Chỉnh sửa</ListItemText>
                        </MenuItem>
                    )}
                    {canDelete && (
                        <MenuItem onClick={handleDelete} sx={{ borderRadius: "var(--shape-borderRadius-sm)", py: 1, color: 'error.main' }}>
                            <ListItemIcon sx={{ minWidth: '24px !important', mr: 1.5, color: 'error.main' }}>
                                <DeleteIcon sx={{ width: 20, height: 20, mr: 0 }} />
                            </ListItemIcon>
                            <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}>Xóa</ListItemText>
                        </MenuItem>
                    )}
                </>
            </Popover>
        </Box>
    );
};
