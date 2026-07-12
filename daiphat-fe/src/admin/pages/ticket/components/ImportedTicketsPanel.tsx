import {
    Alert,
    Box,
    CircularProgress,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getImportBatchReductionTickets } from '../../../api/importBatch.api';
import { QUERY_KEYS } from '../../../../constants/queryKeys';

type ImportedTicketsPanelProps = {
    batchId?: string | number;
    lineId?: string | number;
};

const statusLabel = (status?: string) => {
    if (!status) return '—';
    const normalized = status.toUpperCase();
    if (normalized === 'ACTIVE') return 'Đang bán';
    if (normalized === 'DRAFT' || normalized === 'IMPORTED') return 'Đã nhập';
    if (normalized === 'SOLD') return 'Đã bán';
    if (normalized === 'EXPIRED') return 'Hết hạn';
    return status;
};

export const ImportedTicketsPanel = ({ batchId, lineId }: ImportedTicketsPanelProps) => {
    const enabled = !!batchId && !!lineId;

    const { data, isLoading, isError, isFetching } = useQuery({
        queryKey: [QUERY_KEYS.IMPORT_BATCH_REDUCTION_TICKETS, String(batchId ?? '')],
        queryFn: () => getImportBatchReductionTickets(batchId!),
        enabled,
        select: (res) => res.data ?? null,
        staleTime: 0,
        refetchOnMount: 'always',
    });

    const line = data?.lines?.find((item) => String(item.lineId) === String(lineId));
    const tickets = line?.tickets ?? [];

    if (!enabled) {
        return null;
    }

    return (
        <Box sx={{ mb: 2.5 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                    Vé đã nhập
                </Typography>
                {(isLoading || isFetching) && <CircularProgress size={14} />}
            </Stack>

            {isError && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                    Không tải được danh sách vé đã nhập. Vui lòng thử lại sau.
                </Alert>
            )}

            {!isLoading && !isError && tickets.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                    Chưa có vé nào được nhập cho nhà đài này.
                </Typography>
            )}

            {tickets.length > 0 && (
                <TableContainer
                    sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1.5,
                        maxHeight: 280,
                    }}
                >
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell width={56}>#</TableCell>
                                <TableCell>Dãy số</TableCell>
                                <TableCell>Sê-ri</TableCell>
                                <TableCell align="right">SL sê-ri</TableCell>
                                <TableCell>Trạng thái</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {tickets.map((ticket, index) => (
                                <TableRow key={ticket.id} hover>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                        {ticket.numbers || '—'}
                                    </TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace' }}>
                                        {ticket.serialNumber || '—'}
                                    </TableCell>
                                    <TableCell align="right">{ticket.serialCount}</TableCell>
                                    <TableCell>{statusLabel(ticket.status)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};
