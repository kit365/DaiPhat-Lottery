import { useSearchParams } from 'react-router-dom';
import { Title } from '../../../../components/ui/Title';
import { Breadcrumb } from '../../../../components/ui/Breadcrumb';
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
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title={title} />
                    <Breadcrumb
                        items={[
                            { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
                            { label: 'Khiếu nại', to: `/${prefixAdmin}/support-tickets/list` },
                            ...(isPrizePayout || isRefund
                                ? [{ label: title }]
                                : [{ label: 'Danh sách' }]),
                        ]}
                    />
                </div>
            </div>
            <SupportTicketList />
        </>
    );
};
