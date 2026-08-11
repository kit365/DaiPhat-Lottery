import { Chip } from '@mui/material';
import {
    REFUND_PROCESSING_URGENCY_LABELS,
    RefundProcessingUrgency,
} from '@/types/refund.type';

const URGENCY_COLORS: Record<
    RefundProcessingUrgency,
    'default' | 'success' | 'warning' | 'error'
> = {
    [RefundProcessingUrgency.ON_TIME]: 'success',
    [RefundProcessingUrgency.NEAR_DEADLINE]: 'warning',
    [RefundProcessingUrgency.OVERDUE]: 'error',
    [RefundProcessingUrgency.NOT_APPLICABLE]: 'default',
};

interface RefundProcessingStatusBadgeProps {
    urgency?: RefundProcessingUrgency;
}

export const RefundProcessingStatusBadge = ({ urgency }: RefundProcessingStatusBadgeProps) => {
    if (!urgency || urgency === RefundProcessingUrgency.NOT_APPLICABLE) {
        return null;
    }

    return (
        <Chip
            size="small"
            label={REFUND_PROCESSING_URGENCY_LABELS[urgency]}
            color={URGENCY_COLORS[urgency]}
            variant="outlined"
        />
    );
};
