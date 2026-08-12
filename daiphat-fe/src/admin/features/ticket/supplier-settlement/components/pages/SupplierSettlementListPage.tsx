"use client";

import { PageHeader } from '../../../../../components/ui/PageHeader';
import { prefixAdmin, ROUTES } from '../../../../../constants/routes';
import { useSupplierSettlementList } from '../../hooks/useSupplierSettlement';
import { SupplierSettlementList } from '../sections/SupplierSettlementList';

export const SupplierSettlementListPage = () => {
    const listHook = useSupplierSettlementList();

    return (
        <>
            <PageHeader
                title="Đối soát nhà cung cấp"
                breadcrumbItems={[
                            { label: 'Bảng điều khiển', to: '/' },
                            { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                            { label: 'Đối soát NCC', to: ROUTES.ADMIN.SUPPLIER_SETTLEMENT.LIST },
                            { label: 'Danh sách' },
                        ]}
            />

            <SupplierSettlementList listHook={listHook} />
        </>
    );
};
