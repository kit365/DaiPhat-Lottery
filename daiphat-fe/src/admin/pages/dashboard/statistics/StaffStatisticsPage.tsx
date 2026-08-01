import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Skeleton } from '@mui/material';
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });
import { getDetailedStaffStats } from '../../../api/dashboard.api';
import DashboardCard from '../../../components/dashboard/DashboardCard';

export const StaffStatisticsPage = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await getDetailedStaffStats();
                setStats(response.data);
            } catch (error) {
                console.error("Error fetching staff stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading || !stats) {
        return <Box p={3}><Skeleton variant="rectangular" height={500} sx={{ borderRadius: 2 }} /></Box>;
    }

    const { ticketServicePerformance, workAttendance } = stats;

    const attendanceOptions: any = {
        labels: (workAttendance || []).map((a: any) => a.name),
        colors: ['#00A76F', '#FFAB00', '#00B8D9'],
        legend: { position: 'right', fontWeight: 600 }
    };

    const performanceOptions: any = {
        chart: { toolbar: { show: false }, fontFamily: 'Public Sans, sans-serif' },
        plotOptions: { bar: { horizontal: false, borderRadius: 4, columnWidth: '35%' } },
        xaxis: { categories: (ticketServicePerformance || []).map((a: any) => a.name) },
        colors: ['#00B8D9'],
        grid: { strokeDashArray: 3 },
        tooltip: { y: { formatter: (val: number) => `${val} ${t('admin.common.bookings', 'lượt đặt')}` } }
    };

    const gridLayout = {
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: '24px',
    };

    return (
        <Box p={3}>
            <Box mb={4}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>{t('admin.dashboard.statistics.hr_analytics_title', 'Hiệu suất & Nhân sự (HR Analytics)')}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('admin.dashboard.statistics.hr_analytics_desc', 'Theo dõi năng suất làm việc của từng nhân viên và phân bổ ca trực trong ngày.')}</Typography>
            </Box>

            <Box sx={gridLayout}>
                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 7' } }}>
                    <DashboardCard sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>{t('admin.dashboard.statistics.top_staff_performance', 'Top Nhân viên Xuất sắc (Hoàn thành nhiều nhất)')}</Typography>
                        <Chart options={performanceOptions} series={[{ name: t('admin.common.services_completed', 'Dịch vụ đã xong'), data: (ticketServicePerformance || []).map((a: any) => a.count) }]} type="bar" height={360} />
                    </DashboardCard>
                </Box>

                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 5' } }}>
                    <DashboardCard sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>{t('admin.dashboard.statistics.shift_distribution', 'Phân bổ Ca làm việc hiện tại')}</Typography>
                        <Chart options={attendanceOptions} series={(workAttendance || []).map((a: any) => a.count)} type="pie" height={360} />
                    </DashboardCard>
                </Box>

                <Box sx={{ gridColumn: 'span 12' }}>
                    <DashboardCard sx={{ p: 4 }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>{t('admin.dashboard.statistics.staff_productivity_details', 'Chi tiết Năng suất Nhân viên')}</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 3 }}>
                            {ticketServicePerformance.slice(0, 8).map((p: any, index: number) => (
                                <Box key={p._id} sx={{ p: 3, border: '1px dashed rgba(145, 158, 171, 0.4)', borderRadius: 2, textAlign: 'center', bgcolor: index === 0 ? 'rgba(0, 167, 111, 0.05)' : 'transparent' }}>
                                    <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: index < 3 ? 'primary.main' : 'grey.300', color: '#fff', mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                                        {index + 1}
                                    </Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>{p.name}</Typography>
                                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>{p.count}</Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('admin.common.services_completed', 'Dịch vụ đã xong')}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </DashboardCard>
                </Box>
            </Box>
        </Box>
    );
};
