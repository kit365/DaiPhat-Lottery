import {
    Alert,
    Box,
    Checkbox,
    CircularProgress,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { CollapsibleCard } from '../../../../../components/ui/CollapsibleCard';
import { LoadingButton } from '../../../../../components/ui/LoadingButton';
import { ROUTES } from '../../../../../constants/routes';
import { useStationsByDrawDate } from '../../../../station/hooks/useStation';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import {
    useAttachReturnSerials,
    useReturnBatchDetail,
    useUpdateReturnBatch,
    useUpdateReturnBatchLineStatus,
} from '../../hooks/useReturnBatch';
import type { ReturnBatchLine, ReturnBatchLineStatus } from '../../types/returnBatch.type';
import {
    canAttachSerials,
    getReturnBatchLineStatusBadgeClass,
    getReturnBatchLineStatusLabel,
    isReturnBatchEditable,
} from '../../utils/returnBatchLabels';

const LINE_STATUS_OPTIONS: ReturnBatchLineStatus[] = [
    'PENDING',
    'SUCCESS',
    'REJECTED_BY_SUPPLIER',
    'PULLED_FOR_SALE',
];

const parseSerialIds = (raw: string): number[] => {
    const parts = raw.split(/[\s,;]+/).map((p) => p.trim()).filter(Boolean);
    const ids = parts
        .map((p) => Number(p))
        .filter((n) => Number.isFinite(n) && n > 0);
    return [...new Set(ids)];
};

export const ReturnBatchEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: batch, isLoading, isError, refetch } = useReturnBatchDetail(id);
    const updateBatch = useUpdateReturnBatch();
    const attachSerials = useAttachReturnSerials();
    const updateLineStatus = useUpdateReturnBatchLineStatus();

    const [note, setNote] = useState('');
    const [returnReceiptUrl, setReturnReceiptUrl] = useState('');
    const [addStationIds, setAddStationIds] = useState<number[]>([]);
    const [serialDrafts, setSerialDrafts] = useState<Record<number, string>>({});
    const [overrideDrafts, setOverrideDrafts] = useState<
        Record<number, { enabled: boolean; reason: string; evidenceUrl: string }>
    >({});

    useEffect(() => {
        if (!batch) return;
        setNote(batch.note || '');
        setReturnReceiptUrl(batch.returnReceiptUrl || '');
    }, [batch]);

    const { data: stations = [] } = useStationsByDrawDate(batch?.drawDate);
    const existingStationIds = useMemo(
        () => new Set((batch?.lines || []).map((l) => l.lotteryStationId)),
        [batch?.lines]
    );
    const availableStations = useMemo(
        () => (Array.isArray(stations) ? stations : []).filter((s: any) => !existingStationIds.has(s.id)),
        [stations, existingStationIds]
    );

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
                <CircularProgress />
            </Box>
        );
    }

    if (isError || !batch) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
                <Typography color="text.secondary">Không tìm thấy phiếu trả vé.</Typography>
            </Box>
        );
    }

    if (!isReturnBatchEditable(batch.status)) {
        return (
            <Box sx={{ maxWidth: 800, mx: 'auto', py: 4 }}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Phiếu đã xác nhận không thể chỉnh sửa.
                </Alert>
                <LoadingButton
                    label="Xem chi tiết"
                    onClick={() => navigate(ROUTES.ADMIN.RETURN_BATCH.DETAIL(batch.id))}
                />
            </Box>
        );
    }

    const handleSaveHeader = async () => {
        try {
            await updateBatch.mutateAsync({
                id: batch.id,
                payload: {
                    note: note.trim() || null,
                    returnReceiptUrl: returnReceiptUrl.trim() || null,
                    addLines:
                        batch.status === 'PENDING' && addStationIds.length > 0
                            ? addStationIds.map((lotteryStationId) => ({ lotteryStationId }))
                            : undefined,
                },
            });
            setAddStationIds([]);
            toast.success('Đã cập nhật phiếu trả vé.');
            refetch();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Cập nhật thất bại.');
        }
    };

    const handleAttach = async (line: ReturnBatchLine) => {
        const ids = parseSerialIds(serialDrafts[line.id] || '');
        if (ids.length === 0) {
            toast.error('Nhập ít nhất một ID sê-ri (cách nhau bởi dấu phẩy hoặc xuống dòng).');
            return;
        }
        const override = overrideDrafts[line.id];
        try {
            await attachSerials.mutateAsync({
                batchId: batch.id,
                lineId: line.id,
                payload: {
                    serials: ids.map((serialId) => ({
                        serialId,
                        manualOverride: override?.enabled || false,
                        overrideReason: override?.enabled ? override.reason || null : null,
                        overrideEvidenceUrl: override?.enabled ? override.evidenceUrl || null : null,
                    })),
                },
            });
            setSerialDrafts((prev) => ({ ...prev, [line.id]: '' }));
            toast.success('Đã gắn sê-ri vào dòng trả.');
            refetch();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể gắn sê-ri.');
        }
    };

    const handleLineStatus = async (line: ReturnBatchLine, status: ReturnBatchLineStatus) => {
        try {
            await updateLineStatus.mutateAsync({
                batchId: batch.id,
                lineId: line.id,
                status,
            });
            toast.success('Đã cập nhật trạng thái dòng.');
            refetch();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể đổi trạng thái dòng.');
        }
    };

    return (
        <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
            <div className="mb-[calc(3*var(--spacing))] flex items-start justify-end gap-[calc(2*var(--spacing))]">
                <div className="mr-auto">
                    <Title title={`Chỉnh sửa phiếu trả #${batch.id}`} />
                    <Breadcrumb
                        items={[
                            { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                            { label: 'Trả vé NCC', to: ROUTES.ADMIN.RETURN_BATCH.LIST },
                            { label: `#${batch.id}`, to: ROUTES.ADMIN.RETURN_BATCH.DETAIL(batch.id) },
                            { label: 'Chỉnh sửa' },
                        ]}
                    />
                </div>
                <Stack direction="row" spacing={1}>
                    <LoadingButton
                        label="Chi tiết"
                        onClick={() => navigate(ROUTES.ADMIN.RETURN_BATCH.DETAIL(batch.id))}
                    />
                    <LoadingButton
                        label="Lưu phiếu"
                        className="btn-primary-admin"
                        loading={updateBatch.isPending}
                        onClick={handleSaveHeader}
                    />
                </Stack>
            </div>

            <Stack spacing={2}>
                <CollapsibleCard title="Thông tin chung" expanded onToggle={() => undefined}>
                    <Stack spacing={2} sx={{ p: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                            NCC: <strong>{batch.supplierName}</strong> · Ngày quay:{' '}
                            <strong>{batch.drawDate}</strong>
                        </Typography>
                        <TextField
                            label="Ghi chú"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            multiline
                            minRows={2}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="URL biên nhận trả"
                            value={returnReceiptUrl}
                            onChange={(e) => setReturnReceiptUrl(e.target.value)}
                            fullWidth
                            size="small"
                            placeholder="https://..."
                        />

                        {batch.status === 'PENDING' && availableStations.length > 0 && (
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    Thêm nhà đài
                                </Typography>
                                <Stack>
                                    {availableStations.map((station: any) => (
                                        <FormControlLabel
                                            key={station.id}
                                            control={
                                                <Checkbox
                                                    checked={addStationIds.includes(station.id)}
                                                    onChange={() =>
                                                        setAddStationIds((prev) =>
                                                            prev.includes(station.id)
                                                                ? prev.filter((x) => x !== station.id)
                                                                : [...prev, station.id]
                                                        )
                                                    }
                                                />
                                            }
                                            label={station.name || `#${station.id}`}
                                        />
                                    ))}
                                </Stack>
                            </Box>
                        )}
                    </Stack>
                </CollapsibleCard>

                <CollapsibleCard title="Dòng trả & gắn sê-ri thủ công" expanded onToggle={() => undefined}>
                    <Stack spacing={3} sx={{ p: 2 }}>
                        <Alert severity="info">
                            Nhập ID sê-ri (số) cách nhau bởi dấu phẩy. Có thể bật ghi đè thủ công kèm lý do/ảnh chứng minh.
                            Quét mã sẽ bổ sung sau — luồng hiện tại là kiểm kê thủ công.
                        </Alert>

                        {(batch.lines || []).map((line) => (
                            <Box
                                key={line.id}
                                sx={{
                                    border: '1px solid var(--palette-divider)',
                                    borderRadius: 1,
                                    p: 2,
                                }}
                            >
                                <Stack
                                    direction={{ xs: 'column', md: 'row' }}
                                    justifyContent="space-between"
                                    spacing={2}
                                    sx={{ mb: 2 }}
                                >
                                    <Box>
                                        <Typography fontWeight={700}>
                                            {line.lotteryStationName || `Nhà đài #${line.lotteryStationId}`}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            SL: {line.totalQuantity} · Giá trị:{' '}
                                            {formatImportCost(line.totalReturnValue)} VNĐ · Sê-ri gắn:{' '}
                                            {line.attachedSerialCount ?? 0}
                                        </Typography>
                                        <span
                                            className={`admin-status-badge ${getReturnBatchLineStatusBadgeClass(line.status)}`}
                                        >
                                            {getReturnBatchLineStatusLabel(line.status, line.statusLabel)}
                                        </span>
                                    </Box>
                                    <FormControl size="small" sx={{ minWidth: 200 }}>
                                        <InputLabel>Trạng thái dòng</InputLabel>
                                        <Select
                                            label="Trạng thái dòng"
                                            value={line.status}
                                            onChange={(e) =>
                                                handleLineStatus(line, e.target.value as ReturnBatchLineStatus)
                                            }
                                            disabled={updateLineStatus.isPending || batch.status === 'CONFIRMED'}
                                        >
                                            {LINE_STATUS_OPTIONS.map((status) => (
                                                <MenuItem key={status} value={status}>
                                                    {getReturnBatchLineStatusLabel(status)}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Stack>

                                {canAttachSerials(batch.status, line.status) && (
                                    <Stack spacing={1.5}>
                                        <TextField
                                            label="ID sê-ri cần gắn"
                                            placeholder="501, 502, 503"
                                            value={serialDrafts[line.id] || ''}
                                            onChange={(e) =>
                                                setSerialDrafts((prev) => ({
                                                    ...prev,
                                                    [line.id]: e.target.value,
                                                }))
                                            }
                                            multiline
                                            minRows={2}
                                            size="small"
                                            fullWidth
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={!!overrideDrafts[line.id]?.enabled}
                                                    onChange={(e) =>
                                                        setOverrideDrafts((prev) => ({
                                                            ...prev,
                                                            [line.id]: {
                                                                enabled: e.target.checked,
                                                                reason: prev[line.id]?.reason || '',
                                                                evidenceUrl: prev[line.id]?.evidenceUrl || '',
                                                            },
                                                        }))
                                                    }
                                                />
                                            }
                                            label="Ghi đè thủ công (lệch thực tế / máy đọc)"
                                        />
                                        {overrideDrafts[line.id]?.enabled && (
                                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                                                <TextField
                                                    label="Lý do ghi đè"
                                                    size="small"
                                                    fullWidth
                                                    value={overrideDrafts[line.id]?.reason || ''}
                                                    onChange={(e) =>
                                                        setOverrideDrafts((prev) => ({
                                                            ...prev,
                                                            [line.id]: {
                                                                enabled: true,
                                                                reason: e.target.value,
                                                                evidenceUrl: prev[line.id]?.evidenceUrl || '',
                                                            },
                                                        }))
                                                    }
                                                />
                                                <TextField
                                                    label="URL ảnh chứng minh"
                                                    size="small"
                                                    fullWidth
                                                    value={overrideDrafts[line.id]?.evidenceUrl || ''}
                                                    onChange={(e) =>
                                                        setOverrideDrafts((prev) => ({
                                                            ...prev,
                                                            [line.id]: {
                                                                enabled: true,
                                                                reason: prev[line.id]?.reason || '',
                                                                evidenceUrl: e.target.value,
                                                            },
                                                        }))
                                                    }
                                                />
                                            </Stack>
                                        )}
                                        <Box>
                                            <LoadingButton
                                                label="Gắn sê-ri"
                                                className="btn-primary-admin"
                                                loading={attachSerials.isPending}
                                                onClick={() => handleAttach(line)}
                                            />
                                        </Box>
                                    </Stack>
                                )}
                            </Box>
                        ))}

                        {(batch.lines || []).length === 0 && (
                            <Typography color="text.secondary">Chưa có dòng trả vé.</Typography>
                        )}
                    </Stack>
                </CollapsibleCard>

                <CollapsibleCard title="Tóm tắt dòng" expanded onToggle={() => undefined}>
                    <TableContainer sx={{ px: 1, pb: 2 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Nhà đài</TableCell>
                                    <TableCell>Trạng thái</TableCell>
                                    <TableCell align="right">Số lượng</TableCell>
                                    <TableCell align="right">Giá trị</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(batch.lines || []).map((line) => (
                                    <TableRow key={line.id}>
                                        <TableCell>{line.lotteryStationName || line.lotteryStationId}</TableCell>
                                        <TableCell>
                                            {getReturnBatchLineStatusLabel(line.status, line.statusLabel)}
                                        </TableCell>
                                        <TableCell align="right">{line.totalQuantity}</TableCell>
                                        <TableCell align="right">
                                            {formatImportCost(line.totalReturnValue)} VNĐ
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CollapsibleCard>
            </Stack>
        </Box>
    );
};
