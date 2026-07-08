import { useState, SyntheticEvent } from "react";
import {
    Box,
    Card,
    Tabs,
    Tab,
    styled,
    CircularProgress,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Checkbox,
    TablePagination,
    Collapse,
    Stack,
    Avatar,
    Chip,
    Menu,
    MenuItem
} from "@mui/material";
import { Icon } from "@iconify/react";
import dayjs from "dayjs";
import React from 'react';
import { useTicketServiceOrders, useUpdateTicketServiceOrderStatus } from "../hooks/useTicketServiceOrderManagement";
import { toast } from "react-toastify";
import { Search } from "../../../components/ui/Search";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { prefixAdmin } from "../../../constants/routes";
import { useAuthStore } from "../../../../stores/useAuthStore";
import { confirmAction } from "../../../utils/swal";

const TabBadge = styled('span')(() => ({
    height: "24px",
    minWidth: "24px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: '8px',
    padding: '0px 6px',
    borderRadius: "var(--shape-borderRadius-sm)",
    fontSize: '0.75rem',
    fontWeight: 700,
    transition: 'all 0.2s',
}));

export const TicketServiceOrderList = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isStaff = user?.role?.code?.includes('STAFF');
    const [tabStatus, setTabStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selected, setSelected] = useState<string[]>([]);
    const [openRows, setOpenRows] = useState<string[]>([]);
    const [anchorEl, setAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({});

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, id: string) => {
        setAnchorEl({ ...anchorEl, [id]: event.currentTarget });
    };

    const handleCloseMenu = (id: string) => {
        setAnchorEl({ ...anchorEl, [id]: null });
    };

    const filters = {
        ...(isStaff && { staffId: user?.id }),
        ...(tabStatus !== 'all' && { status: tabStatus }),
        ...(searchQuery && { keyword: searchQuery }),
        page: page + 1,
        limit: rowsPerPage,
    };

    const { data: res, isLoading } = useTicketServiceOrders(filters);
    const ticketServiceOrders = res?.data?.recordList || [];
    const pagination = res?.data?.pagination || { totalRecords: 0 };

    const { mutate: updateStatus } = useUpdateTicketServiceOrderStatus();

    const handleStatusUpdate = (id: string, status: string) => {
        const update = () => {
            updateStatus({ id, status }, {
                onSuccess: () => toast.success(t("admin.validation.update_success"))
            });
        };

        if (status === 'in-progress') {
            confirmAction(
                "Bắt đầu thực hiện?",
                "Xác nhận đơn dịch vụ này bắt đầu được thực hiện ngay bây giờ.",
                update,
                'info'
            );
        } else if (status === 'completed') {
            confirmAction(
                "Xác nhận Hoàn thành?",
                "Đảm bảo khách đã thanh toán đủ trước khi thực hiện Checkout.",
                update,
                'warning'
            );
        } else {
            update();
        }
    };

    const handleViewDetail = (id: string) => {
        navigate(`/${prefixAdmin}/ticketServiceOrder/detail/${id}`);
    };

    const handleEdit = (ticketServiceOrder: any) => {
        navigate(`/${prefixAdmin}/ticketServiceOrder/edit/${ticketServiceOrder._id}`);
    };

    const handleTabChange = (_event: SyntheticEvent, newValue: string) => {
        setTabStatus(newValue);
        setPage(0);
    };

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setPage(0);
    };

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const newSelected = ticketServiceOrders.map((n: any) => n._id);
            setSelected(newSelected);
            return;
        }
        setSelected([]);
    };

    const handleSelectRow = (id: string) => {
        const selectedIndex = selected.indexOf(id);
        let newSelected: string[] = [];

        if (selectedIndex === -1) {
            newSelected = [...selected, id];
        } else if (selectedIndex === 0) {
            newSelected = selected.slice(1);
        } else if (selectedIndex === selected.length - 1) {
            newSelected = selected.slice(0, -1);
        } else if (selectedIndex > 0) {
            newSelected = [
                ...selected.slice(0, selectedIndex),
                ...selected.slice(selectedIndex + 1),
            ];
        }
        setSelected(newSelected);
    };

    const toggleRow = (id: string) => {
        setOpenRows(prev =>
            prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
        );
    };

    const statusCounts = res?.data?.statusCounts || {
        all: 0,
        pending: 0,
        confirmed: 0,
        "in-progress": 0,
        completed: 0,
        cancelled: 0,
        request_cancel: 0,
    };

    return (
        <Card sx={{
            borderRadius: 'var(--shape-borderRadius-lg)',
            bgcolor: 'var(--palette-background-paper)',
            boxShadow: "var(--customShadows-card)",
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <Tabs
                value={tabStatus}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons={false}
                sx={{
                    px: '20px',
                    minHeight: "48px",
                    borderBottom: `1px solid var(--palette-background-neutral)`,
                    '& .MuiTabs-flexContainer': { gap: "calc(5 * var(--spacing))" },
                    '& .MuiTabs-indicator': { backgroundColor: 'var(--palette-text-primary)', height: 2 },
                }}
            >
                {[
                    { value: 'all', label: t("admin.common.tabs.all"), color: 'var(--palette-common-white)', bg: 'var(--palette-grey-800)', activeColor: 'var(--palette-common-white)', activeBg: 'var(--palette-grey-800)' },
                    { value: 'pending', label: t("admin.ticketServiceOrder.status.pending"), color: 'var(--palette-warning-dark)', bg: 'var(--palette-warning-lighter)', activeColor: 'var(--palette-warning-contrastText)', activeBg: 'var(--palette-warning-main)' },
                    { value: 'confirmed', label: t("admin.ticketServiceOrder.status.confirmed"), color: 'var(--palette-info-dark)', bg: 'var(--palette-info-lighter)', activeColor: 'var(--palette-info-contrastText)', activeBg: 'var(--palette-info-main)' },
                    { value: 'in-progress', label: t("admin.ticketServiceOrder.status.in_progress"), color: 'var(--palette-primary-dark)', bg: 'var(--palette-primary-lighter)', activeColor: 'var(--palette-primary-contrastText)', activeBg: 'var(--palette-primary-main)' },
                    { value: 'completed', label: t("admin.ticketServiceOrder.status.completed"), color: 'var(--palette-success-dark)', bg: 'var(--palette-success-lighter)', activeColor: 'var(--palette-success-contrastText)', activeBg: 'var(--palette-success-main)' },
                    { value: 'cancelled', label: t("admin.ticketServiceOrder.status.cancelled"), color: 'var(--palette-error-dark)', bg: 'var(--palette-error-lighter)', activeColor: 'var(--palette-error-contrastText)', activeBg: 'var(--palette-error-main)' },
                    { value: 'request_cancel', label: t("admin.ticketServiceOrder.status.request_cancel"), color: 'var(--palette-error-dark)', bg: 'var(--palette-error-lighter)', activeColor: 'var(--palette-error-contrastText)', activeBg: 'var(--palette-error-main)' },
                ].map((tab) => (
                    <Tab
                        key={tab.value}
                        value={tab.value}
                        disableRipple
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography sx={{
                                    fontSize: '0.875rem',
                                    fontWeight: tabStatus === tab.value ? 700 : 500,
                                    color: tabStatus === tab.value ? 'var(--palette-text-primary)' : 'inherit'
                                }}>
                                    {tab.label}
                                </Typography>
                                <TabBadge
                                    sx={{
                                        bgcolor: tabStatus === tab.value ? tab.activeBg : tab.bg,
                                        color: tabStatus === tab.value ? tab.activeColor : tab.color,
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {statusCounts[tab.value as keyof typeof statusCounts]}
                                </TabBadge>
                            </Box>
                        }
                        sx={{
                            minWidth: 0,
                            padding: '0',
                            minHeight: '48px',
                            textTransform: 'none',
                            color: 'var(--palette-text-secondary)',
                            '&.Mui-selected': {
                                color: 'var(--palette-text-primary)'
                            },
                        }}
                    />
                ))}
            </Tabs>

            <Box sx={{ p: '20px', display: 'flex', alignItems: 'center', gap: 2, borderBottom: `1px dashed var(--palette-background-neutral)` }}>
                <Search
                    placeholder="Tìm theo mã đơn, khách hàng, số điện thoại..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    maxWidth="25rem"
                />
            </Box>

            <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
                <Table sx={{ minWidth: 960 }}>
                    <TableHead sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                        <TableRow>
                            <TableCell padding="checkbox" sx={{ borderBottom: 'none', textAlign: 'center' }}>
                                <Checkbox
                                    indeterminate={selected.length > 0 && selected.length < ticketServiceOrders.length}
                                    checked={ticketServiceOrders.length > 0 && selected.length === ticketServiceOrders.length}
                                    onChange={handleSelectAllClick}
                                    sx={{ color: 'var(--palette-text-disabled)', p: 0 }}
                                />
                            </TableCell>
                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>{t("admin.ticketServiceOrder.fields.code")}</TableCell>
                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>{t("admin.ticketServiceOrder.fields.customer")}</TableCell>
                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>{t("admin.ticketServiceOrder.fields.service")}</TableCell>
                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>{t("admin.ticketServiceOrder.fields.time")}</TableCell>
                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>{t("admin.ticketServiceOrder.fields.total")}</TableCell>
                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }} align="right">{t("admin.ticketServiceOrder.fields.status")}</TableCell>
                            <TableCell sx={{ borderBottom: 'none', width: 80 }} align="right" />
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                                    <CircularProgress size={32} />
                                </TableCell>
                            </TableRow>
                        ) : ticketServiceOrders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                                    <Typography sx={{ color: 'var(--palette-text-secondary)' }}>
                                        {t("admin.common.no_data")}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            ticketServiceOrders.map((row: any) => {
                                const isItemSelected = selected.indexOf(row._id) !== -1;
                                const isOpen = openRows.includes(row._id);

                                return (
                                    <React.Fragment key={row._id}>
                                        <TableRow
                                            hover
                                            selected={isItemSelected}
                                            sx={{
                                                '&:hover': { bgcolor: 'var(--palette-action-hover)' },
                                                ...(isOpen && {
                                                    bgcolor: 'transparent'
                                                }),
                                                transition: 'background-color 0.2s'
                                            }}
                                        >
                                            <TableCell padding="checkbox" sx={{ borderBottom: '1px dashed var(--palette-background-neutral)', textAlign: 'center' }}>
                                                <Checkbox
                                                    checked={isItemSelected}
                                                    onClick={() => handleSelectRow(row._id)}
                                                    sx={{ color: 'var(--palette-text-disabled)', p: 0 }}
                                                />
                                            </TableCell>

                                            <TableCell sx={{ borderBottom: '1px dashed var(--palette-background-neutral)' }}>
                                                <Typography
                                                    onClick={() => handleViewDetail(row._id)}
                                                    sx={{
                                                        fontWeight: 600,
                                                        fontSize: '0.875rem',
                                                        color: 'var(--palette-text-primary)',
                                                        textDecoration: 'underline',
                                                        cursor: 'pointer',
                                                        '&:hover': { color: 'var(--palette-primary-main)' }
                                                    }}
                                                >
                                                    #{row.code?.slice(-6).toUpperCase() || 'N/A'}
                                                </Typography>
                                            </TableCell>

                                            <TableCell sx={{ borderBottom: '1px dashed var(--palette-background-neutral)' }}>
                                                <Stack direction="row" spacing={2} alignItems="center">
                                                    <Avatar
                                                        src={row.userId?.avatar}
                                                        sx={{ width: 40, height: 40, borderRadius: 'var(--shape-borderRadius-sm)' }}
                                                    >
                                                        <Icon icon="eva:person-fill" width={24} />
                                                    </Avatar>
                                                    <Stack spacing={0.25}>
                                                        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                                                            {row.userId?.fullName || 'Khách vãng lai'}
                                                        </Typography>
                                                        <Typography sx={{ color: 'var(--palette-text-secondary)', fontSize: '0.75rem' }}>
                                                            {row.userId?.email || row.userId?.phone || "Không có thông tin"}
                                                        </Typography>
                                                    </Stack>
                                                </Stack>
                                            </TableCell>

                                            <TableCell sx={{ borderBottom: '1px dashed var(--palette-background-neutral)' }}>
                                                <Typography sx={{ fontWeight: 400, fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                                                    {row.ticketServiceId?.name || "Dịch vụ"}
                                                </Typography>
                                            </TableCell>

                                            <TableCell sx={{ borderBottom: '1px dashed var(--palette-background-neutral)' }}>
                                                <Stack spacing={0}>
                                                    {row.originalStart && dayjs(row.originalStart).format("HH:mm") !== dayjs(row.start).format("HH:mm") && (
                                                        <Typography sx={{ color: 'var(--palette-error-main)', fontSize: '10px', textDecoration: 'line-through', fontWeight: 800, opacity: 0.9 }}>
                                                            Gốc: {dayjs(row.originalStart).format("HH:mm")}
                                                        </Typography>
                                                    )}
                                                    <Typography sx={{ fontWeight: 400, fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                                                        {dayjs(row.start).format("DD MMM YYYY")}
                                                    </Typography>
                                                    <Typography sx={{ color: 'var(--palette-text-secondary)', fontSize: '0.75rem' }}>
                                                        {dayjs(row.start).format("h:mm a")}
                                                    </Typography>
                                                </Stack>
                                            </TableCell>


                                            <TableCell sx={{ borderBottom: '1px dashed var(--palette-background-neutral)' }}>
                                                <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(row.total || 0)}
                                                </Typography>
                                            </TableCell>

                                            <TableCell align="right" sx={{ borderBottom: '1px dashed var(--palette-background-neutral)' }}>
                                                {(() => {
                                                    const statusMap: any = {
                                                        pending: { label: t("admin.ticketServiceOrder.status.pending"), color: "var(--palette-warning-dark)", bg: "var(--palette-warning-lighter)" },
                                                        confirmed: { label: t("admin.ticketServiceOrder.status.confirmed"), color: "var(--palette-info-dark)", bg: "var(--palette-info-lighter)" },
                                                        delayed: { label: t("admin.ticketServiceOrder.status.delayed"), color: "var(--palette-error-dark)", bg: "rgba(255, 86, 48, 0.16)" },
                                                        "in-progress": { label: t("admin.ticketServiceOrder.status.in_progress"), color: "var(--palette-primary-dark)", bg: "var(--palette-primary-lighter)" },
                                                        completed: { label: t("admin.ticketServiceOrder.status.completed"), color: "var(--palette-success-dark)", bg: "var(--palette-success-lighter)" },
                                                        cancelled: { label: t("admin.ticketServiceOrder.status.cancelled"), color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
                                                        request_cancel: { label: t("admin.ticketServiceOrder.status.request_cancel"), color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" }
                                                    };
                                                    const status = statusMap[row.ticketServiceOrderStatus] || { label: row.ticketServiceOrderStatus, color: 'var(--palette-text-disabled)', bg: "var(--palette-background-neutral)" };
                                                    return (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                            <Chip
                                                                label={status.label}
                                                                size="small"
                                                                sx={{
                                                                    borderRadius: "var(--shape-borderRadius-sm)",
                                                                    fontWeight: 700,
                                                                    fontSize: '0.6875rem',
                                                                    color: status.color,
                                                                    bgcolor: status.bg,
                                                                    height: '24px'
                                                                }}
                                                            />
                                                            {row.isOverrun && !['completed', 'cancelled'].includes(row.ticketServiceOrderStatus) && (
                                                                <Chip
                                                                    icon={<Icon icon="eva:alert-triangle-fill" />}
                                                                    label={t("admin.common.overrun")}
                                                                    size="small"
                                                                    sx={{
                                                                        ml: 1,
                                                                        borderRadius: "var(--shape-borderRadius-sm)",
                                                                        fontWeight: 700,
                                                                        fontSize: '0.6875rem',
                                                                        color: "var(--palette-error-main)",
                                                                        bgcolor: "rgba(255, 86, 48, 0.16)",
                                                                        height: '24px',
                                                                        '& .MuiChip-icon': { color: 'inherit' }
                                                                    }}
                                                                />
                                                            )}
                                                        </Box>
                                                    );
                                                })()}
                                            </TableCell>

                                            <TableCell align="right" sx={{ borderBottom: '1px dashed var(--palette-background-neutral)', width: 80 }}>
                                                <Stack direction="row" spacing={0} justifyContent="flex-end">
                                                    <IconButton
                                                        onClick={() => toggleRow(row._id)}
                                                        sx={{
                                                            color: 'var(--palette-text-primary)',
                                                            bgcolor: isOpen ? 'var(--palette-action-hover)' : 'transparent',
                                                            '&:hover': {
                                                                bgcolor: 'rgba(var(--palette-action-activeChannel) / var(--palette-action-hoverOpacity))',
                                                            }
                                                        }}
                                                    >
                                                        <Icon icon={isOpen ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'} width={20} />
                                                    </IconButton>

                                                    <IconButton
                                                        onClick={(e) => handleOpenMenu(e, row._id)}
                                                        sx={{
                                                            color: 'var(--palette-text-primary)',
                                                            bgcolor: anchorEl[row._id] ? 'var(--palette-action-hover)' : 'transparent',
                                                            '&:hover': {
                                                                bgcolor: 'rgba(var(--palette-action-activeChannel) / var(--palette-action-hoverOpacity))',
                                                            }
                                                        }}
                                                    >
                                                        <Icon icon="eva:more-vertical-fill" width={20} />
                                                    </IconButton>
                                                </Stack>

                                                <Menu
                                                    anchorEl={anchorEl[row._id]}
                                                    open={Boolean(anchorEl[row._id])}
                                                    onClose={() => handleCloseMenu(row._id)}
                                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                                    slotProps={{
                                                        paper: {
                                                            sx: {
                                                                width: 160,
                                                                boxShadow: 'var(--customShadows-z20)',
                                                                borderRadius: 'var(--shape-borderRadius-md)',
                                                                p: 0.5
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <MenuItem onClick={() => { handleCloseMenu(row._id); handleViewDetail(row._id); }}>
                                                        <Icon icon="eva:eye-fill" width={18} style={{ marginRight: 8 }} />
                                                        Chi tiết
                                                    </MenuItem>

                                                    <MenuItem onClick={() => { handleCloseMenu(row._id); handleEdit(row); }}>
                                                        <Icon icon="solar:pen-bold" width={18} style={{ marginRight: 8 }} />
                                                        Sửa
                                                    </MenuItem>

                                                    {row.ticketServiceOrderStatus === 'pending' && (
                                                        <MenuItem
                                                            onClick={() => { handleCloseMenu(row._id); handleStatusUpdate(row._id, 'confirmed'); }}
                                                            sx={{ color: 'var(--palette-success-main)' }}
                                                        >
                                                            <Icon icon="eva:checkmark-circle-2-fill" width={18} style={{ marginRight: 8 }} />
                                                            Xác nhận
                                                        </MenuItem>
                                                    )}


                                                    {['in-progress'].includes(row.ticketServiceOrderStatus) && (
                                                        <MenuItem
                                                            onClick={() => { handleCloseMenu(row._id); handleStatusUpdate(row._id, 'completed'); }}
                                                            sx={{ color: 'var(--palette-warning-main)' }}
                                                        >
                                                            <Icon icon="solar:card-send-bold" width={18} style={{ marginRight: 8 }} />
                                                            Hoàn thành
                                                        </MenuItem>
                                                    )}

                                                    {['pending', 'confirmed'].includes(row.ticketServiceOrderStatus) && (
                                                        <MenuItem
                                                            onClick={() => { handleCloseMenu(row._id); handleStatusUpdate(row._id, 'cancelled'); }}
                                                            sx={{ color: 'var(--palette-error-main)' }}
                                                        >
                                                            <Icon icon="eva:close-circle-fill" width={18} style={{ marginRight: 8 }} />
                                                            Hủy đơn
                                                        </MenuItem>
                                                    )}
                                                </Menu>
                                            </TableCell>
                                        </TableRow>

                                        <TableRow>
                                            <TableCell colSpan={8} sx={{ p: 0, bgcolor: 'var(--palette-background-neutral)', borderBottom: isOpen ? '1px dashed var(--palette-divider)' : 'none' }}>
                                                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                                    <Box sx={{
                                                        bgcolor: 'var(--palette-background-paper)',
                                                        color: 'var(--palette-text-primary)',
                                                        borderRadius: '8px',
                                                        m: 'calc(1.5 * var(--spacing))',
                                                        overflow: 'hidden',
                                                    }}>
                                                        {row.ticketStaffMap?.map((item: any, idx: number) => {
                                                            const ticket = item.ticketId;
                                                            const ticketType = ticket?.type === 'XSMN' ? 'Miền Nam' : (ticket?.type === 'XSMB' ? 'Miền Bắc' : (ticket?.type === 'XSMT' ? 'Miền Trung' : ''));
                                                            const ticketInfo = `${ticketType}${ticket?.ticketSubtype ? ` - ${ticket.ticketSubtype}` : ''}`;
                                                            const ticketPrice = item.price || (row.total / (row.ticketIds?.length || 1));

                                                            return (
                                                                <Stack
                                                                    key={idx}
                                                                    direction="row"
                                                                    alignItems="center"
                                                                    spacing={"calc(2 * var(--spacing))"}
                                                                    sx={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        padding: 'calc(1.5 * var(--spacing)) calc(2 * var(--spacing)) calc(1.5 * var(--spacing)) calc(1.5 * var(--spacing))',
                                                                        bgcolor: 'var(--palette-background-paper)',
                                                                        '&:not(:last-of-type)': {
                                                                            borderBottom: 'solid 2px var(--palette-background-neutral)'
                                                                        }
                                                                    }}
                                                                >
                                                                    <Avatar
                                                                        src={ticket?.avatar}
                                                                        variant="rounded"
                                                                        sx={{ width: 48, height: 48, bgcolor: 'var(--palette-background-neutral)' }}
                                                                    >
                                                                        <Icon icon="solar:ticket-bold" width={24} />
                                                                    </Avatar>

                                                                    <Box sx={{ flexGrow: 1 }}>
                                                                        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                                                                            {ticket?.name || "Tên vé"}
                                                                            <Box component="span" sx={{ ml: 1, fontWeight: 400, color: 'var(--palette-text-secondary)', fontSize: '0.75rem' }}>
                                                                                ({ticketInfo})
                                                                            </Box>
                                                                        </Typography>
                                                                        <Typography sx={{
                                                                            color: 'var(--palette-text-secondary)',
                                                                            fontSize: '0.875rem',
                                                                            lineHeight: 1.57143
                                                                        }}>
                                                                            {item.staffId?.fullName ? `Phụ trách: ${item.staffId.fullName}` : "Chưa phân công"}
                                                                        </Typography>
                                                                    </Box>

                                                                    <Box sx={{ textAlign: 'right', minWidth: 100 }}>
                                                                        <Typography sx={{ fontWeight: 400, fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                                                                            x1
                                                                        </Typography>
                                                                    </Box>

                                                                    <Box sx={{ textAlign: 'right', minWidth: 120 }}>
                                                                        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                                                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(ticketPrice)}
                                                                        </Typography>
                                                                    </Box>
                                                                </Stack>
                                                            );
                                                        })}
                                                        {(!row.ticketStaffMap || row.ticketStaffMap.length === 0) && (
                                                            <Typography sx={{ color: 'var(--palette-text-secondary)', fontSize: '0.875rem', fontStyle: 'italic', textAlign: 'center', py: 3 }}>
                                                                Chưa có thông tin chi tiết vé
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Collapse>
                                            </TableCell>
                                        </TableRow>
                                    </React.Fragment>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={pagination.totalRecords || 0}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
        </Card >
    );
};




