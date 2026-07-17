import { Title } from '../../../../components/ui/Title';
import { Breadcrumb } from '../../../../components/ui/Breadcrumb';
import { prefixAdmin } from '../../../../constants/routes';
import { SupportTicketList } from '../sections/SupportTicketList';

export const SupportTicketListPage = () => {
    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Quản lý khiếu nại / Hỗ trợ" />
                    <Breadcrumb
                        items={[
                            { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
                            { label: 'Khiếu nại / Hỗ trợ' },
                        ]}
                    />
                </div>
            </div>
            <SupportTicketList />
        </>
    );
};
