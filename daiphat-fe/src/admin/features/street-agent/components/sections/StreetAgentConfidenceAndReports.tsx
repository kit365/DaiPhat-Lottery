"use client";

import Link from "@/admin/components/navigation/AdminLink";
import {
    Alert,
    Box,
    Button,
    Card,
    Chip,
    CircularProgress,
    Divider,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Typography,
} from "@mui/material";
import { useState } from "react";
import { ROUTES } from "../../../../constants/routes";
import {
    useDailySalesReportDetail,
    useStreetAgentConfidence,
    useStreetAgentDailySalesReports,
} from "../../hooks/useStreetAgent";
import { CONFIDENCE_TIER_LABELS } from "../configs/constants";
import {
    formatCommission,
    formatCurrency,
    formatDate,
    formatDateTime,
} from "../../utils/format";

const InfoItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Stack spacing={0.5}>
        <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)", fontWeight: 600 }}>
            {label}
        </Typography>
        <Typography variant="body2" sx={{ color: "var(--palette-text-primary)", fontWeight: 500 }}>
            {value ?? "—"}
        </Typography>
    </Stack>
);

export const StreetAgentConfidencePanel = ({ profileId }: { profileId: string | number }) => {
    const { data: confidence, isLoading, error, refetch } = useStreetAgentConfidence(profileId);
    const errorMessage =
        (error as any)?.response?.data?.message ||
        (error ? "Không tải được điểm tin cậy từ hệ thống." : null);

    if (isLoading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={28} />
            </Box>
        );
    }

    if (errorMessage) {
        return (
            <Alert
                severity="error"
                action={
                    <Button color="inherit" size="small" onClick={() => refetch()}>
                        Thử lại
                    </Button>
                }
            >
                {errorMessage}
            </Alert>
        );
    }

    if (!confidence) {
        return <Typography color="text.secondary">Chưa có dữ liệu tin cậy.</Typography>;
    }

    return (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
            <InfoItem label="Điểm" value={confidence.score} />
            <InfoItem
                label="Tier"
                value={CONFIDENCE_TIER_LABELS[confidence.tier] || confidence.tier}
            />
            <InfoItem
                label="Cap % theo tier (BE)"
                value={formatCommission(confidence.capPercentage)}
            />
            <InfoItem label="Số mẫu batch" value={confidence.sampleSize} />
            <InfoItem label="On-time rate" value={formatCommission(confidence.onTimeRate)} />
            <InfoItem label="Sell-through rate" value={formatCommission(confidence.sellThroughRate)} />
            <InfoItem label="Experience rate" value={formatCommission(confidence.experienceRate)} />
            <InfoItem
                label="Tính lúc"
                value={confidence.calculatedAt ? formatDateTime(confidence.calculatedAt) : "—"}
            />
        </Box>
    );
};

export const StreetAgentDailySalesReportsPanel = ({
    profileId,
}: {
    profileId: string | number;
}) => {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

    const { data: listData, isLoading, error, refetch } = useStreetAgentDailySalesReports(
        profileId,
        { page, limit }
    );
    const {
        data: reportDetail,
        isLoading: isLoadingDetail,
        error: detailError,
    } = useDailySalesReportDetail(selectedReportId);

    const rows = listData?.recordList || [];
    const total = listData?.pagination?.totalRecords || 0;
    const listError =
        (error as any)?.response?.data?.message ||
        (error ? "Không tải được báo cáo bán hàng." : null);
    const detailErrorMessage =
        (detailError as any)?.response?.data?.message ||
        (detailError ? "Không tải được chi tiết báo cáo." : null);

    return (
        <Stack spacing={2}>
            {listError ? (
                <Alert
                    severity="error"
                    action={
                        <Button color="inherit" size="small" onClick={() => refetch()}>
                            Thử lại
                        </Button>
                    }
                >
                    {listError}
                </Alert>
            ) : (
                <Card variant="outlined" sx={{ overflow: "hidden" }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Ngày</TableCell>
                                    <TableCell>Trạng thái</TableCell>
                                    <TableCell align="right">Đã bán</TableCell>
                                    <TableCell align="right">Còn lại/trả</TableCell>
                                    <TableCell align="right">Tiền thu</TableCell>
                                    <TableCell align="right">Chi tiết</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6}>
                                            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                                                <CircularProgress size={24} />
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6}>
                                            <Typography color="text.secondary" sx={{ py: 2 }}>
                                                Chưa có báo cáo bán hàng.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map((row) => (
                                        <TableRow key={row.id} hover selected={selectedReportId === row.id}>
                                            <TableCell>{formatDate(row.reportDate)}</TableCell>
                                            <TableCell>
                                                <Chip size="small" label={row.status} />
                                            </TableCell>
                                            <TableCell align="right">{row.totalSoldQuantity}</TableCell>
                                            <TableCell align="right">
                                                {row.totalRemainingQuantity}
                                            </TableCell>
                                            <TableCell align="right">
                                                {formatCurrency(row.totalCashCollected)}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Button
                                                    size="small"
                                                    onClick={() => setSelectedReportId(row.id)}
                                                >
                                                    Xem
                                                </Button>
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
                        page={Math.max(0, page - 1)}
                        onPageChange={(_e, next) => setPage(next + 1)}
                        rowsPerPage={limit}
                        onRowsPerPageChange={(e) => {
                            setLimit(Number(e.target.value));
                            setPage(1);
                        }}
                        rowsPerPageOptions={[5, 10, 20]}
                        labelRowsPerPage="Mỗi trang"
                    />
                </Card>
            )}

            {selectedReportId != null && (
                <Card variant="outlined" sx={{ p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="subtitle2">Chi tiết báo cáo #{selectedReportId}</Typography>
                        <Button size="small" onClick={() => setSelectedReportId(null)}>
                            Đóng
                        </Button>
                    </Stack>
                    {isLoadingDetail ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : detailErrorMessage ? (
                        <Alert severity="error">{detailErrorMessage}</Alert>
                    ) : reportDetail ? (
                        <Stack spacing={2}>
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                                    gap: 2,
                                }}
                            >
                                <InfoItem label="Ngày" value={formatDate(reportDetail.reportDate)} />
                                <InfoItem label="Trạng thái" value={reportDetail.status} />
                                <InfoItem label="Tổng bán" value={reportDetail.totalSoldQuantity} />
                                <InfoItem
                                    label="Tổng còn lại/trả"
                                    value={reportDetail.totalRemainingQuantity}
                                />
                                <InfoItem
                                    label="Tổng tiền thu"
                                    value={formatCurrency(reportDetail.totalCashCollected)}
                                />
                            </Box>

                            <Divider />
                            <Typography variant="subtitle2">Chi tiết theo allocation</Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Batch</TableCell>
                                            <TableCell>Station</TableCell>
                                            <TableCell align="right">Giao</TableCell>
                                            <TableCell align="right">Bán</TableCell>
                                            <TableCell align="right">Trả</TableCell>
                                            <TableCell align="right">Tiền thu</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(reportDetail.details || []).map((d) => (
                                            <TableRow key={`${d.detailId}-${d.allocationBatchId}`}>
                                                <TableCell>
                                                    <Button
                                                        size="small"
                                                        component={Link}
                                                        href={`${ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.ALLOCATION_BATCHES}?batchId=${d.allocationBatchId}`}
                                                    >
                                                        #{d.allocationBatchId}
                                                    </Button>
                                                </TableCell>
                                                <TableCell>{d.stationId}</TableCell>
                                                <TableCell align="right">
                                                    {d.allocatedQuantity}
                                                </TableCell>
                                                <TableCell align="right">{d.soldQuantity}</TableCell>
                                                <TableCell align="right">
                                                    {d.remainingQuantity}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {formatCurrency(d.cashCollected)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Typography variant="subtitle2">Settlement liên kết</Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Settlement</TableCell>
                                            <TableCell>Batch</TableCell>
                                            <TableCell>Ngày</TableCell>
                                            <TableCell align="right">Agent nhận</TableCell>
                                            <TableCell align="right">Agent trả</TableCell>
                                            <TableCell>Trạng thái</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(reportDetail.settlements || []).length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6}>
                                                    <Typography color="text.secondary">
                                                        Không có settlement liên kết.
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            (reportDetail.settlements || []).map((s) => (
                                                <TableRow key={s.settlementId}>
                                                    <TableCell>#{s.settlementId}</TableCell>
                                                    <TableCell>
                                                        <Button
                                                            size="small"
                                                        component={Link}
                                                        href={`${ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.ALLOCATION_BATCHES}?batchId=${s.allocationBatchId}`}
                                                        >
                                                            {s.batchCode || `#${s.allocationBatchId}`}
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell>
                                                        {s.settlementDate
                                                            ? formatDate(s.settlementDate)
                                                            : "—"}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {formatCurrency(s.agentReceives)}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {formatCurrency(s.agentPays)}
                                                    </TableCell>
                                                    <TableCell>{s.status || "—"}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Stack>
                    ) : null}
                </Card>
            )}
        </Stack>
    );
};
