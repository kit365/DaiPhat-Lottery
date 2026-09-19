import { AdminStatusBadge } from '@/admin/components/ui/AdminStatusBadge';
import {
    REFUND_PROCESSING_URGENCY_LABELS,
    RefundProcessingUrgency,
} from '@/types/refund.type';
const URGENCY_MODIFIERS: Record<
    RefundProcessingUrgency,
    string
> = {
    [RefundProcessingUrgency.ON_TIME]: 'admin-status-badge--success',
    [RefundProcessingUrgency.NEAR_DEADLINE]: 'admin-status-badge--pending',
    [RefundProcessingUrgency.OVERDUE]: 'admin-status-badge--inactive',
    [RefundProcessingUrgency.NOT_APPLICABLE]: '',
};

interface RefundProcessingStatusBadgeProps {
    urgency?: RefundProcessingUrgency;
}

export const RefundProcessingStatusBadge = ({ urgency }: RefundProcessingStatusBadgeProps) => {
    if (!urgency || urgency === RefundProcessingUrgency.NOT_APPLICABLE) {
        return null;
    }

    return (
        <AdminStatusBadge
            label={REFUND_PROCESSING_URGENCY_LABELS[urgency]}
            modifier={URGENCY_MODIFIERS[urgency]}
        />
    );
};
