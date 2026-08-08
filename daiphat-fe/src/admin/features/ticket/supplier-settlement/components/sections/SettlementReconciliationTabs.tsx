"use client";

import { useMemo, useState } from 'react';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import MoveToInboxOutlinedIcon from '@mui/icons-material/MoveToInboxOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
    Box,
    Card,
    Chip,
    CircularProgress,
    IconButton,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableFooter,
    TableHead,
    TableRow,
    Tabs,
    Tooltip,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { useNavigate } from '@/components/router-compat';
import { ROUTES } from '../../../../../constants/routes';
import { useImportBatchDetail } from '../../../import-batch/hooks/useImportBatch';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import { getImportBatchStatusLabel } from '../../../import-batch/utils/batchTypeLabels';
import { useReturnBatchDetail } from '../../../return-batch/hooks/useReturnBatch';
import { getReturnBatchStatusLabel } from '../../../return-batch/utils/returnBatchLabels';
import type {
    SettlementOverviewImportBatch,
    SettlementOverviewReturnBatch,
    SettlementStationInventory,
} from '../../types/supplierSettlement.type';

type TabKey =
    | { kind: 'all' }
    | { kind: 'import'; index: number; batchId: number }
    | { kind: 'return'; index: number; batchId: number };

interface Props {
    inventoryByStation: SettlementStationInventory[];
    importBatches: SettlementOverviewImportBatch[];
    returnBatches: SettlementOverviewReturnBatch[];
    remainingPayableAmount?: number;
}

const headerCellSx = {
    fontWeight: 700,
    color: '#475569',
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
};

const stationNameFromInventory = (
    stationId: number | undefined,
    inventory: SettlementStationInventory[]
) => {
    if (!stationId) return '—';
    const hit = inventory.find((r) => r.lotteryStationId === stationId);
    return hit?.lotteryStationName || `Đài #${stationId}`;
};

const AllStationsTable = ({
    inventoryByStation,
}: {
    inventoryByStation: SettlementStationInventory[];
}) => {
    const sumImport = inventoryByStation.reduce((a, r) => a + (r.importedQuantity || 0), 0);
    const sumSold = inventoryByStation.reduce((a, r) => a + (r.soldQuantity || 0), 0);
    const sumRemaining = inventoryByStation.reduce((a, r) => {
        const rem =
            r.remainingQuantity !== undefined && r.remainingQuantity > 0
                ? r.remainingQuantity
                : Math.max(0, (r.importedQuantity || 0) - (r.soldQuantity || 0));
        return a + rem;
    }, 0);
    const sumReturn = inventoryByStation.reduce((a, r) => a + (r.returnQuantity || 0), 0);
    const diffQty = sumRemaining - sumReturn;
    const isBalanced = diffQty === 0;

    return (
        <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
            <Table size="medium">
                <TableHead sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <TableRow>
                        <TableCell sx={headerCellSx}>STT</TableCell>
                        <TableCell sx={headerCellSx}>Nhà đài</TableCell>
                        <TableCell align="right" sx={headerCellSx}>
                            Nhập (Sáng)
                        </TableCell>
                        <TableCell align="right" sx={{ ...headerCellSx, color: '#0284c7' }}>
                            Đã bán
                        </TableCell>
                        <TableCell align="right" sx={{ ...headerCellSx, color: '#16a34a' }}>
                            Còn lại (Tồn)
                        </TableCell>
                        <TableCell align="right" sx={{ ...headerCellSx, color: '#ea580c' }}>
                            Số vé trả (Chiều)
                        </TableCell>
                        <TableCell align="center" sx={headerCellSx}>
                            Trạng thái đối soát
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {inventoryByStation.map((row, idx) => {
                        const importedQty = row.importedQuantity ?? 0;
                        const soldQty = row.soldQuantity ?? 0;
                        const calcRemaining =
                            row.remainingQuantity !== undefined && row.remainingQuantity > 0
                                ? row.remainingQuantity
                                : Math.max(0, importedQty - soldQty);
                        const returnQty = row.returnQuantity ?? 0;
                        const stationDiff = calcRemaining - returnQty;

                        let statusLabel = 'Khớp';
                        let statusColor: 'success' | 'warning' | 'error' = 'success';
                        if (returnQty === 0 && calcRemaining > 0) {
                            statusLabel = `Chờ lập phiếu trả (${calcRemaining} vé)`;
                            statusColor = 'warning';
                        } else if (stationDiff !== 0) {
                            statusLabel = `Lệch ${Math.abs(stationDiff)} vé`;
                            statusColor = 'error';
                        }

                        return (
                            <TableRow key={row.lotteryStationId || idx} hover>
                                <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>{idx + 1}</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                                    {row.lotteryStationName || `Đài #${row.lotteryStationId}`}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                    {importedQty.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600, color: '#0284c7' }}>
                                    {soldQty.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: '#16a34a' }}>
                                    {calcRemaining.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: '#ea580c' }}>
                                    {returnQty.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="center">
                                    <Chip
                                        size="small"
                                        label={statusLabel}
                                        color={statusColor}
                                        variant="outlined"
                                        sx={{ height: 22, fontSize: '0.72rem', fontWeight: 700 }}
                                    />
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    {inventoryByStation.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={7} align="center">
                                <Typography color="text.secondary" sx={{ py: 3 }}>
                                    Chưa có dữ liệu phân rã theo đài.
                                </Typography>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                {inventoryByStation.length > 0 && (
                    <TableFooter sx={{ bgcolor: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                        <TableRow>
                            <TableCell colSpan={2} sx={{ fontWeight: 800, fontSize: '0.85rem' }}>
                                TỔNG CỘNG ({inventoryByStation.length} nhà đài)
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.85rem' }}>
                                {sumImport.toLocaleString('vi-VN')}
                            </TableCell>
                            <TableCell
                                align="right"
                                sx={{ fontWeight: 800, color: '#0284c7', fontSize: '0.85rem' }}
                            >
                                {sumSold.toLocaleString('vi-VN')}
                            </TableCell>
                            <TableCell
                                align="right"
                                sx={{ fontWeight: 800, color: '#16a34a', fontSize: '0.85rem' }}
                            >
                                {sumRemaining.toLocaleString('vi-VN')}
                            </TableCell>
                            <TableCell
                                align="right"
                                sx={{ fontWeight: 800, color: '#ea580c', fontSize: '0.85rem' }}
                            >
                                {sumReturn.toLocaleString('vi-VN')}
                            </TableCell>
                            <TableCell align="center">
                                <Chip
                                    size="small"
                                    label={
                                        isBalanced
                                            ? 'Hoàn toàn khớp'
                                            : sumReturn === 0
                                              ? `Chờ lập phiếu trả (${sumRemaining} vé)`
                                              : `Lệch tổng ${Math.abs(diffQty)} vé`
                                    }
                                    color={
                                        isBalanced ? 'success' : sumReturn === 0 ? 'warning' : 'error'
                                    }
                                    sx={{ height: 22, fontSize: '0.72rem', fontWeight: 800 }}
                                />
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                )}
            </Table>
        </TableContainer>
    );
};

const ImportBatchTabPanel = ({
    batchId,
    inventoryByStation,
}: {
    batchId: number;
    inventoryByStation: SettlementStationInventory[];
}) => {
    const navigate = useNavigate();
    const { data: batch, isLoading, isError } = useImportBatchDetail(batchId);
    const lines = batch?.lines || [];

    const sumQty = lines.reduce((a, l) => a + (l.totalQuantity || l.declareQuantity || 0), 0);
    const sumValue = lines.reduce(
        (a, l) => a + Number(l.totalCostValue ?? l.declaredCostValue ?? 0),
        0
    );

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={28} />
            </Box>
        );
    }
    if (isError || !batch) {
        return (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                Không tải được chi tiết phiếu nhập.
            </Typography>
        );
    }

    return (
        <Stack spacing={1.5}>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
            >
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                    <Typography variant="subtitle2" fontWeight={800}>
                        {batch.batchCode || `#${batch.id}`}
                    </Typography>
                    <Chip
                        size="small"
                        label={getImportBatchStatusLabel(batch.status)}
                        sx={{ fontWeight: 700, height: 22 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                        Ngày quay:{' '}
                        {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                    </Typography>
                </Stack>
                <Tooltip title="Mở chi tiết phiếu nhập">
                    <IconButton
                        size="small"
                        color="primary"
                        onClick={() => navigate(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch.id))}
                    >
                        <VisibilityOutlinedIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Stack>

            <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                            <TableCell sx={headerCellSx}>STT</TableCell>
                            <TableCell sx={headerCellSx}>Nhà đài</TableCell>
                            <TableCell align="right" sx={headerCellSx}>
                                SL khai báo
                            </TableCell>
                            <TableCell align="right" sx={headerCellSx}>
                                SL nhập
                            </TableCell>
                            <TableCell align="right" sx={headerCellSx}>
                                Đơn giá
                            </TableCell>
                            <TableCell align="right" sx={headerCellSx}>
                                Thành tiền
                            </TableCell>
                            <TableCell sx={headerCellSx}>Trạng thái</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {lines.map((line, idx) => (
                            <TableRow key={line.id || idx} hover>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>
                                    {stationNameFromInventory(line.lotteryStationId, inventoryByStation)}
                                </TableCell>
                                <TableCell align="right">
                                    {(line.declareQuantity ?? 0).toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                    {(line.totalQuantity ?? 0).toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right">
                                    {formatImportCost(line.importCost)} VNĐ
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                    {formatImportCost(line.totalCostValue ?? line.declaredCostValue)} VNĐ
                                </TableCell>
                                <TableCell>{line.status || '—'}</TableCell>
                            </TableRow>
                        ))}
                        {lines.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    <Typography color="text.secondary" sx={{ py: 2.5 }}>
                                        Phiếu nhập chưa có dòng nhà đài.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    {lines.length > 0 && (
                        <TableFooter sx={{ bgcolor: '#f8fafc' }}>
                            <TableRow>
                                <TableCell colSpan={3} sx={{ fontWeight: 800 }}>
                                    Tổng {lines.length} nhà đài
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800 }}>
                                    {sumQty.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell />
                                <TableCell align="right" sx={{ fontWeight: 800 }}>
                                    {formatImportCost(sumValue)} VNĐ
                                </TableCell>
                                <TableCell />
                            </TableRow>
                        </TableFooter>
                    )}
                </Table>
            </TableContainer>
        </Stack>
    );
};

const ReturnBatchTabPanel = ({
    batchId,
}: {
    batchId: number;
}) => {
    const navigate = useNavigate();
    const { data: batch, isLoading, isError } = useReturnBatchDetail(batchId);
    const lines = batch?.lines || [];

    const sumQty = lines.reduce((a, l) => a + (l.totalQuantity || 0), 0);
    const sumValue = lines.reduce((a, l) => a + Number(l.totalReturnValue || 0), 0);

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={28} />
            </Box>
        );
    }
    if (isError || !batch) {
        return (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                Không tải được chi tiết phiếu trả.
            </Typography>
        );
    }

    return (
        <Stack spacing={1.5}>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
            >
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                    <Typography variant="subtitle2" fontWeight={800}>
                        {batch.batchCode || `#${batch.id}`}
                    </Typography>
                    <Chip
                        size="small"
                        label={getReturnBatchStatusLabel(batch.status, batch.statusLabel)}
                        sx={{ fontWeight: 700, height: 22 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                        Ngày quay:{' '}
                        {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                    </Typography>
                </Stack>
                <Tooltip title="Mở chi tiết phiếu trả">
                    <IconButton
                        size="small"
                        color="primary"
                        onClick={() => navigate(ROUTES.ADMIN.RETURN_BATCH.DETAIL(batch.id))}
                    >
                        <VisibilityOutlinedIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Stack>

            <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                            <TableCell sx={headerCellSx}>STT</TableCell>
                            <TableCell sx={headerCellSx}>Nhà đài</TableCell>
                            <TableCell align="right" sx={headerCellSx}>
                                SL trả
                            </TableCell>
                            <TableCell align="right" sx={headerCellSx}>
                                Giá trị trả
                            </TableCell>
                            <TableCell sx={headerCellSx}>Trạng thái dòng</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {lines.map((line, idx) => (
                            <TableRow key={line.id || idx} hover>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>
                                    {line.lotteryStationName || `Đài #${line.lotteryStationId}`}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                    {(line.totalQuantity ?? 0).toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                    {formatImportCost(line.totalReturnValue)} VNĐ
                                </TableCell>
                                <TableCell>
                                    {line.statusLabel || line.status || '—'}
                                </TableCell>
                            </TableRow>
                        ))}
                        {lines.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    <Typography color="text.secondary" sx={{ py: 2.5 }}>
                                        Phiếu trả chưa có dòng nhà đài.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    {lines.length > 0 && (
                        <TableFooter sx={{ bgcolor: '#f8fafc' }}>
                            <TableRow>
                                <TableCell colSpan={2} sx={{ fontWeight: 800 }}>
                                    Tổng {lines.length} nhà đài
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800 }}>
                                    {sumQty.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800 }}>
                                    {formatImportCost(sumValue)} VNĐ
                                </TableCell>
                                <TableCell />
                            </TableRow>
                        </TableFooter>
                    )}
                </Table>
            </TableContainer>
        </Stack>
    );
};

export const SettlementReconciliationTabs = ({
    inventoryByStation,
    importBatches,
    returnBatches,
    remainingPayableAmount,
}: Props) => {
    const [activeTab, setActiveTab] = useState(0);

    const tabs: TabKey[] = useMemo(() => {
        const list: TabKey[] = [{ kind: 'all' }];
        importBatches.forEach((batch, index) => {
            list.push({ kind: 'import', index, batchId: batch.id });
        });
        returnBatches.forEach((batch, index) => {
            list.push({ kind: 'return', index, batchId: batch.id });
        });
        return list;
    }, [importBatches, returnBatches]);

    const current = tabs[activeTab] ?? tabs[0];

    const sumImportQty = importBatches.reduce(
        (a, b) => a + (b.totalImportedQuantity ?? b.totalDeclareQuantity ?? 0),
        0
    );
    const sumImportVal = importBatches.reduce(
        (a, b) => a + Number(b.totalImportedCostValue ?? b.totalDeclaredCostValue ?? 0),
        0
    );
    const sumReturnQty = returnBatches.reduce((a, b) => a + (b.totalQuantity ?? 0), 0);
    const sumReturnVal = returnBatches.reduce((a, b) => a + Number(b.totalReturnValue ?? 0), 0);
    const qtyDiff = sumImportQty - sumReturnQty;

    return (
        <Card
            elevation={0}
            sx={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                mb: 3,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
            }}
        >
            <Box
                sx={{
                    px: 2.5,
                    pt: 2,
                    pb: 1,
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: 'space-between',
                    gap: 1,
                    alignItems: { xs: 'flex-start', md: 'center' },
                }}
            >
                <Box>
                    <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                        Bảng chi tiết đối soát từng Nhà đài ({inventoryByStation.length} đài)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Gộp từ {importBatches.length} phiếu nhập · {returnBatches.length} phiếu trả
                        trong ngày — chọn tab để xem chi tiết từng phiếu
                    </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                    Tổng phải trả NCC còn lại:{' '}
                    <strong style={{ color: '#dc2626' }}>
                        {formatImportCost(remainingPayableAmount)} VNĐ
                    </strong>
                </Typography>
            </Box>

            <Box sx={{ borderBottom: '1px solid #e2e8f0', px: 2, bgcolor: '#fafafa' }}>
                <Tabs
                    value={Math.min(activeTab, tabs.length - 1)}
                    onChange={(_, v) => setActiveTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{
                        minHeight: 44,
                        '& .MuiTab-root': {
                            minHeight: 44,
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            textTransform: 'none',
                            px: 1.5,
                            mr: 0.5,
                        },
                    }}
                >
                    <Tab
                        icon={<Inventory2OutlinedIcon sx={{ fontSize: '1.05rem' }} />}
                        iconPosition="start"
                        label={
                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <span>Tất cả</span>
                                <Chip
                                    size="small"
                                    label={inventoryByStation.length}
                                    sx={{
                                        height: 18,
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        bgcolor: activeTab === 0 ? '#eff6ff' : '#f1f5f9',
                                        color: activeTab === 0 ? '#2563eb' : '#64748b',
                                    }}
                                />
                            </Stack>
                        }
                    />
                    {importBatches.map((batch, index) => {
                        const tabIndex = 1 + index;
                        return (
                            <Tab
                                key={`import-${batch.id}`}
                                icon={<MoveToInboxOutlinedIcon sx={{ fontSize: '1.05rem' }} />}
                                iconPosition="start"
                                label={
                                    <Stack direction="row" spacing={0.75} alignItems="center">
                                        <span>Phiếu nhập {index + 1}</span>
                                        <Chip
                                            size="small"
                                            label={(
                                                batch.totalImportedQuantity ??
                                                batch.totalDeclareQuantity ??
                                                0
                                            ).toLocaleString('vi-VN')}
                                            sx={{
                                                height: 18,
                                                fontSize: '0.68rem',
                                                fontWeight: 800,
                                                bgcolor: activeTab === tabIndex ? '#eff6ff' : '#f1f5f9',
                                                color: activeTab === tabIndex ? '#2563eb' : '#64748b',
                                            }}
                                        />
                                    </Stack>
                                }
                            />
                        );
                    })}
                    {returnBatches.map((batch, index) => {
                        const tabIndex = 1 + importBatches.length + index;
                        const label =
                            returnBatches.length === 1 ? 'Phiếu trả' : `Phiếu trả ${index + 1}`;
                        return (
                            <Tab
                                key={`return-${batch.id}`}
                                icon={<AssignmentReturnOutlinedIcon sx={{ fontSize: '1.05rem' }} />}
                                iconPosition="start"
                                label={
                                    <Stack direction="row" spacing={0.75} alignItems="center">
                                        <span>{label}</span>
                                        <Chip
                                            size="small"
                                            label={(batch.totalQuantity ?? 0).toLocaleString('vi-VN')}
                                            sx={{
                                                height: 18,
                                                fontSize: '0.68rem',
                                                fontWeight: 800,
                                                bgcolor: activeTab === tabIndex ? '#fff7ed' : '#f1f5f9',
                                                color: activeTab === tabIndex ? '#c2410c' : '#64748b',
                                            }}
                                        />
                                    </Stack>
                                }
                            />
                        );
                    })}
                </Tabs>
            </Box>

            <Box sx={{ p: 2.5 }}>
                {current?.kind === 'all' && (
                    <Stack spacing={1.75}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip
                                size="small"
                                color="info"
                                label={`${importBatches.length} phiếu nhập · ${sumImportQty.toLocaleString('vi-VN')} vé · ${formatImportCost(sumImportVal)} VNĐ`}
                                sx={{ fontWeight: 700 }}
                            />
                            <Chip
                                size="small"
                                color="warning"
                                label={`${returnBatches.length} phiếu trả · ${sumReturnQty.toLocaleString('vi-VN')} vé · ${formatImportCost(sumReturnVal)} VNĐ`}
                                sx={{ fontWeight: 700 }}
                            />
                            <Chip
                                size="small"
                                color={qtyDiff === 0 ? 'success' : 'error'}
                                label={
                                    qtyDiff === 0
                                        ? 'Nhập − Trả: khớp'
                                        : `Chênh lệch Nhập−Trả: ${Math.abs(qtyDiff).toLocaleString('vi-VN')} vé`
                                }
                                sx={{ fontWeight: 800 }}
                            />
                        </Stack>
                        <AllStationsTable inventoryByStation={inventoryByStation} />
                    </Stack>
                )}

                {current?.kind === 'import' && (
                    <ImportBatchTabPanel
                        batchId={current.batchId}
                        inventoryByStation={inventoryByStation}
                    />
                )}

                {current?.kind === 'return' && (
                    <ReturnBatchTabPanel batchId={current.batchId} />
                )}
            </Box>
        </Card>
    );
};
