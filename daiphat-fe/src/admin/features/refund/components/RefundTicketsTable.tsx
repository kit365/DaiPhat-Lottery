import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { AdminLuckyDisplay } from '@/shared/lucky-number';
import {
    TICKET_NUMBERS_LABEL,
    TICKET_SERIAL_PREFIX,
} from '@/constants/ticketDisplay.constants';
import { RefundEligibleTicketItem } from '@/types/refund.type';

interface RefundTicketsTableProps {
    tickets?: RefundEligibleTicketItem[];
}

const headerCellSx = {
    color: 'var(--palette-text-secondary)',
    fontWeight: 600,
    borderBottom: 'none',
    py: 1.5,
    px: 2,
    whiteSpace: 'nowrap',
} as const;

const bodyCellSx = {
    py: 1.75,
    px: 2,
    verticalAlign: 'top',
} as const;

export const RefundTicketsTable = ({ tickets }: RefundTicketsTableProps) => {
    if (!tickets?.length) {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 2 }}>
                Không có thông tin vé hoàn
            </Typography>
        );
    }

    return (
        <TableContainer
            sx={{
                border: '1px solid var(--palette-divider)',
                borderRadius: '12px',
                overflow: 'auto',
            }}
        >
            <Table size="small" sx={{ minWidth: 640 }}>
                <TableHead>
                    <TableRow sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                        <TableCell align="center" sx={headerCellSx}>
                            {TICKET_NUMBERS_LABEL}
                        </TableCell>
                        <TableCell sx={headerCellSx}>Đài</TableCell>
                        <TableCell sx={headerCellSx}>Ngày xổ</TableCell>
                        <TableCell align="center" sx={headerCellSx}>
                            SL
                        </TableCell>
                        <TableCell align="right" sx={headerCellSx}>
                            Đơn giá
                        </TableCell>
                        <TableCell align="right" sx={headerCellSx}>
                            Thành tiền
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {tickets.map((ticket, index) => (
                        <TableRow
                            key={ticket.orderDetailId ?? `${ticket.numbers}-${index}`}
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                            <TableCell align="center" sx={bodyCellSx}>
                                <Box sx={{ textAlign: 'center' }}>
                                    <AdminLuckyDisplay
                                        value={ticket.numbers}
                                        ticket
                                        fontSize="0.875rem"
                                        fontWeight={700}
                                        letterSpacing="0.06em"
                                        sx={{ color: 'var(--palette-text-primary)' }}
                                    />
                                    {ticket.serialNumber && (
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            component="div"
                                            sx={{ mt: 0.25, lineHeight: 1.4, wordBreak: 'break-all' }}
                                        >
                                            {TICKET_SERIAL_PREFIX}: {ticket.serialNumber}
                                        </Typography>
                                    )}
                                </Box>
                            </TableCell>
                            <TableCell sx={bodyCellSx}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    {ticket.stationName || '—'}
                                </Typography>
                            </TableCell>
                            <TableCell sx={bodyCellSx}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                    {ticket.drawDate ? dayjs(ticket.drawDate).format('DD/MM/YYYY') : '—'}
                                </Typography>
                            </TableCell>
                            <TableCell align="center" sx={bodyCellSx}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    {ticket.quantity}
                                </Typography>
                            </TableCell>
                            <TableCell align="right" sx={bodyCellSx}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    {ticket.unitPrice?.toLocaleString('vi-VN')}đ
                                </Typography>
                            </TableCell>
                            <TableCell align="right" sx={bodyCellSx}>
                                <Typography
                                    variant="subtitle2"
                                    sx={{ fontWeight: 700, color: 'var(--palette-text-primary)', whiteSpace: 'nowrap' }}
                                >
                                    {ticket.subtotalAmount?.toLocaleString('vi-VN')}đ
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
