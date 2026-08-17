"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useAppSearchParams } from "@/hooks/useAppSearchParams";
import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Card,
    CircularProgress,
    Stack,
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
    Typography,
    styled,
} from '@mui/material';
import { useQueries } from '@tanstack/react-query';
import { AdminStatusBadge } from '../../../../components/ui/AdminStatusBadge';
import { AdminRowActionsMenu } from '../../../../components/ui/AdminRowActionsMenu';
import { SelectMulti } from '../../../../components/ui/SelectMulti';
import { SelectSingle } from '../../../../components/ui/SelectSingle';
import dayjs from 'dayjs';
import { Search } from '../../../../components/ui/Search';
import { PERMISSIONS } from '../../../../constants/permission.constants';
import { prefixAdmin } from '../../../../constants/routes';
import { QUERY_KEYS } from '../../constants/queryKeys';
import {
    useAssignSupportTicket,
    useGetAdminTicketCategories,
    useGetStaffTickets,
} from '../../hooks/useSupportTicket';
import { supportTicketAdminApi } from '../../services/supportTicketService';
import {
    TicketRefType,
    TicketStatus,
    TICKET_REF_TYPE_LABELS,
    TICKET_STATUS_LABELS,
    getTicketStatusBadgeClass,
} from '../../../../../types/support.type';

const TabBadge = styled('span')(() => ({
    height: '24px',
    minWidth: '24px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '8px',
    padding: '0px 6px',
    borderRadius: 'var(--shape-borderRadius-sm)',
    fontSize: '0.75rem',
    fontWeight: 700,
    transition: 'all 0.2s',
}));

const STATUS_TABS: {
    value: string;
    label: string;
    color: string;
    bg: string;
    activeColor: string;
    activeBg: string;
}[] = [
    {
        value: 'OPEN,IN_PROGRESS,WAITING_FOR_CUSTOMER,RESOLVED,REJECTED,CLOSED',
        label: 'Tất cả',
        color: 'var(--palette-common-white, #FFFFFF)',
        bg: 'var(--palette-grey-800, #1C252E)',
        activeColor: 'var(--palette-common-white, #FFFFFF)',
        activeBg: 'var(--palette-grey-800, #1C252E)',
    },
    {
        value: 'OPEN,IN_PROGRESS,WAITING_FOR_CUSTOMER',
        label: 'Cần xử lý',
        color: 'var(--palette-warning-dark, #B76E00)',
        bg: 'var(--palette-warning-lighter, #FFF5CC)',
        activeColor: 'var(--palette-warning-contrastText, #1C252E)',
        activeBg: 'var(--palette-warning-main, #FFAB00)',
    },
    {
        value: 'OPEN',
        label: 'Mới tạo',
        color: 'var(--palette-info-dark, #006C9C)',
        bg: 'var(--palette-info-lighter, #CAFDF5)',
        activeColor: 'var(--palette-info-contrastText, #FFFFFF)',
        activeBg: 'var(--palette-info-main, #00B8D9)',
    },
    {
        value: 'IN_PROGRESS',
        label: 'Đang xử lý',
        color: '#1A237E',
        bg: '#E8EAF6',
        activeColor: '#FFFFFF',
        activeBg: '#3F51B5',
    },
    {
        value: 'WAITING_FOR_CUSTOMER',
        label: 'Chờ khách',
        color: '#6B21A8',
        bg: '#F3E8FF',
        activeColor: '#FFFFFF',
        activeBg: '#9C27B0',
    },
    {
        value: 'RESOLVED',
        label: 'Đã giải quyết',
        color: 'var(--palette-success-dark, #118D57)',
        bg: 'var(--palette-success-lighter, #D3FCD2)',
        activeColor: 'var(--palette-success-contrastText, #FFFFFF)',
        activeBg: 'var(--palette-success-main, #22C55E)',
    },
    {
        value: 'REJECTED',
        label: 'Đã từ chối',
        color: 'var(--palette-error-dark, #B71D18)',
        bg: 'var(--palette-error-lighter, #FFE9D5)',
        activeColor: 'var(--palette-error-contrastText, #FFFFFF)',
        activeBg: 'var(--palette-error-main, #FF5630)',
    },
    {
        value: 'CLOSED',
        label: 'Đã đóng',
        color: 'var(--palette-text-secondary, #637381)',
        bg: 'var(--palette-action-selected, rgba(145, 158, 171, 0.16))',
        activeColor: 'var(--palette-common-white, #FFFFFF)',
        activeBg: 'var(--palette-grey-600, #637381)',
    },
];

const COMPLAINT_KIND_OPTIONS = [
    { value: 'refund', label: 'Hoàn tiền' },
    { value: 'prize-payout', label: 'Trả thưởng' },
] as const;

type ComplaintKind = (typeof COMPLAINT_KIND_OPTIONS)[number]['value'];
const ALL_COMPLAINT_KINDS: ComplaintKind[] = ['refund', 'prize-payout'];

const REFUND_CATEGORY_CODES = 'REFUND_SLOW_PROCESSING,REFUND_PAID_ISSUE';
const PRIZE_PAYOUT_CATEGORY_CODES = 'PRIZE_PAYOUT_SLOW_PROCESSING,PRIZE_PAYOUT_PAID_ISSUE';

const FILTER_CONTROL_SX = {
    width: 200,
    minWidth: 200,
    flexShrink: 0,
    '& .MuiOutlinedInput-root': {
        height: 56,
    },
} as const;

const HEAD_CELL_SX = {
    borderBottom: 'none',
    color: 'var(--palette-text-secondary)',
    fontWeight: 600,
    fontSize: '0.875rem',
    whiteSpace: 'nowrap',
} as const;

const BODY_CELL_SX = {
    borderBottom: '1px dashed var(--palette-background-neutral)',
    fontSize: '0.875rem',
    color: 'var(--palette-text-primary)',
} as const;

export const SupportTicketList = () => {
    const router = useAdminRouter();
    const [searchParams, setSearchParams] = useAppSearchParams();
    const filterParam = searchParams.get('filter');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState('');
    const [statusTab, setStatusTab] = useState(STATUS_TABS[0].value);
    const [sortBy, setSortBy] = useState<'dueAt' | 'createdAt'>('dueAt');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [refTypeFilter, setRefTypeFilter] = useState<TicketRefType | ''>('');
    const [categoryFilter, setCategoryFilter] = useState<number | ''>('');

    const complaintKinds: ComplaintKind[] = useMemo(() => {
        if (filterParam === 'refund' || filterParam === 'prize-payout') {
            return [filterParam];
        }
        return ALL_COMPLAINT_KINDS;
    }, [filterParam]);
    const refundOnly = complaintKinds.length === 1 && complaintKinds[0] === 'refund';
    const prizePayoutOnly = complaintKinds.length === 1 && complaintKinds[0] === 'prize-payout';

    const assignMutation = useAssignSupportTicket();
    const { data: categoriesData } = useGetAdminTicketCategories();

    const setComplaintKinds = (next: string[]) => {
        const kinds = next.filter((value): value is ComplaintKind =>
            value === 'refund' || value === 'prize-payout'
        );
        const params = new URLSearchParams(searchParams);
        if (kinds.length === 1) {
            params.set('filter', kinds[0]);
        } else {
            params.delete('filter');
        }
        setSearchParams(params, { replace: true });
        if (kinds.length === 1) {
            setRefTypeFilter('');
            setCategoryFilter('');
        }
    };

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
    const tickets = data?.data?.recordList || [];
    const total = data?.data?.pagination?.totalRecords || 0;

    const countFilterParams = useMemo(
        () => ({
            search: search || undefined,
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
        [search, refTypeFilter, categoryFilter, refundOnly, prizePayoutOnly]
    );

    const tabCountQueries = useQueries({
        queries: STATUS_TABS.map((tab) => ({
            queryKey: [QUERY_KEYS.ADMIN_SUPPORT_TICKETS, 'tab-count', tab.value, countFilterParams],
            queryFn: () =>
                supportTicketAdminApi.getStaffTickets({
                    page: 1,
                    limit: 1,
                    statuses: tab.value,
                    ...countFilterParams,
                }),
            staleTime: 10_000,
        })),
    });

    const getTabCount = (tabValue: string, index: number) => {
        if (tabValue === statusTab) return total;
        return Number(tabCountQueries[index]?.data?.data?.pagination?.totalRecords || 0);
    };

    const categoryMap = useMemo(() => {
        const map = new Map<number, string>();
        (categoriesData?.data || []).forEach((c) => map.set(c.id, c.name));
        return map;
    }, [categoriesData]);

    const visibleCategories = useMemo(
        () => (categoriesData?.data || []).filter((c) => !c.code.startsWith('GROUP_')),
        [categoriesData]
    );

    const refTypeOptions = useMemo(
        () => [
            { value: 'all', label: 'Tất cả' },
            ...Object.values(TicketRefType).map((type) => ({
                value: type,
                label: TICKET_REF_TYPE_LABELS[type],
            })),
        ],
        []
    );

    const categoryOptions = useMemo(
        () => [
            { value: 'all', label: 'Tất cả' },
            ...visibleCategories.map((category) => ({
                value: String(category.id),
                label: category.name,
            })),
        ],
        [visibleCategories]
    );

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

    const handleAssign = (id: number) => {
        assignMutation.mutate(id, {
            onSuccess: (res) => {
                if (res.success) {
                    router.push(`/${prefixAdmin}/support-tickets/detail/${id}`);
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
            <Box component="span" sx={{ fontSize: '0.875rem', color: overdue ? 'error.main' : 'var(--palette-text-primary)', fontWeight: overdue ? 700 : 400 }}>
                {due.format('DD/MM/YYYY HH:mm')}
            </Box>
        );
    };

    return (
        <Card elevation={0} className="admin-datagrid-card" sx={{ height: 'auto' }}>
            <Tabs
                value={statusTab}
                onChange={(_, value) => setStatusTab(value)}
                variant="scrollable"
                scrollButtons={false}
                sx={{
                    px: '20px',
                    minHeight: '48px',
                    borderBottom: '1px solid var(--palette-background-neutral)',
                    '& .MuiTabs-flexContainer': { gap: 'calc(5 * var(--spacing))' },
                    '& .MuiTabs-indicator': { backgroundColor: 'var(--palette-text-primary)', height: 2 },
                }}
            >
                {STATUS_TABS.map((tab, index) => {
                    const selected = statusTab === tab.value;
                    return (
                    <Tab
                        key={tab.value}
                        value={tab.value}
                        disableRipple
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography
                                    sx={{
                                        fontSize: '0.875rem',
                                        fontWeight: selected ? 700 : 500,
                                        color: selected ? 'var(--palette-text-primary)' : 'inherit',
                                    }}
                                >
                                    {tab.label}
                                </Typography>
                                <TabBadge
                                    sx={{
                                        bgcolor: selected ? tab.activeBg : tab.bg,
                                        color: selected ? tab.activeColor : tab.color,
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {getTabCount(tab.value, index)}
                                </TabBadge>
                            </Box>
                        }
                        sx={{
                            minWidth: 0,
                            padding: 0,
                            minHeight: '48px',
                            textTransform: 'none',
                            color: 'var(--palette-text-secondary)',
                            '&.Mui-selected': {
                                color: 'var(--palette-text-primary)',
                            },
                        }}
                    />
                    );
                })}
            </Tabs>

            <Box sx={{ borderBottom: '1px dashed var(--palette-background-neutral)' }}>
                <Stack
                    direction={{ xs: 'column', lg: 'row' }}
                    spacing={2}
                    alignItems={{ xs: 'stretch', lg: 'center' }}
                    sx={{ p: '20px' }}
                >
                    <Box sx={{ flex: 1, minWidth: 220 }}>
                        <Search
                            placeholder="Tìm theo tiêu đề hoặc mô tả..."
                            value={search}
                            onChange={setSearch}
                            maxWidth="100%"
                        />
                    </Box>
                    <SelectSingle
                        label="Liên quan đến"
                        value={refTypeFilter || 'all'}
                        options={refTypeOptions}
                        onChange={(value) => setRefTypeFilter(value === 'all' ? '' : (value as TicketRefType))}
                        sx={FILTER_CONTROL_SX}
                    />
                    <SelectSingle
                        label="Danh mục"
                        value={categoryFilter === '' ? 'all' : String(categoryFilter)}
                        options={categoryOptions}
                        onChange={(value) => setCategoryFilter(value === 'all' ? '' : Number(value))}
                        sx={FILTER_CONTROL_SX}
                    />
                    <SelectMulti
                        label="Loại khiếu nại"
                        value={complaintKinds}
                        options={[...COMPLAINT_KIND_OPTIONS]}
                        onChange={setComplaintKinds}
                        sx={FILTER_CONTROL_SX}
                    />
                </Stack>
            </Box>

            <TableContainer sx={{ position: 'relative', overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Table sx={{ minWidth: 960 }} size="medium">
                    <TableHead sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                        <TableRow>
                            <TableCell sx={HEAD_CELL_SX}>ID</TableCell>
                            <TableCell sx={HEAD_CELL_SX}>Danh mục</TableCell>
                            <TableCell sx={HEAD_CELL_SX}>Tiêu đề</TableCell>
                            <TableCell sx={HEAD_CELL_SX}>Khách hàng</TableCell>
                            <TableCell sx={HEAD_CELL_SX}>Liên quan đến</TableCell>
                            <TableCell sx={HEAD_CELL_SX} align="center">Trạng thái</TableCell>
                            <TableCell sx={HEAD_CELL_SX}>Người xử lý</TableCell>
                            <TableCell sx={HEAD_CELL_SX} sortDirection={sortBy === 'dueAt' ? sortDirection : false}>
                                <TableSortLabel
                                    active={sortBy === 'dueAt'}
                                    direction={sortBy === 'dueAt' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('dueAt')}
                                >
                                    Hạn xử lý
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sx={HEAD_CELL_SX} sortDirection={sortBy === 'createdAt' ? sortDirection : false}>
                                <TableSortLabel
                                    active={sortBy === 'createdAt'}
                                    direction={sortBy === 'createdAt' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('createdAt')}
                                >
                                    Tạo lúc
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ ...HEAD_CELL_SX, width: 80 }} align="right" />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={10} align="center" sx={{ borderBottom: 'none', py: 10 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
                                        <CircularProgress size={32} />
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : tickets.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} align="center" sx={{ borderBottom: 'none', py: 10 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
                                        <span className="admin-datagrid-empty">Không có dữ liệu</span>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : (
                            tickets.map((ticket) => (
                                <TableRow
                                    key={ticket.id}
                                    hover
                                    sx={{
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: 'var(--palette-action-hover)' },
                                    }}
                                    onClick={() => router.push(`/${prefixAdmin}/support-tickets/detail/${ticket.id}`)}
                                >
                                    <TableCell sx={BODY_CELL_SX}>
                                        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                                            #{ticket.id}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={BODY_CELL_SX}>
                                        <Typography sx={{ fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                                            {categoryMap.get(ticket.ticketCategoryId) || '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ ...BODY_CELL_SX, maxWidth: 220 }}>
                                        <Typography
                                            sx={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                fontWeight: 600,
                                                fontSize: '0.875rem',
                                                color: 'var(--palette-text-primary)',
                                            }}
                                        >
                                            {ticket.title}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={BODY_CELL_SX}>
                                        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                                            {ticket.customerName || '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={BODY_CELL_SX}>
                                        <Typography sx={{ fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                                            {ticket.refType
                                                ? `${TICKET_REF_TYPE_LABELS[ticket.refType]}${ticket.refId ? ` · #${ticket.refId}` : ''}`
                                                : '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center" sx={BODY_CELL_SX}>
                                        <AdminStatusBadge
                                            label={TICKET_STATUS_LABELS[ticket.status]}
                                            modifier={getTicketStatusBadgeClass(ticket.status)}
                                        />
                                    </TableCell>
                                    <TableCell sx={BODY_CELL_SX}>
                                        <Typography sx={{ fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                                            {ticket.assignedToName || 'Chưa tiếp nhận'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={BODY_CELL_SX}>
                                        {formatDueAt(ticket.dueAt, ticket.status)}
                                    </TableCell>
                                    <TableCell sx={BODY_CELL_SX}>
                                        <Stack spacing={0}>
                                            <Typography sx={{ fontWeight: 400, fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                                                {dayjs(ticket.createdAt).format('DD MMM YYYY')}
                                            </Typography>
                                            <Typography sx={{ color: 'var(--palette-text-secondary)', fontSize: '0.75rem' }}>
                                                {dayjs(ticket.createdAt).format('HH:mm')}
                                            </Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell align="right" sx={{ ...BODY_CELL_SX, width: 80 }} onClick={(e) => e.stopPropagation()}>
                                        <AdminRowActionsMenu
                                            items={[
                                                {
                                                    id: 'assign',
                                                    label: 'Tiếp nhận',
                                                    icon: 'edit',
                                                    hidden: ticket.status !== TicketStatus.OPEN,
                                                    permission: PERMISSIONS.SUPPORT_TICKET.PROCESS,
                                                    onClick: () => handleAssign(ticket.id),
                                                },
                                                {
                                                    id: 'view',
                                                    label: 'Chi tiết',
                                                    icon: 'view',
                                                    onClick: () =>
                                                        router.push(`/${prefixAdmin}/support-tickets/detail/${ticket.id}`),
                                                },
                                            ]}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={total}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                }}
                labelRowsPerPage="Số hàng mỗi trang:"
                labelDisplayedRows={({ from, to, count }) =>
                    `${from}-${to} của ${count !== -1 ? count : `hơn ${to}`}`
                }
                sx={{
                    borderTop: '1px solid var(--palette-divider)',
                    color: 'var(--palette-text-secondary)',
                    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                        fontSize: '0.875rem',
                    },
                }}
            />
        </Card>
    );
};
