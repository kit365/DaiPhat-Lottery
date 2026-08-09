import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { CollapsibleCard } from '../../../../../components/ui/CollapsibleCard';
import { ROUTES } from '../../../../../constants/routes';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import { getReturnBatchStatusLabel } from '../../../return-batch/utils/returnBatchLabels';
import type { SettlementOverviewReturnBatch } from '../../types/supplierSettlement.type';

interface Props {
    batches: SettlementOverviewReturnBatch[];
}

export const SettlementReturnBatchesSection = ({ batches }: Props) => {
    const router = useAdminRouter();

    return (
        <CollapsibleCard title={`Phiếu trả vé (${batches.length})`} expanded onToggle={() => undefined}>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Mã phiếu</TableCell>
                            <TableCell>Ngày quay</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell align="right">Số lượng</TableCell>
                            <TableCell align="right">Giá trị trả</TableCell>
                            <TableCell align="center" width={64}>
                                Xem
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {batches.map((batch) => (
                            <TableRow key={batch.id} hover>
                                <TableCell>
                                    <Typography fontWeight={600}>#{batch.id}</Typography>
                                </TableCell>
                                <TableCell>
                                    {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                                </TableCell>
                                <TableCell>
                                    {getReturnBatchStatusLabel(
                                        batch.status as any,
                                        batch.statusLabel
                                    )}
                                </TableCell>
                                <TableCell align="right">
                                    {(batch.totalQuantity ?? 0).toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right">
                                    {formatImportCost(batch.totalReturnValue)} VNĐ
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title="Chi tiết phiếu trả">
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={() =>
                                                router.push(ROUTES.ADMIN.RETURN_BATCH.DETAIL(batch.id))
                                            }
                                        >
                                            <VisibilityOutlinedIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                        {batches.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    <Typography color="text.secondary" sx={{ py: 3 }}>
                                        Chưa có phiếu trả vé liên kết kỳ đối soát này.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </CollapsibleCard>
    );
};
