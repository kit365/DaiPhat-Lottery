import { IconButton } from '@mui/material';
import { GridRenderCellParams } from '@mui/x-data-grid';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes';
import { PERMISSIONS } from '../../../constants/permission.constants';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { getSupplierStatusLabel, getSupplierTypeLabel } from './supplierLabels';

const getStatusBadgeStyle = (isActive?: boolean) =>
    isActive
        ? {
              label: getSupplierStatusLabel(true),
              bg: 'var(--palette-info-lighter)',
              text: 'var(--palette-info-dark)',
          }
        : {
              label: getSupplierStatusLabel(false),
              bg: 'var(--palette-error-lighter)',
              text: 'var(--palette-error-dark)',
          };

export const RenderNameCell = (params: GridRenderCellParams) => (
    <span className="supplier-title" style={{ fontWeight: 600 }}>
        {params.row.name}
    </span>
);

export const RenderTypeCell = (params: GridRenderCellParams) =>
    params.row.typeLabel || getSupplierTypeLabel(params.row.type);

export const RenderStatusCell = (params: GridRenderCellParams) => {
    const { label, bg, text } = getStatusBadgeStyle(params.row.isActive);

    return (
        <span
            className="inline-flex items-center justify-center leading-1.5 min-w-[1.5rem] h-[1.5rem] text-[0.75rem] px-[6px] font-[700] rounded-[6px]"
            style={{
                backgroundColor: bg,
                color: text,
            }}
        >
            {label}
        </span>
    );
};

export const RenderActionsCell = (params: GridRenderCellParams) => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const roleCode = typeof user?.role === 'string' ? user.role : user?.role?.code || '';
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'SUPER_ADMIN';
    const canEdit =
        isAdmin || Boolean(user?.permissions?.includes(PERMISSIONS.SUPPLIER.EDIT));
    const id = params.row.id;

    if (!canEdit) {
        return null;
    }

    return (
        <IconButton
            size="small"
            aria-label="Sửa"
            onClick={() => navigate(ROUTES.ADMIN.SUPPLIER.EDIT(id))}
            sx={{ color: 'var(--palette-text-secondary)' }}
        >
            <EditOutlinedIcon fontSize="small" />
        </IconButton>
    );
};
