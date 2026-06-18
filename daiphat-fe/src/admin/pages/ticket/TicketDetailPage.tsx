import { Box, Stack, ThemeProvider, useTheme, createTheme, Button, Typography, CircularProgress, Chip } from "@mui/material"
import { Breadcrumb } from "../../components/ui/Breadcrumb"
import { Title } from "../../components/ui/Title"
import { useState, useMemo } from "react"
import { CollapsibleCard } from "../../components/ui/CollapsibleCard"
import { prefixAdmin } from "../../constants/routes";
import { useTicketDetail } from "./hooks/useTicket";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useProviders } from "../provider/hooks/useProvider";

export const TicketDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: ticketDetail, isLoading: isLoadingTicket } = useTicketDetail(id);
    const { data: providersRes } = useProviders({ size: 1000 });
    const providers = (providersRes as any)?.data?.recordList || [];

    const [expandedDetail, setExpandedDetail] = useState(true);
    const [expandedSerials, setExpandedSerials] = useState(true);
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

    if (isLoadingTicket) {
        return <Box display="flex" justifyContent="center" alignItems="center" height="400px"><CircularProgress /></Box>
    }

    if (!ticketDetail) {
        return <Box display="flex" justifyContent="center" alignItems="center" height="400px"><Typography>Không tìm thấy vé số.</Typography></Box>
    }

    const providerId = ticketDetail.stationId || ticketDetail.productId || ticketDetail.providerId;
    const provider = providers.find((p: any) => (p.id || p._id)?.toString() === providerId?.toString());
    const providerName = provider ? provider.name : 'Không xác định';
    const canEditTicket = ["IN_STOCK", "ISSUER_FAULT"].includes((ticketDetail.status || "").toUpperCase())
        && !(ticketDetail.serials || []).some((serial: any) => ["RESERVED", "SOLD"].includes((serial.status || "").toUpperCase()));
    const ticketStatus = (ticketDetail.status || "").toUpperCase();
    const ticketStatusColor =
        ticketStatus === "IN_STOCK" ? "success" :
        ticketStatus === "SOLD_OUT" || ticketStatus === "EXPIRED" ? "warning" :
        ticketStatus === "SOLD" || ticketStatus === "INTERNAL_FAULT" || ticketStatus === "ISSUER_FAULT" ? "error" :
        "default";

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title={"Chi tiết vé số"} />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Kho vé số", to: `/${prefixAdmin}/ticket/list` },
                            { label: "Chi tiết" }
                        ]}
                    />
                </div>
                <Button
                    variant="contained"
                    color="primary"
                    disabled={!canEditTicket}
                    onClick={() => navigate(`/${prefixAdmin}/ticket/edit/${id}`)}
                >
                    Chỉnh sửa
                </Button>
            </div>
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
                                    <Typography variant="caption" color="text.secondary">Mã lô nhập</Typography>
                                    <Typography variant="body1" fontWeight={600}>{ticketDetail.batchCode || 'N/A'}</Typography>
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
                                    <Typography variant="body1" fontWeight={600}>{ticketDetail.quantity ?? 'N/A'} tờ</Typography>
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
                        <Stack p="calc(3 * var(--spacing))" gap="calc(2 * var(--spacing))">
                            {(ticketDetail.serials || []).length === 0 ? (
                                <Typography variant="body2" color="text.secondary">Không có sê-ri.</Typography>
                            ) : (
                                (ticketDetail.serials || []).map((serial: any, index: number) => (
                                    <Box
                                        key={serial.id || index}
                                        sx={{
                                            p: 2.5,
                                            border: "1px solid var(--palette-divider)",
                                            borderRadius: 2,
                                        }}
                                    >
                                        <Stack gap={2}>
                                            <Typography variant="subtitle2" fontWeight={700}>
                                                Sê-ri #{index + 1}
                                            </Typography>
                                            <Box
                                                sx={{
                                                    display: "grid",
                                                    gridTemplateColumns: "repeat(12, 1fr)",
                                                    gap: "calc(2 * var(--spacing))",
                                                }}
                                            >
                                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 3" } }}>
                                                    <Typography variant="caption" color="text.secondary">Số sê-ri</Typography>
                                                    <Typography variant="body2" fontWeight={600}>{serial.serialNumber || "N/A"}</Typography>
                                                </Box>
                                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 3" } }}>
                                                    <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
                                                    <Typography variant="body2" fontWeight={600}>{serial.statusDisplayName || serial.status || "N/A"}</Typography>
                                                </Box>
                                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 3" } }}>
                                                    <Typography variant="caption" color="text.secondary">Ngày tạo</Typography>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {serial.createdAt ? dayjs(serial.createdAt).format("DD/MM/YYYY HH:mm") : "N/A"}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 3" } }}>
                                                    <Typography variant="caption" color="text.secondary">Người tạo</Typography>
                                                    <Typography variant="body2" fontWeight={600}>{serial.createdBy || "N/A"}</Typography>
                                                </Box>
                                            </Box>

                                            {serial.ticketImg ? (
                                                <Box
                                                    component="img"
                                                    src={serial.ticketImg}
                                                    sx={{
                                                        width: 160,
                                                        maxWidth: "100%",
                                                        height: 160,
                                                        objectFit: "cover",
                                                        borderRadius: 1.5,
                                                        border: "1px solid #DFE1E6",
                                                    }}
                                                />
                                            ) : null}
                                        </Stack>
                                    </Box>
                                ))
                            )}
                        </Stack>
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
