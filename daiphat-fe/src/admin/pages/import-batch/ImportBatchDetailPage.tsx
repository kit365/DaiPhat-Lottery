import {
    Box,
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
import { useParams } from 'react-router-dom';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Title } from '../../components/ui/Title';
import { CollapsibleCard } from '../../components/ui/CollapsibleCard';
import { prefixAdmin, ROUTES } from '../../constants/routes';
import { useImportBatchDetail } from './hooks/useImportBatch';
import { useProviders } from '../provider/hooks/useProvider';
import { getBatchTypeLabel } from './utils/batchTypeLabels';
import dayjs from 'dayjs';

const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Nháp',
    IMPORTED: 'Đã nhập',
    IN_LEDGER: 'Đã vào sổ',
};

export const ImportBatchDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const { data: batch, isLoading } = useImportBatchDetail(id);
    const { data: providersRes } = useProviders({ size: 1000 });
    const providers = (providersRes as any)?.data?.recordList || [];

    const resolveStationName = (stationId: number) =>
        providers.find((p: any) => String(p.id || p._id) === String(stationId))?.name ||
        `Đài #${stationId}`;

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

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Breadcrumb
                items={[
                    { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                    { label: 'Nhập lô vé', to: ROUTES.ADMIN.IMPORT_BATCH.CREATE },
                    { label: `Phiếu #${batch.id}` },
                ]}
            />
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Title title={`Phiếu nhập lô #${batch.id}`} />
                <Chip
                    label={STATUS_LABELS[batch.status] || batch.status}
                    color={batch.status === 'DRAFT' ? 'warning' : 'default'}
                    size="small"
                />
            </Stack>

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
                            label="Tổng số lượng khai báo"
                            value={batch.totalDeclareQuantity ?? 0}
                            fullWidth
                            InputProps={{ readOnly: true }}
                        />
                        <TextField
                            label="Tổng giá vốn (VNĐ)"
                            value={Number(batch.totalDeclaredCostValue ?? 0).toLocaleString('vi-VN')}
                            fullWidth
                            InputProps={{ readOnly: true }}
                        />
                    </Stack>

                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Nhà đài</TableCell>
                                    <TableCell>Loại lô</TableCell>
                                    <TableCell align="right">Khai báo</TableCell>
                                    <TableCell align="right">Đã nhập</TableCell>
                                    <TableCell align="right">Giá vốn</TableCell>
                                    <TableCell align="right">Tổng giá vốn</TableCell>
                                    <TableCell>Biên lai</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(batch.lines ?? []).map((line) => (
                                    <TableRow key={line.id}>
                                        <TableCell>{resolveStationName(line.lotteryStationId)}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={getBatchTypeLabel(line.batchType)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="right">{line.declareQuantity}</TableCell>
                                        <TableCell align="right">{line.totalQuantity}</TableCell>
                                        <TableCell align="right">
                                            {Number(line.importCost).toLocaleString('vi-VN')}
                                        </TableCell>
                                        <TableCell align="right">
                                            {Number(line.totalCostValue).toLocaleString('vi-VN')}
                                        </TableCell>
                                        <TableCell>
                                            {line.invoiceEvidenceUrl ? (
                                                <Box
                                                    component="img"
                                                    src={line.invoiceEvidenceUrl}
                                                    alt="Biên lai"
                                                    sx={{
                                                        maxWidth: 80,
                                                        maxHeight: 60,
                                                        borderRadius: 1,
                                                        border: '1px solid',
                                                        borderColor: 'divider',
                                                    }}
                                                />
                                            ) : (
                                                '—'
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Stack>
            </CollapsibleCard>

            {batch.status === 'DRAFT' && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Phiếu đang ở trạng thái nháp. Thêm vé số từ trang Danh sách vé số.
                </Typography>
            )}
        </Box>
    );
};
