import {
    Alert,
    Box,
    Button,
    Chip,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Paper,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Title } from '../../components/ui/Title';
import { CollapsibleCard } from '../../components/ui/CollapsibleCard';
import { CanAccess } from '../../components/auth/CanAccess';
import { PERMISSIONS } from '../../constants/permission.constants';
import { prefixAdmin, ROUTES } from '../../constants/routes';
import { useImportBatchDetail } from './hooks/useImportBatch';
import { useProviders } from '../provider/hooks/useProvider';
import {
    getBatchTypeLabel,
    getImportBatchCancelledAlertMessage,
    getImportBatchLineStatusLabel,
    getImportBatchLineStatusChipColor,
    formatImportBatchLineCancelReason,
    getImportBatchStatusChipColor,
    getImportBatchStatusLabel,
    getImportModeLabel,
    formatImportBatchCancelReason,
    importBatchStatusChipSx,
} from './utils/batchTypeLabels';
import {
    displayImportBatchLineCodeRaw,
    formatImportBatchHeaderCode,
    formatImportBatchLineCode,
    importBatchCodeMonospaceSx,
} from './utils/importBatchCode';
import {
    findFirstIncompleteLine,
    hasTicketImportEligibleLines,
    isImportBatchEditable,
} from '../ticket/utils/importBatchProgress';
import { hasUnsavedImportBatchEditDraft } from './utils/importBatchEditDraft';
import { ImportBatchProgressBar } from './components/ImportBatchProgressBar';
import { ImagePreview } from '../../components/ui/ImagePreview';
import dayjs from 'dayjs';

export const ImportBatchDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: batch, isLoading } = useImportBatchDetail(id);
    const { data: providersRes } = useProviders({ size: 1000 });
    const providers = (providersRes as any)?.data?.recordList || [];

    const resolveStationName = (stationId: number) =>
        providers.find((p: any) => String(p.id || p._id) === String(stationId))?.name ||
        `Đài #${stationId}`;

    const batchLines = batch?.lines ?? [];
    const totalDeclareQuantity = batch?.totalDeclareQuantity ?? 0;
    const totalDeclaredCostValue = batch?.totalDeclaredCostValue ?? 0;
    const totalImportedQuantity = batch?.totalImportedQuantity ?? 0;
    const totalImportedCostValue = batch?.totalImportedCostValue ?? 0;
    const canEditBatch = batch ? isImportBatchEditable(batch) : false;
    const canImportTickets = batch ? hasTicketImportEligibleLines(batch) : false;
    const hasUnsavedDraft = id ? hasUnsavedImportBatchEditDraft(id) : false;

    const cancelledReasonText =
        batch?.status === 'CANCELLED' ? formatImportBatchCancelReason(batch.cancelReason) : undefined;

    if (isLoading) {
        return null;
    }

    if (!batch) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>Không tìm thấy phiếu nhập lô.</Typography>
            </Box>
        );
    }

    const firstIncompleteLine = findFirstIncompleteLine(batch);

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Breadcrumb
                items={[
                    { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                    { label: 'Nhập lô vé', to: ROUTES.ADMIN.IMPORT_BATCH.LIST },
                    { label: formatImportBatchHeaderCode(batch.batchCode, batch.id) },
                ]}
            />
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
                justifyContent="space-between"
                spacing={2}
                sx={{ mb: 2 }}
            >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
                        <Title title={`Phiếu nhập lô ${formatImportBatchHeaderCode(batch.batchCode, batch.id)}`} />
                        <Chip
                            label={getImportBatchStatusLabel(batch.status)}
                            color={getImportBatchStatusChipColor(batch.status)}
                            size="small"
                            sx={importBatchStatusChipSx}
                        />
                    </Stack>
                    {cancelledReasonText && (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.75, maxWidth: 720 }}
                        >
                            {cancelledReasonText}
                        </Typography>
                    )}
                </Box>
                {canEditBatch && (
                    <CanAccess permission={PERMISSIONS.IMPORT_BATCH.CREATE}>
                        <Stack direction="row" spacing={1}>
                            <Button
                                variant="outlined"
                                onClick={() => navigate(ROUTES.ADMIN.IMPORT_BATCH.EDIT(batch.id))}
                            >
                                Chỉnh sửa phiếu
                            </Button>
                            {canImportTickets && (
                                <CanAccess permission={PERMISSIONS.TICKET.CREATE}>
                                    <Button
                                        variant="contained"
                                        onClick={() =>
                                            navigate(
                                                ROUTES.ADMIN.TICKETS.CREATE_FOR_BATCH(
                                                    batch.id,
                                                    firstIncompleteLine?.id
                                                )
                                            )
                                        }
                                    >
                                        Nhập vé vào phiếu
                                    </Button>
                                </CanAccess>
                            )}
                        </Stack>
                    </CanAccess>
                )}
            </Stack>

            {hasUnsavedDraft && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Phiếu nhập lô đang được chỉnh sửa và chưa được lưu. Nội dung nháp cục bộ sẽ được
                    khôi phục khi bạn mở màn hình chỉnh sửa.
                </Alert>
            )}

            <CollapsibleCard title="Thông tin phiếu" expanded onToggle={() => undefined}>
                <Stack spacing={2} sx={{ p: 3 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                            label="Ngày quay"
                            value={batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : ''}
                            fullWidth
                            InputProps={{ readOnly: true }}
                        />
                        <TextField
                            label="Nhà cung cấp"
                            value={batch.supplierName || '—'}
                            fullWidth
                            InputProps={{ readOnly: true }}
                        />
                        <TextField
                            label="Loại nhập"
                            value={getImportModeLabel(batch.importMode)}
                            fullWidth
                            InputProps={{ readOnly: true }}
                        />
                        <TextField
                            label="Số dòng"
                            value={batch.lineCount ?? batchLines.length}
                            fullWidth
                            InputProps={{ readOnly: true }}
                        />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                            label="Tổng SL khai báo"
                            value={totalDeclareQuantity}
                            fullWidth
                            InputProps={{ readOnly: true }}
                        />
                        <TextField
                            label="Tổng giá trị khai báo (VNĐ)"
                            value={Number(totalDeclaredCostValue).toLocaleString('vi-VN')}
                            fullWidth
                            InputProps={{ readOnly: true }}
                        />
                        <TextField
                            label="Tổng SL đã nhập"
                            value={totalImportedQuantity}
                            fullWidth
                            InputProps={{ readOnly: true }}
                        />
                        <TextField
                            label="Tổng giá trị đã nhập (VNĐ)"
                            value={Number(totalImportedCostValue).toLocaleString('vi-VN')}
                            fullWidth
                            InputProps={{ readOnly: true }}
                        />
                    </Stack>

                    <ImportBatchProgressBar
                        batch={batch}
                        resolveStationName={resolveStationName}
                    />

                    {batch.note && (
                        <TextField
                            label="Ghi chú"
                            value={batch.note}
                            fullWidth
                            multiline
                            minRows={2}
                            InputProps={{ readOnly: true }}
                        />
                    )}

                    {batch.invoiceEvidenceUrl && (
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                Ảnh biên lai
                            </Typography>
                            <ImagePreview
                                src={batch.invoiceEvidenceUrl}
                                alt="Ảnh biên lai"
                                dialogTitle="Ảnh biên lai"
                                infoItems={[
                                    {
                                        label: 'Mã phiếu',
                                        value: formatImportBatchHeaderCode(batch.batchCode, batch.id),
                                    },
                                    {
                                        label: 'Ngày quay',
                                        value: batch.drawDate
                                            ? dayjs(batch.drawDate).format('DD/MM/YYYY')
                                            : '—',
                                    },
                                    {
                                        label: 'Nhà cung cấp',
                                        value: batch.supplierName || '—',
                                    },
                                    {
                                        label: 'Loại nhập',
                                        value: getImportModeLabel(batch.importMode),
                                    },
                                ]}
                                thumbnailSx={{
                                    maxWidth: 240,
                                    maxHeight: 180,
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    objectFit: 'contain',
                                }}
                            />
                        </Box>
                    )}

                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Nhà đài</TableCell>
                                    <TableCell>Loại lô</TableCell>
                                    <TableCell>Mã lô nhập</TableCell>
                                    <TableCell>Trạng thái dòng</TableCell>
                                    <TableCell align="right">Khai báo</TableCell>
                                    <TableCell align="right">Đã nhập</TableCell>
                                    <TableCell align="right">Giá vốn</TableCell>
                                    <TableCell align="right">GT khai báo</TableCell>
                                    <TableCell align="right">GT đã nhập</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {batchLines.map((line) => {
                                    const stationName = resolveStationName(line.lotteryStationId);

                                    return (
                                        <TableRow key={line.id}>
                                            <TableCell>{stationName}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={getBatchTypeLabel(line.batchType)}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography
                                                    variant="body2"
                                                    sx={importBatchCodeMonospaceSx}
                                                    title={formatImportBatchLineCode(line.batchCode)}
                                                >
                                                    {displayImportBatchLineCodeRaw(line.batchCode)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={getImportBatchLineStatusLabel(line.status)}
                                                    size="small"
                                                    color={getImportBatchLineStatusChipColor(line.status)}
                                                />
                                                {line.status === 'CANCELLED' && line.cancelReason && (
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        sx={{ display: 'block', mt: 0.5, maxWidth: 280 }}
                                                    >
                                                        {formatImportBatchLineCancelReason(line.cancelReason)}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell align="right">{line.declareQuantity}</TableCell>
                                            <TableCell align="right">{line.totalQuantity}</TableCell>
                                            <TableCell align="right">
                                                {Number(line.importCost).toLocaleString('vi-VN')}
                                            </TableCell>
                                            <TableCell align="right">
                                                {Number(
                                                    line.declaredCostValue ??
                                                        line.declareQuantity * line.importCost
                                                ).toLocaleString('vi-VN')}
                                            </TableCell>
                                            <TableCell align="right">
                                                {Number(line.totalCostValue).toLocaleString('vi-VN')}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Stack>
            </CollapsibleCard>

            {batch.status === 'CANCELLED' && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {getImportBatchCancelledAlertMessage(batch.cancelReason)}
                </Alert>
            )}

            {canEditBatch && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Phiếu đang trong quá trình nhập. Bạn có thể chỉnh sửa phiếu hoặc tiếp tục nhập vé.
                </Typography>
            )}

            {batch.status === 'IMPORTED' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                    Phiếu đã nhập kho. Không thể chỉnh sửa hoặc xóa dòng.
                </Alert>
            )}
        </Box>
    );
};
