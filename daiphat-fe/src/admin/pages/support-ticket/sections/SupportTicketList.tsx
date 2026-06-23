import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Card,
    Chip,
    CircularProgress,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TableSortLabel,
    Tabs,
    Tab,
    Tooltip,
} from '@mui/material';
import { Icon } from '@iconify/react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { Search } from '../../../components/ui/Search';
import { prefixAdmin } from '../../../constants/routes';
import { useAssignSupportTicket, useGetAdminTicketCategories, useGetStaffTickets } from '../hooks/useSupportTicket';
import {
    TicketStatus,
    TICKET_STATUS_LABELS,
} from '../../../../types/support.type';

const STATUS_TABS: { value: string; label: string }[] = [
    { value: 'OPEN,IN_PROGRESS,WAITING_FOR_CUSTOMER', label: 'Đang xử lý' },
    { value: 'OPEN', label: 'Mới tạo' },
    { value: 'IN_PROGRESS', label: 'Đang xử lý' },
    { value: 'WAITING_FOR_CUSTOMER', label: 'Chờ khách' },
    { value: 'RESOLVED', label: 'Đã giải quyết' },
    { value: 'CLOSED', label: 'Đã đóng' },
    { value: 'OPEN,IN_PROGRESS,WAITING_FOR_CUSTOMER,RESOLVED,CLOSED', label: 'Tất cả' },
];

const STATUS_COLORS: Partial<Record<TicketStatus, 'default' | 'primary' | 'warning' | 'success' | 'error' | 'info'>> = {
    [TicketStatus.OPEN]: 'default',
    [TicketStatus.IN_PROGRESS]: 'primary',
    [TicketStatus.WAITING_FOR_CUSTOMER]: 'warning',
    [TicketStatus.RESOLVED]: 'success',
    [TicketStatus.CLOSED]: 'error',
};

export const SupportTicketList = () => {
    const navigate = useNavigate();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState('');
    const [statusTab, setStatusTab] = useState(STATUS_TABS[0].value);
    const [sortBy, setSortBy] = useState<'dueAt' | 'createdAt'>('dueAt');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const assignMutation = useAssignSupportTicket();
    const { data: categoriesData } = useGetAdminTicketCategories();

    const { data, isLoading } = useGetStaffTickets({
        page: page + 1,
        limit: rowsPerPage,
        statuses: statusTab,
        search: search || undefined,
        sortBy,
        direction: sortDirection,
    });

    const categoryMap = useMemo(() => {
        const map = new Map<number, string>();
        (categoriesData?.data || []).forEach((c) => map.set(c.id, c.name));
        return map;
    }, [categoriesData]);

    const tickets = data?.data?.recordList || [];
    const total = data?.data?.pagination?.totalRecords || 0;

    useEffect(() => {
        setPage(0);
    }, [statusTab, search, sortBy, sortDirection]);

    const handleSort = (field: 'dueAt' | 'createdAt') => {
        if (sortBy === field) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(field);
            setSortDirection('asc');
        }
    };

    const handleAssign = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        assignMutation.mutate(id, {
            onSuccess: (res) => {
                if (res.success) {
                    navigate(`/${prefixAdmin}/support-tickets/detail/${id}`);
                }
            },
        });
    };

    return (
        <Card>
            <Box sx={{ px: 2, pt: 2 }}>
                <Search
                    placeholder="Tìm theo tiêu đề hoặc mô tả..."
                    value={search}
                    onChange={(value) => setSearch(value)}
                />
            </Box>

            <Tabs
                value={statusTab}
                onChange={(_, value) => setStatusTab(value)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
            >
                {STATUS_TABS.map((tab) => (
                    <Tab key={tab.value} label={tab.label} value={tab.value} />
                ))}
            </Tabs>

            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Tiêu đề</TableCell>
                            <TableCell>Danh mục</TableCell>
                            <TableCell>Khách hàng</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell>Nhân viên</TableCell>
                            <TableCell sortDirection={sortBy === 'dueAt' ? sortDirection : false}>
                                <TableSortLabel
                                    active={sortBy === 'dueAt'}
                                    direction={sortBy === 'dueAt' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('dueAt')}
                                >
                                    Hạn xử lý
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sortDirection={sortBy === 'createdAt' ? sortDirection : false}>
                                <TableSortLabel
                                    active={sortBy === 'createdAt'}
                                    direction={sortBy === 'createdAt' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('createdAt')}
                                >
                                    Ngày tạo
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="center">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                                    <CircularProgress size={28} />
                                </TableCell>
                            </TableRow>
                        ) : tickets.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                                    Không có yêu cầu hỗ trợ
                                </TableCell>
                            </TableRow>
                        ) : (
                            tickets.map((ticket) => (
                                <TableRow
                                    key={ticket.id}
                                    hover
                                    sx={{ cursor: 'pointer' }}
                                    onClick={() =>
                                        navigate(`/${prefixAdmin}/support-tickets/detail/${ticket.id}`)
                                    }
                                >
                                    <TableCell>#{ticket.id}</TableCell>
                                    <TableCell sx={{ maxWidth: 220 }}>
                                        <Box className="truncate font-medium">{ticket.title}</Box>
                                    </TableCell>
                                    <TableCell>
                                        {categoryMap.get(ticket.ticketCategoryId) || '—'}
                                    </TableCell>
                                    <TableCell>{ticket.customerName || '—'}</TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={TICKET_STATUS_LABELS[ticket.status]}
                                            color={STATUS_COLORS[ticket.status] || 'default'}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>{ticket.assignedToName || '—'}</TableCell>
                                    <TableCell>
                                        {ticket.dueAt
                                            ? dayjs(ticket.dueAt).format('DD/MM/YYYY HH:mm')
                                            : '—'}
                                    </TableCell>
                                    <TableCell>
                                        {dayjs(ticket.createdAt).format('DD/MM/YYYY HH:mm')}
                                    </TableCell>
                                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                        {ticket.status === TicketStatus.OPEN ? (
                                            <Tooltip title="Tiếp nhận">
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    disabled={assignMutation.isPending}
                                                    onClick={(e) => handleAssign(ticket.id, e)}
                                                >
                                                    <Icon icon="mdi:hand-back-right" />
                                                </IconButton>
                                            </Tooltip>
                                        ) : (
                                            <Tooltip title="Xem chi tiết">
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        navigate(
                                                            `/${prefixAdmin}/support-tickets/detail/${ticket.id}`
                                                        )
                                                    }
                                                >
                                                    <Icon icon="mdi:eye-outline" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                }}
                labelRowsPerPage="Số dòng:"
            />
        </Card>
    );
};
