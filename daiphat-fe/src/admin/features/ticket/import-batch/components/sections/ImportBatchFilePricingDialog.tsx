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
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import { bulkUpdateStationPricing } from '../../../../station/services/stationService';
import type { ImportBatchFilePricingMismatch } from '../../types/importBatch.type';

type ImportBatchFilePricingDialogProps = {
    open: boolean;
    onClose: () => void;
    mismatches: ImportBatchFilePricingMismatch[];
    /** Called after a successful save so the caller can re-run the preview. */
    onSaved: () => void;
};

/** What the operator has decided this station's pricing should become. */
type DraftRow = {
    lotteryStationId: number;
    stationName: string;
    salePrice: string;
    commissionPercent: string;
};

const toInput = (value?: number) => (value == null ? '' : String(value));

const parseNumber = (value: string): number | null => {
    const trimmed = value.trim().replace(/\s/g, '');
    if (!trimmed) {
        return null;
    }
    const parsed = Number(trimmed.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
};

const formatMoney = (value?: number | null) =>
    value == null ? '—' : value.toLocaleString('vi-VN', { maximumFractionDigits: 0 });

const formatPercent = (value?: number | null) => (value == null ? '—' : `${value}%`);

/** Same rule the backend applies, so the preview here matches what gets stored. */
const deriveImportCost = (salePrice: number | null, commissionPercent: number | null) => {
    if (salePrice == null || commissionPercent == null) {
        return null;
    }
    return Math.round(salePrice * (1 - commissionPercent / 100));
};

const buildDrafts = (mismatches: ImportBatchFilePricingMismatch[]): DraftRow[] =>
    mismatches.map((item) => ({
        lotteryStationId: item.lotteryStationId,
        stationName: item.stationName,
        // Seed with the system's current values: keeping today's configuration is
        // the safer default, and adopting the file is one click away.
        salePrice: toInput(item.salePriceInSystem),
        commissionPercent: toInput(item.commissionRateInSystem),
    }));

export const ImportBatchFilePricingDialog = ({
    open,
    onClose,
    mismatches,
    onSaved,
}: ImportBatchFilePricingDialogProps) => {
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

    const patch = (stationId: number, field: keyof DraftRow, value: string) => {
        setDrafts((current) =>
            current.map((row) =>
                row.lotteryStationId === stationId ? { ...row, [field]: value } : row
            )
        );
    };

    const adoptFile = (stationId: number) => {
        const source = byStationId.get(stationId);
        if (!source) {
            return;
        }
        setDrafts((current) =>
            current.map((row) =>
                row.lotteryStationId === stationId
                    ? {
                          ...row,
                          salePrice: toInput(source.salePriceInFile ?? source.salePriceInSystem),
                          commissionPercent: toInput(
                              source.commissionRateInFile ?? source.commissionRateInSystem
                          ),
                      }
                    : row
            )
        );
    };

    const invalidRows = drafts.filter((row) => {
        const price = parseNumber(row.salePrice);
        const commission = parseNumber(row.commissionPercent);
        return (
            price == null ||
            price <= 0 ||
            commission == null ||
            commission < 0 ||
            commission > 100
        );
    });

    const handleSave = async () => {
        if (invalidRows.length > 0) {
            toast.error('Giá bán phải lớn hơn 0 và hoa hồng nằm trong khoảng 0–100%.');
            return;
        }

        setBusy(true);
        try {
            await bulkUpdateStationPricing(
                drafts.map((row) => ({
                    lotteryStationId: row.lotteryStationId,
                    // The API field is named importCost but the backend writes it to
                    // lottery_stations.price, so the sale price belongs here.
                    importCost: parseNumber(row.salePrice) as number,
                    commissionRate: (parseNumber(row.commissionPercent) as number) / 100,
                }))
            );
            toast.success(`Đã cập nhật giá cho ${drafts.length} đài.`);
            onSaved();
            onClose();
        } catch {
            toast.error('Không cập nhật được giá đài. Vui lòng thử lại.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ fontWeight: 800 }}>Đối chiếu giá nhà đài</DialogTitle>
            <DialogContent dividers>
                <Alert severity="warning" sx={{ mb: 2, borderRadius: '10px' }}>
                    Giá trong tệp lệch với cấu hình đài trên hệ thống. Phiếu nhập luôn được tính tiền
                    theo cấu hình đài, nên phải thống nhất trước khi tạo phiếu. Thay đổi tại đây sẽ
                    được lưu vĩnh viễn vào nhà đài.
                </Alert>

                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Nhà đài</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Trong tệp</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Trên hệ thống</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 150 }}>Giá bán áp dụng</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 140 }}>Hoa hồng (%)</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Giá nhập kết quả</TableCell>
                            <TableCell />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {drafts.map((row) => {
                            const source = byStationId.get(row.lotteryStationId);
                            const price = parseNumber(row.salePrice);
                            const commission = parseNumber(row.commissionPercent);
                            const derived = deriveImportCost(price, commission);
                            const priceInvalid = price == null || price <= 0;
                            const commissionInvalid =
                                commission == null || commission < 0 || commission > 100;

                            return (
                                <TableRow key={row.lotteryStationId} hover>
                                    <TableCell sx={{ fontWeight: 600 }}>
                                        <Stack spacing={0.25}>
                                            <span>{row.stationName}</span>
                                            {source?.rowNumber != null && (
                                                <Typography variant="caption" color="text.secondary">
                                                    Lệch ở dòng #{source.rowNumber} của tệp
                                                </Typography>
                                            )}
                                        </Stack>
                                    </TableCell>

                                    <TableCell>
                                        <Stack spacing={0.25}>
                                            <Typography variant="caption">
                                                Giá bán: {formatMoney(source?.salePriceInFile)}
                                            </Typography>
                                            <Typography variant="caption">
                                                Hoa hồng: {formatPercent(source?.commissionRateInFile)}
                                            </Typography>
                                            <Typography variant="caption">
                                                Giá nhập: {formatMoney(source?.importCostInFile)}
                                            </Typography>
                                        </Stack>
                                    </TableCell>

                                    <TableCell>
                                        <Stack spacing={0.25}>
                                            <Typography variant="caption">
                                                Giá bán: {formatMoney(source?.salePriceInSystem)}
                                            </Typography>
                                            <Typography variant="caption">
                                                Hoa hồng: {formatPercent(source?.commissionRateInSystem)}
                                            </Typography>
                                            <Typography variant="caption">
                                                Giá nhập: {formatMoney(source?.importCostExpected)}
                                            </Typography>
                                        </Stack>
                                    </TableCell>

                                    <TableCell>
                                        <TextField
                                            size="small"
                                            fullWidth
                                            value={row.salePrice}
                                            error={priceInvalid}
                                            onChange={(event) =>
                                                patch(row.lotteryStationId, 'salePrice', event.target.value)
                                            }
                                        />
                                    </TableCell>

                                    <TableCell>
                                        <TextField
                                            size="small"
                                            fullWidth
                                            value={row.commissionPercent}
                                            error={commissionInvalid}
                                            onChange={(event) =>
                                                patch(
                                                    row.lotteryStationId,
                                                    'commissionPercent',
                                                    event.target.value
                                                )
                                            }
                                        />
                                    </TableCell>

                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={formatMoney(derived)}
                                            color={
                                                derived != null &&
                                                source?.importCostInFile != null &&
                                                derived === Math.round(source.importCostInFile)
                                                    ? 'success'
                                                    : 'default'
                                            }
                                        />
                                    </TableCell>

                                    <TableCell>
                                        <Tooltip title="Lấy giá bán và hoa hồng theo tệp">
                                            <span>
                                                <Button
                                                    size="small"
                                                    onClick={() => adoptFile(row.lotteryStationId)}
                                                    sx={{ textTransform: 'none', fontWeight: 700 }}
                                                >
                                                    Theo tệp
                                                </Button>
                                            </span>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>

                <Box sx={{ mt: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">
                        Giá nhập không nhập tay được — hệ thống luôn tính bằng Giá bán × (1 − Hoa hồng).
                        Ô hiển thị xanh khi kết quả khớp với giá nhập ghi trong tệp.
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
                    disabled={busy || drafts.length === 0 || invalidRows.length > 0}
                    startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                    Lưu và xem lại
                </Button>
            </DialogActions>
        </Dialog>
    );
};
