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
    const { data: providersRes } = useProviders({ limit: 1000 });
    const providers = (providersRes as any)?.data?.recordList || [];

    const [expandedDetail, setExpandedDetail] = useState(true);
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
                <Button variant="contained" color="primary" onClick={() => navigate(`/${prefixAdmin}/ticket/edit/${id}`)}>
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
                        subheader={"Sản phẩm, dãy số, ngày quay..."}
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
                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }}>
                                    <Typography variant="caption" color="text.secondary">Nhà đài</Typography>
                                    <Typography variant="body1" fontWeight={600}>{providerName}</Typography>
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }}>
                                    <Typography variant="caption" color="text.secondary">Mã lô nhập</Typography>
                                    <Typography variant="body1" fontWeight={600}>{ticketDetail.batchCode || 'N/A'}</Typography>
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
                                </Box>
                                
                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                    <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
                                    <Box mt={0.5}>
                                        {ticketDetail.status === 'SOLD' ? (
                                            <Chip label="Đã bán" color="error" size="small" />
                                        ) : (
                                            <Chip label="Trong kho" color="success" size="small" />
                                        )}
                                    </Box>
                                </Box>
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
