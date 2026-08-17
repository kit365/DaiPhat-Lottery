"use client";

import dayjs from 'dayjs';
import {
    Box,
    Chip,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import type {
    SettlementOverviewImportBatch,
    SettlementOverviewReturnBatch,
    SettlementStationPricing,
    SupplierSettlement,
    SupplierSettlementAdjustment,
} from '../../types/supplierSettlement.type';
import {
    formatSettlementMoney,
    formatSignedCashflow,
    toAgencyCashflow,
} from '../../utils/settlementCashflow';
import { resolveLiveSystemReturnQuantity } from '../../utils/settlementLabels';

interface Props {
    settlement: SupplierSettlement;
    importBatches?: SettlementOverviewImportBatch[];
    returnBatches?: SettlementOverviewReturnBatch[];
    stationPricing?: SettlementStationPricing[];
    adjustments?: SupplierSettlementAdjustment[];
}

const formatDate = (value?: string | null) => (value ? dayjs(value).format('DD/MM/YYYY') : '—');

const formatSignedQty = (value: number) => {
    if (!Number.isFinite(value) || value === 0) return '0';
    return `${value > 0 ? '+' : '−'}${Math.abs(value).toLocaleString('vi-VN')}`;
};

const qtyUnit = (qty: number, amount: number) => (qty > 0 ? amount / qty : 0);

const KpiTile = ({
    label,
    systemVal,
    actualVal,
    diffVal,
    isMoney,
}: {
    label: string;
    systemVal: string;
    actualVal: string;
    diffVal: string;
    isMoney?: boolean;
}) => {
    const matched = diffVal === '0' || diffVal === '0 VNĐ';
    return (
        <Paper
            elevation={0}
            sx={{
                p: 1.75,
                height: '100%',
                borderRadius: '14px',
                border: '1px solid',
                borderColor: matched ? '#bbf7d0' : '#e2e8f0',
                bgcolor: matched ? '#f0fdf4' : '#ffffff',
            }}
        >
            <Typography
                variant="caption"
                fontWeight={800}
                color="#64748b"
                sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '0.04em' }}
            >
                {label}
            </Typography>
            <Stack spacing={0.65}>
                <Stack direction="row" justifyContent="space-between" gap={1}>
                    <Typography variant="caption" color="#94a3b8">Hệ thống</Typography>
                    <Typography variant="body2" fontWeight={700}>{systemVal}{isMoney ? ' VNĐ' : ''}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" gap={1}>
                    <Typography variant="caption" color="#1d4ed8" fontWeight={700}>Thực tế</Typography>
                    <Typography variant="body2" fontWeight={800} color="#1e40af">
                        {actualVal}{isMoney ? ' VNĐ' : ''}
                    </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" gap={1}>
                    <Typography variant="caption" color="#64748b">Chênh lệch</Typography>
                    <Typography variant="body2" fontWeight={800} color={matched ? '#15803d' : '#be123c'}>
                        {diffVal}{isMoney && diffVal !== '—' ? ' VNĐ' : ''}
                    </Typography>
                </Stack>
            </Stack>
        </Paper>
    );
};

const MoneyTile = ({
    label,
    value,
    hint,
    tone = 'neutral',
}: {
    label: string;
    value: string;
    hint?: string;
    tone?: 'neutral' | 'blue' | 'green' | 'rose';
}) => {
    const palette = {
        neutral: { bg: '#f8fafc', border: '#e2e8f0', color: '#0f172a' },
        blue: { bg: '#eff6ff', border: '#dbeafe', color: '#1e40af' },
        green: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
        rose: { bg: '#fff1f2', border: '#fecdd3', color: '#be123c' },
    }[tone];
    return (
        <Paper
            elevation={0}
            sx={{
                p: 1.75,
                height: '100%',
                borderRadius: '14px',
                border: `1px solid ${palette.border}`,
                bgcolor: palette.bg,
            }}
        >
            <Typography
                variant="caption"
                fontWeight={800}
                color="#64748b"
                sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}
            >
                {label}
            </Typography>
            <Typography variant="h6" fontWeight={800} color={palette.color} sx={{ fontSize: '1.15rem' }}>
                {value} <Box component="span" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>VNĐ</Box>
            </Typography>
            {hint && (
                <Typography variant="caption" color="#94a3b8">
                    {hint}
                </Typography>
            )}
        </Paper>
    );
};

export const SettlementCompletionDashboard = ({
    settlement,
    importBatches = [],
    returnBatches = [],
    stationPricing = [],
    adjustments = [],
}: Props) => {
    const systemImportQty = settlement.systemImportQuantity ?? 0;
    const actualImportQty = settlement.actualTicketImportQuantity ?? systemImportQty;
    const systemReturnQty = resolveLiveSystemReturnQuantity(settlement, returnBatches);
    const actualReturnQty = settlement.actualReturnTicketQuantity ?? systemReturnQty;
    const systemImportVal = Number(settlement.systemImportValue ?? settlement.totalImportValue ?? 0);
    const actualImportVal = Number(settlement.actualTicketImportValue ?? systemImportVal);
    const systemReturnVal = Number(settlement.systemReturnValue ?? settlement.totalReturnValue ?? 0);
    const actualReturnVal = Number(settlement.actualReturnTicketValue ?? systemReturnVal);

    const importQtyDiff = actualImportQty - systemImportQty;
    const returnQtyDiff = actualReturnQty - systemReturnQty;
    const importValDiff = actualImportVal - systemImportVal;
    const returnValDiff = actualReturnVal - systemReturnVal;

    const initialVal = Number(settlement.initialEstimatedSettlementValue ?? 0);
    const finalVal = Number(settlement.finalSettlementValue ?? 0);
    const actualPaid = settlement.actualPaidAmount != null ? Number(settlement.actualPaidAmount) : null;
    const payableDiff = Number(settlement.settlementDifferenceAmount ?? finalVal - initialVal);
    const cashflowDiff = toAgencyCashflow(payableDiff);
    const remainingDiff =
        actualPaid != null ? Math.abs(actualPaid - finalVal) : null;

    const activeImportLots = importBatches.filter((batch) => batch.status !== 'CANCELLED');
    const activeReturnLots = returnBatches.filter((batch) => batch.status !== 'CANCELLED');
    const importLotTotalQty = activeImportLots.reduce((sum, batch) => sum + (batch.totalImportedQuantity ?? 0), 0);
    const importLotTotalVal = activeImportLots.reduce(
        (sum, batch) => sum + Number(batch.totalImportedCostValue ?? 0),
        0
    );
    const returnLotTotalQty = activeReturnLots.reduce((sum, batch) => sum + (batch.totalQuantity ?? 0), 0);
    const returnLotTotalVal = activeReturnLots.reduce(
        (sum, batch) => sum + Number(batch.totalReturnValue ?? 0),
        0
    );
    const settlementAdjustments = (adjustments || []).filter((row) => row.groupType === 'SETTLEMENT');

    return (
        <Box sx={{ mb: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }} flexWrap="wrap" gap={1}>
                <Box>
                    <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                        Tổng hợp hoàn tất đối soát
                    </Typography>
                    <Typography variant="caption" color="#64748b">
                        Số lượng, tiền chênh lệch, giá từng lô nhập và tổng nhập / trả của kỳ này
                    </Typography>
                </Box>
                <Chip
                    size="small"
                    color={importQtyDiff === 0 && returnQtyDiff === 0 && (remainingDiff == null || remainingDiff === 0) ? 'success' : 'warning'}
                    label={
                        importQtyDiff === 0 && returnQtyDiff === 0 && (remainingDiff == null || remainingDiff === 0)
                            ? 'Số liệu đã khớp'
                            : 'Còn chênh lệch'
                    }
                    sx={{ fontWeight: 800 }}
                />
            </Stack>

            <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KpiTile
                        label="Số lượng vé nhập"
                        systemVal={systemImportQty.toLocaleString('vi-VN')}
                        actualVal={actualImportQty.toLocaleString('vi-VN')}
                        diffVal={formatSignedQty(importQtyDiff)}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KpiTile
                        label="Số lượng vé trả"
                        systemVal={systemReturnQty.toLocaleString('vi-VN')}
                        actualVal={actualReturnQty.toLocaleString('vi-VN')}
                        diffVal={formatSignedQty(returnQtyDiff)}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KpiTile
                        label="Tổng tiền nhập"
                        systemVal={formatSettlementMoney(systemImportVal)}
                        actualVal={formatSettlementMoney(actualImportVal)}
                        diffVal={formatSignedCashflow(importValDiff)}
                        isMoney
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KpiTile
                        label="Tổng tiền trả"
                        systemVal={formatSettlementMoney(systemReturnVal)}
                        actualVal={formatSettlementMoney(actualReturnVal)}
                        diffVal={formatSignedCashflow(returnValDiff)}
                        isMoney
                    />
                </Grid>
            </Grid>

            <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <MoneyTile label="Tạm tính ban đầu" value={formatSettlementMoney(initialVal)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <MoneyTile
                        label={finalVal < 0 ? 'NCC hoàn / ghi có' : 'Chênh lệch sau đối soát'}
                        value={formatSettlementMoney(Math.abs(finalVal))}
                        tone="blue"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <MoneyTile
                        label="Tiền chênh lệch"
                        value={formatSignedCashflow(cashflowDiff)}
                        hint={cashflowDiff === 0 ? 'Không đổi so với tạm tính' : cashflowDiff < 0 ? 'Phát sinh chi phí' : 'Dư / giảm chi'}
                        tone={cashflowDiff === 0 ? 'neutral' : cashflowDiff < 0 ? 'rose' : 'green'}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <MoneyTile
                        label={actualPaid != null && actualPaid < 0 ? 'Số tiền NCC hoàn thực tế' : 'Số tiền cần trả thực tế'}
                        value={actualPaid != null ? formatSettlementMoney(Math.abs(actualPaid)) : '—'}
                        hint={
                            remainingDiff == null
                                ? undefined
                                : remainingDiff === 0
                                  ? 'Khớp chênh lệch sau đối soát'
                                  : `Còn lệch ${formatSettlementMoney(remainingDiff)} VNĐ`
                        }
                        tone={remainingDiff === 0 ? 'green' : remainingDiff == null ? 'neutral' : 'rose'}
                    />
                </Grid>
            </Grid>

            <Paper elevation={0} sx={{ mb: 2, borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <Box sx={{ px: 2, py: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <Typography variant="subtitle2" fontWeight={800}>
                        Giá tiền từng lô nhập
                    </Typography>
                </Box>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 800, color: '#64748b' }}>Mã lô</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: '#64748b' }}>Ngày</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: '#64748b' }}>SL</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: '#64748b' }}>Đơn giá</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: '#64748b' }}>Thành tiền</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {activeImportLots.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5}>
                                    <Typography variant="body2" color="text.secondary">Không có lô nhập trong kỳ.</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            activeImportLots.map((batch) => {
                                const qty = batch.totalImportedQuantity ?? 0;
                                const amount = Number(batch.totalImportedCostValue ?? 0);
                                return (
                                    <TableRow key={batch.id}>
                                        <TableCell sx={{ fontWeight: 700 }}>{batch.batchCode || `#${batch.id}`}</TableCell>
                                        <TableCell>{formatDate(batch.drawDate)}</TableCell>
                                        <TableCell align="right">{qty.toLocaleString('vi-VN')}</TableCell>
                                        <TableCell align="right">{formatSettlementMoney(qtyUnit(qty, amount))} VNĐ</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                                            {formatSettlementMoney(amount)} VNĐ
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                    {activeImportLots.length > 0 && (
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={2} sx={{ fontWeight: 800 }}>Tổng tiền nhập</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800 }}>
                                    {importLotTotalQty.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell />
                                <TableCell align="right" sx={{ fontWeight: 800 }}>
                                    {formatSettlementMoney(importLotTotalVal)} VNĐ
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    )}
                </Table>
            </Paper>

            <Paper elevation={0} sx={{ mb: 2, borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <Box sx={{ px: 2, py: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <Typography variant="subtitle2" fontWeight={800}>
                        Tổng hợp phiếu trả
                    </Typography>
                </Box>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 800, color: '#64748b' }}>Mã phiếu</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: '#64748b' }}>Ngày</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: '#64748b' }}>SL trả</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: '#64748b' }}>Thành tiền</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {activeReturnLots.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4}>
                                    <Typography variant="body2" color="text.secondary">Không có phiếu trả trong kỳ.</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            activeReturnLots.map((batch) => (
                                <TableRow key={batch.id}>
                                    <TableCell sx={{ fontWeight: 700 }}>{batch.batchCode || `#${batch.id}`}</TableCell>
                                    <TableCell>{formatDate(batch.drawDate)}</TableCell>
                                    <TableCell align="right">{(batch.totalQuantity ?? 0).toLocaleString('vi-VN')}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                                        {formatSettlementMoney(Number(batch.totalReturnValue ?? 0))} VNĐ
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                    {activeReturnLots.length > 0 && (
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={2} sx={{ fontWeight: 800 }}>Tổng tiền trả</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800 }}>
                                    {returnLotTotalQty.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800 }}>
                                    {formatSettlementMoney(returnLotTotalVal)} VNĐ
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    )}
                </Table>
            </Paper>

            {stationPricing.length > 0 && (
                <Paper elevation={0} sx={{ mb: settlementAdjustments.length > 0 ? 2 : 0, borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <Box sx={{ px: 2, py: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <Typography variant="subtitle2" fontWeight={800}>
                            Giá vốn theo nhà đài
                        </Typography>
                    </Box>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 800, color: '#64748b' }}>Nhà đài</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, color: '#64748b' }}>SL nhập</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, color: '#64748b' }}>Giá nhập</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, color: '#64748b' }}>HH</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, color: '#64748b' }}>Giá sau HH</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {stationPricing.map((row) => (
                                <TableRow key={row.lotteryStationId}>
                                    <TableCell sx={{ fontWeight: 700 }}>
                                        {row.lotteryStationName || `Đài #${row.lotteryStationId}`}
                                    </TableCell>
                                    <TableCell align="right">{(row.importedQuantity ?? 0).toLocaleString('vi-VN')}</TableCell>
                                    <TableCell align="right">{formatSettlementMoney(row.importCost)} VNĐ</TableCell>
                                    <TableCell align="right">
                                        {(Number(row.commissionRate || 0) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                                        {formatSettlementMoney(row.netUnitPrice)} VNĐ
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>
            )}
        </Box>
    );
};
