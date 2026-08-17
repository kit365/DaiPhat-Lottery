"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useRouteParams } from "@/hooks/useRouteParams";
import React from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogContent,
    FormControl,
    IconButton,
    MenuItem,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { SpinnerLoading } from '../../../../../components/ui/SpinnerLoading';
import { AdminStatusBadge } from '../../../../../components/ui/AdminStatusBadge';
import { Search } from '../../../../../components/ui/Search';
import { prefixAdmin, ROUTES } from '../../../../../constants/routes';
import { QUERY_KEYS } from '../../../inventory/constants/queryKeys';
import { QUERY_KEYS as IMPORT_BATCH_QUERY_KEYS } from '../../constants/queryKeys';
import { getTicketStatusLabel, normalizeTicketStatus } from '../../../inventory/constants/ticket-status.config';
import { useStations } from '../../../../station/hooks/useStation';
import { LazyReportSerialFaultPane } from '../sections/LazyReportSerialFaultPane';
import { TicketImportProgressTrack } from '../sections/TicketImportProgressTrack';
import { ImportBatchLineImportHost } from '../../../inventory/components/sections/ImportBatchLineImportHost';
import { useImportBatchDetail, useImportBatchLineEntryTickets } from '../../hooks/useImportBatch';
import { useImportBatchIntakeGate } from '../../hooks/useImportBatchIntakeGate';
import { useActiveSuppliers } from '../../../../supplier';
import { CanAccess } from '../../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../../constants/permission.constants';
import { Button as LoadingButton } from '../../../../../components/ui/Button';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import {
    displayImportBatchLineCodeRaw,
    formatImportBatchHeaderCode,
    importBatchCodeMonospaceSx,
} from '../../utils/importBatchCode';
import { formatVnd } from '../../utils/importCostCalculator';
import {
    getBatchTypeBadgeClass,
    getBatchTypeLabel,
    getImportBatchLineStatusBadgeClass,
    getImportBatchLineStatusLabel,
} from '../../utils/batchTypeLabels';
import {
    buildCancelFlowStatusFilterOptions,
    getCancelFlowTicketStatusLabel,
    isTicketSelectableForCancel,
    matchesCancelFlowSerialFilter,
    matchesCancelFlowStatusFilter,
} from '../../utils/cancelTicketSelection';
import { isSerialIncidentEligible } from '../../utils/serialIncidentWorkflow';
import { isLineIncomplete, isLinePaused } from '../../utils/importBatchProgress';
import { AdminLuckyDisplay } from '@/shared/lucky-number';

const asSerials = (serials: unknown): any[] =>
    (Array.isArray(serials) ? serials : []).filter((serial) => {
        const condition = String(serial?.ticketCondition || '').toUpperCase();
        return condition !== 'VOIDED';
    });

const ticketNumberSx = {
    fontWeight: 700,
    fontSize: '0.875rem',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.04em',
    color: 'var(--palette-text-primary)',
} as const;

const LineDetailInfoItem = ({
    label,
    value,
    monospace,
}: {
    label: string;
    value: string;
    monospace?: boolean;
}) => (
    <Box>
        <Typography className="admin-form-label" display="block" sx={{ mb: 0.5 }}>
            {label}
        </Typography>
        <Typography
            variant="body1"
            fontWeight={700}
            color="text.primary"
            sx={monospace ? importBatchCodeMonospaceSx : undefined}
        >
            {value}
        </Typography>
    </Box>
);

const getTicketStatusBadgeClass = (status?: string | null): string => {
    const normalized = normalizeTicketStatus(status);
    switch (normalized) {
        case 'IN_STOCK':
            return 'admin-status-badge--active';
        case 'IMPORTING':
            return 'admin-status-badge--pending';
        case 'SOLD_OUT':
        case 'EXPIRED':
            return 'admin-status-badge--inactive';
        case 'SOLD':
            return 'admin-status-badge--success';
        case 'RESERVED':
        case 'PROXY_HOLDING':
            return 'admin-status-badge--pending';
        case 'DAMAGED':
        case 'LOST':
        case 'VOIDED':
            return 'admin-status-badge--inactive';
        default:
            return 'admin-status-badge--draft';
    }
};

const getTicketConditionBadge = (condition?: string | null) => {
    const normalized = String(condition || 'GOOD').toUpperCase();
    if (normalized === 'GOOD') {
        return { className: 'admin-status-badge--success', label: 'Tốt' };
    }
    if (normalized === 'DAMAGED') {
        return { className: 'admin-status-badge--inactive', label: 'Hỏng' };
    }
    if (normalized === 'LOST') {
        return { className: 'admin-status-badge--inactive', label: 'Thất lạc' };
    }
    if (normalized === 'VOIDED') {
        return { className: 'admin-status-badge--inactive', label: 'Đã hủy' };
    }
    return { className: 'admin-status-badge--pending', label: condition || '—' };
};

const getSerialDisplayBadge = (serial: {
    status?: string | null;
    statusDisplayName?: string | null;
    ticketCondition?: string | null;
    ticketConditionDisplayName?: string | null;
}) => {
    const condition = String(serial.ticketCondition || '').toUpperCase();
    if (condition === 'DAMAGED' || condition === 'LOST' || condition === 'VOIDED') {
        return {
            className: getTicketStatusBadgeClass(condition),
            label:
                serial.ticketConditionDisplayName ||
                (condition === 'DAMAGED' ? 'Hỏng' : condition === 'LOST' ? 'Thất lạc' : 'Đã hủy'),
        };
    }
    return {
        className: getTicketStatusBadgeClass(serial.status),
        label: serial.statusDisplayName || getTicketStatusLabel(serial.status) || serial.status || '—',
    };
};

type CollapsibleRowProps = {
    ticket: any;
    index: number;
    cancelMode: 'NONE' | 'TICKET' | 'SERIAL';
    selectedSerials: any[];
    onSelectTicket: (ticket: any, checked: boolean) => void;
    onSelectSerial: (ticket: any, serial: any, checked: boolean) => void;
};

const CollapsibleRow = ({
    ticket,
    index,
    cancelMode,
    selectedSerials,
    onSelectTicket,
    onSelectSerial,
}: CollapsibleRowProps) => {
    const [open, setOpen] = React.useState(false);
    const ticketSelectable = isTicketSelectableForCancel(ticket.status);
    const statusLabel = getCancelFlowTicketStatusLabel(
        ticket.status,
        ticket.statusDisplayName || getTicketStatusLabel(ticket.status)
    );
    const conditionBadge = getTicketConditionBadge(ticket.ticketCondition);

    const ticketSerials = asSerials(ticket.serials);
    const cancelableSerials = React.useMemo(() => {
        if (!ticketSelectable) {
            return [];
        }
        return ticketSerials.filter((serial: any) => isSerialIncidentEligible(serial));
    }, [ticketSerials, ticketSelectable]);

    const cancelableCount = cancelableSerials.length;
    const selectedCount = React.useMemo(
        () =>
            cancelableSerials.filter((serial: any) =>
                selectedSerials.some((item) => String(item.id) === String(serial.id))
            ).length,
        [cancelableSerials, selectedSerials]
    );

    const isTicketChecked = cancelableCount > 0 && selectedCount === cancelableCount;
    const isTicketIndeterminate = selectedCount > 0 && selectedCount < cancelableCount;

    const toggleOpen = () => setOpen((prev) => !prev);

    return (
        <React.Fragment>
            <TableRow hover className={open ? 'admin-table-row-expanded' : undefined}>
                <TableCell sx={{ width: 40 }}>
                    <IconButton aria-label="Mở rộng dòng" size="small" onClick={toggleOpen}>
                        {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                    </IconButton>
                </TableCell>
                <TableCell align="center" sx={{ width: 48 }}>
                    <Checkbox
                        size="small"
                        disabled={!ticketSelectable || cancelableCount === 0}
                        checked={isTicketChecked}
                        indeterminate={isTicketIndeterminate}
                        onChange={(event) => onSelectTicket(ticket, event.target.checked)}
                        sx={{ color: 'var(--palette-text-disabled)', p: 0 }}
                    />
                </TableCell>
                <TableCell align="center" onClick={toggleOpen}>
                    <span className="admin-cell-text">{index + 1}</span>
                </TableCell>
                <TableCell onClick={toggleOpen}>
                    <AdminLuckyDisplay
                        value={ticket.numbers}
                        ticket
                        sx={{ fontWeight: 700 }}
                    />
                </TableCell>
                <TableCell onClick={toggleOpen}>
                    <span className="admin-cell-text">
                        {ticketSerials.length ? `${ticketSerials.length} sê-ri` : '—'}
                    </span>
                </TableCell>
                <TableCell align="center" onClick={toggleOpen}>
                    <AdminStatusBadge label={statusLabel} modifier={getTicketStatusBadgeClass(ticket.status)} />
                </TableCell>
                <TableCell align="center" onClick={toggleOpen}>
                    <AdminStatusBadge label={conditionBadge.label} modifier={conditionBadge.className} />
                </TableCell>
                <TableCell align="center" onClick={toggleOpen}>
                    <span className="admin-cell-text">
                        {formatVnd(ticket.priceSnapshot || 10000)}
                    </span>
                </TableCell>
                <TableCell align="center" onClick={toggleOpen}>
                    <span className="admin-cell-title">
                        {formatVnd(ticket.importCostSnapshot || ticket.priceSnapshot || 10000)}
                    </span>
                </TableCell>
            </TableRow>

            {open && ticketSerials.length > 0
                ? ticketSerials.map((serial: any, serialIndex: number) => {
                      const serialBadge = getSerialDisplayBadge(serial);
                      const serialCondition = getTicketConditionBadge(serial.ticketCondition);
                      const isSerialChecked = selectedSerials.some(
                          (item) => String(item.id) === String(serial.id)
                      );

                      const handleSerialToggle = () => {
                          if (cancelMode === 'SERIAL') {
                              onSelectSerial(ticket, serial, !isSerialChecked);
                          }
                      };

                      return (
                          <TableRow
                              key={serial.id}
                              hover
                              sx={{ bgcolor: 'var(--palette-background-neutral)' }}
                          >
                              <TableCell sx={{ width: 40 }} />
                              <TableCell align="center" sx={{ width: 48 }}>
                                  <Checkbox
                                      size="small"
                                      checked={isSerialChecked}
                                      disabled={!ticketSelectable || !isSerialIncidentEligible(serial)}
                                      onChange={(event) =>
                                          onSelectSerial(ticket, serial, event.target.checked)
                                      }
                                      sx={{ color: 'var(--palette-text-disabled)', p: 0 }}
                                  />
                              </TableCell>
                              <TableCell align="center" onClick={handleSerialToggle}>
                                  <span className="admin-cell-text">{`${index + 1}.${serialIndex + 1}`}</span>
                              </TableCell>
                              <TableCell onClick={handleSerialToggle}>
                                  <AdminLuckyDisplay
                                      value={ticket.numbers}
                                      ticket
                                      sx={{ fontWeight: 600, fontSize: '0.875rem' }}
                                  />
                              </TableCell>
                              <TableCell onClick={handleSerialToggle}>
                                  <Typography className="admin-cell-title" sx={ticketNumberSx}>
                                      {serial.serialNumber}
                                  </Typography>
                              </TableCell>
                              <TableCell align="center" onClick={handleSerialToggle}>
                                  <AdminStatusBadge
                                      label={serialBadge.label}
                                      modifier={serialBadge.className}
                                  />
                              </TableCell>
                              <TableCell align="center" onClick={handleSerialToggle}>
                                  <AdminStatusBadge
                                      label={serialCondition.label}
                                      modifier={serialCondition.className}
                                  />
                              </TableCell>
                              <TableCell align="center" onClick={handleSerialToggle}>
                                  <span className="admin-cell-text">
                                      {formatVnd(serial.ticketPrice ?? ticket.priceSnapshot ?? 10000)}
                                  </span>
                              </TableCell>
                              <TableCell align="center" onClick={handleSerialToggle}>
                                  <span className="admin-cell-title">
                                      {formatVnd(
                                          serial.importCost ??
                                              ticket.importCostSnapshot ??
                                              ticket.priceSnapshot ??
                                              10000
                                      )}
                                  </span>
                              </TableCell>
                          </TableRow>
                      );
                  })
                : open ? (
                      <TableRow sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                          <TableCell sx={{ width: 40 }} />
                          <TableCell sx={{ width: 48 }} />
                          <TableCell colSpan={7}>
                              <span className="admin-cell-text">Không có số sê-ri nào được gán</span>
                          </TableCell>
                      </TableRow>
                  ) : null}
        </React.Fragment>
    );
};

type ImportBatchLineDetailPageProps = {
    id?: string;
    lineId?: string;
};

export const ImportBatchLineDetailPage = ({
    id: idProp,
    lineId: lineIdProp,
}: ImportBatchLineDetailPageProps = {}) => {
    const routeParams = useRouteParams<{ id?: string; lineId?: string }>();
    const id = idProp || routeParams.id;
    const lineId = lineIdProp || routeParams.lineId;
    const router = useAdminRouter();
    const queryClient = useQueryClient();

    const { data: batch, isLoading: isBatchLoading, refetch: refetchBatch } = useImportBatchDetail(id);
    const { data: providersRes } = useStations({ limit: 1000 });
    const { data: activeSuppliers = [] } = useActiveSuppliers();
    const { evaluate: evaluateIntake } = useImportBatchIntakeGate();
    const providers = (providersRes as any)?.data?.recordList || [];

    const resolveStationName = (stationId: number) =>
        providers.find((provider: any) => String(provider.id || provider._id) === String(stationId))?.name ||
        `Đài #${stationId}`;

    const line = batch?.lines?.find((item) => String(item.id) === String(lineId));

    const { data: entryTickets, isLoading: isTicketsLoading } = useImportBatchLineEntryTickets(id, lineId);
    const tickets = React.useMemo(
        () =>
            (entryTickets?.tickets ?? []).map((ticket) => {
                const serials = asSerials(ticket.serials);
                return {
                    ...ticket,
                    serials,
                    quantity: serials.length,
                };
            }),
        [entryTickets]
    );

    const [selectedSerials, setSelectedSerials] = React.useState<any[]>([]);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('ALL');
    const [quantityFilter, setQuantityFilter] = React.useState('ALL');
    const [isReportDialogOpen, setIsReportDialogOpen] = React.useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
    const dialogCancelMode: 'TICKET' | 'SERIAL' = 'TICKET';
    const autoOpenedImportRef = React.useRef(false);

    const availableStatusFilterOptions = React.useMemo(
        () => buildCancelFlowStatusFilterOptions(tickets || []),
        [tickets]
    );

    React.useEffect(() => {
        if (
            statusFilter !== 'ALL' &&
            !availableStatusFilterOptions.some((option) => option.value === statusFilter)
        ) {
            setStatusFilter('ALL');
        }
    }, [availableStatusFilterOptions, statusFilter]);

    const filteredTickets = React.useMemo(() => {
        return (tickets || []).filter((ticket: any) => {
            if (searchQuery.trim()) {
                const query = searchQuery.trim().toLowerCase();
                const matchNumbers = (ticket.numbers || '').toLowerCase().includes(query);
                const matchSerials = asSerials(ticket.serials).some((serial: any) =>
                    (serial.serialNumber || '').toLowerCase().includes(query)
                );
                if (!matchNumbers && !matchSerials) {
                    return false;
                }
            }

            if (statusFilter !== 'ALL') {
                const ticketStatusMatch = matchesCancelFlowStatusFilter(ticket.status, statusFilter);
                const serialStatusMatch = asSerials(ticket.serials).some((serial: any) =>
                    matchesCancelFlowSerialFilter(serial, statusFilter)
                );
                if (!ticketStatusMatch && !serialStatusMatch) {
                    return false;
                }
            }

            const quantity = ticket.quantity || asSerials(ticket.serials).length || 0;
            if (quantityFilter === '10' && quantity !== 10) return false;
            if (quantityFilter === 'LESS_10' && (quantity >= 10 || quantity === 0)) return false;
            if (quantityFilter === 'ZERO' && quantity !== 0) return false;

            return true;
        });
    }, [tickets, searchQuery, statusFilter, quantityFilter]);

    const cancelableSerials = React.useMemo(() => {
        const list: any[] = [];
        filteredTickets.forEach((ticket: any) => {
            if (!isTicketSelectableForCancel(ticket.status)) {
                return;
            }
            asSerials(ticket.serials).forEach((serial: any) => {
                if (!isSerialIncidentEligible(serial)) {
                    return;
                }
                list.push({
                    id: serial.id,
                    serialNumber: serial.serialNumber,
                    status: serial.status,
                    ticketCondition: serial.ticketCondition,
                    returnBatchLineId: serial.returnBatchLineId,
                    ticketId: ticket.id,
                    ticketNumbers: ticket.numbers,
                    ticketStatus: ticket.status,
                    reservedByOrderId: serial.reservedByOrderId,
                });
            });
        });
        return list;
    }, [filteredTickets]);

    const totalCancelableSerialsCount = cancelableSerials.length;

    const handleSelectAll = (checked: boolean) => {
        setSelectedSerials(checked ? cancelableSerials : []);
    };

    const handleSelectTicket = (ticket: any, checked: boolean) => {
        if (!isTicketSelectableForCancel(ticket.status)) {
            return;
        }
        const ticketSerialIds = asSerials(ticket.serials)
            .filter((serial: any) => isSerialIncidentEligible(serial))
            .map((serial: any) => String(serial.id));

        if (checked) {
            const cancelableOfTicket = asSerials(ticket.serials)
                .filter((serial: any) => isSerialIncidentEligible(serial))
                .map((serial: any) => ({
                    id: serial.id,
                    serialNumber: serial.serialNumber,
                    status: serial.status,
                    ticketCondition: serial.ticketCondition,
                    returnBatchLineId: serial.returnBatchLineId,
                    ticketId: ticket.id,
                    ticketNumbers: ticket.numbers,
                    reservedByOrderId: serial.reservedByOrderId,
                }));

            setSelectedSerials((prev) => {
                const filtered = prev.filter((item) => !ticketSerialIds.includes(String(item.id)));
                return [...filtered, ...cancelableOfTicket];
            });
            return;
        }

        setSelectedSerials((prev) => prev.filter((item) => !ticketSerialIds.includes(String(item.id))));
    };

    const handleSelectSerial = (ticket: any, serial: any, checked: boolean) => {
        if (!isTicketSelectableForCancel(ticket.status) || !isSerialIncidentEligible(serial)) {
            return;
        }
        if (checked) {
            setSelectedSerials((prev) => {
                if (prev.some((item) => String(item.id) === String(serial.id))) {
                    return prev;
                }
                return [
                    ...prev,
                    {
                        id: serial.id,
                        serialNumber: serial.serialNumber,
                        status: serial.status,
                        ticketCondition: serial.ticketCondition,
                        returnBatchLineId: serial.returnBatchLineId,
                        ticketId: ticket.id,
                        ticketNumbers: ticket.numbers,
                        reservedByOrderId: serial.reservedByOrderId,
                    },
                ];
            });
            return;
        }
        setSelectedSerials((prev) => prev.filter((item) => String(item.id) !== String(serial.id)));
    };

    const handleReportSuccess = () => {
        setIsReportDialogOpen(false);
        setSelectedSerials([]);
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TICKETS] });
        queryClient.invalidateQueries({ queryKey: [IMPORT_BATCH_QUERY_KEYS.IMPORT_BATCH_LINE_ENTRY_TICKETS] });
        queryClient.invalidateQueries({ queryKey: [IMPORT_BATCH_QUERY_KEYS.IMPORT_BATCH_DETAIL] });
    };

    const intakeGate = React.useMemo(() => {
        if (!batch?.supplierId || !batch.drawDate) {
            return null;
        }
        const supplier = activeSuppliers.find((entry) => entry.id === batch.supplierId);
        return evaluateIntake(supplier, batch.drawDate);
    }, [activeSuppliers, batch, evaluateIntake]);

    const showImportTicketsButton =
        !!line && isLineIncomplete(line) && !isLinePaused(line);
    const importTicketsBlocked = !!intakeGate?.blocked || !!intakeGate?.notYetAllowed;
    const canImportTickets = showImportTicketsButton && !importTicketsBlocked;

    React.useEffect(() => {
        if (autoOpenedImportRef.current || !canImportTickets || isTicketsLoading) {
            return;
        }
        // Empty incomplete line: open entry dialog so "Nhập vé" is not a dead-end detail page.
        if ((tickets?.length ?? 0) === 0 && (line?.totalQuantity ?? 0) === 0) {
            autoOpenedImportRef.current = true;
            setIsImportDialogOpen(true);
        }
    }, [canImportTickets, isTicketsLoading, tickets?.length, line?.totalQuantity]);

    if (isBatchLoading || !line || !batch) {
        return (
            <Box className="admin-page">
                <PageHeader
                    title="Chi tiết lô nhập"
                    breadcrumbItems={[
                        { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                        { label: 'Nhập lô vé', to: ROUTES.ADMIN.IMPORT_BATCH.LIST },
                        { label: id ? `Phiếu #${id}` : 'Chi tiết' },
                    ]}
                />
                <SpinnerLoading />
            </Box>
        );
    }

    const stationName = resolveStationName(line.lotteryStationId);
    const batchCodeLabel = formatImportBatchHeaderCode(batch.batchCode, batch.id);
    const lineCodeRaw = displayImportBatchLineCodeRaw(line.batchCode);
    const firstSelected = selectedSerials[0];

    return (
        <Box className="admin-page">
            <PageHeader
                title="Chi tiết lô nhập"
                breadcrumbItems={[
                    { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                    { label: 'Nhập lô vé', to: ROUTES.ADMIN.IMPORT_BATCH.LIST },
                    {
                        label: batchCodeLabel,
                        to: id ? ROUTES.ADMIN.IMPORT_BATCH.DETAIL(id) : undefined,
                    },
                    { label: stationName },
                ]}
                titleExtra={
                    <>
                        <AdminStatusBadge
                            label={getImportBatchLineStatusLabel(line.status)}
                            modifier={getImportBatchLineStatusBadgeClass(line.status)}
                        />
                        <AdminStatusBadge
                            label={getBatchTypeLabel(line.batchType)}
                            modifier={getBatchTypeBadgeClass(line.batchType)}
                        />
                    </>
                }
                description={
                    <>
                        <Box
                            className="admin-ticket-create-meta"
                            sx={{
                                gridTemplateColumns: {
                                    xs: '1fr',
                                    sm: 'repeat(2, minmax(0, 1fr))',
                                    md: 'repeat(4, minmax(0, 1fr))',
                                },
                                mb: 1.5,
                            }}
                        >
                            <LineDetailInfoItem label="Mã lô" value={lineCodeRaw || '—'} monospace />
                            <LineDetailInfoItem
                                label="Ngày quay"
                                value={batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                            />
                            <LineDetailInfoItem
                                label="SL đã nhập / khai báo"
                                value={`${(line.totalQuantity ?? 0).toLocaleString('vi-VN')} / ${(line.declareQuantity ?? 0).toLocaleString('vi-VN')} vé`}
                            />
                            <LineDetailInfoItem
                                label="Giá vốn"
                                value={formatVnd(line.importCost)}
                            />
                        </Box>

                        <Box sx={{ maxWidth: 360 }}>
                            <TicketImportProgressTrack
                                imported={line.totalQuantity ?? 0}
                                declared={line.declareQuantity ?? 0}
                                ariaLabel={`Tiến độ nhập vé ${stationName}`}
                            />
                        </Box>
                    </>
                }
                action={
                    <Stack direction="row" spacing={1}>
                        {showImportTicketsButton && (
                            <CanAccess permission={PERMISSIONS.TICKET.CREATE}>
                                <Tooltip
                                    title={
                                        importTicketsBlocked
                                            ? intakeGate?.tooltipTitle ?? 'Không thể nhập vé lúc này.'
                                            : ''
                                    }
                                >
                                    <span>
                                        <LoadingButton
                                            variant="contained"
                                            className="btn-primary-admin"
                                            label="Nhập vé"
                                            disabled={importTicketsBlocked}
                                            startIcon={<ConfirmationNumberOutlinedIcon />}
                                            onClick={() => setIsImportDialogOpen(true)}
                                        />
                                    </span>
                                </Tooltip>
                            </CanAccess>
                        )}
                        <Button
                            variant="outlined"
                            className="btn-outlined-admin"
                            onClick={() => id && router.push(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(id))}
                        >
                            Quay lại phiếu
                        </Button>
                    </Stack>
                }
            />

            {(intakeGate?.blocked || intakeGate?.notYetAllowed) && (
                <Alert severity={intakeGate.blocked ? 'error' : 'warning'} sx={{ mb: 2 }}>
                    {intakeGate.message}
                </Alert>
            )}

            <Card elevation={0} className="admin-datagrid-card">
                <Box
                    sx={{
                        px: 2.5,
                        py: 1.5,
                        borderBottom: '1px dashed var(--palette-background-neutral)',
                    }}
                >
                    <Stack
                        direction={{ xs: 'column', lg: 'row' }}
                        alignItems={{ xs: 'stretch', lg: 'center' }}
                        justifyContent="space-between"
                        spacing={1.5}
                    >
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.25}
                            alignItems={{ xs: 'stretch', sm: 'center' }}
                            sx={{ flex: 1, minWidth: 0 }}
                        >
                            <Search
                                maxWidth={360}
                                placeholder="Tìm theo dãy số hoặc số sê-ri..."
                                value={searchQuery}
                                onChange={setSearchQuery}
                            />
                            <FormControl size="small" sx={{ minWidth: 175 }}>
                                <Select
                                    value={statusFilter}
                                    onChange={(event) => setStatusFilter(event.target.value)}
                                    displayEmpty
                                >
                                    <MenuItem value="ALL">Tất cả trạng thái</MenuItem>
                                    {availableStatusFilterOptions.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 155 }}>
                                <Select
                                    value={quantityFilter}
                                    onChange={(event) => setQuantityFilter(event.target.value)}
                                    displayEmpty
                                >
                                    <MenuItem value="ALL">Tất cả số lượng</MenuItem>
                                    <MenuItem value="10">Đủ 10 vé</MenuItem>
                                    <MenuItem value="LESS_10">Dưới 10 vé</MenuItem>
                                    <MenuItem value="ZERO">0 vé</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>

                        <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<ReportProblemIcon />}
                            disabled={selectedSerials.length === 0}
                            onClick={() => setIsReportDialogOpen(true)}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                borderRadius: '8px',
                                whiteSpace: 'nowrap',
                                alignSelf: { xs: 'stretch', lg: 'center' },
                            }}
                        >
                            Tiến hành hủy vé
                            {selectedSerials.length > 0 ? ` (${selectedSerials.length})` : ''}
                        </Button>
                    </Stack>
                </Box>

                <TableContainer className="admin-table-container">
                    <Table className="admin-table" sx={{ minWidth: 960 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: 40 }} />
                                <TableCell align="center" sx={{ width: 48 }}>
                                    <Checkbox
                                        indeterminate={
                                            selectedSerials.length > 0 &&
                                            selectedSerials.length < totalCancelableSerialsCount
                                        }
                                        checked={
                                            totalCancelableSerialsCount > 0 &&
                                            selectedSerials.length === totalCancelableSerialsCount
                                        }
                                        onChange={(event) => handleSelectAll(event.target.checked)}
                                        size="small"
                                        sx={{ color: 'var(--palette-text-disabled)', p: 0 }}
                                    />
                                </TableCell>
                                <TableCell align="center" sx={{ width: 56 }}>
                                    STT
                                </TableCell>
                                <TableCell>Dãy số</TableCell>
                                <TableCell>Sê-ri</TableCell>
                                <TableCell align="center">Trạng thái</TableCell>
                                <TableCell align="center">Tình trạng vé</TableCell>
                                <TableCell align="center">Giá bán</TableCell>
                                <TableCell align="center">Giá vốn</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isTicketsLoading ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                                        <CircularProgress size={32} />
                                    </TableCell>
                                </TableRow>
                            ) : filteredTickets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                                        <span className="admin-datagrid-empty">
                                            Không có vé số nào phù hợp với bộ lọc tìm kiếm.
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTickets.map((ticket: any, index: number) => (
                                    <CollapsibleRow
                                        key={ticket.id}
                                        ticket={ticket}
                                        index={index}
                                        cancelMode={dialogCancelMode}
                                        selectedSerials={selectedSerials}
                                        onSelectTicket={handleSelectTicket}
                                        onSelectSerial={handleSelectSerial}
                                    />
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            {isReportDialogOpen && (
            <Dialog
                open
                onClose={() => setIsReportDialogOpen(false)}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    className: 'admin-theme',
                    sx: {
                        borderRadius: '16px',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    },
                }}
            >
                <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <LazyReportSerialFaultPane
                        serials={selectedSerials}
                        ticketNumbers={firstSelected ? firstSelected.ticketNumbers : ''}
                        ticketId={firstSelected ? firstSelected.ticketId : undefined}
                        importBatchLineId={line.id}
                        stationId={line.lotteryStationId}
                        drawDate={batch.drawDate}
                        defaultCancelMode={dialogCancelMode}
                        onCancel={() => setIsReportDialogOpen(false)}
                        onSuccess={handleReportSuccess}
                    />
                </DialogContent>
            </Dialog>
            )}

            {isImportDialogOpen && (
            <ImportBatchLineImportHost
                batchId={batch.id}
                lineId={String(line.id)}
                onClose={() => setIsImportDialogOpen(false)}
                onSuccess={() => {
                    setIsImportDialogOpen(false);
                    refetchBatch();
                    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TICKETS] });
                    queryClient.invalidateQueries({
                        queryKey: [IMPORT_BATCH_QUERY_KEYS.IMPORT_BATCH_LINE_ENTRY_TICKETS],
                    });
                }}
            />
            )}
        </Box>
    );
};
