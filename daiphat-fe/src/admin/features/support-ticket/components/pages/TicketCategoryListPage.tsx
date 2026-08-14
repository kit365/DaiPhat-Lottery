"use client";

import { PageHeader } from '../../../../components/ui/PageHeader';
import { prefixAdmin } from '../../../../constants/routes';
import { TicketCategoryList } from '../sections/TicketCategoryList';

export const TicketCategoryListPage = () => {
    return (
        <>
            <PageHeader
                title="Danh mục khiếu nại"
                breadcrumbItems={[
                    { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
                    { label: 'Khiếu nại', to: `/${prefixAdmin}/support-tickets/list` },
                    { label: 'Danh mục' },
                ]}
            />
            <TicketCategoryList />
        </>
    );
};
