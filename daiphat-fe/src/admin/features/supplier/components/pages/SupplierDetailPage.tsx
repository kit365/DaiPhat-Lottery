"use client";

import { Box, Typography } from '@mui/material';
import { useNavigate, useParams } from '@/components/router-compat';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { SpinnerLoading } from '../../../../components/ui/SpinnerLoading';
import { Button } from '../../../../components/ui/Button';
import { CanAccess } from '../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../constants/permission.constants';
import { ROUTES } from '../../../../constants/routes';
import { useSupplierDetail } from '../../hooks/useSupplier';
import { SupplierInfoCard } from '../sections/SupplierInfoCard';

export const SupplierDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: supplier, isLoading, isError } = useSupplierDetail(id);

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <PageHeader
                title="Chi tiết nhà cung cấp"
                breadcrumbItems={[
                    { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                    { label: 'Nhà cung cấp', to: ROUTES.ADMIN.SUPPLIER.LIST },
                    { label: supplier?.name ?? `#${id}` },
                ]}
                action={
                    supplier ? (
                        <CanAccess permission={PERMISSIONS.SUPPLIER.EDIT}>
                            <Button
                                label="Chỉnh sửa"
                                className="btn-primary-admin"
                                onClick={() => navigate(ROUTES.ADMIN.SUPPLIER.EDIT(supplier.id))}
                            />
                        </CanAccess>
                    ) : undefined
                }
            />

            {isLoading ? (
                <SpinnerLoading />
            ) : isError || !supplier ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
                    <Typography color="text.secondary">Không tìm thấy nhà cung cấp.</Typography>
                </Box>
            ) : (
                <SupplierInfoCard supplier={supplier} />
            )}
        </Box>
    );
};
