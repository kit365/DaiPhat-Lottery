import { Alert } from '@mui/material';
import type { OrderCutoffPhase } from '../../hooks/useOrder';

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

    const preparingHint =
        preparingCount > 0 ? ` · ${preparingCount} đơn đang chuẩn bị` : '';

    return (
        <Alert severity="warning" sx={{ mb: 2.5, borderRadius: '12px' }}>
            {phase === 'past'
                ? `Đã qua giờ chốt xổ (${cutoffLabel})${preparingHint}.`
                : `Sắp đến giờ chốt xổ (${cutoffLabel})${preparingHint}.`}
        </Alert>
    );
};
