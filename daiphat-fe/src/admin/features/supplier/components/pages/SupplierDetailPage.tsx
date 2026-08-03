"use client";

import { Box, CircularProgress, Typography } from '@mui/material';
import { useNavigate, useParams } from '@/components/router-compat';
import { Breadcrumb } from '../../../../components/ui/Breadcrumb';
import { Title } from '../../../../components/ui/Title';
import { LoadingButton } from '../../../../components/ui/LoadingButton';
import { CanAccess } from '../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../constants/permission.constants';
import { ROUTES } from '../../../../constants/routes';
import { useSupplierDetail } from '../../hooks/useSupplier';
import { SupplierInfoCard } from '../sections/SupplierInfoCard';

export const SupplierDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: supplier, isLoading, isError } = useSupplierDetail(id);

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
                <CircularProgress />
            </Box>
        );
    }

    if (isError || !supplier) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
                <Typography color="text.secondary">Không tìm thấy nhà cung cấp.</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <div className="mb-[calc(3*var(--spacing))] flex items-start justify-end gap-[calc(2*var(--spacing))]">
                <div className="mr-auto">
                    <Title title="Chi tiết nhà cung cấp" />
                    <Breadcrumb
                        items={[
                            { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                            { label: 'Nhà cung cấp', to: ROUTES.ADMIN.SUPPLIER.LIST },
                            { label: supplier.name },
                        ]}
                    />
                </div>
                <CanAccess permission={PERMISSIONS.SUPPLIER.EDIT}>
                    <LoadingButton
                        label="Chỉnh sửa"
                        className="btn-primary-admin"
                        onClick={() => navigate(ROUTES.ADMIN.SUPPLIER.EDIT(supplier.id))}
                    />
                </CanAccess>
            </div>

            <SupplierInfoCard supplier={supplier} />
        </Box>
    );
};
