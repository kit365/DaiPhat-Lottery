import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { CollapsibleCard } from '../../../../../components/ui/CollapsibleCard';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import type { SettlementStationInventory } from '../../types/supplierSettlement.type';

interface Props {
    rows: SettlementStationInventory[];
}

export const SettlementStationInventoryTable = ({ rows }: Props) => (
    <CollapsibleCard title="Tồn kho theo nhà đài" expanded onToggle={() => undefined}>
        <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Nhà đài</TableCell>
                        <TableCell align="right">Nhập</TableCell>
                        <TableCell align="right">Đã bán</TableCell>
                        <TableCell align="right">Còn lại</TableCell>
                        <TableCell align="right">Hỏng</TableCell>
                        <TableCell align="right">Thất lạc</TableCell>
                        <TableCell align="right">VOIDED</TableCell>
                        <TableCell align="right">Trả</TableCell>
                        <TableCell align="right">Giá trị trả</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow key={row.lotteryStationId} hover>
                            <TableCell>
                                <Typography fontWeight={600}>
                                    {row.lotteryStationName || `#${row.lotteryStationId}`}
                                </Typography>
                            </TableCell>
                            <TableCell align="right">{row.importedQuantity.toLocaleString('vi-VN')}</TableCell>
                            <TableCell align="right">{row.soldQuantity.toLocaleString('vi-VN')}</TableCell>
                            <TableCell align="right">{row.remainingQuantity.toLocaleString('vi-VN')}</TableCell>
                            <TableCell align="right">{row.damagedQuantity.toLocaleString('vi-VN')}</TableCell>
                            <TableCell align="right">{row.lostQuantity.toLocaleString('vi-VN')}</TableCell>
                            <TableCell align="right">{row.voidedQuantity.toLocaleString('vi-VN')}</TableCell>
                            <TableCell align="right">{row.returnQuantity.toLocaleString('vi-VN')}</TableCell>
                            <TableCell align="right">{formatImportCost(row.returnValue)} VNĐ</TableCell>
                        </TableRow>
                    ))}
                    {rows.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={9} align="center">
                                <Typography color="text.secondary" sx={{ py: 3 }}>
                                    Chưa có dữ liệu tồn kho theo nhà đài cho kỳ đối soát này.
                                </Typography>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    </CollapsibleCard>
);
