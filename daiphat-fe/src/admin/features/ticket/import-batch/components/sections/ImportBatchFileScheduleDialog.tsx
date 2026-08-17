'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import { updateStationSchedule } from '../../../../station/services/stationService';
import type {
    BackendDayOfWeek,
    ImportBatchFileScheduleMismatch,
} from '../../types/importBatch.type';

type ImportBatchFileScheduleDialogProps = {
    open: boolean;
    onClose: () => void;
    mismatches: ImportBatchFileScheduleMismatch[];
    /** Called after a successful save so the caller can re-run the preview. */
    onSaved: () => void;
};

/** Week order, Monday first, as a Vietnamese calendar prints it. */
const WEEK: Array<{ value: BackendDayOfWeek; label: string }> = [
    { value: 'MONDAY', label: 'T2' },
    { value: 'TUESDAY', label: 'T3' },
    { value: 'WEDNESDAY', label: 'T4' },
    { value: 'THURSDAY', label: 'T5' },
    { value: 'FRIDAY', label: 'T6' },
    { value: 'SATURDAY', label: 'T7' },
    { value: 'SUNDAY', label: 'CN' },
];

const LABEL_BY_DAY = new Map(WEEK.map((day) => [day.value, day.label]));

const describe = (days: BackendDayOfWeek[]) =>
    days.length === 0 ? 'chưa thiết lập' : days.map((day) => LABEL_BY_DAY.get(day) ?? day).join(', ');

/** What the operator has decided this station's weekly schedule should become. */
type DraftRow = {
    lotteryStationId: number;
    drawDays: BackendDayOfWeek[];
};

const buildDrafts = (mismatches: ImportBatchFileScheduleMismatch[]): DraftRow[] =>
    mismatches.map((item) => ({
        lotteryStationId: item.lotteryStationId,
        // Seed with the suggestion: keep the days the station already serves and
        // add the one the file needs. Dropping an existing day would silently
        // break imports for other draw dates.
        drawDays: item.suggestedDrawDays,
    }));

/**
 * Fixes stale draw schedules without leaving the import.
 *
 * <p>A file naming a station on a weekday the system does not have almost always
 * means the schedule went stale — the delivery really happened. Sending the
 * operator to the station screen to fix it loses the upload, so the correction
 * happens here and the preview re-runs.
 */
export const ImportBatchFileScheduleDialog = ({
    open,
    onClose,
    mismatches,
    onSaved,
}: ImportBatchFileScheduleDialogProps) => {
    const [drafts, setDrafts] = useState<DraftRow[]>([]);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            setDrafts(buildDrafts(mismatches));
        }
    }, [open, mismatches]);

    const byStationId = useMemo(
        () => new Map(mismatches.map((item) => [item.lotteryStationId, item])),
        [mismatches]
    );

    const toggleDay = (stationId: number, day: BackendDayOfWeek) => {
        setDrafts((current) =>
            current.map((row) => {
                if (row.lotteryStationId !== stationId) {
                    return row;
                }
                const has = row.drawDays.includes(day);
                const next = has
                    ? row.drawDays.filter((value) => value !== day)
                    : [...row.drawDays, day];
                // Kept in week order so the chip row always reads left to right.
                return {
                    ...row,
                    drawDays: WEEK.map((entry) => entry.value).filter((value) =>
                        next.includes(value)
                    ),
                };
            })
        );
    };

    /** Rows that would not actually solve the problem they were opened for. */
    const unresolved = drafts.filter((row) => {
        const source = byStationId.get(row.lotteryStationId);
        if (!source) {
            return false;
        }
        return !source.requiredDrawDays.every((day) => row.drawDays.includes(day));
    });

    const empty = drafts.filter((row) => row.drawDays.length === 0);
    const inactive = mismatches.filter((item) => !item.active);

    const handleSave = async () => {
        if (empty.length > 0) {
            toast.error('Mỗi nhà đài phải có ít nhất một ngày quay trong tuần.');
            return;
        }

        setBusy(true);
        try {
            // One call per station: the endpoint updates a single schedule, and a
            // partial failure leaves the stations that did save already correct.
            for (const row of drafts) {
                await updateStationSchedule({
                    lotteryStationId: row.lotteryStationId,
                    drawDays: row.drawDays,
                });
            }
            toast.success(`Đã cập nhật lịch quay cho ${drafts.length} nhà đài.`);
            onSaved();
            onClose();
        } catch {
            toast.error('Không cập nhật được lịch quay. Vui lòng thử lại.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ fontWeight: 800 }}>Đối chiếu lịch quay nhà đài</DialogTitle>
            <DialogContent dividers>
                <Alert severity="warning" sx={{ mb: 2, borderRadius: '10px' }}>
                    Các nhà đài dưới đây có trong hệ thống nhưng lịch quay không bao gồm thứ của ngày
                    quay trong tệp, nên vé của họ không nhập được. Nếu đài thực sự có quay vào ngày
                    đó, hãy bổ sung thứ còn thiếu rồi xem trước lại. Thay đổi được lưu vĩnh viễn vào
                    nhà đài.
                </Alert>

                {inactive.length > 0 && (
                    <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
                        {inactive.map((item) => item.stationName).join(', ')} đang{' '}
                        <b>ngừng hoạt động</b>. Sửa lịch quay không đủ — cần bật lại nhà đài ở màn
                        hình quản lý nhà đài trước.
                    </Alert>
                )}

                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Nhà đài</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Ngày quay trong tệp</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Lịch hiện tại</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Lịch quay áp dụng</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {drafts.map((row) => {
                            const source = byStationId.get(row.lotteryStationId);
                            if (!source) {
                                return null;
                            }
                            const missing = source.requiredDrawDays.filter(
                                (day) => !row.drawDays.includes(day)
                            );

                            return (
                                <TableRow key={row.lotteryStationId} hover>
                                    <TableCell sx={{ fontWeight: 600 }}>
                                        <Stack spacing={0.25}>
                                            <span>{source.stationName}</span>
                                            {source.stationCode && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {source.stationCode}
                                                </Typography>
                                            )}
                                        </Stack>
                                    </TableCell>

                                    <TableCell>
                                        <Stack spacing={0.25}>
                                            <Typography variant="body2">{source.drawDate}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Cần có: {describe(source.requiredDrawDays)}
                                            </Typography>
                                        </Stack>
                                    </TableCell>

                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {describe(source.currentDrawDays)}
                                        </Typography>
                                    </TableCell>

                                    <TableCell>
                                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                            {WEEK.map((day) => {
                                                const selected = row.drawDays.includes(day.value);
                                                const required = source.requiredDrawDays.includes(
                                                    day.value
                                                );
                                                return (
                                                    <Tooltip
                                                        key={day.value}
                                                        title={
                                                            required
                                                                ? 'Thứ mà ngày quay trong tệp rơi vào'
                                                                : ''
                                                        }
                                                    >
                                                        <Chip
                                                            size="small"
                                                            label={day.label}
                                                            clickable
                                                            onClick={() =>
                                                                toggleDay(
                                                                    row.lotteryStationId,
                                                                    day.value
                                                                )
                                                            }
                                                            color={
                                                                selected
                                                                    ? required
                                                                        ? 'success'
                                                                        : 'primary'
                                                                    : 'default'
                                                            }
                                                            variant={selected ? 'filled' : 'outlined'}
                                                            sx={{ fontWeight: 700, minWidth: 44 }}
                                                        />
                                                    </Tooltip>
                                                );
                                            })}
                                        </Stack>
                                        {missing.length > 0 && (
                                            <Typography
                                                variant="caption"
                                                color="error"
                                                sx={{ mt: 0.5, display: 'block' }}
                                            >
                                                Còn thiếu {describe(missing)} — vé của đài này vẫn sẽ
                                                không nhập được.
                                            </Typography>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>

                <Box sx={{ mt: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">
                        Ô xanh lá là thứ mà ngày quay trong tệp rơi vào. Các thứ đang có sẵn được giữ
                        nguyên để không ảnh hưởng những ngày quay khác của đài.
                    </Typography>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} disabled={busy} sx={{ textTransform: 'none' }}>
                    Huỷ bỏ
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={busy || drafts.length === 0 || empty.length > 0}
                    startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                    {unresolved.length > 0 ? 'Vẫn lưu và xem lại' : 'Lưu và xem lại'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
