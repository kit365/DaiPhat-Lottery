"use client";

import { Box, CircularProgress, Typography } from '@mui/material';
import { useNavigate, useParams } from '@/components/router-compat';
import { PageHeader } from '../../../../components/ui/PageHeader';
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
            <PageHeader
                title="Chi tiết nhà cung cấp"
                breadcrumbItems={[
                    { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                    { label: 'Nhà cung cấp', to: ROUTES.ADMIN.SUPPLIER.LIST },
                    { label: supplier.name },
                ]}
                action={
                    <CanAccess permission={PERMISSIONS.SUPPLIER.EDIT}>
                        <LoadingButton
                            label="Chỉnh sửa"
                            className="btn-primary-admin"
                            onClick={() => navigate(ROUTES.ADMIN.SUPPLIER.EDIT(supplier.id))}
                        />
                    </CanAccess>
                }
            />

            <SupplierInfoCard supplier={supplier} />
        </Box>
    );
};
