import { Title } from '../../components/ui/Title';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { prefixAdmin } from '../../constants/routes';
import { PrizePayoutList } from './sections/PrizePayoutList';

export const PrizePayoutListPage = () => {
    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Quản lý trả thưởng" />
                    <Breadcrumb
                        items={[
                            { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
                            { label: 'Trả thưởng' },
                        ]}
                    />
                </div>
            </div>
            <PrizePayoutList />
        </>
    );
};
