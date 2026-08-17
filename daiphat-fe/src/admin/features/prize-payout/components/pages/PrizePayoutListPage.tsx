"use client";

import AddIcon from '@mui/icons-material/Add';
import { useAdminRouter } from '@/admin/hooks/useAdminRouter';
import { Button } from '@/admin/components/ui/Button';
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
                            onClick={() => router.push(`/${prefixAdmin}/prize-payouts/create`)}
                            className="btn-primary-admin"
                            variant="contained"
                            startIcon={<AddIcon />}
                            label="Tạo tại quầy"
                        />
                    </CanAccess>
                }
            />
            <PrizePayoutList />
        </>
    );
};
