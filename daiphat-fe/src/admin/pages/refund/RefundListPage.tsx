import { PageHeader } from '../../components/ui/PageHeader';
import { prefixAdmin } from '../../constants/routes';
import { RefundList } from './sections/RefundList';

export const RefundListPage = () => {
    return (
        <>
            <PageHeader
                title="Quản lý hoàn tiền"
                breadcrumbItems={[
                    { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
                    { label: 'Hoàn tiền' },
                ]}
            />
            <RefundList />
        </>
    );
};
