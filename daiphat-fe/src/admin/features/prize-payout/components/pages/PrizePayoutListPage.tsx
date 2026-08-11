import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { Button } from '@mui/material';
import { Icon } from '@/admin/components/ui/AdminIcon';
import { PageHeader } from '@/admin/components/ui/PageHeader';
import { CanAccess } from '@/admin/components/auth/CanAccess';
import { PERMISSIONS } from '@/admin/constants/permission.constants';
import { prefixAdmin } from '@/admin/constants/routes';
import { PrizePayoutList } from '../sections/PrizePayoutList';

export const PrizePayoutListPage = () => {
    const router = useAdminRouter();

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
                        onClick={() => router.push(`/${prefixAdmin}/prize-payouts/create`)}
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
