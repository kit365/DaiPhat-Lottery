import { Button } from '@mui/material';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { Title } from '../../components/ui/Title';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { CanAccess } from '../../components/auth/CanAccess';
import { PERMISSIONS } from '../../constants/permission.constants';
import { prefixAdmin } from '../../constants/routes';
import { PrizePayoutList } from './sections/PrizePayoutList';

export const PrizePayoutListPage = () => {
    const navigate = useNavigate();

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
                <CanAccess permission={PERMISSIONS.PRIZE_PAYOUT.PROCESS}>
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<Icon icon="solar:add-circle-bold-duotone" />}
                        onClick={() => navigate(`/${prefixAdmin}/prize-payouts/create`)}
                        sx={{ height: 36, fontWeight: 700, textTransform: 'none', borderRadius: '8px' }}
                    >
                        Tạo tại quầy
                    </Button>
                </CanAccess>
            </div>
            <PrizePayoutList />
        </>
    );
};
