import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Box, 
    Card, 
    Typography, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow, 
    Checkbox, 
    TablePagination, 
    Stack, 
    Chip,
    Button,
    TextField,
    InputAdornment,
    IconButton,
    Breadcrumbs,
    Link as MuiLink,
    Toolbar,
    SvgIcon,
    Grid,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Autocomplete,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    DialogContentText
} from '@mui/material';
import { Icon } from '@iconify/react';
import { Title } from '../../components/ui/Title';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { CounterToolbar } from './sections/CounterToolbar';
import { prefixAdmin } from '../../constants/routes';
import { useTicketList } from '../ticket/hooks/useTicket';
import { LotteryTicketStatus } from '../../../constants/lottery.constants';
import { useStationsByDrawDate } from '../provider/hooks/useProvider';
import dayjs from 'dayjs';
import { useCreateOrder } from './hooks/useOrderManagement';
import { CreateDirectOrderRequest, OrderReceiveType, DirectOrderTransactionRequest } from '../../../types/order.type';
import { toast } from 'react-toastify';
import { useUsers } from '../account-user/hooks/useAccountUser';

const PHONE_REGEX = /^(0|84)(3|5|7|8|9)[0-9]{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CounterOrderCreatePage = () => {
    const [activeStep, setActiveStep] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<any>({
        dateRange: [dayjs().format('YYYY-MM-DD')]
    });
    const [sortByUI, setSortByUI] = useState('default');
    const [settings, setSettings] = useState({ density: 'compact', showColumns: [] });
    const [selectedTickets, setSelectedTickets] = useState<Record<string, { qty: number, ticket: any }>>({});
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [customerInfo, setCustomerInfo] = useState({ customerId: '', name: '', phone: '', email: '', note: '' });
    const [customerSearchInput, setCustomerSearchInput] = useState('');
    const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('');

    const normalizedCustomerPhone = customerInfo.phone.trim();
    const normalizedCustomerEmail = customerInfo.email.trim();

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedCustomerSearch(customerSearchInput);
        }, 500);
        return () => clearTimeout(timer);
    }, [customerSearchInput]);

    const { data: customers = [], isLoading: isSearchingUsers } = useUsers(
        { q: debouncedCustomerSearch, limit: 10, customerSearch: true } as any,
        {
            enabled: debouncedCustomerSearch.length >= 2,
            select: (res: any) => res?.data || []
        }
    );

    const { data: matchedExistingCustomer = null } = useUsers(
        { q: normalizedCustomerEmail, limit: 10, customerSearch: true } as any,
        {
            enabled: !customerInfo.customerId && normalizedCustomerEmail.length >= 3,
            select: (res: any) => {
                const users = res?.data || [];
                return users.find((user: any) => (user.email || '').trim().toLowerCase() === normalizedCustomerEmail.toLowerCase()) || null;
            }
        }
    );
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'PARTIAL'>('CASH');
    const [cashAmount, setCashAmount] = useState<string>('');
    const [openConfirm, setOpenConfirm] = useState(false);
    const [openAccountLinkPrompt, setOpenAccountLinkPrompt] = useState(false);
    const [accountLinkPromptSource, setAccountLinkPromptSource] = useState<'BLUR' | 'CHECKOUT'>('BLUR');
    const [guestAccountBypassEmail, setGuestAccountBypassEmail] = useState('');
    const [hasCheckedEmailBlur, setHasCheckedEmailBlur] = useState(false);

    useEffect(() => {
        if (hasCheckedEmailBlur && matchedExistingCustomer && !customerInfo.customerId && normalizedCustomerEmail.length > 0) {
            if (guestAccountBypassEmail.toLowerCase() !== normalizedCustomerEmail.toLowerCase()) {
                setAccountLinkPromptSource('BLUR');
                setOpenAccountLinkPrompt(true);
            }
        }
    }, [matchedExistingCustomer, hasCheckedEmailBlur, customerInfo.customerId, normalizedCustomerEmail, guestAccountBypassEmail]);

    const { mutate: createOrder, isPending: isCreating } = useCreateOrder();

    const selectedDrawDates = filters.dateRange && filters.dateRange.length > 0
        ? filters.dateRange
        : [dayjs().format('YYYY-MM-DD')];
    const { data: scheduleStations } = useStationsByDrawDate(selectedDrawDates);
    const previousDrawDatesKeyRef = useRef(selectedDrawDates.join(','));

    useEffect(() => {
        const stationList = Array.isArray(scheduleStations) ? scheduleStations : [];
        const allIds = stationList.map((station: any) => (station.id || station._id).toString());
        const drawDatesKey = selectedDrawDates.join(',');
        const didDrawDatesChange = previousDrawDatesKeyRef.current !== drawDatesKey;

        setFilters((prev: any) => {
            const currentRegion = Array.isArray(prev.region) ? prev.region : [];

            if (didDrawDatesChange) {
                return { ...prev, region: allIds };
            }

            const nextRegion = currentRegion.length === 0
                ? allIds
                : currentRegion.filter((id: string) => allIds.includes(id));

            const changed = currentRegion.length !== nextRegion.length
                || currentRegion.some((id: string, index: number) => nextRegion[index] !== id);

            if (!changed && currentRegion.length > 0) {
                return prev;
            }

            return { ...prev, region: nextRegion.length > 0 ? nextRegion : allIds };
        });

        previousDrawDatesKeyRef.current = drawDatesKey;
    }, [scheduleStations, selectedDrawDates]);

    const { data: ticketsRes, isLoading } = useTicketList({
        status: LotteryTicketStatus.IN_STOCK,
        search: searchQuery || undefined,
        stationIds: filters.region && filters.region.length > 0 ? filters.region.map((id: string) => Number(id)) : undefined,
        drawDate: filters.dateRange && filters.dateRange.length > 0 ? filters.dateRange : undefined,
        page: page + 1,
        limit: rowsPerPage
    });

    const paginatedTickets = (ticketsRes as any)?.data?.recordList || [];
    const totalRecords = (ticketsRes as any)?.data?.pagination?.totalRecords || 0;

    const groupedTickets = useMemo(() => {
        const groups: { [key: string]: { stationName: string; stationCode: string; tickets: any[] } } = {};
        paginatedTickets.forEach((ticket: any) => {
            const stationName = ticket.station?.name || ticket.stationName || ticket.region?.name || 'Vé số';
            const stationCode = ticket.station?.province || ticket.region?.code || 'ĐN';
            const key = `${stationCode}-${stationName}`;
            if (!groups[key]) {
                groups[key] = { stationName, stationCode, tickets: [] };
            }
            groups[key].tickets.push(ticket);
        });
        return Object.values(groups);
    }, [paginatedTickets]);

    const handleQuantityChange = (ticket: any, delta: number, max: number) => {
        const id = ticket.id || ticket._id;
        setSelectedTickets(prev => {
            const current = prev[id]?.qty || 0;
            const next = Math.max(0, Math.min(max, current + delta));
            const updated = { ...prev };
            if (next === 0) {
                delete updated[id];
            } else {
                updated[id] = { qty: next, ticket };
            }
            return updated;
        });
    };

    const totalSelectedQuantity = Object.values(selectedTickets).reduce((a, b) => a + b.qty, 0);

    useEffect(() => {
        if (activeStep === 2 && totalSelectedQuantity === 0) {
            setActiveStep(1);
        }
    }, [activeStep, totalSelectedQuantity]);

    const totalPrice = useMemo(() => {
        return Object.values(selectedTickets).reduce((total, { qty, ticket }) => {
            const price = ticket.price || 10000;
            return total + (qty * price);
        }, 0);
    }, [selectedTickets]);

    const parsedCashAmount = parseInt(cashAmount.replace(/\D/g, '')) || 0;
    const isCashExceeds = paymentMethod === 'PARTIAL' && parsedCashAmount > totalPrice;
    const remainingTransferAmount = Math.max(0, totalPrice - parsedCashAmount);
    const isPartialZeroCash = paymentMethod === 'PARTIAL' && (!cashAmount || parsedCashAmount <= 0);

    const isPartialInvalid = paymentMethod === 'PARTIAL'
        && !isPartialZeroCash
        && remainingTransferAmount > 0
        && remainingTransferAmount < 10000;
    const isBankInvalid = paymentMethod === 'BANK' && totalPrice < 10000;
    const hasPaymentError = isPartialInvalid || isBankInvalid || isCashExceeds || isPartialZeroCash;
    
    const isPhoneValid = !normalizedCustomerPhone || PHONE_REGEX.test(normalizedCustomerPhone);
    const isEmailValid = !normalizedCustomerEmail || EMAIL_REGEX.test(normalizedCustomerEmail);
    const hasCustomerError = !customerInfo.name.trim() || (!normalizedCustomerPhone && !normalizedCustomerEmail) || !isPhoneValid || !isEmailValid;

    useEffect(() => {
        if (guestAccountBypassEmail && guestAccountBypassEmail.toLowerCase() !== normalizedCustomerEmail.toLowerCase()) {
            setGuestAccountBypassEmail('');
        }
        if (customerInfo.customerId && guestAccountBypassEmail) {
            setGuestAccountBypassEmail('');
        }
    }, [customerInfo.customerId, guestAccountBypassEmail, normalizedCustomerEmail]);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleLinkExistingAccount = () => {
        if (!matchedExistingCustomer) {
            setOpenAccountLinkPrompt(false);
            if (accountLinkPromptSource === 'CHECKOUT') setOpenConfirm(true);
            return;
        }

        setCustomerInfo(prev => ({
            ...prev,
            customerId: matchedExistingCustomer.id || matchedExistingCustomer._id || '',
            name: matchedExistingCustomer.fullName || prev.name,
            phone: matchedExistingCustomer.phone || matchedExistingCustomer.phoneNumber || prev.phone,
            email: matchedExistingCustomer.email || prev.email
        }));
        setGuestAccountBypassEmail('');
        setOpenAccountLinkPrompt(false);
        if (accountLinkPromptSource === 'CHECKOUT') setOpenConfirm(true);
    };

    const handleContinueAsGuest = () => {
        setGuestAccountBypassEmail(normalizedCustomerEmail);
        setOpenAccountLinkPrompt(false);
        if (accountLinkPromptSource === 'CHECKOUT') setOpenConfirm(true);
    };

    const handleOpenCheckoutConfirm = () => {
        const shouldAskToLinkAccount = !!matchedExistingCustomer
            && !customerInfo.customerId
            && normalizedCustomerEmail.length > 0
            && guestAccountBypassEmail.toLowerCase() !== normalizedCustomerEmail.toLowerCase();

        if (shouldAskToLinkAccount) {
            setAccountLinkPromptSource('CHECKOUT');
            setOpenAccountLinkPrompt(true);
            return;
        }

        setOpenConfirm(true);
    };

    const handleCreateOrder = () => {
        const transactions: DirectOrderTransactionRequest[] = [];
        const normalizedPaymentMethod = paymentMethod === 'PARTIAL' && remainingTransferAmount === 0 ? 'CASH' : paymentMethod;

        if (normalizedPaymentMethod === 'CASH') {
            transactions.push({ type: 'OFFLINE', amount: totalPrice });
        } else if (normalizedPaymentMethod === 'BANK') {
            transactions.push({ type: 'ONLINE', amount: totalPrice });
        } else if (normalizedPaymentMethod === 'PARTIAL') {
            if (parsedCashAmount > 0) {
                transactions.push({ type: 'OFFLINE', amount: parsedCashAmount });
            }
            if (remainingTransferAmount > 0) {
                transactions.push({ type: 'ONLINE', amount: remainingTransferAmount });
            }
        }

        const items = Object.values(selectedTickets).map(item => ({
            lotteryTicketId: item.ticket.id || item.ticket._id,
            quantity: item.qty
        }));

        const payload: CreateDirectOrderRequest = {
            customerId: customerInfo.customerId || undefined,
            name: customerInfo.name.trim(),
            phone: normalizedCustomerPhone || undefined,
            email: normalizedCustomerEmail || undefined,
            note: customerInfo.note || undefined,
            receiveType: OrderReceiveType.COUNTER_PICKUP,
            items,
            transactions
        };

        createOrder(payload, {
            onSuccess: (res) => {
                toast.success('Tạo đơn hàng thành công!');
                setOpenConfirm(false);
                setSelectedTickets({});
                setCustomerInfo({ customerId: '', name: '', phone: '', email: '', note: '' });
                setCashAmount('');
                setPaymentMethod('CASH');
                setActiveStep(1);
            },
            onError: (err: any) => {
                toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi tạo đơn hàng');
                setOpenConfirm(false);
            }
        });
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleFilterChange = (fieldId: string, values: string[]) => {
        setFilters((prev: any) => ({ ...prev, [fieldId]: values }));
    };

    const handleClearFilters = () => {
        const allIds = Array.isArray(scheduleStations) ? scheduleStations.map((p: any) => (p.id || p._id).toString()) : [];
        setFilters({
            region: allIds,
            dateRange: [dayjs().format('YYYY-MM-DD')]
        });
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 100px)' }}>
            {/* Header Area */}
            <Box sx={{ mb: 4 }}>
                <Title title="Tạo đơn tại quầy" />
                <Breadcrumb
                    items={[
                        { label: 'Bảng điều khiển', to: `/${prefixAdmin}/dashboard` },
                        { label: 'Đơn hàng', to: `/${prefixAdmin}/order/list` },
                        activeStep === 1 
                            ? { label: 'Tạo đơn tại quầy' }
                            : { label: 'Tạo đơn tại quầy', onClick: () => setActiveStep(1) },
                        ...(activeStep === 2 ? [{ label: 'Thông tin đơn hàng' }] : [])
                    ]}
                />
            </Box>



            {activeStep === 1 && (
                <Card sx={{
                    borderRadius: 'var(--shape-borderRadius-lg)',
                    bgcolor: 'var(--palette-background-paper)',
                    boxShadow: "var(--customShadows-card)",
                    overflow: 'hidden'
                }}>
                    {/* Toolbar */}
                    <CounterToolbar
                        filters={{ ...filters, search: searchQuery }}
                        onFilterChange={handleFilterChange}
                        onClearFilters={handleClearFilters}
                        onSearchChange={setSearchQuery}
                        sortByUI={sortByUI}
                        onSortChange={setSortByUI}
                        settings={settings}
                        onSettingsChange={setSettings}
                    />



                    {/* Table */}
                    <TableContainer>
                        <Table size="medium" sx={{ minWidth: 960 }}>
                            <TableHead sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                                <TableRow>
                                    <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Số vé</TableCell>
                                    <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Ngày mở thưởng</TableCell>
                                    <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Mệnh giá</TableCell>
                                    <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Tồn kho</TableCell>
                                    <TableCell>
                                        Số lượng mua
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {groupedTickets.map((group, groupIndex) => (
                                    <React.Fragment key={group.stationCode + groupIndex}>
                                        {/* Group Header Row */}
                                        <TableRow sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                                            <TableCell colSpan={5} sx={{ py: 1 }}>
                                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                                    <Box sx={{ 
                                                        width: 24, height: 24, borderRadius: 1, 
                                                        bgcolor: 'var(--palette-success-main)', 
                                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.65rem', fontWeight: 700
                                                    }}>
                                                        {group.stationCode}
                                                    </Box>
                                                    <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                                                        {group.stationName}
                                                    </Typography>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>

                                        {group.tickets.map((row: any) => {
                                            const qty = selectedTickets[row.id]?.qty || 0;
                                            const maxQty = row.quantity || 0;

                                            return (
                                                <TableRow
                                                    hover
                                                    tabIndex={-1}
                                                    key={row.id}
                                                    selected={qty > 0}
                                                    sx={{ '&:hover': { bgcolor: 'var(--palette-action-hover)' } }}
                                                >
                                                    <TableCell sx={{ borderBottom: '1px dashed var(--palette-background-neutral)' }}>
                                                        <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: 'var(--palette-text-primary)' }}>
                                                            {row.numbers}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ borderBottom: '1px dashed var(--palette-background-neutral)', fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                                                        {row.drawDate || '-'}
                                                    </TableCell>
                                                    <TableCell sx={{ borderBottom: '1px dashed var(--palette-background-neutral)', fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                                                        {(row.price || 10000).toLocaleString('vi-VN')}đ
                                                    </TableCell>
                                                    <TableCell sx={{ borderBottom: '1px dashed var(--palette-background-neutral)', fontSize: '0.875rem', color: 'var(--palette-text-primary)', fontWeight: 700 }}>
                                                        {maxQty}
                                                    </TableCell>
                                                    <TableCell sx={{ borderBottom: '1px dashed var(--palette-background-neutral)' }}>
                                                        <Stack direction="row" alignItems="center" spacing={1}>
                                                            <Box 
                                                                onClick={(e) => { e.stopPropagation(); handleQuantityChange(row, -1, maxQty); }}
                                                                sx={{ 
                                                                    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                                    borderRadius: 1, border: '1px solid var(--palette-action-disabledBackground)',
                                                                    cursor: qty > 0 ? 'pointer' : 'not-allowed', color: qty > 0 ? 'var(--palette-text-primary)' : 'var(--palette-text-disabled)',
                                                                    '&:hover': qty > 0 ? { bgcolor: 'var(--palette-action-hover)' } : {}
                                                                }}
                                                            >
                                                                -
                                                            </Box>
                                                            <Typography sx={{ width: 30, textAlign: 'center', fontWeight: 600 }}>
                                                                {qty}
                                                            </Typography>
                                                            <Box 
                                                                onClick={(e) => { e.stopPropagation(); handleQuantityChange(row, 1, maxQty); }}
                                                                sx={{ 
                                                                    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                                    borderRadius: 1, border: '1px solid var(--palette-action-disabledBackground)',
                                                                    cursor: qty < maxQty ? 'pointer' : 'not-allowed', color: qty < maxQty ? 'var(--palette-text-primary)' : 'var(--palette-text-disabled)',
                                                                    '&:hover': qty < maxQty ? { bgcolor: 'var(--palette-action-hover)' } : {}
                                                                }}
                                                            >
                                                                +
                                                            </Box>
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', p: 2, borderTop: '1px dashed var(--palette-background-neutral)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <TablePagination
                                component="div"
                                count={totalRecords}
                                page={page}
                                onPageChange={handleChangePage}
                                rowsPerPage={rowsPerPage}
                                onRowsPerPageChange={handleChangeRowsPerPage}
                                labelRowsPerPage="Hiển thị"
                                sx={{ border: 'none', '.MuiTablePagination-toolbar': { minHeight: '36px', p: 0 } }}
                            />
                        </Box>
                    </Box>
                </Card>
            )}

            {activeStep === 2 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
                    {/* Left Column: Details */}
                    <Stack spacing={3}>
                        {/* 1. Danh sách vé */}
                        <Card sx={{ p: 3, borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: "var(--customShadows-card)" }}>
                            <Typography variant="h6" mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box component="span" sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#212B36', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700 }}>1</Box>
                                Danh sách vé
                            </Typography>
                            <TableContainer>
                                <Table>
                                    <TableHead sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                                        <TableRow>
                                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>VÉ SỐ</TableCell>
                                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>ĐÀI & NGÀY QUAY</TableCell>
                                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>SỐ LƯỢNG</TableCell>
                                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>ĐƠN GIÁ</TableCell>
                                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>THÀNH TIỀN</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Object.entries(selectedTickets).map(([id, { qty, ticket }]) => {
                                            if (qty <= 0) return null;
                                            const ticketNumber = ticket.numbers || ticket.ticketNumber || '...';
                                            const stationName = ticket.station?.name || ticket.stationName || ticket.region?.name || '...';
                                            const drawDate = ticket.drawDate ? dayjs(ticket.drawDate).format('DD/MM/YYYY') : '...';
                                            const price = ticket.price || 10000;
                                            const maxQty = ticket.quantity || 0;
                                            
                                            return (
                                                <TableRow key={id}>
                                                    <TableCell sx={{ borderBottom: '1px dashed var(--palette-background-neutral)', fontWeight: 600 }}>{ticketNumber}</TableCell>
                                                    <TableCell sx={{ borderBottom: '1px dashed var(--palette-background-neutral)' }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{stationName}</Typography>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{drawDate}</Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ borderBottom: '1px dashed var(--palette-background-neutral)' }}>
                                                        <Stack direction="row" alignItems="center" spacing={1}>
                                                            <Box 
                                                                onClick={(e) => { e.stopPropagation(); handleQuantityChange(ticket, -1, maxQty); }}
                                                                sx={{ 
                                                                    width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                                    borderRadius: 1, border: '1px solid var(--palette-action-disabledBackground)',
                                                                    cursor: qty > 0 ? 'pointer' : 'not-allowed', color: qty > 0 ? 'var(--palette-text-primary)' : 'var(--palette-text-disabled)',
                                                                    '&:hover': qty > 0 ? { bgcolor: 'var(--palette-action-hover)' } : {}
                                                                }}
                                                            >
                                                                -
                                                            </Box>
                                                            <Typography sx={{ width: 24, textAlign: 'center', fontWeight: 600 }}>
                                                                {qty}
                                                            </Typography>
                                                            <Box 
                                                                onClick={(e) => { e.stopPropagation(); handleQuantityChange(ticket, 1, maxQty); }}
                                                                sx={{ 
                                                                    width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                                    borderRadius: 1, border: '1px solid var(--palette-action-disabledBackground)',
                                                                    cursor: qty < maxQty ? 'pointer' : 'not-allowed', color: qty < maxQty ? 'var(--palette-text-primary)' : 'var(--palette-text-disabled)',
                                                                    '&:hover': qty < maxQty ? { bgcolor: 'var(--palette-action-hover)' } : {}
                                                                }}
                                                            >
                                                                +
                                                            </Box>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell sx={{ borderBottom: '1px dashed var(--palette-background-neutral)' }}>{price.toLocaleString('vi-VN')}đ</TableCell>
                                                    <TableCell sx={{ borderBottom: '1px dashed var(--palette-background-neutral)', color: 'var(--palette-text-primary)', fontWeight: 600 }}>{(qty * price).toLocaleString('vi-VN')}đ</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Card>

                        {/* 2. Thông tin khách hàng */}
                        <Card sx={{ p: 3, borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: "var(--customShadows-card)" }}>
                            <Typography variant="h6" mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box component="span" sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#212B36', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700 }}>2</Box>
                                Thông tin khách hàng
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <Autocomplete
                                    options={[
                                        ...(customers || []),
                                        ...(customerInfo.customerId ? [{
                                            id: customerInfo.customerId,
                                            fullName: customerInfo.name,
                                            phone: customerInfo.phone,
                                            email: customerInfo.email
                                        }] : [])
                                    ]}
                                    getOptionLabel={(option: any) => {
                                        const parts = [option.fullName || option.name || 'Khách hàng'];
                                        if (option.phone) parts.push(option.phone);
                                        if (option.email) parts.push(option.email);
                                        return parts.join(' - ');
                                    }}
                                    isOptionEqualToValue={(option: any, value: any) => (option.id || option._id) === (value.id || value._id)}
                                    value={customerInfo.customerId ? { 
                                        id: customerInfo.customerId, 
                                        fullName: customerInfo.name, 
                                        phone: customerInfo.phone, 
                                        email: customerInfo.email 
                                    } : null}
                                    loading={isSearchingUsers}
                                    onInputChange={(event, newInputValue) => {
                                        setCustomerSearchInput(newInputValue);
                                    }}
                                    onChange={(event, newValue: any) => {
                                        if (newValue) {
                                            setCustomerInfo(prev => ({
                                                ...prev,
                                                customerId: newValue.id || newValue._id,
                                                name: newValue.fullName || '',
                                                phone: newValue.phone || '',
                                                email: newValue.email || ''
                                            }));
                                        } else {
                                            setCustomerInfo(prev => ({ ...prev, customerId: '', name: '', phone: '', email: '' }));
                                        }
                                    }}
                                    noOptionsText="Không tìm thấy khách hàng"
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Tìm kiếm khách hàng có sẵn (Tên / SĐT / Email)"
                                            placeholder="Nhập từ 2 ký tự..."
                                            InputProps={{
                                                ...params.InputProps,
                                                endAdornment: (
                                                    <React.Fragment>
                                                        {isSearchingUsers ? <CircularProgress color="inherit" size={20} /> : null}
                                                        {params.InputProps.endAdornment}
                                                    </React.Fragment>
                                                ),
                                            }}
                                        />
                                    )}
                                />
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                                    <TextField fullWidth label="Họ và tên *" placeholder="Nhập họ và tên" value={customerInfo.name} onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})} error={!customerInfo.name.trim()} />
                                    <TextField fullWidth label="Số điện thoại" helperText={(!normalizedCustomerPhone && !normalizedCustomerEmail) ? "Nhập SĐT hoặc email" : (!isPhoneValid ? "Số điện thoại không hợp lệ" : " ")} placeholder="Nhập số điện thoại" value={customerInfo.phone} onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})} error={(!normalizedCustomerPhone && !normalizedCustomerEmail) || !isPhoneValid} />
                                    <TextField 
                                        fullWidth 
                                        disabled={!!customerInfo.customerId} 
                                        label="Email" 
                                        helperText={(!normalizedCustomerPhone && !normalizedCustomerEmail) ? "Nhập email hoặc SĐT" : (!isEmailValid ? "Email không hợp lệ" : " ")} 
                                        placeholder="Nhập địa chỉ email" 
                                        value={customerInfo.email} 
                                        onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})} 
                                        onBlur={() => setHasCheckedEmailBlur(true)}
                                        onFocus={() => setHasCheckedEmailBlur(false)}
                                        error={(!normalizedCustomerPhone && !normalizedCustomerEmail) || !isEmailValid} 
                                    />
                                    <TextField fullWidth label="Ghi chú thêm" placeholder="VD: Tới lấy vào giờ nghỉ trưa..." value={customerInfo.note} onChange={(e) => setCustomerInfo({...customerInfo, note: e.target.value})} />
                                </Box>
                            </Box>
                        </Card>
                    </Stack>

                    {/* Right Column: Summary */}
                    <Box sx={{ position: 'sticky', top: 24 }}>
                        <Card sx={{ borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: "var(--customShadows-card)" }}>
                            <Box sx={{ p: 2, bgcolor: '#212B36', color: '#fff', borderRadius: 'var(--shape-borderRadius-lg) var(--shape-borderRadius-lg) 0 0' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>TÓM TẮT ĐƠN HÀNG</Typography>
                            </Box>
                            <Box sx={{ p: 3 }}>
                                <Stack spacing={2}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Số lượng vé</Typography>
                                        <Typography variant="subtitle2">{totalSelectedQuantity} vé</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Tạm tính</Typography>
                                        <Typography variant="subtitle2" sx={{ color: 'var(--palette-text-primary)' }}>{totalPrice.toLocaleString('vi-VN')}đ</Typography>
                                    </Box>
                                    <Divider sx={{ borderStyle: 'dashed' }} />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="subtitle1">TỔNG THANH TOÁN</Typography>
                                        <Typography variant="h6" sx={{ color: 'var(--palette-text-primary)' }}>{totalPrice.toLocaleString('vi-VN')}đ</Typography>
                                    </Box>

                                    <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                                        <InputLabel>Phương thức thanh toán</InputLabel>
                                        <Select
                                            value={paymentMethod}
                                            label="Phương thức thanh toán"
                                            onChange={(e) => setPaymentMethod(e.target.value as any)}
                                        >
                                            <MenuItem value="CASH">Tiền mặt</MenuItem>
                                            <MenuItem value="BANK">Chuyển khoản</MenuItem>
                                            <MenuItem value="PARTIAL">Thanh toán kết hợp</MenuItem>
                                        </Select>
                                    </FormControl>

                                    {paymentMethod === 'PARTIAL' && (
                                        <Box sx={{ p: 2, bgcolor: 'var(--palette-background-neutral)', borderRadius: 1 }}>
                                            <TextField 
                                                fullWidth 
                                                size="small" 
                                                label="Khách đưa tiền mặt" 
                                                placeholder="VD: 150000"
                                                value={cashAmount}
                                                onChange={(e) => {
                                                    const rawValue = e.target.value.replace(/\D/g, '');
                                                    if (!rawValue) {
                                                        setCashAmount('');
                                                    } else {
                                                        setCashAmount(parseInt(rawValue, 10).toLocaleString('vi-VN'));
                                                    }
                                                }}
                                                InputProps={{
                                                    endAdornment: <InputAdornment position="end">đ</InputAdornment>,
                                                }}
                                                sx={{ mb: 2, bgcolor: 'background.paper' }}
                                                error={isPartialInvalid || isCashExceeds}
                                                helperText={
                                                    isCashExceeds 
                                                        ? "Tiền mặt không được vượt quá tổng hoá đơn"
                                                        : (isPartialZeroCash
                                                            ? "Thanh toán kết hợp cần có phần tiền mặt lớn hơn 0đ"
                                                            : (isPartialInvalid ? "Số tiền chuyển khoản phải >= 10.000đ" : ""))
                                                }
                                            />
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>Cần chuyển khoản thêm:</Typography>
                                                <Typography variant="subtitle1" sx={{ color: 'var(--palette-error-main)', fontWeight: 700 }}>
                                                    {remainingTransferAmount.toLocaleString('vi-VN')}đ
                                                </Typography>
                                            </Box>
                                        </Box>
                                    )}

                                    {isBankInvalid && (
                                        <Typography variant="caption" sx={{ color: 'error.main', mt: 1, display: 'block', textAlign: 'center' }}>
                                            Giao dịch chuyển khoản phải từ 10.000đ trở lên
                                        </Typography>
                                    )}

                                    <Button 
                                        disabled={hasPaymentError || hasCustomerError || isCreating}
                                        variant="contained" 
                                        size="large" 
                                        fullWidth 
                                        sx={{ mt: 2, bgcolor: '#212B36', '&:hover': { bgcolor: '#161C24' }, boxShadow: 'var(--customShadows-primary)' }}
                                        onClick={handleOpenCheckoutConfirm}
                                    >
                                        Chốt đơn ngay
                                    </Button>
                                    <Button variant="outlined" size="large" fullWidth sx={{ mt: 1, color: 'text.primary', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover', borderColor: 'divider' } }} onClick={() => setActiveStep(1)}>
                                        Quay lại chọn vé
                                    </Button>
                                </Stack>
                            </Box>
                        </Card>
                    </Box>
                </Box>
            )}

            {/* Fixed Bottom Action Bar */}
            {activeStep === 1 && (
                <Box sx={{ 
                    position: 'sticky', bottom: 0, p: 2, mt: 'auto',
                    bgcolor: 'var(--palette-background-paper)', 
                    borderTop: '1px solid var(--palette-background-neutral)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    boxShadow: '0 -4px 20px 0 rgba(0,0,0,0.05)', zIndex: 1100,
                    mx: { xs: -2, lg: -3 }, mb: { xs: -2, lg: -3 }
                }}>
                    <Box sx={{ pl: { xs: 2, lg: 4 }, display: 'flex', alignItems: 'center' }}>
                        <Typography sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                            Đã chọn: <Typography component="span" sx={{ color: 'var(--palette-error-main)', fontWeight: 800 }}>{totalSelectedQuantity}</Typography> vé
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, md: 3 } }}>
                        <Typography sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                            Tổng tiền: <Typography component="span" sx={{ color: 'var(--palette-error-main)', fontWeight: 800, fontSize: '1.125rem' }}>{totalPrice.toLocaleString('vi-VN')}đ</Typography>
                        </Typography>
                        <Button 
                            variant="contained" 
                            disabled={totalSelectedQuantity === 0}
                            onClick={() => setActiveStep(2)}
                            sx={{ bgcolor: '#212B36', '&:hover': { bgcolor: '#161C24' }, boxShadow: 'var(--customShadows-primary)' }}
                        >
                            Tiếp tục
                        </Button>
                    </Box>
                </Box>
            )}

            {/* Confirm Dialog */}
            <Dialog open={openAccountLinkPrompt} onClose={() => setOpenAccountLinkPrompt(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ pb: 2 }}>Email đã có tài khoản</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Email này đã tồn tại trong hệ thống. Bạn có muốn liên kết đơn hàng với tài khoản của khách không?
                    </DialogContentText>
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'var(--palette-background-neutral)', borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {matchedExistingCustomer?.fullName || 'Khách hàng'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {matchedExistingCustomer?.email || normalizedCustomerEmail}
                        </Typography>
                        {(matchedExistingCustomer?.phone || matchedExistingCustomer?.phoneNumber) && (
                            <Typography variant="body2" color="text.secondary">
                                {matchedExistingCustomer?.phone || matchedExistingCustomer?.phoneNumber}
                            </Typography>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setOpenAccountLinkPrompt(false)} color="inherit" variant="outlined" sx={{ borderColor: 'divider', '&:hover': { borderColor: 'text.primary', bgcolor: 'transparent' } }}>
                        Quay lại
                    </Button>
                    <Button onClick={handleContinueAsGuest} variant="outlined" sx={{ borderColor: 'divider', color: 'text.primary', '&:hover': { borderColor: 'text.primary', bgcolor: 'transparent' } }}>
                        Tạo đơn khách lẻ
                    </Button>
                    <Button onClick={handleLinkExistingAccount} variant="contained" sx={{ bgcolor: '#212B36', color: '#fff', '&:hover': { bgcolor: '#161C24' } }}>
                        Liên kết tài khoản
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openConfirm} onClose={() => !isCreating && setOpenConfirm(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ pb: 2 }}>Xác nhận chốt đơn</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bạn có chắc chắn muốn chốt đơn hàng này không?
                    </DialogContentText>
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'var(--palette-background-neutral)', borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">Khách hàng:</Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{customerInfo.name || 'Khách vãng lai'}</Typography>
                        </Box>
                        {normalizedCustomerPhone && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2" color="text.secondary">Số điện thoại:</Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{normalizedCustomerPhone}</Typography>
                            </Box>
                        )}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">Tổng tiền:</Typography>
                            <Typography variant="subtitle2" color="error.main" sx={{ fontWeight: 700 }}>{totalPrice.toLocaleString('vi-VN')}đ</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Thanh toán:</Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {paymentMethod === 'CASH' ? 'Tiền mặt' : paymentMethod === 'BANK' ? 'Chuyển khoản' : 'Thanh toán kết hợp'}
                            </Typography>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setOpenConfirm(false)} disabled={isCreating} color="inherit" variant="outlined" sx={{ borderColor: 'divider', '&:hover': { borderColor: 'text.primary', bgcolor: 'transparent' } }}>
                        Hủy
                    </Button>
                    <Button 
                        onClick={handleCreateOrder} 
                        variant="contained" 
                        disabled={isCreating}
                        sx={{ bgcolor: '#212B36', color: '#fff', '&:hover': { bgcolor: '#161C24' } }}
                    >
                        {isCreating ? 'Đang xử lý...' : 'Xác nhận'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
