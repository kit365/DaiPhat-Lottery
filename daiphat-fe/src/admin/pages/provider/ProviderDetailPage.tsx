import { Box, Stack, ThemeProvider, useTheme, createTheme, Button, Typography, CircularProgress, Chip } from "@mui/material"
import { Breadcrumb } from "../../components/ui/Breadcrumb"
import { Title } from "../../components/ui/Title"
import { useState, useMemo } from "react"
import { CollapsibleCard } from "../../components/ui/CollapsibleCard"
import { prefixAdmin } from "../../constants/routes";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useProviderDetail } from "./hooks/useProvider";

const REGION_OPTIONS = [
    { value: 'NORTH', label: 'Miền Bắc' },
    { value: 'CENTRAL', label: 'Miền Trung' },
    { value: 'SOUTH', label: 'Miền Nam' },
];

const WEEKDAY_OPTIONS = [
    { value: 'MONDAY', label: 'Thứ 2' },
    { value: 'TUESDAY', label: 'Thứ 3' },
    { value: 'WEDNESDAY', label: 'Thứ 4' },
    { value: 'THURSDAY', label: 'Thứ 5' },
    { value: 'FRIDAY', label: 'Thứ 6' },
    { value: 'SATURDAY', label: 'Thứ 7' },
    { value: 'SUNDAY', label: 'Chủ nhật' }
];

export const ProviderDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: providerRes, isLoading } = useProviderDetail(id);
    const providerDetail = providerRes;

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

    if (!providerDetail) {
        return <Box display="flex" justifyContent="center" alignItems="center" height="400px"><Typography>Không tìm thấy nhà đài.</Typography></Box>
    }

    const regionLabel = REGION_OPTIONS.find(r => r.value === providerDetail.region)?.label || providerDetail.region || 'N/A';
    
    // Parse drawDays properly if it's an array or comma-separated string
    let drawDaysArray: string[] = [];
    if (Array.isArray(providerDetail.drawDays)) {
        drawDaysArray = providerDetail.drawDays;
    } else if (typeof providerDetail.drawDays === 'string') {
        drawDaysArray = providerDetail.drawDays.split(',');
    }
    
    const drawDaysLabels = drawDaysArray.map(day => WEEKDAY_OPTIONS.find(w => w.value === day.trim())?.label || day).join(', ');

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title={"Chi tiết nhà đài"} />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Nhà đài", to: `/${prefixAdmin}/provider/list` },
                            { label: "Chi tiết" }
                        ]}
                    />
                </div>
                <Button variant="contained" color="primary" onClick={() => navigate(`/${prefixAdmin}/provider/edit/${id}`)}>
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
                                    <Typography variant="h6" fontWeight={700} color="primary.main">{providerDetail.name || 'N/A'}</Typography>
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                    <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
                                    <Box mt={0.5}>
                                        {providerDetail.status === 'ACTIVE' || providerDetail.status === 'active' ? (
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
                                    <Typography variant="caption" color="text.secondary">Thứ quay thưởng</Typography>
                                    <Typography variant="body1" fontWeight={600}>{drawDaysLabels || 'N/A'}</Typography>
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                    <Typography variant="caption" color="text.secondary">Giờ quay thưởng</Typography>
                                    <Typography variant="body1" fontWeight={600}>{providerDetail.drawTime || 'N/A'}</Typography>
                                </Box>
                                
                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                    <Typography variant="caption" color="text.secondary">Độ ưu tiên</Typography>
                                    <Typography variant="body1" fontWeight={600}>{providerDetail.priority !== undefined ? providerDetail.priority : 'N/A'}</Typography>
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12", md: "span 8" } }}>
                                    <Typography variant="caption" color="text.secondary">Tính năng Scan</Typography>
                                    <Box mt={0.5}>
                                        {providerDetail.scanEnabled ? (
                                            <Chip label="Có hỗ trợ" color="info" size="small" variant="outlined" />
                                        ) : (
                                            <Chip label="Không hỗ trợ" color="default" size="small" variant="outlined" />
                                        )}
                                    </Box>
                                </Box>

                                <Box sx={{ gridColumn: { xs: "span 12" } }}>
                                    <Typography variant="caption" color="text.secondary">Mô tả</Typography>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5, bgcolor: '#FAFBFC', p: 1.5, borderRadius: 1, border: '1px solid #DFE1E6' }}>
                                        {providerDetail.description || 'Không có mô tả'}
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ mt: 2 }}>
                                <Typography variant="caption" color="text.secondary" mb={1} display="block">Logo / Hình ảnh</Typography>
                                {providerDetail.avatar || providerDetail.image ? (
                                    <Box 
                                        component="img"
                                        src={providerDetail.avatar || providerDetail.image}
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
    )
}
