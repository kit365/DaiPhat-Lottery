"use client";

import { useTranslation } from 'react-i18next';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { prefixAdmin, ROUTES } from '../../../../../constants/routes';
import { useSupplierSettlementList } from '../../hooks/useSupplierSettlement';
import { SupplierSettlementList } from '../sections/SupplierSettlementList';

export const SupplierSettlementListPage = () => {
    const { t } = useTranslation();
    const listHook = useSupplierSettlementList();

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Đối soát nhà cung cấp" />
                    <Breadcrumb
                        items={[
                            { label: t('admin.dashboard.title'), to: '/' },
                            { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                            { label: 'Đối soát NCC', to: ROUTES.ADMIN.SUPPLIER_SETTLEMENT.LIST },
                            { label: 'Danh sách' },
                        ]}
                    />
                </div>
            </div>

            <SupplierSettlementList listHook={listHook} />
        </>
    );
};
