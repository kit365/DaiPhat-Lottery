"use client";

import {
    Alert,
    Box,
    Button,
    Checkbox,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { SpinnerLoading } from '@/admin/components/ui/SpinnerLoading';
import { formatPrizePayoutCurrency, computeSupplierExpectedAmount } from '@/types/prize-payout.type';
import {
    useAddPrizeClaimLines,
    useEligiblePrizeClaimTickets,
} from '../hooks/usePrizeClaimSubmission';

type Props = {
    submissionId: number;
};

export const EligibleTicketsPicker = ({ submissionId }: Props) => {
    const [periodFrom, setPeriodFrom] = useState('');
    const [periodTo, setPeriodTo] = useState('');
    const [selected, setSelected] = useState<Set<number>>(new Set());

    const queryParams = useMemo(
        () => ({
            ...(periodFrom ? { periodFrom } : {}),
            ...(periodTo ? { periodTo } : {}),
        }),
        [periodFrom, periodTo]
    );

    const { data: eligibleRes, isLoading, isFetching, isError } = useEligiblePrizeClaimTickets(queryParams, true);
    const addLinesMutation = useAddPrizeClaimLines();

    const tickets = eligibleRes?.data ?? [];
    const allSelected = tickets.length > 0 && tickets.every((t) => selected.has(t.serialId));
    const someSelected = tickets.some((t) => selected.has(t.serialId));

    const toggleOne = (serialId: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(serialId)) {
                next.delete(serialId);
            } else {
                next.add(serialId);
            }
            return next;
        });
    };

    const toggleAll = () => {
        if (allSelected) {
            setSelected(new Set());
        } else {
            setSelected(new Set(tickets.map((t) => t.serialId)));
        }
    };

    const handleAddSelected = async () => {
        if (selected.size === 0) return;
        try {
            await addLinesMutation.mutateAsync({
                submissionId,
                serialIds: Array.from(selected),
            });
            setSelected(new Set());
        } catch {
            // toast handled in hook
        }
    };

    return (
        <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Vé đã trả thưởng — chọn để thêm vào phiếu
            </Typography>
            <Alert severity="info" sx={{ mb: 2, fontSize: '0.85em' }}>
                Danh sách vé đã trả thưởng cho khách (COMPLETED / PAID_OUT) từ mọi nhà đài, chưa nằm trong phiếu nộp active.
            </Alert>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
                <TextField
                    size="small"
                    label="Từ ngày quay"
                    type="date"
                    value={periodFrom}
                    onChange={(e) => setPeriodFrom(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 160 }}
                />
                <TextField
                    size="small"
                    label="Đến ngày quay"
                    type="date"
                    value={periodTo}
                    onChange={(e) => setPeriodTo(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 160 }}
                />
                <Button
                    variant="contained"
                    onClick={handleAddSelected}
                    disabled={selected.size === 0 || addLinesMutation.isPending}
                    sx={{ alignSelf: { sm: 'center' }, whiteSpace: 'nowrap' }}
                >
                    Thêm đã chọn ({selected.size})
                </Button>
            </Stack>

            {isLoading || isFetching ? (
                <SpinnerLoading />
            ) : isError ? (
                <Alert severity="error">Không tải được danh sách vé. Vui lòng thử lại sau.</Alert>
            ) : tickets.length === 0 ? (
                <Alert severity="warning">Không có vé đủ điều kiện nộp trong khoảng thời gian này.</Alert>
            ) : (
                <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        indeterminate={someSelected && !allSelected}
                                        checked={allSelected}
                                        onChange={toggleAll}
                                    />
                                </TableCell>
                                <TableCell>Nhà đài</TableCell>
                                <TableCell>Serial</TableCell>
                                <TableCell>Số vé</TableCell>
                                <TableCell>Ngày quay</TableCell>
                                <TableCell>Giải</TableCell>
                                <TableCell align="right">Tiền giải</TableCell>
                                <TableCell align="right">Thuế</TableCell>
                                <TableCell align="right">Sau thuế</TableCell>
                                <TableCell>Phiếu trả thưởng</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {tickets.map((ticket) => (
                                <TableRow
                                    key={ticket.serialId}
                                    hover
                                    selected={selected.has(ticket.serialId)}
                                    onClick={() => toggleOne(ticket.serialId)}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            checked={selected.has(ticket.serialId)}
                                            onChange={() => toggleOne(ticket.serialId)}
                                        />
                                    </TableCell>
                                    <TableCell>{ticket.stationName ?? `Đài #${ticket.stationId}`}</TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
                                        {ticket.serialNumber}
                                    </TableCell>
                                    <TableCell>{ticket.ticketNumbers ?? '—'}</TableCell>
                                    <TableCell>
                                        {ticket.drawDate ? dayjs(ticket.drawDate).format('DD/MM/YYYY') : '—'}
                                    </TableCell>
                                    <TableCell>{ticket.prizeDisplayName ?? ticket.prizeCode ?? '—'}</TableCell>
                                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                        {formatPrizePayoutCurrency(ticket.grossPrizeAmount)}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                        {formatPrizePayoutCurrency(ticket.taxAmount)}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                        {formatPrizePayoutCurrency(
                                            computeSupplierExpectedAmount(ticket.grossPrizeAmount, ticket.taxAmount),
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8em' }}>
                                        {ticket.payoutRequestCode}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
            )}
        </Box>
    );
};
