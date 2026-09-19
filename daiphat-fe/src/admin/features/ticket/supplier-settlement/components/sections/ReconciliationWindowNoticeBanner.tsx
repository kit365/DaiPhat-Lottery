"use client";

import { Alert, Stack } from '@mui/material';
import dayjs from 'dayjs';
import { AdminStatusBadge } from '@/admin/components/ui/AdminStatusBadge';

interface Props {
    reconciliationWindowStartAt?: string | null;
    settlementBufferMinutes?: number | null;
    variant?: 'detail' | 'inspect';
}

export const ReconciliationWindowNoticeBanner = ({
    reconciliationWindowStartAt,
    settlementBufferMinutes,
    variant = 'detail',
}: Props) => {
    const formattedStartTime = reconciliationWindowStartAt
        ? dayjs(reconciliationWindowStartAt).format('HH:mm · DD/MM/YYYY')
        : null;

    return (
        <Alert 
            severity="info" 
            sx={{ mb: 2, alignItems: 'center', '& .MuiAlert-message': { flex: 1, p: 0 }, py: 0.5, px: 2 }}
            action={
                <AdminStatusBadge
                    label="Tạm khóa kiểm tra"
                    modifier="admin-status-badge--draft"
                />
            }
        >
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <strong>Chưa đến thời gian mở đối soát</strong>
                {formattedStartTime && (
                    <AdminStatusBadge
                        label={`Mở lúc: ${formattedStartTime}`}
                        modifier="admin-status-badge--active"
                    />
                )}
                <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                    {settlementBufferMinutes === 0 
                        ? 'Kỳ đối soát sẽ sẵn sàng khi hệ thống chốt xong số liệu.'
                        : 'Các thao tác đối chiếu tạm thời được khóa.'
                    }
                </span>
            </Stack>
        </Alert>
    );
};
