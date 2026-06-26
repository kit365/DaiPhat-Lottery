import { useEffect, useState } from 'react';
import { Alert, Box, Typography } from '@mui/material';
import dayjs from 'dayjs';
import {
    computeProcessingSecondsLeft,
    formatProcessingCountdown,
    RefundProcessingUrgency,
    RefundRequestStatus,
} from '../../../../types/refund.type';
import { RefundProcessingStatusBadge } from './RefundProcessingStatusBadge';

interface ProcessingDeadlineCardProps {
    status: RefundRequestStatus;
    processingDeadlineAt?: string;
    remainingProcessingSeconds?: number;
    processingUrgency?: RefundProcessingUrgency;
}

export const ProcessingDeadlineCard = ({
    status,
    processingDeadlineAt,
    remainingProcessingSeconds,
    processingUrgency,
}: ProcessingDeadlineCardProps) => {
    const [secondsLeft, setSecondsLeft] = useState(() =>
        computeProcessingSecondsLeft(processingDeadlineAt, remainingProcessingSeconds)
    );

    useEffect(() => {
        setSecondsLeft(
            computeProcessingSecondsLeft(processingDeadlineAt, remainingProcessingSeconds)
        );
    }, [processingDeadlineAt, remainingProcessingSeconds]);

    useEffect(() => {
        if (
            status === RefundRequestStatus.EXPIRED
            || processingUrgency === RefundProcessingUrgency.NOT_APPLICABLE
            || secondsLeft <= 0
        ) {
            return;
        }

        const timer = window.setInterval(() => {
            setSecondsLeft(computeProcessingSecondsLeft(processingDeadlineAt));
        }, 1000);

        return () => window.clearInterval(timer);
    }, [status, processingDeadlineAt, processingUrgency, secondsLeft]);

    if (
        processingUrgency === RefundProcessingUrgency.NOT_APPLICABLE
        && status !== RefundRequestStatus.EXPIRED
    ) {
        return null;
    }

    const isExpired = status === RefundRequestStatus.EXPIRED || secondsLeft <= 0;
    const urgency = isExpired ? RefundProcessingUrgency.OVERDUE : processingUrgency;

    return (
        <Alert
            severity={
                urgency === RefundProcessingUrgency.OVERDUE
                    ? 'error'
                    : urgency === RefundProcessingUrgency.NEAR_DEADLINE
                      ? 'warning'
                      : 'info'
            }
            sx={{ mb: 3 }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                    <Typography fontWeight={600} gutterBottom>
                        Hạn xử lý
                    </Typography>
                    {processingDeadlineAt && (
                        <Typography variant="body2">
                            Hạn chót: {dayjs(processingDeadlineAt).format('DD/MM/YYYY HH:mm')}
                        </Typography>
                    )}
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {isExpired ? 'Đã quá hạn xử lý' : formatProcessingCountdown(secondsLeft)}
                    </Typography>
                </Box>
                <RefundProcessingStatusBadge urgency={urgency} />
            </Box>
        </Alert>
    );
};
