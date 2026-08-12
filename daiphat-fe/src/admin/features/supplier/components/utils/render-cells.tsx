"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { Link } from '@mui/material';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { ROUTES } from '../../../../constants/routes';
import { PERMISSIONS } from '../../../../constants/permission.constants';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import { AdminRowActionsMenu } from '../../../../components/ui/AdminRowActionsMenu';
import { getSupplierStatusLabel, getSupplierTypeLabel } from '../../utils/supplierLabels';

export const RenderNameCell = (params: GridRenderCellParams) => {
    const router = useAdminRouter();
    const id = params.row.id;

    return (
        <Link
            href={ROUTES.ADMIN.SUPPLIER.DETAIL(id)}
            className="admin-cell-title"
            onClick={(e) => {
                e.preventDefault();
                router.push(ROUTES.ADMIN.SUPPLIER.DETAIL(id));
            }}
            underline="hover"
        >
            {params.row.name}
        </Link>
    );
};

export const RenderTypeCell = (params: GridRenderCellParams) => (
    <span className="admin-cell-text">
        {params.row.typeLabel || getSupplierTypeLabel(params.row.type)}
    </span>
);

export const RenderStatusCell = (params: GridRenderCellParams) => {
    const isActive = Boolean(params.row.isActive);
    const label = getSupplierStatusLabel(isActive);
    const modifier = isActive ? 'admin-status-badge--active' : 'admin-status-badge--inactive';

    return <span className={`admin-status-badge ${modifier}`}>{label}</span>;
};

export const RenderActionsCell = (params: GridRenderCellParams) => {
    const router = useAdminRouter();
    const { user } = useAuthStore();
    const roleCode = typeof user?.role === 'string' ? user.role : user?.role?.code || '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'SUPER_ADMIN';
    const canEdit = isAdmin || Boolean(user?.permissions?.includes(PERMISSIONS.SUPPLIER.EDIT));
    const id = params.row.id;

    if (!canEdit) {
        return null;
    }

    return (
        <AdminRowActionsMenu
            items={[
                {
                    id: 'edit',
                    label: 'Chỉnh sửa',
                    icon: 'edit',
                    onClick: () => router.push(ROUTES.ADMIN.SUPPLIER.EDIT(id)),
                },
            ]}
        />
    );
};
