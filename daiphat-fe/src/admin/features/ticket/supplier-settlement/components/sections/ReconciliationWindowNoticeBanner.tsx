"use client";

import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import { Box, Paper, Stack, Typography } from '@mui/material';
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
        <Paper
            elevation={0}
            sx={{
                mb: 2.5,
                p: { xs: 1.75, sm: 2 },
                borderRadius: '14px',
                border: '1px solid #bfdbfe',
                bgcolor: '#f0f7ff',
                background: 'linear-gradient(135deg, #f0f7ff 0%, #f8fafc 100%)',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.04)',
                display: 'flex',
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                flexWrap: { xs: 'wrap', md: 'nowrap' },
                gap: 2,
            }}
        >
            <Stack direction="row" spacing={1.75} alignItems="flex-start" sx={{ flex: 1 }}>
                <Box
                    sx={{
                        width: 42,
                        height: 42,
                        borderRadius: '10px',
                        bgcolor: '#dbeafe',
                        color: '#1d4ed8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 1px 3px rgba(37, 99, 235, 0.1)',
                    }}
                >
                    <AccessTimeOutlinedIcon sx={{ fontSize: '1.35rem' }} />
                </Box>

                <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.925rem' }}>
                            Chưa đến thời gian mở đối soát
                        </Typography>

                        {formattedStartTime && (
                            <AdminStatusBadge
                                label={`Mở lúc: ${formattedStartTime}`}
                                modifier="admin-status-badge--active"
                            />
                        )}
                    </Stack>

                    <Typography variant="body2" color="#475569" sx={{ fontSize: '0.825rem', lineHeight: 1.5 }}>
                        {settlementBufferMinutes === 0 ? (
                            'Kỳ đối soát sẽ sẵn sàng để kiểm tra và đối chiếu ngay khi hệ thống hoàn tất chốt số liệu trong ngày.'
                        ) : variant === 'inspect' ? (
                            'Kỳ đối soát đang trong thời gian chờ chốt số liệu vé và trả vé theo quy định với nhà cung cấp. Các thao tác đối chiếu tạm thời được khóa cho đến khi mở phiên.'
                        ) : (
                            'Hệ thống đang trong thời gian chờ chốt số liệu vé và xử lý trả vé theo quy định với nhà cung cấp. Nút "Tiến hành kiểm tra" sẽ tự động được kích hoạt khi đến giờ mở đối soát.'
                        )}
                    </Typography>
                </Box>
            </Stack>

            <Box sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, flexShrink: 0 }}>
                <AdminStatusBadge
                    label="Tạm khóa kiểm tra"
                    modifier="admin-status-badge--draft"
                />
            </Box>
        </Paper>
    );
};
