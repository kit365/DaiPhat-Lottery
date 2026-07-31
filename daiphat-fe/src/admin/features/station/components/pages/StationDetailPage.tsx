import { Box, Stack, ThemeProvider, useTheme, createTheme, Button, Typography, CircularProgress, Chip } from "@mui/material"
import { Breadcrumb } from "../../../../components/ui/Breadcrumb"
import { Title } from "../../../../components/ui/Title"
import { useState, useMemo } from "react"
import { CollapsibleCard } from "../../../../components/ui/CollapsibleCard"
import { prefixAdmin } from "../../../../constants/routes";
import { DAYS_OF_WEEK } from "../../../../constants/schedule.constants";
import { useParams, useNavigate } from "react-router-dom";
import { useStationDetail } from "../../hooks/useStation";

const REGION_LABELS: Record<string, string> = {
    MIEN_BAC: 'Miền Bắc',
    MIEN_TRUNG: 'Miền Trung',
    MIEN_NAM: 'Miền Nam',
};

const DAY_LABEL: Record<string, string> = Object.fromEntries(
    DAYS_OF_WEEK.map((d) => [d.value, d.label])
);

export const StationDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: stationDetail, isLoading } = useStationDetail(id);

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

    if (isLoading) {
        return <Box display="flex" justifyContent="center" alignItems="center" height="400px"><CircularProgress /></Box>
    }

    if (!stationDetail) {
        return <Box display="flex" justifyContent="center" alignItems="center" height="400px"><Typography>Không tìm thấy nhà đài.</Typography></Box>
    }

    const regionLabel = REGION_LABELS[stationDetail.region] || stationDetail.region || 'N/A';

    let drawDaysArray: string[] = [];
    if (Array.isArray(stationDetail.drawDays)) {
        drawDaysArray = stationDetail.drawDays;
    } else if (typeof stationDetail.drawDays === 'string') {
        drawDaysArray = stationDetail.drawDays.split(',');
    }

    const drawDaysLabels = drawDaysArray
        .map((day) => DAY_LABEL[day.trim()] || day.trim())
        .join(', ');

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title={"Chi tiết nhà đài"} />
                    <Breadcrumb
                        items={[
                            { label: "Bảng điều khiển", to: `/${prefixAdmin}` },
                            { label: "Nhà đài", to: `/${prefixAdmin}/provider/list` },
                            { label: "Chi tiết" }
                        ]}
                    />
                </div>
                <Button variant="contained" className="btn-primary-admin" onClick={() => navigate(`/${prefixAdmin}/provider/edit/${id}`)}>
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
                        title={"Thông tin nhà đài"}
                        subheader={"Tên, khu vực, lịch quay thưởng..."}
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
                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 8" } }}>
                                    <Typography variant="caption" color="text.secondary">Tên nhà đài</Typography>
                                    <Typography variant="h6" fontWeight={700} color="text.primary">{stationDetail.name || 'N/A'}</Typography>
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                    <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
                                    <Box mt={0.5}>
                                        {stationDetail.status === 'ACTIVE' || stationDetail.status === 'active' ? (
                                            <Chip label="Hoạt động" color="success" size="small" />
                                        ) : (
                                            <Chip label="Vô hiệu hóa" color="default" size="small" />
                                        )}
                                    </Box>
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                    <Typography variant="caption" color="text.secondary">Khu vực</Typography>
                                    <Typography variant="body1" fontWeight={600}>{regionLabel}</Typography>
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                    <Typography variant="caption" color="text.secondary">Tỉnh/Thành phố</Typography>
                                    <Typography variant="body1" fontWeight={600}>{stationDetail.province || 'N/A'}</Typography>
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                    <Typography variant="caption" color="text.secondary">Thứ quay thưởng</Typography>
                                    <Typography variant="body1" fontWeight={600}>{drawDaysLabels || 'N/A'}</Typography>
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                    <Typography variant="caption" color="text.secondary">Giờ quay thưởng</Typography>
                                    <Typography variant="body1" fontWeight={600}>{stationDetail.drawTime || 'N/A'}</Typography>
                                </Box>
                                
                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                    <Typography variant="caption" color="text.secondary">Giá vé</Typography>
                                    <Typography variant="body1" fontWeight={600}>
                                        {stationDetail.price != null ? `${new Intl.NumberFormat('vi-VN').format(Number(stationDetail.price))} VNĐ` : 'N/A'}
                                    </Typography>
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                    <Typography variant="caption" color="text.secondary">Tỉ lệ hoa hồng</Typography>
                                    <Typography variant="body1" fontWeight={600}>
                                        {stationDetail.commissionRate != null ? `${Number(stationDetail.commissionRate) * 100}% (${stationDetail.commissionRate})` : 'N/A'}
                                    </Typography>
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                    <Typography variant="caption" color="text.secondary">Độ ưu tiên</Typography>
                                    <Typography variant="body1" fontWeight={600}>{stationDetail.priority !== undefined ? stationDetail.priority : 'N/A'}</Typography>
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 8" } }}>
                                    <Typography variant="caption" color="text.secondary">Tính năng Scan</Typography>
                                    <Box mt={0.5}>
                                        {stationDetail.scanEnabled ? (
                                            <Chip label="Có hỗ trợ" color="info" size="small" variant="outlined" />
                                        ) : (
                                            <Chip label="Không hỗ trợ" color="default" size="small" variant="outlined" />
                                        )}
                                    </Box>
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12" } }}>
                                    <Typography variant="caption" color="text.secondary">Mô tả</Typography>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5, bgcolor: '#FAFBFC', p: 1.5, borderRadius: 1, border: '1px solid #DFE1E6' }}>
                                        {stationDetail.description || 'Không có mô tả'}
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ mt: 2 }}>
                                <Typography variant="caption" color="text.secondary" mb={1} display="block">Logo / Hình ảnh</Typography>
                                {stationDetail.avatar || stationDetail.image ? (
                                    <Box 
                                        component="img"
                                        src={stationDetail.avatar || stationDetail.image}
                                        sx={{ 
                                            maxWidth: '200px', 
                                            maxHeight: '200px', 
                                            objectFit: 'contain', 
                                            borderRadius: 1, 
                                            border: '1px solid #DFE1E6' 
                                        }}
                                    />
                                ) : (
                                    <Box 
                                        sx={{ 
                                            width: '200px', 
                                            height: '200px', 
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
                        <Button variant="outlined" color="inherit" onClick={() => navigate(`/${prefixAdmin}/provider/list`)}>
                            Quay lại danh sách
                        </Button>
                    </Box>
                </Stack>
            </ThemeProvider>
        </>
    );
};
