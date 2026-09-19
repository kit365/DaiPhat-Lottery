import { Box, Stack, Typography, Tooltip } from '@mui/material';
import { formatVnd } from '../../../import-batch/utils/importCostCalculator';
import type { SupplierSettlement } from '../../types/supplierSettlement.type';

interface Props {
    settlement: SupplierSettlement;
}

export const SettlementOverviewSummary = ({ settlement }: Props) => {
    const isExpired = settlement.isReturnExpired;
    const importValue = settlement.totalImportValue || 0;
    const returnValue = settlement.totalReturnValue || 0;
    const paidValue = settlement.totalPaidAmount || 0;
    const remainingValue = settlement.remainingAmount || 0;
    const isOverdue = settlement.status === 'RECEIPT_OVERDUE';
    const isSettled = settlement.status === 'COMPLETED' || settlement.status === 'CLOSED';

    // Calculate total expected payment
    const expectedTotal = Math.max(importValue - returnValue, 0);
    const progress = expectedTotal > 0 ? Math.min((paidValue / expectedTotal) * 100, 100) : (paidValue > 0 ? 100 : 0);

    return (
        <Box sx={{ pt: 1, pb: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems="center" justifyContent="space-between">
                
                {/* Left side: Financial breakdown */}
                <Stack direction="row" spacing={4} sx={{ flex: 1, width: '100%' }}>
                    <Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={600} mb={0.5}>Tổng giá trị nhập</Typography>
                        <Typography variant="h6" fontWeight={800}>{formatVnd(importValue)}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={600} mb={0.5}>
                            {isExpired ? 'Giá trị quá hạn trả' : 'Tổng giá trị trả'}
                        </Typography>
                        <Typography variant="h6" fontWeight={800} color={isExpired ? 'error.main' : 'text.primary'}>
                            {isExpired ? formatVnd(settlement.expiredReturnValue || 0) : formatVnd(returnValue)}
                        </Typography>
                        {isExpired && (
                            <Typography variant="caption" color="error.main" display="block">Vé chưa kịp bàn giao</Typography>
                        )}
                    </Box>
                    <Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={600} mb={0.5}>Đã thanh toán</Typography>
                        <Typography variant="h6" fontWeight={800} color="success.main">{formatVnd(paidValue)}</Typography>
                    </Box>
                </Stack>

                {/* Right side: Remaining and Progress */}
                <Box sx={{ 
                    minWidth: { xs: '100%', md: '300px' }, 
                    p: 2, 
                    borderRadius: '12px',
                    bgcolor: 'rgba(0,0,0,0.02)',
                    border: '1px solid rgba(0,0,0,0.05)'
                }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-end" mb={1.5}>
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>Còn phải trả</Typography>
                        <Typography variant="h5" fontWeight={800} color={isOverdue ? 'error.main' : 'text.primary'}>
                            {formatVnd(remainingValue)}
                        </Typography>
                    </Stack>
                    
                    <Tooltip title={`${Math.round(progress)}% hoàn thành`} arrow placement="top">
                        <Box>
                            <Box sx={{ h: 6, w: '100%', bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 10, overflow: 'hidden' }}>
                                <Box 
                                    sx={{ 
                                        height: '100%', 
                                        width: `${progress}%`, 
                                        transition: 'width 0.5s ease',
                                        bgcolor: isSettled ? 'success.main' : isOverdue ? 'error.main' : 'success.main',
                                        borderRadius: 10 
                                    }} 
                                />
                            </Box>
                            <Stack direction="row" justifyContent="space-between" mt={1}>
                                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                    Tiến độ thanh toán
                                </Typography>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                    {Math.round(progress)}%
                                </Typography>
                            </Stack>
                        </Box>
                    </Tooltip>
                </Box>
            </Stack>
        </Box>
    );
};
