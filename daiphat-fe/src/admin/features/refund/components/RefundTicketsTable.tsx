import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { RefundEligibleTicketItem } from '@/types/refund.type';

interface RefundTicketsTableProps {
    tickets?: RefundEligibleTicketItem[];
}

export const RefundTicketsTable = ({ tickets }: RefundTicketsTableProps) => {
    if (!tickets?.length) {
        return <Typography color="text.secondary">Không có thông tin vé hoàn</Typography>;
    }

    return (
        <TableContainer>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Bộ số</TableCell>
                        <TableCell>Đài</TableCell>
                        <TableCell>Ngày quay</TableCell>
                        <TableCell align="right">SL</TableCell>
                        <TableCell align="right">Đơn giá</TableCell>
                        <TableCell align="right">Thành tiền</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {tickets.map((ticket, index) => (
                        <TableRow key={ticket.orderDetailId ?? index}>
                            <TableCell>{ticket.numbers || '—'}</TableCell>
                            <TableCell>{ticket.stationName || '—'}</TableCell>
                            <TableCell>
                                {ticket.drawDate ? dayjs(ticket.drawDate).format('DD/MM/YYYY') : '—'}
                            </TableCell>
                            <TableCell align="right">{ticket.quantity}</TableCell>
                            <TableCell align="right">
                                {ticket.unitPrice?.toLocaleString('vi-VN')}đ
                            </TableCell>
                            <TableCell align="right">
                                {ticket.subtotalAmount?.toLocaleString('vi-VN')}đ
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
