"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useState, SyntheticEvent } from "react";
import React from 'react';
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
    Checkbox,
    TablePagination,
    Stack,
    Avatar,
    Chip,
} from "@mui/material";
import { Icon } from '@/admin/components/ui/AdminIcon';
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { confirmAction } from "../../../../utils/swal";
import { formatVnd } from '../../../../utils/currency';
import { prefixAdmin } from "../../../../constants/routes";
import { useAdminOrderList, useUpdateOrderStatus } from "../../hooks/useOrder";
import { OrderToolbar } from './OrderToolbar';
import { useSettings } from '../../../../shared/data-grid';
import { useOrderDrawCutoff } from '../../hooks/useOrder';
import { OrderCutoffReminderBanner } from './OrderCutoffReminderBanner';
import { OrderHandoverConfirmDialog } from './OrderHandoverConfirmDialog';
import { OrderStatus } from '../../../../../types/order.type';
import { ORDER_STATUS_TABS } from '../../constants/orderStatus.constants';
import { OrderStatusBadge } from '@/shared/components/StatusBadge';
import {
    AdminRowActionsMenu,
    type AdminRowActionsMenuItem,
} from '../../../../components/ui/AdminRowActionsMenu';

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

export const OrderList = () => {
    const router = useAdminRouter();
    const { settings, setSettings } = useSettings();
    
    const [tabStatus, setTabStatus] = useState('all');
    const [selected, setSelected] = useState<string[]>([]);
    const [openRows, setOpenRows] = useState<string[]>([]);
    const [handoverOrderId, setHandoverOrderId] = useState<string | null>(null);

    const {
        orders,
        pagination,
        statusCounts = {},
        isLoading,
        filters,
        setFilter,
        clearFilters,
        setSearchFilter,
        sortByUI,
        setSortBy,
        setPage,
        setLimit,
        refetch
    } = useAdminOrderList({ status: tabStatus !== 'all' ? tabStatus : undefined } as any);

    const handleTabChange = (_event: SyntheticEvent, newValue: string) => {
        setTabStatus(newValue);
        setFilter('status', newValue === 'all' ? [] : [newValue]);
        setPage(1);
    };

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage + 1);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setLimit(parseInt(event.target.value, 10));
    };

    const { mutate: updateStatus } = useUpdateOrderStatus();

    const handleStatusUpdate = (id: string, status: string) => {
        const update = () => {
            updateStatus({ id, status }, {
                onSuccess: () => toast.success("Cập nhật thành công")
            });
        };

        if (status === 'COMPLETED') {
            setHandoverOrderId(id);
        } else if (status === 'PENDING_PICKUP') {
            confirmAction(
                "Chuyển sang Chờ nhận vé?",
                "Bạn có chắc chắn muốn chuyển trạng thái thành chờ nhận vé?",
                update,
                'info'
            );
        } else {
            update();
        }
    };

    const handleViewDetail = (id: string) => {
        router.push(`/${prefixAdmin}/order/detail/${id}`);
    };

    const getOrderRowMenuItems = (row: { id: string; status: string }): AdminRowActionsMenuItem[] => {
        const items: AdminRowActionsMenuItem[] = [
            {
                id: 'view',
                label: 'Xem chi tiết',
                icon: 'view',
                onClick: () => handleViewDetail(row.id),
            },
        ];

        if (row.status === 'PENDING_PAYMENT') {
            items.push({
                id: 'paid',
                label: 'Đã thu tiền',
                icon: <Icon icon="solar:wallet-money-bold" width={18} />,
                onClick: () => handleStatusUpdate(row.id, 'PAID'),
                sx: { color: 'var(--palette-success-main)' },
            });
        }

        if (row.status === 'PAID') {
            items.push({
                id: 'preparing',
                label: 'Đang chuẩn bị',
                icon: <Icon icon="solar:box-bold" width={18} />,
                onClick: () => handleStatusUpdate(row.id, 'PREPARING'),
                sx: { color: 'var(--palette-info-main)' },
            });
        }

        if (row.status === 'PREPARING') {
            items.push({
                id: 'pending-pickup',
                label: 'Chờ nhận vé',
                icon: <Icon icon="solar:shop-2-bold" width={18} />,
                onClick: () => handleStatusUpdate(row.id, 'PENDING_PICKUP'),
                sx: { color: 'var(--palette-primary-main)' },
            });
        }

        if (row.status === 'PENDING_PICKUP') {
            items.push({
                id: 'completed',
                label: 'Hoàn thành',
                icon: <Icon icon="eva:checkmark-circle-2-fill" width={18} />,
                onClick: () => handleStatusUpdate(row.id, 'COMPLETED'),
                sx: { color: 'var(--palette-success-main)' },
            });
        }

        return items;
    };



    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const newSelected = orders.map((n: any) => n.id);
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

    const safeStatusCounts = statusCounts || {};
    const totalCount = Object.keys(safeStatusCounts)
        .filter(key => key !== 'all')
        .reduce((sum, key) => sum + (Number(safeStatusCounts[key]) || 0), 0);
    safeStatusCounts['all'] = safeStatusCounts['all'] ?? totalCount;

    const preparingCount = Number(safeStatusCounts.PREPARING) || 0;
    const {
        phase: cutoffPhase,
        cutoffLabel,
        shouldHighlightPreparing,
        showReminderBanner,
    } = useOrderDrawCutoff(preparingCount);

    return (
        <>
            <OrderCutoffReminderBanner
                phase={cutoffPhase}
                cutoffLabel={cutoffLabel}
                preparingCount={preparingCount}
                visible={showReminderBanner}
            />
            <Card elevation={0} className="admin-datagrid-card" sx={{ height: 'auto' }}>
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
                {ORDER_STATUS_TABS.map((tab) => {
                    const isPreparingUrgent = tab.value === 'PREPARING' && shouldHighlightPreparing;
                    const urgentColors = cutoffPhase === 'past'
                        ? {
                            color: 'var(--palette-error-dark)',
                            bg: 'var(--palette-error-lighter)',
                            activeColor: 'var(--palette-error-contrastText)',
                            activeBg: 'var(--palette-error-main)',
                        }
                        : {
                            color: 'var(--palette-warning-dark)',
                            bg: 'var(--palette-warning-lighter)',
                            activeColor: 'var(--palette-warning-contrastText)',
                            activeBg: 'var(--palette-warning-main)',
                        };
                    const tabColors = isPreparingUrgent ? { ...tab, ...urgentColors } : tab;

                    return (
                    <Tab
                        key={tab.value}
                        value={tab.value}
                        disableRipple
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography sx={{
                                    fontSize: '0.875rem',
                                    fontWeight: tabStatus === tab.value || isPreparingUrgent ? 700 : 500,
                                    color: tabStatus === tab.value
                                        ? 'var(--palette-text-primary)'
                                        : isPreparingUrgent
                                            ? tabColors.color
                                            : 'inherit'
                                }}>
                                    {tab.label}
                                </Typography>
                                <TabBadge
                                    sx={{
                                        bgcolor: tabStatus === tab.value ? tabColors.activeBg : tabColors.bg,
                                        color: tabStatus === tab.value ? tabColors.activeColor : tabColors.color,
                                        transition: 'all 0.2s ease',
                                        ...(isPreparingUrgent && tabStatus !== tab.value && {
                                            boxShadow: cutoffPhase === 'past'
                                                ? '0 0 0 1px var(--palette-error-main)'
                                                : '0 0 0 1px var(--palette-warning-main)',
                                        }),
                                    }}
                                >
                                    {safeStatusCounts[tab.value] || 0}
                                </TabBadge>
                            </Box>
                        }
                        sx={{
                            minWidth: 0,
                            padding: '0',
                            minHeight: '48px',
                            textTransform: 'none',
                            color: isPreparingUrgent ? tabColors.color : 'var(--palette-text-secondary)',
                            '&.Mui-selected': {
                                color: 'var(--palette-text-primary)'
                            },
                        }}
                    />
                    );
                })}
            </Tabs>

            <Box sx={{ borderBottom: `1px dashed var(--palette-background-neutral)` }}>
                <OrderToolbar
                    settings={settings}
                    onSettingsChange={setSettings as any}
                    filters={filters as any}
                    onFilterChange={setFilter}
                    onClearFilters={clearFilters}
                    onSearchChange={setSearchFilter}
                    sortByUI={sortByUI}
                    onSortChange={setSortBy}
                />
            </Box>

            <TableContainer sx={{ position: 'relative', overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Table sx={{ minWidth: 960 }} size={settings.density === 'compact' ? 'small' : 'medium'}>
                    <TableHead sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                        <TableRow>
                            <TableCell padding="checkbox" sx={{ borderBottom: 'none', textAlign: 'center' }}>
                                <Checkbox
                                    indeterminate={selected.length > 0 && selected.length < orders.length}
                                    checked={orders.length > 0 && selected.length === orders.length}
                                    onChange={handleSelectAllClick}
                                    sx={{ color: 'var(--palette-text-disabled)', p: 0 }}
                                />
                            </TableCell>
                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Mã đơn</TableCell>
                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Khách hàng</TableCell>
                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Loại đơn</TableCell>
                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Ngày tạo</TableCell>
                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Tổng tiền</TableCell>
                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }} align="right">Trạng thái</TableCell>
                            <TableCell sx={{ borderBottom: 'none', width: 80 }} align="right" />
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ borderBottom: 'none', py: 10 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
                                        <CircularProgress size={32} />
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : orders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ borderBottom: 'none', py: 10 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
                                        <span className="admin-datagrid-empty">Không có dữ liệu</span>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : (
                            orders.map((row: any) => {
                                const isItemSelected = selected.indexOf(row.id) !== -1;
                                const isOpen = openRows.includes(row.id);
                                const isPreparingUrgentRow =
                                    shouldHighlightPreparing && row.status === 'PREPARING';

                                return (
                                    <React.Fragment key={row.id}>
                                        <TableRow
                                            hover
                                            selected={isItemSelected}
                                            sx={{
                                                '&:hover': { bgcolor: 'var(--palette-action-hover)' },
                                                ...(isOpen && {
                                                    bgcolor: 'transparent'
                                                }),
                                                ...(isPreparingUrgentRow && {
                                                    bgcolor: cutoffPhase === 'past'
                                                        ? 'rgba(var(--palette-error-mainChannel) / 0.08)'
                                                        : 'rgba(var(--palette-warning-mainChannel) / 0.10)',
                                                    boxShadow: cutoffPhase === 'past'
                                                        ? 'inset 3px 0 0 var(--palette-error-main)'
                                                        : 'inset 3px 0 0 var(--palette-warning-main)',
                                                    '&:hover': {
                                                        bgcolor: cutoffPhase === 'past'
                                                            ? 'rgba(var(--palette-error-mainChannel) / 0.12)'
                                                            : 'rgba(var(--palette-warning-mainChannel) / 0.16)',
                                                    },
                                                }),
                                                transition: 'background-color 0.2s'
                                            }}
                                        >
                                            <TableCell padding="checkbox" sx={{ borderBottom: '1px dashed var(--palette-background-neutral)', textAlign: 'center' }}>
                                                <Checkbox
                                                    checked={isItemSelected}
                                                    onClick={() => handleSelectRow(row.id)}
                                                    sx={{ color: 'var(--palette-text-disabled)', p: 0 }}
                                                />
                                            </TableCell>

                                            <TableCell sx={{ borderBottom: '1px dashed var(--palette-background-neutral)' }}>
                                                <Typography
                                                    onClick={() => handleViewDetail(row.id)}
                                                    sx={{
                                                        fontWeight: 600,
                                                        fontSize: '0.875rem',
                                                        color: 'var(--palette-text-primary)',
                                                        textDecoration: 'underline',
                                                        cursor: 'pointer',
                                                        '&:hover': { color: 'var(--palette-primary-main)' }
                                                    }}
                                                >
                                                    #{row.orderCode || 'N/A'}
                                                </Typography>
                                            </TableCell>

                                            <TableCell sx={{ borderBottom: '1px dashed var(--palette-background-neutral)' }}>
                                                <Stack direction="row" spacing={2} alignItems="center">
                                                    <Avatar
                                                        src={row.user?.avatar || ""}
                                                        sx={{ width: 40, height: 40, borderRadius: 'var(--shape-borderRadius-sm)' }}
                                                    >
                                                        <Icon icon="eva:person-fill" width={24} />
                                                    </Avatar>
                                                    <Stack spacing={0.25}>
                                                        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                                                            {row.name || row.user?.fullName || 'Khách vãng lai'}
                                                        </Typography>
                                                        <Typography sx={{ color: 'var(--palette-text-secondary)', fontSize: '0.75rem' }}>
                                                            {row.phone || row.user?.phone || row.user?.email || "Không có thông tin"}
                                                        </Typography>
                                                    </Stack>
                                                </Stack>
                                            </TableCell>

                                            <TableCell sx={{ borderBottom: '1px dashed var(--palette-background-neutral)' }}>
                                                {(() => {
                                                    const typeMap: any = {
                                                        'ONLINE': { label: 'Online', color: 'var(--palette-info-dark)', bg: 'var(--palette-info-lighter)' },
                                                        'DIRECT': { label: 'Tại quầy', color: 'var(--palette-warning-dark)', bg: 'var(--palette-warning-lighter)' }
                                                    };
                                                    const tInfo = typeMap[row.orderType] || { label: row.orderType, color: 'var(--palette-text-disabled)', bg: 'var(--palette-background-neutral)' };
                                                    return (
                                                        <Chip
                                                            label={tInfo.label}
                                                            size="small"
                                                            sx={{
                                                                borderRadius: "var(--shape-borderRadius-sm)",
                                                                fontWeight: 700,
                                                                fontSize: '0.6875rem',
                                                                color: tInfo.color,
                                                                bgcolor: tInfo.bg,
                                                                height: '24px'
                                                            }}
                                                        />
                                                    );
                                                })()}
                                            </TableCell>

                                            <TableCell sx={{ borderBottom: '1px dashed var(--palette-background-neutral)' }}>
                                                <Stack spacing={0}>
                                                    <Typography sx={{ fontWeight: 400, fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                                                        {dayjs(row.createdAt).format("DD MMM YYYY")}
                                                    </Typography>
                                                    <Typography sx={{ color: 'var(--palette-text-secondary)', fontSize: '0.75rem' }}>
                                                        {dayjs(row.createdAt).format("h:mm a")}
                                                    </Typography>
                                                </Stack>
                                            </TableCell>


                                            <TableCell sx={{ borderBottom: '1px dashed var(--palette-background-neutral)' }}>
                                                <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                                                    {formatVnd(row.totalAmount || 0)}
                                                </Typography>
                                            </TableCell>

                                            <TableCell align="right" sx={{ borderBottom: '1px dashed var(--palette-background-neutral)' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                    <OrderStatusBadge status={row.status} />
                                                </Box>
                                            </TableCell>

                                            <TableCell align="right" sx={{ borderBottom: '1px dashed var(--palette-background-neutral)', width: 80 }}>
                                                <Stack direction="row" spacing={0} justifyContent="flex-end">
                                                    <AdminRowActionsMenu
                                                        items={getOrderRowMenuItems(row)}
                                                        minWidth={160}
                                                    />
                                                </Stack>
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
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={pagination?.totalRecords || 0}
                rowsPerPage={(filters as { limit?: number }).limit || filters.size || 10}
                page={(filters.page || 1) - 1}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
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

            <OrderHandoverConfirmDialog
                open={Boolean(handoverOrderId)}
                onClose={() => setHandoverOrderId(null)}
                onConfirm={() => {
                    if (!handoverOrderId) return;
                    updateStatus(
                        { id: handoverOrderId, status: OrderStatus.COMPLETED },
                        { onSuccess: () => toast.success("Cập nhật thành công") }
                    );
                }}
            />
        </>
    );
};
