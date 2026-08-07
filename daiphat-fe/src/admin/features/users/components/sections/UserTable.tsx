"use client";

import { RoleEnum } from "../../../../../types/role.type";
import React, { useMemo } from 'react';
import { useNavigate } from '@/components/router-compat';
import { DataGrid } from '@mui/x-data-grid';
import { Box, CircularProgress } from '@mui/material';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import { PERMISSIONS } from '../../../../constants/permission.constants';
import { getColumnsConfig } from '../configs/column.config';
import { PaginationMetadata } from '../../../../../types/api.type';
import { dataGridStyles } from '../../../../shared/data-grid';
import { DATA_GRID_LOCALE_VN } from "../../../../../shared/components/DataTable/localeText.config";
import { AdminRowActionsMenu } from "../../../../components/ui/AdminRowActionsMenu";

interface UserTableProps {
    data: any[];
    isLoading: boolean;
    pagination?: PaginationMetadata;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
    onRefresh: () => void;
    isClient?: boolean;
}

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
    
    const roleCode = typeof user?.role === 'string' ? user.role : (user?.role?.code || "");
    const isAdmin = roleCode === RoleEnum.ADMIN || roleCode === "SUPER_ADMIN";
    
    const accountOrUser = isClient ? PERMISSIONS.USER : PERMISSIONS.ACCOUNT;

    const canEdit = isAdmin || Boolean(user?.permissions?.includes(accountOrUser.EDIT));
    const canDelete = isAdmin || Boolean(user?.permissions?.includes(accountOrUser.DELETE));
    const canView = isAdmin || Boolean(user?.permissions?.includes(accountOrUser.VIEW));

    const columns = useMemo(() => {
        const baseColumns = getColumnsConfig(
            () => {},
            () => {},
            () => {},
            { canEdit: false, canDelete: false, canView: false },
            pagination?.currentPage || 1,
            pagination?.limit || 10,
            isClient
        ).filter(c => c.field !== 'actions');

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
                    <AdminRowActionsMenu
                        items={[
                            ...(canView
                                ? [{
                                    id: 'view',
                                    label: 'Chi tiết',
                                    icon: 'view',
                                    onClick: () => navigate(
                                        isClient
                                            ? `/admin/account-user/detail/${params.row.id}`
                                            : `/admin/account-admin/detail/${params.row.id}`
                                    ),
                                }]
                                : []),
                            ...(canEdit
                                ? [{
                                    id: 'edit',
                                    label: 'Chỉnh sửa',
                                    icon: 'edit',
                                    onClick: () => navigate(
                                        isClient
                                            ? `/admin/account-user/edit/${params.row.id}`
                                            : `/admin/account-admin/edit/${params.row.id}`
                                    ),
                                }]
                                : []),
                            ...(canDelete
                                ? [{
                                    id: 'delete',
                                    label: 'Xóa',
                                    icon: 'delete',
                                    onClick: () => console.log('Delete', params.row.id),
                                    danger: true,
                                }]
                                : []),
                        ]}
                    />
                )
            }
        ];
    }, [pagination?.currentPage, pagination?.limit, isClient, canView, canEdit, canDelete, navigate]);

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
                    onPageChange(newModel.page + 1);
                    onLimitChange(newModel.pageSize);
                }}
                pageSizeOptions={[10, 25, 50]}
                disableColumnMenu
                disableColumnSorting
                disableRowSelectionOnClick
                density="comfortable"
                localeText={DATA_GRID_LOCALE_VN}
                className="admin-datagrid"
                sx={dataGridStyles}
                slots={{
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
        </Box>
    );
};
