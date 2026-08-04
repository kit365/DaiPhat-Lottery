"use client";

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

const normalizeDrawDays = (drawDays?: string[] | string) => {
    if (!drawDays) {
        return [];
    }
    const values = Array.isArray(drawDays) ? drawDays : [drawDays];
    return values
        .map((day) => String(day).trim().toUpperCase())
        .filter((day) => day.length > 0);
};

const formatDrawTime = (drawTime?: unknown) => {
    if (drawTime == null || drawTime === '') {
        return '';
    }
    const normalized = String(drawTime).trim();
    if (!normalized) {
        return '';
    }
    const match = normalized.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
        return `${match[1].padStart(2, '0')}:${match[2]}`;
    }
    return normalized.length >= 5 ? normalized.slice(0, 5) : normalized;
};

const isExistingStationRow = (row: { existingStationId?: number | null }) =>
    row.existingStationId != null && row.existingStationId > 0;

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
    const [bulkCommissionRate, setBulkCommissionRate] = useState<string>('');

    useEffect(() => {
        if (!open || previewItems.length === 0) {
            return;
        }
        const initial: Record<string, number | null | string> = {};
        previewItems.forEach((item) => {
            initial[item.canonicalName] = item.commissionRate ?? null;
        });
        setCommissionRates(initial);
        setBulkCommissionRate('');
    }, [open, previewData]);

    const handleApplyBulkCommission = () => {
        const rawValue = bulkCommissionRate.trim();
        if (rawValue === '') {
            toast.error('Vui lòng nhập tỷ lệ hoa hồng để áp dụng.');
            return;
        }
        const numValue = Number(rawValue);
        if (isNaN(numValue) || numValue < 0 || numValue > 1) {
            toast.error('Tỷ lệ hoa hồng không hợp lệ (phải từ 0 đến 1, ví dụ: 0.1).');
            return;
        }

        const updatedRates: Record<string, number | null | string> = { ...commissionRates };
        let count = 0;
        previewItems.forEach((item) => {
            if (!isExistingStationRow(item)) {
                updatedRates[item.canonicalName] = rawValue;
                count++;
            }
        });

        setCommissionRates(updatedRates);
        if (count > 0) {
            toast.success(`Đã áp dụng hoa hồng ${rawValue} cho ${count} nhà đài.`);
        } else {
            toast.info('Không có nhà đài mới nào để áp dụng hoa hồng.');
        }
    };

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
        (row) => !isExistingStationRow(row) && !isValidCommissionRate(row.editedCommissionRate)
    );

    const buildConfirmItems = () => {
        const newStationRows = rows.filter((row) => !isExistingStationRow(row));

        for (const row of newStationRows) {
            if (!row.drawDays.length || !row.drawTime) {
                toast.error(`Nhà đài "${row.name}" thiếu lịch quay hợp lệ.`);
                return null;
            }
        }

        return newStationRows.map((row) => ({
            name: row.name,
            canonicalName: row.canonicalName,
            drawDays: row.drawDays,
            drawTime: row.drawTime,
            commissionRate: isValidCommissionRate(row.editedCommissionRate)
                ? Number(row.editedCommissionRate)
                : null,
            action: 'CREATED' as const,
            existingStationId: null,
        }));
    };

    const submitConfirm = () => {
        if (!syncParams) {
            return;
        }

        const invalidRate = rows.find((row) => {
            const rate = row.editedCommissionRate;
            return !isExistingStationRow(row) && rate != null && !isValidCommissionRate(rate);
        });

        if (invalidRate) {
            toast.error(`Tỷ lệ hoa hồng của "${invalidRate.name}" phải từ 0 đến 1.`);
            return;
        }

        const confirmItems = buildConfirmItems();
        if (!confirmItems || confirmItems.length === 0) {
            toast.error('Không có nhà đài mới để đồng bộ.');
            return;
        }

        const payload = {
            source: syncParams.source,
            region: syncParams.region,
            defaultPrice: syncParams.defaultPrice,
            items: confirmItems,
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
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 2,
                        flexWrap: 'wrap',
                        gap: 2,
                    }}
                >
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 600 }}>
                        Kiểm tra thông tin và nhập tỷ lệ hoa hồng (0–1) cho nhà đài mới trước khi lưu.
                        Nhà đài đã tồn tại (làm mờ) sẽ được bỏ qua; chỉ các nhà đài mới được tạo.
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField
                            size="small"
                            placeholder="Hoa hồng chung (VD: 0.1)"
                            value={bulkCommissionRate}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                    setBulkCommissionRate('');
                                    return;
                                }
                                const num = Number(val);
                                if (!isNaN(num) && num >= 0 && num <= 1) {
                                    setBulkCommissionRate(val);
                                }
                            }}
                            disabled={isPending || rows.every(isExistingStationRow)}
                            sx={{ width: 190 }}
                        />
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleApplyBulkCommission}
                            disabled={isPending || !bulkCommissionRate.trim() || rows.every(isExistingStationRow)}
                            sx={{ whiteSpace: 'nowrap', height: 40 }}
                        >
                            Áp dụng cho tất cả
                        </Button>
                    </Box>
                </Box>
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
                                const isExisting = isExistingStationRow(row);
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
                <Box sx={{ display: 'flex', gap: 1, mb: rows.length > 0 && rows.every(isExistingStationRow) ? 1 : 0 }}>
                    <Button onClick={onClose} disabled={isPending} color="inherit">
                        Hủy
                    </Button>
                    <LoadingButton
                        loading={isPending}
                        onClick={handleConfirmSave}
                        label="Xác nhận & Lưu"
                        variant="contained"
                        disabled={rows.length === 0 || rows.every(isExistingStationRow)}
                    />
                </Box>
                {rows.length > 0 && rows.every(isExistingStationRow) && (
                    <Typography variant="caption" color="text.secondary">
                        Tất cả nhà đài đều đã tồn tại trên hệ thống.
                    </Typography>
                )}
            </DialogActions>
        </Dialog>
    );
};
