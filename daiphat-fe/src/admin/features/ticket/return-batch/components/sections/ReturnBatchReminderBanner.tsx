import { Alert, AlertTitle, Stack, Typography } from '@mui/material';
import { Icon } from '@/admin/components/ui/AdminIcon';
import { useMemo } from 'react';
import type { ReturnBatch } from '../../types/returnBatch.type';
import { formatMinutesUntilCutoff } from '../../utils/returnBatchLabels';

interface ReturnBatchReminderBannerProps {
    batches: ReturnBatch[];
}

export const ReturnBatchReminderBanner = ({ batches }: ReturnBatchReminderBannerProps) => {
    const { urgent, windowOnly } = useMemo(() => {
        const open = (batches || []).filter(
            (b) =>
                (b.status === 'PENDING_INSPECTION' || b.status === 'INSPECTING') &&
                !b.inspectionExpired
        );
        return {
            urgent: open.filter((b) => b.urgentReminder),
            windowOnly: open.filter((b) => b.inInspectionWindow && !b.urgentReminder),
        };
    }, [batches]);

    if (urgent.length === 0 && windowOnly.length === 0) {
        return null;
    }

    return (
        <Stack spacing={1.5} sx={{ mb: 3 }}>
            {urgent.length > 0 && (
                <Alert
                    severity="error"
                    icon={<Icon icon="solar:danger-triangle-bold" width={22} />}
                    sx={{
                        borderRadius: '12px',
                        alignItems: 'flex-start',
                        border: '1px solid',
                        borderColor: 'var(--palette-error-light)',
                        bgcolor: 'var(--palette-error-lighter)',
                        '& .MuiAlert-message': { width: '100%' },
                    }}
                >
                    <AlertTitle sx={{ fontWeight: 700, mb: 0.5, fontSize: '0.9375rem' }}>
                        Nhắc khẩn: sắp đến hạn trả vé NCC
                    </AlertTitle>
                    <Typography variant="body2" sx={{ opacity: 0.92 }}>
                        Còn ít thời gian trước giờ cắt trả. Vui lòng hoàn tất kiểm tra vé ngay.
                    </Typography>
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                        {urgent.map((b) => (
                            <Typography key={b.id} variant="caption" sx={{ fontWeight: 700, opacity: 0.9 }}>
                                #{b.id} · {b.supplierName || 'NCC'} · còn{' '}
                                {formatMinutesUntilCutoff(b.minutesUntilCutoff)} (hết hạn{' '}
                                {b.returnCutOffTime || '—'})
                            </Typography>
                        ))}
                    </Stack>
                </Alert>
            )}

            {windowOnly.length > 0 && (
                <Alert
                    severity="warning"
                    icon={<Icon icon="solar:clock-circle-bold" width={22} />}
                    sx={{
                        borderRadius: '12px',
                        alignItems: 'flex-start',
                        border: '1px solid',
                        borderColor: 'var(--palette-warning-light)',
                        bgcolor: 'var(--palette-warning-lighter)',
                        '& .MuiAlert-message': { width: '100%' },
                    }}
                >
                    <AlertTitle sx={{ fontWeight: 700, mb: 0.5, fontSize: '0.9375rem' }}>
                        Cửa sổ kiểm tra trả vé đã mở
                    </AlertTitle>
                    <Typography variant="body2" sx={{ opacity: 0.92 }}>
                        Đã vào khung kiểm tra (trước hạn trả − RETURN_BUFFER_TIME). Vui lòng bắt đầu kiểm
                        tra vé ngay.
                    </Typography>
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                        {windowOnly.map((b) => (
                            <Typography key={b.id} variant="caption" sx={{ fontWeight: 700, opacity: 0.9 }}>
                                #{b.id} · {b.supplierName || 'NCC'} · còn{' '}
                                {formatMinutesUntilCutoff(b.minutesUntilCutoff)} đến hạn trả (
                                {b.returnCutOffTime || '—'})
                            </Typography>
                        ))}
                    </Stack>
                </Alert>
            )}
        </Stack>
    );
};
