"use client";

import { Box, Stack, ThemeProvider, useTheme, createTheme, Button, Typography, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Select, MenuItem } from "@mui/material"
import { PageHeader } from "../../../../../components/ui/PageHeader"
import { SpinnerLoading } from "../../../../../components/ui/SpinnerLoading"
import { useState, useMemo } from "react"
import { CollapsibleCard } from "../../../../../components/ui/CollapsibleCard"
import { prefixAdmin } from "../../../../../constants/routes";
import { useTicketDetail } from "../../hooks/useTicket";
import { useParams, useNavigate } from "react-router-dom";
import { formatImportBatchCode } from "../../../import-batch/utils/importBatchCode";
import { resolveAvailableTicketQuantity } from "../../utils/ticketQuantity";
import dayjs from "dayjs";
import { useStations } from '../../../../station/hooks/useStation';
import { buildSerialStatusFilterOptions, buildSerialConditionFilterOptions } from '../../constants/serial-status-filter.config';

const getSerialStatusChipSx = (status?: string, ticketCondition?: string) => {
    const condition = (ticketCondition || "").toUpperCase();
    if (condition === "DAMAGED" || condition === "LOST" || condition === "VOIDED") {
        return { color: "var(--palette-error-dark)", bgcolor: "var(--palette-error-lighter)" };
    }
    const normalized = (status || "").toUpperCase();
    if (normalized === "IN_STOCK" || normalized === "AVAILABLE") {
        return { color: "var(--palette-success-dark)", bgcolor: "var(--palette-success-lighter)" };
    }
    if (normalized === "RESERVED" || normalized === "PROXY_HOLDING") {
        return { color: "var(--palette-warning-dark)", bgcolor: "var(--palette-warning-lighter)" };
    }
    if (normalized === "SOLD") {
        return { color: "var(--palette-info-dark)", bgcolor: "var(--palette-info-lighter)" };
    }
    if (normalized === "EXPIRED" || normalized.includes("FAULT")) {
        return { color: "var(--palette-error-dark)", bgcolor: "var(--palette-error-lighter)" };
    }
    return { color: "var(--palette-text-secondary)", bgcolor: "var(--palette-background-neutral)" };
};

export const TicketDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: ticketDetail, isLoading: isLoadingTicket } = useTicketDetail(id);
    const { data: providersRes } = useStations({ limit: 1000 });
    const providers = (providersRes as any)?.data?.recordList || [];

    const [expandedDetail, setExpandedDetail] = useState(true);
    const [expandedSerials, setExpandedSerials] = useState(true);
    const [searchSerial, setSearchSerial] = useState("");
    const [filterStatus, setFilterStatus] = useState("ALL");
    const outerTheme = useTheme();

    const localTheme = useMemo(() => createTheme(outerTheme, {
        components: {
            MuiCard: {
                styleOverrides: {
                    root: {
                        backgroundImage: "none !important",
                        backdropFilter: "none !important",
                        backgroundColor: "var(--palette-background-paper) !important",
                        boxShadow: "var(--customShadows-card)",
                        borderRadius: "var(--shape-borderRadius-lg)",
                        color: "var(--palette-text-primary)",
                    },
                }
            }
        }
    }), [outerTheme]);

    const filteredSerials = useMemo(() => {
        return (ticketDetail?.serials || []).filter((serial: any) => {
            const matchesSearch = !searchSerial || (serial.serialNumber || "").toLowerCase().includes(searchSerial.toLowerCase());
            const matchesStatus =
                filterStatus === "ALL" ||
                (serial.status || "").toUpperCase() === filterStatus ||
                (serial.faultedBy || "").toUpperCase() === filterStatus ||
                (serial.ticketCondition || "").toUpperCase() === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [ticketDetail?.serials, searchSerial, filterStatus]);

    const availableSerialStatusOptions = useMemo(() => {
        const statusOptions = buildSerialStatusFilterOptions(ticketDetail?.serials || []);
        const conditionOptions = buildSerialConditionFilterOptions(ticketDetail?.serials || []);
        return [...statusOptions, ...conditionOptions];
    }, [ticketDetail?.serials]);

    if (isLoadingTicket) {
        return (
            <ThemeProvider theme={localTheme}>
                <PageHeader
                    title={"Chi tiết vé số"}
                    breadcrumbItems={[
                        { label: "Dashboard", to: "/" },
                        { label: "Kho vé số", to: `/${prefixAdmin}/ticket/list` },
                        { label: "Chi tiết" }
                    ]}
                />
                <SpinnerLoading />
            </ThemeProvider>
        )
    }

    if (!ticketDetail) {
        return <Box display="flex" justifyContent="center" alignItems="center" height="400px"><Typography>Không tìm thấy vé số.</Typography></Box>
    }

    const providerId = ticketDetail.stationId || ticketDetail.productId || ticketDetail.providerId;
    const provider = providers.find((p: any) => (p.id || p._id)?.toString() === providerId?.toString());
    const providerName = provider ? provider.name : 'Không xác định';
    const canEditTicket = (ticketDetail.status || "").toUpperCase() === "IN_STOCK"
        && !(ticketDetail.serials || []).some((serial: any) => ["RESERVED", "SOLD"].includes((serial.status || "").toUpperCase()));
    const availableQuantity = resolveAvailableTicketQuantity(ticketDetail);
    const ticketStatus = (ticketDetail.status || "").toUpperCase();
    const ticketStatusColor =
        ticketStatus === "IN_STOCK" ? "success" :
        ticketStatus === "IMPORTING" ? "info" :
        ticketStatus === "SOLD_OUT" || ticketStatus === "EXPIRED" ? "warning" :
        "default";

    return (
        <>
            <PageHeader
                title={"Chi tiết vé số"}
                breadcrumbItems={[
                            { label: "Dashboard", to: "/" },
                            { label: "Kho vé số", to: `/${prefixAdmin}/ticket/list` },
                            { label: "Chi tiết" }
                        ]}
                action={
                    <Button
                    variant="contained"
                    className="btn-primary-admin"
                    disabled={!canEditTicket}
                    onClick={() => navigate(`/${prefixAdmin}/ticket/edit/${id}`)}
                >
                    Chỉnh sửa
                </Button>
                }
            />
            <ThemeProvider theme={localTheme}>
                <Stack sx={{
                    margin: "0px calc(15 * var(--spacing))",
                    gap: "calc(5 * var(--spacing))",
                    pb: 10
                }}>
                    <CollapsibleCard
                        title={"Thông tin vé số"}
                        subheader={"Nhà đài, dãy số, ngày quay..."}
                        expanded={expandedDetail}
                        onToggle={() => setExpandedDetail(!expandedDetail)}
                    >
                        <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(12, 1fr)",
                                    gap: "calc(3 * var(--spacing)) calc(2 * var(--spacing))",
                                }}
                            >
                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                    <Typography variant="caption" color="text.secondary">Nhà đài</Typography>
                                    <Typography variant="body1" fontWeight={600}>{providerName}</Typography>
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                    <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
                                    <Box mt={0.5}>
                                        <Chip
                                            label={ticketDetail.statusDisplayName || ticketDetail.status || "N/A"}
                                            color={ticketStatusColor as any}
                                            size="small"
                                        />
                                    </Box>
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                    <Typography variant="caption" color="text.secondary">Số sê-ri</Typography>
                                    <Typography variant="body1" fontWeight={600}>{ticketDetail.serialNumber || 'N/A'}</Typography>
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                    <Typography variant="caption" color="text.secondary">Dãy số</Typography>
                                    <Typography variant="body1" fontWeight={600} color="error.main" sx={{ fontSize: '1.1rem', letterSpacing: '2px' }}>
                                        {ticketDetail.numbers || 'N/A'}
                                    </Typography>
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                    <Typography variant="caption" color="text.secondary">Ngày quay</Typography>
                                    <Typography variant="body1" fontWeight={600}>
                                        {ticketDetail.drawDate ? dayjs(ticketDetail.drawDate).format('DD/MM/YYYY') : 'N/A'}
                                    </Typography>
                                    {provider?.drawTime && (
                                        <Typography variant="body2" color="text.secondary">
                                            {provider.drawTime}
                                        </Typography>
                                    )}
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                    <Typography variant="caption" color="text.secondary">Số lượng</Typography>
                                    <Typography variant="body1" fontWeight={600}>{availableQuantity} tờ</Typography>
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                    <Typography variant="caption" color="text.secondary">Giá (mỗi vé)</Typography>
                                    <Typography variant="body1" fontWeight={600}>{ticketDetail.priceSnapshot ? `${ticketDetail.priceSnapshot.toLocaleString('vi-VN')} đ` : 'N/A'}</Typography>
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                    <Typography variant="caption" color="text.secondary">Đã duyệt</Typography>
                                    <Typography variant="body1" fontWeight={600}>{ticketDetail.verified ? 'Có' : 'Không'}</Typography>
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                    <Typography variant="caption" color="text.secondary">Người tạo</Typography>
                                    <Typography variant="body1" fontWeight={600}>{ticketDetail.createdBy || 'N/A'}</Typography>
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                    <Typography variant="caption" color="text.secondary">Ngày tạo</Typography>
                                    <Typography variant="body1" fontWeight={600}>
                                        {ticketDetail.createdAt ? dayjs(ticketDetail.createdAt).format('DD/MM/YYYY HH:mm') : (ticketDetail.importedAt ? dayjs(ticketDetail.importedAt).format('DD/MM/YYYY HH:mm') : 'N/A')}
                                    </Typography>
                                </Box>

                                {ticketDetail.updatedAt && (
                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                        <Typography variant="caption" color="text.secondary">Cập nhật lúc</Typography>
                                        <Typography variant="body1" fontWeight={600}>
                                            {dayjs(ticketDetail.updatedAt).format('DD/MM/YYYY HH:mm')}
                                        </Typography>
                                    </Box>
                                )}

                                {ticketDetail.returnedAt && (
                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                        <Typography variant="caption" color="text.secondary">Ngày trả vé</Typography>
                                        <Typography variant="body1" fontWeight={600} color="error.main">
                                            {dayjs(ticketDetail.returnedAt).format('DD/MM/YYYY HH:mm')}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>

                            <Box sx={{ mt: 2 }}>
                                <Typography variant="caption" color="text.secondary" mb={1} display="block">Ảnh vé số</Typography>
                                {ticketDetail.ticketImg ? (
                                    <Box 
                                        component="img"
                                        src={ticketDetail.ticketImg}
                                        sx={{ 
                                            maxWidth: '100%', 
                                            maxHeight: 400, 
                                            objectFit: 'contain', 
                                            borderRadius: 1, 
                                            border: '1px solid #DFE1E6' 
                                        }}
                                    />
                                ) : (
                                    <Box 
                                        sx={{ 
                                            width: '100%', 
                                            height: 200, 
                                            bgcolor: '#F4F6F8', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            borderRadius: 1,
                                            border: '1px dashed #DFE1E6',
                                            color: '#919EAB'
                                        }}
                                    >
                                        Không có ảnh
                                    </Box>
                                )}
                            </Box>
                        </Stack>
                    </CollapsibleCard>

                    <CollapsibleCard
                        title={"Danh sách sê-ri"}
                        subheader={"Thông tin từng tờ vé vật lý trong cùng ticket"}
                        expanded={expandedSerials}
                        onToggle={() => setExpandedSerials(!expandedSerials)}
                    >
                        <Box sx={{ px: { xs: 1.5, md: 2 }, pt: 1 }}>
                            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                                <TextField
                                    size="small"
                                    placeholder="Tìm kiếm sê-ri..."
                                    value={searchSerial}
                                    onChange={(e) => setSearchSerial(e.target.value)}
                                    sx={{ minWidth: 200 }}
                                />
                                <Select
                                    size="small"
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    sx={{ minWidth: 180 }}
                                >
                                    <MenuItem value="ALL">Tất cả trạng thái</MenuItem>
                                    {availableSerialStatusOptions.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </Box>
                        </Box>
                        <Box sx={{ px: { xs: 1.5, md: 2 }, pb: 2 }}>
                            {filteredSerials.length === 0 ? (
                                <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 2 }}>
                                    Không có sê-ri nào phù hợp.
                                </Typography>
                            ) : (
                                <TableContainer>
                                    <Table size="small" sx={{ minWidth: 720 }}>
                                        <TableHead>
                                            <TableRow
                                                sx={{
                                                    bgcolor: "var(--palette-background-neutral)",
                                                    "& .MuiTableCell-head": {
                                                        borderBottom: "none",
                                                        color: "var(--palette-text-secondary)",
                                                        fontWeight: 600,
                                                        fontSize: "0.75rem",
                                                        py: 1,
                                                        whiteSpace: "nowrap",
                                                    },
                                                }}
                                            >
                                                <TableCell width={48} align="center">#</TableCell>
                                                <TableCell width={56}>Ảnh</TableCell>
                                                <TableCell>Số sê-ri</TableCell>
                                                <TableCell>Mã lô nhập</TableCell>
                                                <TableCell>Trạng thái</TableCell>
                                                <TableCell>Ngày tạo</TableCell>
                                                <TableCell>Người tạo</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredSerials.map((serial: any, index: number) => {
                                                const statusSx = getSerialStatusChipSx(serial.status, serial.ticketCondition);
                                                return (
                                                    <TableRow
                                                        key={serial.id || index}
                                                        hover
                                                        sx={{
                                                            "&:hover": { bgcolor: "var(--palette-action-hover)" },
                                                            "& .MuiTableCell-root": {
                                                                borderBottom: "1px dashed var(--palette-divider)",
                                                                py: 1,
                                                                verticalAlign: "middle",
                                                            },
                                                        }}
                                                    >
                                                        <TableCell align="center">
                                                            <Typography
                                                                variant="caption"
                                                                sx={{ fontWeight: 700, color: "var(--palette-text-secondary)" }}
                                                            >
                                                                {index + 1}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            {serial.ticketImg ? (
                                                                <Box
                                                                    component="img"
                                                                    src={serial.ticketImg}
                                                                    alt={`Sê-ri ${serial.serialNumber || index + 1}`}
                                                                    sx={{
                                                                        width: 44,
                                                                        height: 32,
                                                                        objectFit: "cover",
                                                                        borderRadius: "6px",
                                                                        border: "1px solid var(--palette-divider)",
                                                                        display: "block",
                                                                        bgcolor: "var(--palette-background-neutral)",
                                                                    }}
                                                                />
                                                            ) : (
                                                                <Box
                                                                    sx={{
                                                                        width: 44,
                                                                        height: 32,
                                                                        borderRadius: "6px",
                                                                        border: "1px dashed var(--palette-divider)",
                                                                        bgcolor: "var(--palette-background-neutral)",
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "center",
                                                                    }}
                                                                >
                                                                    <Typography
                                                                        variant="caption"
                                                                        sx={{ fontSize: "0.625rem", color: "text.disabled", lineHeight: 1 }}
                                                                    >
                                                                        N/A
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontWeight: 700,
                                                                    fontFamily: "monospace",
                                                                    fontSize: "0.8125rem",
                                                                    color: "var(--palette-text-primary)",
                                                                }}
                                                            >
                                                                {serial.serialNumber || "N/A"}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontWeight: 600,
                                                                    fontSize: "0.8125rem",
                                                                    color: "var(--palette-text-primary)",
                                                                }}
                                                            >
                                                                {formatImportBatchCode(serial.batchCode)}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={
                                                                    serial.ticketCondition === 'DAMAGED' || serial.ticketCondition === 'LOST' || serial.ticketCondition === 'VOIDED'
                                                                        ? (serial.ticketConditionDisplayName || serial.ticketCondition)
                                                                        : (serial.statusDisplayName || serial.status || "N/A")
                                                                }
                                                                size="small"
                                                                sx={{
                                                                    height: 22,
                                                                    borderRadius: "var(--shape-borderRadius-sm)",
                                                                    fontWeight: 700,
                                                                    fontSize: "0.6875rem",
                                                                    ...statusSx,
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{ fontSize: "0.8125rem", color: "var(--palette-text-primary)" }}
                                                            >
                                                                {serial.createdAt
                                                                    ? dayjs(serial.createdAt).format("DD/MM/YYYY")
                                                                    : "N/A"}
                                                            </Typography>
                                                            {serial.createdAt && (
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{ color: "text.secondary", display: "block", lineHeight: 1.2 }}
                                                                >
                                                                    {dayjs(serial.createdAt).format("HH:mm")}
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontSize: "0.8125rem",
                                                                    fontWeight: 500,
                                                                    color: "var(--palette-text-primary)",
                                                                }}
                                                            >
                                                                {serial.createdBy || "N/A"}
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Box>
                    </CollapsibleCard>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <Button variant="outlined" color="inherit" onClick={() => navigate(`/${prefixAdmin}/ticket/list`)}>
                            Quay lại danh sách
                        </Button>
                    </Box>
                </Stack>
            </ThemeProvider>
        </>
    )
}
