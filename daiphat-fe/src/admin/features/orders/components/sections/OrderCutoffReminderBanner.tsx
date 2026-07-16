import { Alert, AlertTitle, Box, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import type { OrderCutoffPhase } from '../../../../hooks/useOrderDrawCutoff';

interface OrderCutoffReminderBannerProps {
    phase: OrderCutoffPhase;
    cutoffLabel: string;
    preparingCount: number;
    visible: boolean;
}

export const OrderCutoffReminderBanner = ({
    phase,
    cutoffLabel,
    preparingCount,
    visible,
}: OrderCutoffReminderBannerProps) => {
    if (!visible || phase === 'none') return null;

    const isPast = phase === 'past';

    return (
        <Alert
            severity={isPast ? 'error' : 'warning'}
            icon={
                <Icon
                    icon={isPast ? 'solar:danger-triangle-bold' : 'solar:clock-circle-bold'}
                    width={22}
                />
            }
            sx={{
                mb: 2.5,
                borderRadius: 'var(--shape-borderRadius-lg)',
                alignItems: 'flex-start',
                border: '1px solid',
                borderColor: isPast
                    ? 'var(--palette-error-light)'
                    : 'var(--palette-warning-light)',
                bgcolor: isPast
                    ? 'var(--palette-error-lighter)'
                    : 'var(--palette-warning-lighter)',
                '& .MuiAlert-message': { width: '100%' },
            }}
        >
            <AlertTitle sx={{ fontWeight: 700, mb: 0.5, fontSize: '0.9375rem' }}>
                {isPast
                    ? `Đã qua giờ chốt xổ (${cutoffLabel})`
                    : `Sắp đến giờ chốt xổ (${cutoffLabel})`}
            </AlertTitle>
            <Typography variant="body2" sx={{ color: 'inherit', opacity: 0.92 }}>
                {isPast
                    ? 'Vui lòng kiểm tra ngay tất cả đơn còn ở trạng thái Đang chuẩn bị và thông báo Operator càng sớm càng tốt.'
                    : 'Vui lòng ưu tiên xử lý các đơn ở trạng thái Đang chuẩn bị và thông báo Operator nếu cần.'}
            </Typography>
            {preparingCount > 0 && (
                <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.85 }}>
                        Đang có {preparingCount} đơn ở trạng thái Đang chuẩn bị
                    </Typography>
                </Box>
            )}
        </Alert>
    );
};
