import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { prefixAdmin } from '../../../../constants/routes';
import { SupportTicketList } from '../sections/SupportTicketList';

export const SupportTicketListPage = () => {
    const [searchParams] = useSearchParams();
    const filter = searchParams.get('filter');
    const isPrizePayout = filter === 'prize-payout';
    const isRefund = filter === 'refund';
    const title = isPrizePayout
        ? 'Khiếu nại trả thưởng'
        : isRefund
          ? 'Khiếu nại hoàn tiền'
          : 'Danh sách khiếu nại';

    return (
        <>
            <PageHeader
                title={title}
                breadcrumbItems={[
                            { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
                            { label: 'Khiếu nại', to: `/${prefixAdmin}/support-tickets/list` },
                            ...(isPrizePayout || isRefund
                                ? [{ label: title }]
                                : [{ label: 'Danh sách' }]),
                        ]}
            />
            <SupportTicketList />
        </>
    );
};
