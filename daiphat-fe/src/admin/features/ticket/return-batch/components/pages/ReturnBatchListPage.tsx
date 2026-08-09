"use client";

import { PageHeader } from '../../../../../components/ui/PageHeader';
import { ROUTES } from '../../../../../constants/routes';
import { useReturnBatchList } from '../../hooks/useReturnBatch';
import { ReturnBatchList } from '../sections/ReturnBatchList';

export const ReturnBatchListPage = () => {
    const listHook = useReturnBatchList();

    return (
        <>
            <PageHeader
                title="Danh sách phiếu trả vé"
                breadcrumbItems={[
                    { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                    { label: 'Phiếu trả vé' },
                ]}
            />

            <ReturnBatchList listHook={listHook} />
        </>
    );
};
