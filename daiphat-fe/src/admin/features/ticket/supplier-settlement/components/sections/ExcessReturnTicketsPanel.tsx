"use client";

import { useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import type { SettlementAdjustmentReasonCode, SettlementResolvableSerial } from '../../types/supplierSettlement.type';
import { formatSettlementMoney } from '../../utils/settlementCashflow';

interface Props {
    serials: SettlementResolvableSerial[];
    difference?: number;
    loading?: boolean;
    submitting?: boolean;
    onResolve: (payload: {
        excessSerialNumbers: string[];
        reasonCode: SettlementAdjustmentReasonCode;
        note?: string;
        markResolved: boolean;
    }) => void;
}

export const ExcessReturnTicketsPanel = ({
    serials,
    difference,
    loading,
    submitting,
    onResolve,
}: Props) => {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [note, setNote] = useState('');
    const requiredQuantity = Math.abs(Number(difference ?? 0));
    const selectedSerials = useMemo(
        () => serials.filter((serial) => selectedIds.includes(serial.serialId)),
        [serials, selectedIds]
    );
    const isExactQuantity = selectedIds.length === requiredQuantity;
    const hasInsufficientEligibleSerials = !loading && serials.length < requiredQuantity;
    const canConfirm = isExactQuantity || hasInsufficientEligibleSerials;
    const isAllSelected = serials.length > 0 && serials.every((serial) => selectedIds.includes(serial.serialId));
    const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

    const toggleSerial = (serialId: number) => {
        setSelectedIds((current) =>
            current.includes(serialId)
                ? current.filter((id) => id !== serialId)
                : [...current, serialId]
        );
    };

    const toggleAll = () => {
        setSelectedIds(isAllSelected ? [] : serials.map((serial) => serial.serialId));
    };

    return (
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0', mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <AssignmentReturnOutlinedIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={800}>
                    Xử lý hệ thống ghi thiếu vé trả
                </Typography>
            </Stack>

            <Alert severity={hasInsufficientEligibleSerials ? 'warning' : 'info'} sx={{ mb: 2, borderRadius: '12px' }}>
                {hasInsufficientEligibleSerials
                    ? <>Không đủ {requiredQuantity} vé GOOD chưa thuộc phiếu trả để gắn sê-ri. Bạn vẫn có thể xác nhận bổ sung trả; hệ thống sẽ ghi nhận chênh lệch không gắn sê-ri, không tự gắn hoặc thay đổi trạng thái vé.</>
                    : <>Chọn đúng {requiredQuantity} vé từ danh sách import-batch của ngày đối soát để bổ sung vào phiếu trả. Chỉ những vé còn ở tình trạng GOOD và chưa thuộc phiếu trả khác mới được chấp nhận.</>}
            </Alert>

            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.25 }}>
                <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                    Danh sách vé import-batch trong ngày
                </Typography>
                <Chip
                    size="small"
                    color={hasInsufficientEligibleSerials ? 'warning' : isExactQuantity ? 'success' : selectedIds.length > requiredQuantity ? 'error' : 'warning'}
                    label={hasInsufficientEligibleSerials
                        ? `Không đủ điều kiện (${serials.length}/${requiredQuantity} vé)`
                        : `Đã chọn ${selectedIds.length}/${requiredQuantity} vé`}
                    sx={{ fontWeight: 800 }}
                />
            </Stack>

            {loading ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="#64748b">Đang tải danh sách vé nhập...</Typography>
                </Box>
            ) : (
                <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden', borderColor: '#e2e8f0', mb: 2 }}>
                    <Box sx={{ maxHeight: 360, overflow: 'auto' }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 800, color: '#475569', fontSize: '0.8rem' } }}>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={isAllSelected}
                                            indeterminate={isSomeSelected}
                                            onChange={toggleAll}
                                            disabled={hasInsufficientEligibleSerials}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>MÃ SÊ-RI</TableCell>
                                    <TableCell>LÔ NHẬP</TableCell>
                                    <TableCell>NHÀ ĐÀI</TableCell>
                                    <TableCell align="right">GIÁ VỐN</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {serials.map((serial) => {
                                    const selected = selectedIds.includes(serial.serialId);
                                    return (
                                        <TableRow
                                            key={serial.serialId}
                                            hover
                                            selected={selected}
                                            onClick={() => !hasInsufficientEligibleSerials && toggleSerial(serial.serialId)}
                                            sx={{
                                                cursor: hasInsufficientEligibleSerials ? 'default' : 'pointer',
                                                '&.Mui-selected': { bgcolor: '#eff6ff !important' },
                                            }}
                                        >
                                            <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
                                                <Checkbox
                                                    checked={selected}
                                                    onChange={() => toggleSerial(serial.serialId)}
                                                    disabled={hasInsufficientEligibleSerials}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                                                    {serial.serialNumber}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{serial.importBatchCode || '—'}</TableCell>
                                            <TableCell>{serial.stationName || '—'}</TableCell>
                                            <TableCell align="right">{formatSettlementMoney(Number(serial.importCost || 0))} VNĐ</TableCell>
                                        </TableRow>
                                    );
                                })}
                                {serials.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} sx={{ py: 4, textAlign: 'center' }}>
                                            <Typography variant="body2" color="#64748b">Không có vé nhập đủ điều kiện để bổ sung trả.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Box>
                </Paper>
            )}

            <TextField
                label="Ghi chú"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                fullWidth
                size="small"
                placeholder="Biên bản bàn giao, người giao, ghi chú..."
                sx={{ mb: 1.5 }}
            />

            <Box display="flex" justifyContent="flex-end">
                <Button
                    variant="contained"
                    disabled={!canConfirm || !!submitting}
                    startIcon={<CheckCircleOutlinedIcon />}
                    onClick={() =>
                        onResolve({
                            excessSerialNumbers: isExactQuantity
                                ? selectedSerials.map((serial) => serial.serialNumber)
                                : [],
                            reasonCode: 'EXCESS_RETURN',
                            note: note.trim() || undefined,
                            markResolved: true,
                        })
                    }
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
                >
                    {submitting
                        ? 'Đang lưu...'
                        : hasInsufficientEligibleSerials
                        ? 'Xác nhận bổ sung trả (không gắn sê-ri)'
                        : `Xác nhận bổ sung trả (${selectedIds.length}/${requiredQuantity})`}
                </Button>
            </Box>
        </Paper>
    );
};
