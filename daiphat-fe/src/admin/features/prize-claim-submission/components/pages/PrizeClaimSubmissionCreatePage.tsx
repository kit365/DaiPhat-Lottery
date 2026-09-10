"use client";

import { Box } from '@mui/material';
import { useEffect, useRef } from 'react';
import { ROUTES } from '@/admin/constants/routes';
import { useAdminRouter } from '@/admin/hooks/useAdminRouter';
import { useCreatePrizeClaimDraft } from '../../hooks/usePrizeClaimSubmission';

export const PrizeClaimSubmissionCreatePage = () => {
    const router = useAdminRouter();
    const { mutateAsync } = useCreatePrizeClaimDraft();
    const hasStarted = useRef(false);

    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;

        const createAndRedirect = async () => {
            try {
                const res = await mutateAsync();
                const id = res?.data?.id;
                if (id) {
                    router.replace(ROUTES.ADMIN.PRIZE_CLAIM_SUBMISSIONS.DETAIL(id));
                } else {
                    router.replace(ROUTES.ADMIN.PRIZE_CLAIM_SUBMISSIONS.LIST);
                }
            } catch {
                router.replace(ROUTES.ADMIN.PRIZE_CLAIM_SUBMISSIONS.LIST);
            }
        };

        void createAndRedirect();
    }, [mutateAsync, router]);

    return (
        <Box sx={{ py: 5, textAlign: 'center', color: 'text.secondary' }}>
            Đang tạo phiếu nộp...
        </Box>
    );
};
