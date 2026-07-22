import React, { useEffect, useMemo, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Paper,
    Typography,
    Box,
} from '@mui/material';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { LoadingButton } from '../../../../components/ui/LoadingButton';
import { useConfirmSyncStations } from '../../hooks/useStation';
import { confirmAction } from '../../../../utils/swal';

const REGION_LABELS: Record<string, string> = {
    MIEN_NAM: 'Miền Nam',
    MIEN_TRUNG: 'Miền Trung',
    MIEN_BAC: 'Miền Bắc',
    SOUTH: 'Miền Nam',
    CENTRAL: 'Miền Trung',
    NORTH: 'Miền Bắc',
};

const WEEKDAY_LABELS: Record<string, string> = {
    MONDAY: 'T2',
    TUESDAY: 'T3',
    WEDNESDAY: 'T4',
    THURSDAY: 'T5',
    FRIDAY: 'T6',
    SATURDAY: 'T7',
    SUNDAY: 'CN',
};

export interface SyncPreviewParams {
    source: string;
    region: string;
    defaultPrice: number;
}

interface PreviewItem {
    name: string;
    canonicalName: string;
    province: string;
    region: string;
    drawDays: string[];
    drawTime: string;
    nextDrawDate?: string;
    price: number;
    action: string;
    existingStationId: number | null;
    commissionRate: number | null;
}

interface SyncStationPreviewModalProps {
    open: boolean;
    onClose: () => void;
    previewData: any;
    syncParams: SyncPreviewParams | null;
}

const normalizeDrawDays = (drawDays?: string[]) =>
    Array.isArray(drawDays) ? drawDays.map((day) => day.toUpperCase()) : [];

const formatDrawTime = (drawTime?: string) => {
    if (!drawTime) return '';
    return drawTime.length >= 5 ? drawTime.slice(0, 5) : drawTime;
};

const formatDrawSchedule = (item: PreviewItem) => {
    if (item.nextDrawDate) {
        return dayjs(item.nextDrawDate).format('DD/MM/YYYY');
    }
    const days = normalizeDrawDays(item.drawDays)
        .map((day) => WEEKDAY_LABELS[day] || day)
        .join(', ');
    const time = formatDrawTime(item.drawTime);
    return time ? `${days} ${time}` : days;
};

const parseCommissionInput = (value: string): number | null => {
    if (value.trim() === '') {
        return null;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
        return null;
    }
    return parsed;
};

const isValidCommissionRate = (rate: number | null | string) => {
    if (rate == null || rate === '') return false;
    const num = Number(rate);
    return !isNaN(num) && num >= 0 && num <= 1;
};

export const SyncStationPreviewModal: React.FC<SyncStationPreviewModalProps> = ({
    open,
    onClose,
    previewData,
    syncParams,
}) => {
    const { mutate: confirmSync, isPending } = useConfirmSyncStations();
    const previewItems: PreviewItem[] = previewData?.data?.items || previewData?.items || [];

    const [commissionRates, setCommissionRates] = useState<Record<string, number | null | string>>({});

    useEffect(() => {
        if (!open || previewItems.length === 0) {
            return;
        }
        const initial: Record<string, number | null | string> = {};
        previewItems.forEach((item) => {
            initial[item.canonicalName] = item.commissionRate ?? null;
        });
        setCommissionRates(initial);
    }, [open, previewData]);

    const rows = useMemo(
        () => previewItems.map((item) => ({
            ...item,
            drawDays: normalizeDrawDays(item.drawDays),
            drawTime: formatDrawTime(item.drawTime),
            editedCommissionRate: commissionRates[item.canonicalName] ?? null,
        })),
        [previewItems, commissionRates]
    );

    const missingCommissionStations = rows.filter(
        (row) => row.existingStationId == null && !isValidCommissionRate(row.editedCommissionRate)
    );

    const submitConfirm = () => {
        if (!syncParams) {
            return;
        }

        const invalidRate = rows.find((row) => {
            const rate = row.editedCommissionRate;
            return row.existingStationId == null && rate != null && !isValidCommissionRate(rate);
        });

        if (invalidRate) {
            toast.error(`Tỷ lệ hoa hồng của "${invalidRate.name}" phải từ 0 đến 1.`);
            return;
        }

        const payload = {
            source: syncParams.source,
            region: syncParams.region,
            defaultPrice: syncParams.defaultPrice,
            items: rows
                .filter((row) => row.existingStationId == null)
                .map((row) => ({
                    name: row.name,
                    canonicalName: row.canonicalName,
                    drawDays: row.drawDays,
                    drawTime: row.drawTime,
                    commissionRate: isValidCommissionRate(row.editedCommissionRate)
                        ? Number(row.editedCommissionRate)
                        : null,
                    action: row.action,
                    existingStationId: row.existingStationId,
                })),
        };

        confirmSync(payload, {
            onSuccess: (response: any) => {
                const data = response?.data || response;
                const created = data?.createdCount ?? 0;
                const updated = data?.updatedCount ?? 0;
                toast.success(`Lưu đồng bộ thành công (${created} mới, ${updated} cập nhật).`);
                onClose();
            },
            onError: (error: any) => {
                toast.error(error?.response?.data?.message || 'Lưu đồng bộ thất bại');
            },
        });
    };

    const handleConfirmSave = () => {
        if (missingCommissionStations.length > 0) {
            const names = missingCommissionStations.map((row) => row.name).join(', ');
            confirmAction(
                'Xác nhận lưu không có hoa hồng?',
                `Các nhà đài sau sẽ được lưu ở trạng thái chờ cấu hình hoa hồng: ${names}`,
                submitConfirm,
                'warning'
            );
            return;
        }
        submitConfirm();
    };

    return (
        <Dialog open={open} onClose={isPending ? undefined : onClose} maxWidth="xl" fullWidth>
            <DialogTitle sx={{ fontWeight: 'bold' }}>
                Xem trước đồng bộ nhà đài
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Kiểm tra thông tin và nhập tỷ lệ hoa hồng (0–1) trước khi lưu. Nhà đài chưa có hoa hồng sẽ ở trạng thái chờ cấu hình.
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Tên nhà đài</TableCell>
                                <TableCell>Miền</TableCell>
                                <TableCell>Tỉnh/TP</TableCell>
                                <TableCell>Ngày quay</TableCell>
                                <TableCell width={160}>Hoa hồng (0–1)</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row) => {
                                const isExisting = row.existingStationId != null;
                                return (
                                    <TableRow key={row.canonicalName} sx={{ opacity: isExisting ? 0.5 : 1 }}>
                                        <TableCell>{row.name}</TableCell>
                                        <TableCell>{REGION_LABELS[row.region] || row.region}</TableCell>
                                        <TableCell>{row.province}</TableCell>
                                        <TableCell>{formatDrawSchedule(row)}</TableCell>
                                        <TableCell>
                                            <TextField
                                                size="small"
                                                placeholder="VD: 0.05"
                                                value={row.editedCommissionRate ?? ''}
                                                onChange={(e) => {
                                                    const rawValue = e.target.value;
                                                    if (rawValue === '') {
                                                        setCommissionRates((prev) => ({
                                                            ...prev,
                                                            [row.canonicalName]: '',
                                                        }));
                                                        return;
                                                    }
                                                    const numValue = Number(rawValue);
                                                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 1) {
                                                        setCommissionRates((prev) => ({
                                                            ...prev,
                                                            [row.canonicalName]: rawValue,
                                                        }));
                                                    }
                                                }}
                                                disabled={isPending || isExisting}
                                                fullWidth
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0, flexDirection: 'column', alignItems: 'flex-end' }}>
                <Box sx={{ display: 'flex', gap: 1, mb: rows.length > 0 && rows.every(r => r.existingStationId != null) ? 1 : 0 }}>
                    <Button onClick={onClose} disabled={isPending} color="inherit">
                        Hủy
                    </Button>
                    <LoadingButton
                        loading={isPending}
                        onClick={handleConfirmSave}
                        label="Xác nhận & Lưu"
                        variant="contained"
                        disabled={rows.length === 0 || rows.every((r) => r.existingStationId != null)}
                    />
                </Box>
                {rows.length > 0 && rows.every((r) => r.existingStationId != null) && (
                    <Typography variant="caption" color="text.secondary">
                        Tất cả nhà đài đều đã tồn tại trên hệ thống.
                    </Typography>
                )}
            </DialogActions>
        </Dialog>
    );
};
