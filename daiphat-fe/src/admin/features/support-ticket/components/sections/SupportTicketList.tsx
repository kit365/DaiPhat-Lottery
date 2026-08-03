"use client";

import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Card,
    Chip,
    CircularProgress,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
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
import { useNavigate, useSearchParams } from '@/components/router-compat';
import { Search } from '../../../../components/ui/Search';
import { CanAccess } from '../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../constants/permission.constants';
import { prefixAdmin } from '../../../../constants/routes';
import {
    useAssignSupportTicket,
    useGetAdminTicketCategories,
    useGetStaffTickets,
} from '../../hooks/useSupportTicket';
import {
    TicketRefType,
    TicketStatus,
    TICKET_REF_TYPE_LABELS,
    TICKET_STATUS_LABELS,
} from '../../../../../types/support.type';

const STATUS_TABS: { value: string; label: string }[] = [
    { value: 'OPEN,IN_PROGRESS,WAITING_FOR_CUSTOMER', label: 'Đang xử lý' },
    { value: 'OPEN', label: 'Mới tạo' },
    { value: 'IN_PROGRESS', label: 'Đang xử lý' },
    { value: 'WAITING_FOR_CUSTOMER', label: 'Chờ khách' },
    { value: 'RESOLVED', label: 'Đã giải quyết' },
    { value: 'REJECTED', label: 'Đã từ chối' },
    { value: 'CLOSED', label: 'Đã đóng' },
    { value: 'OPEN,IN_PROGRESS,WAITING_FOR_CUSTOMER,RESOLVED,REJECTED,CLOSED', label: 'Tất cả' },
];

const STATUS_COLORS: Partial<Record<TicketStatus, 'default' | 'primary' | 'warning' | 'success' | 'error' | 'info'>> = {
    [TicketStatus.OPEN]: 'default',
    [TicketStatus.IN_PROGRESS]: 'primary',
    [TicketStatus.WAITING_FOR_CUSTOMER]: 'warning',
    [TicketStatus.RESOLVED]: 'success',
    [TicketStatus.REJECTED]: 'error',
    [TicketStatus.CLOSED]: 'error',
};

const REFUND_CATEGORY_CODES = 'REFUND_SLOW_PROCESSING,REFUND_PAID_ISSUE';
const PRIZE_PAYOUT_CATEGORY_CODES = 'PRIZE_PAYOUT_SLOW_PROCESSING,PRIZE_PAYOUT_PAID_ISSUE';

export const SupportTicketList = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const filterParam = searchParams.get('filter');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState('');
    const [statusTab, setStatusTab] = useState(STATUS_TABS[0].value);
    const [sortBy, setSortBy] = useState<'dueAt' | 'createdAt'>('dueAt');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [refTypeFilter, setRefTypeFilter] = useState<TicketRefType | ''>('');
    const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
    const [refundOnly, setRefundOnly] = useState(filterParam === 'refund');
    const [prizePayoutOnly, setPrizePayoutOnly] = useState(filterParam === 'prize-payout');

    const assignMutation = useAssignSupportTicket();
    const { data: categoriesData } = useGetAdminTicketCategories();

    useEffect(() => {
        setRefundOnly(filterParam === 'refund');
        setPrizePayoutOnly(filterParam === 'prize-payout');
    }, [filterParam]);

    const updateFilterParam = (next: { refund?: boolean; prizePayout?: boolean }) => {
        const params = new URLSearchParams(searchParams);
        if (next.prizePayout) {
            params.set('filter', 'prize-payout');
        } else if (next.refund) {
            params.set('filter', 'refund');
        } else {
            params.delete('filter');
        }
        setSearchParams(params, { replace: true });
    };

    const specialFilterActive = refundOnly || prizePayoutOnly;

    const queryParams = useMemo(
        () => ({
            page: page + 1,
            limit: rowsPerPage,
            statuses: statusTab,
            search: search || undefined,
            sortBy,
            direction: sortDirection,
            refType: refundOnly
                ? TicketRefType.REFUND_REQUEST
                : prizePayoutOnly
                  ? TicketRefType.PRIZE_CLAIM
                  : refTypeFilter || undefined,
            ticketCategoryId: categoryFilter || undefined,
            categoryCodes: refundOnly
                ? REFUND_CATEGORY_CODES
                : prizePayoutOnly
                  ? PRIZE_PAYOUT_CATEGORY_CODES
                  : undefined,
        }),
        [
            page,
            rowsPerPage,
            statusTab,
            search,
            sortBy,
            sortDirection,
            refTypeFilter,
            categoryFilter,
            refundOnly,
            prizePayoutOnly,
        ]
    );

    const { data, isLoading } = useGetStaffTickets(queryParams);

    const categoryMap = useMemo(() => {
        const map = new Map<number, string>();
        (categoriesData?.data || []).forEach((c) => map.set(c.id, c.name));
        return map;
    }, [categoriesData]);

    const visibleCategories = useMemo(
        () => (categoriesData?.data || []).filter((c) => !c.code.startsWith('GROUP_')),
        [categoriesData]
    );

    const tickets = data?.data?.recordList || [];
    const total = data?.data?.pagination?.totalRecords || 0;

    useEffect(() => {
        setPage(0);
    }, [statusTab, search, sortBy, sortDirection, refTypeFilter, categoryFilter, refundOnly, prizePayoutOnly]);

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

    const formatDueAt = (dueAt?: string, status?: TicketStatus) => {
        if (!dueAt) return '—';
        const due = dayjs(dueAt);
        const overdue =
            due.isBefore(dayjs()) &&
            status !== TicketStatus.RESOLVED &&
            status !== TicketStatus.REJECTED &&
            status !== TicketStatus.CLOSED;
        return (
            <Box component="span" sx={{ color: overdue ? 'error.main' : 'inherit', fontWeight: overdue ? 700 : 500 }}>
                {due.format('DD/MM/YYYY HH:mm')}
            </Box>
        );
    };

    return (
        <Card>
            <Box sx={{ px: 2, pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Search
                    placeholder="Tìm theo tiêu đề hoặc mô tả..."
                    value={search}
                    onChange={(value) => setSearch(value)}
                />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel>Liên quan đến</InputLabel>
                        <Select
                            label="Liên quan đến"
                            value={specialFilterActive ? '' : refTypeFilter}
                            disabled={specialFilterActive}
                            onChange={(e) => setRefTypeFilter(e.target.value as TicketRefType | '')}
                        >
                            <MenuItem value="">Tất cả</MenuItem>
                            {Object.values(TicketRefType).map((type) => (
                                <MenuItem key={type} value={type}>
                                    {TICKET_REF_TYPE_LABELS[type]}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel>Danh mục</InputLabel>
                        <Select
                            label="Danh mục"
                            value={categoryFilter}
                            disabled={specialFilterActive}
                            onChange={(e) => setCategoryFilter(e.target.value as number | '')}
                        >
                            <MenuItem value="">Tất cả</MenuItem>
                            {visibleCategories.map((category) => (
                                <MenuItem key={category.id} value={category.id}>
                                    {category.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button
                        variant={refundOnly ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => {
                            const next = !refundOnly;
                            setRefundOnly(next);
                            setPrizePayoutOnly(false);
                            updateFilterParam({ refund: next, prizePayout: false });
                        }}
                        startIcon={<Icon icon="mdi:cash-refund" />}
                    >
                        Khiếu nại hoàn tiền
                    </Button>
                    <Button
                        variant={prizePayoutOnly ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => {
                            const next = !prizePayoutOnly;
                            setPrizePayoutOnly(next);
                            setRefundOnly(false);
                            updateFilterParam({ prizePayout: next, refund: false });
                        }}
                        startIcon={<Icon icon="mdi:trophy-outline" />}
                    >
                        Khiếu nại trả thưởng
                    </Button>
                </Box>
            </Box>

            <Tabs
                value={statusTab}
                onChange={(_, value) => setStatusTab(value)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
            >
                {STATUS_TABS.map((tab) => (
                    <Tab key={tab.value} value={tab.value} label={tab.label} />
                ))}
            </Tabs>

            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Danh mục</TableCell>
                            <TableCell>Tiêu đề</TableCell>
                            <TableCell>Khách hàng</TableCell>
                            <TableCell>Liên quan đến</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell>Người xử lý</TableCell>
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
                                    Tạo lúc
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="right">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading && (
                            <TableRow>
                                <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                                    <CircularProgress size={28} />
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && tickets.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={10} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                                    Không có yêu cầu hỗ trợ nào
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading &&
                            tickets.map((ticket) => (
                                <TableRow
                                    key={ticket.id}
                                    hover
                                    sx={{ cursor: 'pointer' }}
                                    onClick={() => navigate(`/${prefixAdmin}/support-tickets/detail/${ticket.id}`)}
                                >
                                    <TableCell>#{ticket.id}</TableCell>
                                    <TableCell>{categoryMap.get(ticket.ticketCategoryId) || '—'}</TableCell>
                                    <TableCell sx={{ maxWidth: 220 }}>
                                        <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {ticket.title}
                                        </Box>
                                    </TableCell>
                                    <TableCell>{ticket.customerName || '—'}</TableCell>
                                    <TableCell>
                                        {ticket.refType ? (
                                            <Box>
                                                <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
                                                    {TICKET_REF_TYPE_LABELS[ticket.refType]}
                                                </Box>
                                                <Box sx={{ fontSize: 13, fontWeight: 600 }}>
                                                    {ticket.refType === TicketRefType.PRIZE_CLAIM
                                                        ? `Yêu cầu #${ticket.refId}`
                                                        : ticket.refType === TicketRefType.REFUND_REQUEST
                                                          ? `Hoàn tiền #${ticket.refId}`
                                                          : ticket.refType === TicketRefType.ORDER
                                                            ? `Đơn #${ticket.refId}`
                                                            : ticket.refId || '—'}
                                                </Box>
                                            </Box>
                                        ) : (
                                            '—'
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={TICKET_STATUS_LABELS[ticket.status]}
                                            color={STATUS_COLORS[ticket.status] || 'default'}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>{ticket.assignedToName || 'Chưa tiếp nhận'}</TableCell>
                                    <TableCell>{formatDueAt(ticket.dueAt, ticket.status)}</TableCell>
                                    <TableCell>{dayjs(ticket.createdAt).format('DD/MM/YYYY HH:mm')}</TableCell>
                                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                            {ticket.status === TicketStatus.OPEN && (
                                                <CanAccess permission={(PERMISSIONS.SUPPORT_TICKET as any).MANAGE}>
                                                    <Tooltip title="Tiếp nhận">
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            disabled={assignMutation.isPending}
                                                            onClick={(e) => handleAssign(ticket.id, e)}
                                                        >
                                                            <Icon icon="mdi:account-check-outline" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </CanAccess>
                                            )}
                                            <Tooltip title="Xem chi tiết">
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        navigate(`/${prefixAdmin}/support-tickets/detail/${ticket.id}`)
                                                    }
                                                >
                                                    <Icon icon="mdi:eye-outline" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
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
                rowsPerPageOptions={[10, 20, 50]}
                labelRowsPerPage="Số dòng:"
            />
        </Card>
    );
};
