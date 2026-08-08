import { Button } from '@mui/material';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { CanAccess } from '../../components/auth/CanAccess';
import { PERMISSIONS } from '../../constants/permission.constants';
import { prefixAdmin } from '../../constants/routes';
import { PrizePayoutList } from './sections/PrizePayoutList';

export const PrizePayoutListPage = () => {
    const navigate = useNavigate();

    return (
        <>
            <PageHeader
                title="Quản lý trả thưởng"
                breadcrumbItems={[
                            { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
                            { label: 'Trả thưởng' },
                        ]}
                action={
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
                }
            />
            <PrizePayoutList />
        </>
    );
};
