"use client";

import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from '@/components/router-compat';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { Button } from '../../../../components/ui/Button';
import { CanAccess } from '../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../constants/permission.constants';
import { prefixAdmin, ROUTES } from '../../../../constants/routes';
import { useSupplierList } from '../../hooks/useSupplier';
import { SupplierList } from '../sections/SupplierList';

export const SupplierListPage = () => {
    const navigate = useNavigate();
    const supplierHook = useSupplierList();

    return (
        <>
            <PageHeader
                title="Danh sách nhà cung cấp"
                breadcrumbItems={[
                    { label: 'Bảng điều khiển', to: '/' },
                    { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                    { label: 'Nhà cung cấp', to: ROUTES.ADMIN.SUPPLIER.LIST },
                    { label: 'Danh sách' },
                ]}
                action={
                    <CanAccess permission={PERMISSIONS.SUPPLIER.CREATE}>
                        <Button
                            onClick={() => navigate(ROUTES.ADMIN.SUPPLIER.CREATE)}
                            label="Thêm nhà cung cấp"
                            startIcon={<AddIcon />}
                            sx={{
                                minHeight: '2.25rem',
                                padding: 'var(--shape-borderRadius-sm) calc(2 * var(--spacing))',
                            }}
                        />
                    </CanAccess>
                }
            />

            <SupplierList supplierHook={supplierHook} />
        </>
    );
};
