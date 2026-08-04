"use client";

import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from '@/components/router-compat';
import { useTranslation } from 'react-i18next';
import { Breadcrumb } from '../../../../components/ui/Breadcrumb';
import { Title } from '../../../../components/ui/Title';
import { LoadingButton } from '../../../../components/ui/LoadingButton';
import { CanAccess } from '../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../constants/permission.constants';
import { prefixAdmin, ROUTES } from '../../../../constants/routes';
import { useSupplierList } from '../../hooks/useSupplier';
import { SupplierList } from '../sections/SupplierList';

export const SupplierListPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const supplierHook = useSupplierList();

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Danh sách nhà cung cấp" />
                    <Breadcrumb
                        items={[
                            { label: t('admin.dashboard.title'), to: '/' },
                            { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                            { label: 'Nhà cung cấp', to: ROUTES.ADMIN.SUPPLIER.LIST },
                            { label: 'Danh sách' },
                        ]}
                    />
                </div>
                <CanAccess permission={PERMISSIONS.SUPPLIER.CREATE}>
                    <LoadingButton
                        onClick={() => navigate(ROUTES.ADMIN.SUPPLIER.CREATE)}
                        label="Thêm nhà cung cấp"
                        startIcon={<AddIcon />}
                        sx={{
                            minHeight: '2.25rem',
                            padding: 'var(--shape-borderRadius-sm) calc(2 * var(--spacing))',
                        }}
                    />
                </CanAccess>
            </div>

            <SupplierList supplierHook={supplierHook} />
        </>
    );
};
