"use client";

import { Grid, Box, Typography, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, TableContainer } from "@mui/material";
import { useAuthStore } from "@/stores/useAuthStore";
import { Icon } from '@/admin/components/ui/AdminIcon';
import DashboardCard from "@/admin/components/dashboard/DashboardCard";
import WelcomeWidget from "@/admin/components/dashboard/WelcomeWidget";
import SummaryWidget from "@/admin/components/dashboard/SummaryWidget";
import { ImportBatchDraftBanner } from "@/admin/features/ticket/import-batch";

// Local Fixtures
const KPI_DATA = [
    { title: "Người dùng", total: "12,450", percent: 4.5, color: "#00b8d9", trend: [10, 41, 35, 51, 49, 62, 69, 91, 148] },
    { title: "Nhân viên", total: "124", percent: 0, color: "#36B37E", trend: [10, 10, 10, 10, 10, 10, 10, 10, 10] },
    { title: "Vé đang bán", total: "845,000", percent: -1.2, color: "#FFAB00", trend: [51, 49, 62, 69, 91, 148, 10, 41, 35] },
    { title: "Việc cần xử lý", total: "35", percent: 12.5, color: "#FF5630", trend: [148, 91, 69, 62, 49, 51, 35, 41, 10] }
];

const PENDING_TASKS_DATA = [
    { id: "1", type: "Phiếu vendor cần nhận trả", reference: "P-NT-2408-01", status: "Quá hạn", action: "Xử lý", isWarning: true },
    { id: "2", type: "Lô nhập cần xử lý", reference: "LN-2408-05", status: "Hôm nay", action: "Kiểm tra", isWarning: false },
    { id: "3", type: "Đối soát nhà cung cấp", reference: "DS-NCC-08", status: "Ngày mai", action: "Đối soát", isWarning: false },
    { id: "4", type: "Ticket hỗ trợ", reference: "SP-1205", status: "Hôm nay", action: "Phản hồi", isWarning: true },
];

const OPERATION_STATUS_DATA = [
    { title: "Kho vé", value: "Sẵn sàng", icon: "solar:box-bold-duotone", color: "#00b8d9" },
    { title: "Bàn giao người bán vé số", value: "Đang diễn ra", icon: "solar:users-group-two-rounded-bold-duotone", color: "#36B37E" },
    { title: "Nhận vé trả", value: "Cần chú ý", icon: "solar:archive-down-minimlistic-bold-duotone", color: "#FFAB00" },
    { title: "Đối soát nhà cung cấp", value: "Chưa hoàn tất", icon: "solar:document-text-bold-duotone", color: "#FF5630" },
];

const RECENT_EVENTS_DATA = [
    { id: "1", time: "10:30, Hôm nay", event: "Nhập thành công lô vé LN-2408-05 vào hệ thống", user: "Nguyễn Tuấn Kiệt" },
    { id: "2", time: "09:15, Hôm nay", event: "Bàn giao vé cho đại lý Hùng Phát", user: "Trần Văn A" },
    { id: "3", time: "17:45, Hôm qua", event: "Cập nhật kết quả xổ số đài TP.HCM", user: "Hệ thống" },
    { id: "4", time: "16:20, Hôm qua", event: "Hoàn tất đối soát nhà cung cấp Minh Ngọc", user: "Lê Thị B" },
];

const PendingTasksTable = ({ tasks }: { tasks: typeof PENDING_TASKS_DATA }) => {
    if (!tasks || tasks.length === 0) {
        return (
            <DashboardCard sx={{ height: '100%' }}>
                <Box sx={{ p: 3, pb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.125rem' }}>Cần xử lý ngay</Typography>
                </Box>
                <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                    <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)' }}>Không có việc cần xử lý ngay.</Typography>
                </Box>
            </DashboardCard>
        );
    }

    return (
        <DashboardCard sx={{ height: '100%' }}>
            <Box sx={{ p: 3, pb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.125rem' }}>Cần xử lý ngay</Typography>
            </Box>
            <TableContainer sx={{ px: 3, pb: 3 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ '& th': { borderBottom: '1px dashed var(--palette-divider)', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.75rem' } }}>
                            <TableCell>Loại công việc</TableCell>
                            <TableCell>Mã tham chiếu</TableCell>
                            <TableCell>Hạn/Trạng thái</TableCell>
                            <TableCell align="right">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tasks.map((row) => (
                            <TableRow key={row.id} sx={{ '& td': { borderBottom: '1px dashed var(--palette-divider)', py: 1.5 } }}>
                                <TableCell sx={{ fontWeight: 600, fontSize: '0.813rem' }}>{row.type}</TableCell>
                                <TableCell sx={{ fontSize: '0.813rem', color: 'var(--palette-text-secondary)', fontFamily: 'monospace' }}>{row.reference}</TableCell>
                                <TableCell sx={{ fontSize: '0.813rem', color: row.isWarning ? 'var(--palette-error-main)' : 'var(--palette-text-secondary)', fontWeight: row.isWarning ? 600 : 400 }}>{row.status}</TableCell>
                                <TableCell align="right">
                                    <Button size="small" variant="contained" color={row.isWarning ? "error" : "primary"} sx={{ textTransform: 'none', px: 2, py: 0.5, boxShadow: 'none' }}>
                                        {row.action}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </DashboardCard>
    );
}

const OperationStatusCards = () => {
    return (
        <DashboardCard sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.125rem', mb: 3 }}>Tình trạng vận hành</Typography>
            <Stack spacing={2}>
                {OPERATION_STATUS_DATA.map((item, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', p: 2, borderRadius: 2, bgcolor: 'var(--palette-background-neutral)' }}>
                        <Box sx={{
                            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: `${item.color}20`, color: item.color, mr: 2
                        }}>
                            <Icon icon={item.icon} width={24} height={24} />
                        </Box>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>{item.title}</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: item.color, ml: 2, whiteSpace: 'nowrap' }}>{item.value}</Typography>
                    </Box>
                ))}
            </Stack>
        </DashboardCard>
    );
}

const RecentEventsTimeline = () => {
    return (
        <DashboardCard sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.125rem', mb: 3 }}>Hoạt động gần đây</Typography>
            <Box sx={{ position: 'relative', ml: 2, pl: 3, borderLeft: '2px dashed var(--palette-divider)' }}>
                {RECENT_EVENTS_DATA.map((event, index) => (
                    <Box key={event.id} sx={{ mb: index === RECENT_EVENTS_DATA.length - 1 ? 0 : 3, position: 'relative' }}>
                        <Box sx={{
                            position: 'absolute', left: -31, top: 2,
                            width: 12, height: 12, borderRadius: '50%',
                            bgcolor: 'var(--palette-primary-main)',
                            border: '3px solid var(--palette-background-paper)'
                        }} />
                        <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', display: 'block', mb: 0.5 }}>{event.time}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>{event.event}</Typography>
                        <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)' }}>Bởi: {event.user}</Typography>
                    </Box>
                ))}
            </Box>
        </DashboardCard>
    );
}

export const SystemPage = () => {
    const { user } = useAuthStore();

    return (
        <>
            <Box sx={{ width: '100%', mb: 0, px: 0 }}>
                <ImportBatchDraftBanner />
            </Box>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                    <WelcomeWidget
                        title={`Tổng quan hệ thống\n${user?.fullName || 'Quản trị viên'}`}
                        description="Trung tâm điều hành hoạt động kinh doanh vé số. Theo dõi tình trạng kho vé, đại lý, đối soát và các tác vụ vận hành hệ thống hằng ngày."
                        action={
                            <Button
                                variant="contained"
                                sx={{
                                    fontFamily: '"Public Sans Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    textTransform: 'none',
                                    bgcolor: 'var(--palette-primary-main)',
                                    color: 'var(--palette-primary-contrastText)',
                                    boxShadow: 'none',
                                    py: '6px',
                                    px: '12px',
                                    minHeight: '36px',
                                    lineHeight: 1.71429,
                                    borderRadius: 'var(--shape-borderRadius)',
                                    '&:hover': {
                                        bgcolor: 'var(--palette-primary-dark)',
                                        boxShadow: 'none',
                                    },
                                }}
                            >
                                Xem báo cáo
                            </Button>
                        }
                    />
                </Grid>

                {/* KPI Cards */}
                {KPI_DATA.map((kpi, index) => (
                    <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
                        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <SummaryWidget
                                title={kpi.title}
                                total={kpi.total}
                                percent={kpi.percent}
                                color={kpi.color}
                                chartData={kpi.trend}
                            />
                        </Box>
                    </Grid>
                ))}

                <Grid size={{ xs: 12, md: 8 }}>
                    <PendingTasksTable tasks={PENDING_TASKS_DATA} />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <OperationStatusCards />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <RecentEventsTimeline />
                </Grid>
            </Grid>
        </>
    );
};

export default SystemPage;
