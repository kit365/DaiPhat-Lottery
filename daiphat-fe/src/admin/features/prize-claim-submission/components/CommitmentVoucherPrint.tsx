"use client";

import { Box, Card, Divider, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { formatPrizePayoutCurrency } from '@/types/prize-payout.type';

interface CommitmentVoucherPrintProps {
    voucherCode: string;
    agencyName: string;
    customerName: string;
    remainingAmount: number;
    paidAmountToDate: number;
    totalPrizeAmount: number;
    commitmentExpiresAt: string;
    createdAt: string;
    fundAdvanceNote?: string;
}

export const CommitmentVoucherPrint = (props: CommitmentVoucherPrintProps) => {
    const {
        voucherCode,
        agencyName,
        customerName,
        remainingAmount,
        paidAmountToDate,
        totalPrizeAmount,
        commitmentExpiresAt,
        createdAt,
        fundAdvanceNote,
    } = props;

    return (
        <Card
            sx={{
                maxWidth: 480,
                mx: 'auto',
                p: 3,
                border: '2px solid',
                borderColor: 'warning.main',
                borderRadius: 2,
            }}
        >
            <Typography
                variant="h6"
                sx={{ textAlign: 'center', fontWeight: 700, color: 'warning.dark', mb: 1 }}
            >
                PHIẾU CAM KẾT CHI TRẢ
            </Typography>
            <Typography
                variant="body2"
                sx={{ textAlign: 'center', color: 'text.secondary', mb: 2 }}
            >
                Cam kết trả nốt tiền trúng thưởng
            </Typography>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary">Mã tra cứu</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'primary.main' }}>
                    {voucherCode}
                </Typography>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Đại lý</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{agencyName}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Khách hàng</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{customerName}</Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Đã trả</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main', fontVariantNumeric: 'tabular-nums' }}>
                        {formatPrizePayoutCurrency(paidAmountToDate)}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Số tiền còn nợ</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main', fontVariantNumeric: 'tabular-nums' }}>
                        {formatPrizePayoutCurrency(remainingAmount)}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">Tổng giải thưởng</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {formatPrizePayoutCurrency(totalPrizeAmount)}
                    </Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Ngày cam kết</Typography>
                    <Typography variant="body2">{dayjs(createdAt).format('DD/MM/YYYY')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Hạn trả nốt</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.dark' }}>
                        {dayjs(commitmentExpiresAt).format('DD/MM/YYYY')}
                    </Typography>
                </Box>
                {fundAdvanceNote && (
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">Ghi chú</Typography>
                        <Typography variant="body2">{fundAdvanceNote}</Typography>
                    </Box>
                )}
            </Box>

            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', display: 'block' }}>
                Phiếu này là bằng chứng ràng buộc giữa đại lý và khách hàng.
                <br />
                Vui lòng giữ phiếu này để đối soát.
            </Typography>
        </Card>
    );
};
