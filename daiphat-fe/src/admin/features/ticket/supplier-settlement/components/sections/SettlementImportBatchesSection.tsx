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
import { getImportBatchStatusLabel } from '../../../import-batch/utils/batchTypeLabels';
import type { SettlementOverviewImportBatch } from '../../types/supplierSettlement.type';

interface Props {
    batches: SettlementOverviewImportBatch[];
}

export const SettlementImportBatchesSection = ({ batches }: Props) => {
    const router = useAdminRouter();

    return (
        <CollapsibleCard title={`Phiếu nhập lô (${batches.length})`} expanded onToggle={() => undefined}>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Mã phiếu</TableCell>
                            <TableCell>Ngày quay</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell align="right">Số lượng nhập</TableCell>
                            <TableCell align="right">Giá trị nhập</TableCell>
                            <TableCell align="center" width={64}>
                                Xem
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {batches.map((batch) => (
                            <TableRow key={batch.id} hover>
                                <TableCell>
                                    <Typography fontWeight={600}>
                                        {batch.batchCode || `#${batch.id}`}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                                </TableCell>
                                <TableCell>{getImportBatchStatusLabel(batch.status || undefined)}</TableCell>
                                <TableCell align="right">
                                    {(batch.totalImportedQuantity ?? batch.totalDeclareQuantity ?? 0).toLocaleString(
                                        'vi-VN'
                                    )}
                                </TableCell>
                                <TableCell align="right">
                                    {formatImportCost(
                                        batch.totalImportedCostValue ?? batch.totalDeclaredCostValue
                                    )}{' '}
                                    VNĐ
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title="Chi tiết phiếu nhập">
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={() =>
                                                router.push(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch.id))
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
                                        Chưa có phiếu nhập lô liên kết kỳ đối soát này.
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
