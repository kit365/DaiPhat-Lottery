"use client";

import { Grid, Box, Typography, Button, Divider, Stack, Avatar, CircularProgress, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Tooltip } from "@mui/material";
import { useAuthStore } from "../../../stores/useAuthStore";
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });
import { Icon } from '@/admin/components/ui/AdminIcon';
import { useState, useEffect } from "react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import WelcomeWidget from "../../components/dashboard/WelcomeWidget";
import SummaryWidget from "../../components/dashboard/SummaryWidget";
import { getSystemStats } from "../../api/dashboard.api";
import { ImportBatchDraftBanner } from "../../features/ticket/import-batch";




const CAROUSEL_DATA = [
    {
        title: "Sự trỗi dậy của làm việc từ xa: Lợi ích và Xu hướng",
        description: "Khám phá cách làm việc từ xa đang thay đổi bộ mặt của các doanh nghiệp hiện đại.",
        image: "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/cover/cover-4.webp",
    },
    {
        title: "Công nghệ Blockchain: Không chỉ là tiền điện tử",
        description: "Tìm hiểu về tiềm năng to lớn của Blockchain trong việc bảo mật dữ liệu.",
        image: "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/cover/cover-5.webp",
    },
    {
        title: "Sức khỏe tâm thần trong kỷ nguyên số",
        description: "Cách cân bằng giữa mạng xã hội và đời sống thực để duy trì sức khỏe.",
        image: "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/cover/cover-6.webp",
    }
];


const UserTicketDistributionChart = ({ data }: { data: any[] }) => {
    const total = data?.reduce((acc, curr) => acc + curr.count, 0) || 0;
    const labels = data?.map(d => d.label) || [];
    const series = data?.map(d => d.count) || [];

    const chartOptions: any = {
        chart: { type: 'donut' },
        labels: labels,
        legend: { show: false },
        stroke: { show: false },
        dataLabels: { enabled: false },
        plotOptions: {
            pie: {
                donut: {
                    size: '70%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Tổng',
                            formatter: () => total.toLocaleString(),
                            color: 'var(--palette-text-secondary)',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                        },
                        value: {
                            show: true,
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            color: 'var(--palette-text-primary)'
                        }
                    }
                }
            }
        },
        colors: ['#B71833', '#FFC1AC', '#7A0930', '#FFAB00', '#FF5630']
    };

    return (
        <DashboardCard>
            <Box sx={{ p: 3, pb: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.125rem' }}>Phân bổ thú cưng</Typography>
                <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', mt: 0.5 }}>Thống kê theo chủng loại</Typography>
            </Box>

            <Box
                sx={{
                    height: 320,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    borderRadius: '12px',
                    mt: 'calc(2 * var(--spacing))',
                    mb: 'calc(2 * var(--spacing))',
                    ml: 'auto',
                    mr: 'auto'
                }}
            >
                <Chart options={chartOptions} series={series} type="donut" width={260} height={260} />
            </Box>

            <Divider sx={{ borderStyle: 'dashed' }} />

            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                {labels.map((label: string, index: number) => (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: chartOptions.colors[index] }} />
                        <Typography sx={{ fontSize: '0.813rem', fontWeight: 600 }}>{label}</Typography>
                    </Box>
                ))}
            </Box>
        </DashboardCard>
    );
};

const NewTicketsTable = ({ tickets }: { tickets: any[] }) => {
    return (
        <DashboardCard>
            <Box sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.125rem' }}>Sản phẩm mới</Typography>
            </Box>
            <TableContainer sx={{ overflow: 'unset' }}>
                <Table sx={{ minWidth: 640 }}>
                    <TableHead sx={{ bgcolor: 'var(--palette-background-neutral)', borderBottom: 'none' }}>
                        <TableRow>
                            <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, borderBottom: 'none' }}>Tên sản phẩm</TableCell>
                            <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, borderBottom: 'none' }}>Giá</TableCell>
                            <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, borderBottom: 'none' }}>Trạng thái</TableCell>
                            <TableCell sx={{ borderBottom: 'none' }} />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tickets?.map((row) => (
                            <TableRow key={row._id} sx={{ height: '68.4px' }}>
                                <TableCell sx={{
                                    fontFamily: '"Public Sans Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    lineHeight: 1.57143,
                                    color: 'var(--palette-text-primary)',
                                    borderBottom: '1px dashed var(--palette-divider)',
                                    padding: '16px',
                                }}>
                                    {row.name}
                                </TableCell>
                                <TableCell sx={{
                                    fontFamily: '"Public Sans Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
                                    fontWeight: 400,
                                    fontSize: '0.875rem',
                                    lineHeight: 1.57143,
                                    color: 'var(--palette-text-primary)',
                                    borderBottom: '1px dashed var(--palette-divider)',
                                    padding: '16px',
                                }}>
                                    {row.priceNew?.toLocaleString()}đ
                                </TableCell>
                                <TableCell sx={{
                                    borderBottom: '1px dashed var(--palette-divider)',
                                    padding: '16px',
                                }}>
                                    <Box
                                        sx={{
                                            height: 24,
                                            minWidth: 22,
                                            lineHeight: 0,
                                            borderRadius: '6px',
                                            cursor: 'default',
                                            alignItems: 'center',
                                            whiteSpace: 'nowrap',
                                            display: 'inline-flex',
                                            justifyContent: 'center',
                                            padding: '0px 6px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            bgcolor: 'rgba(255, 48, 48, 0.16)',
                                            color: '#FF3030',
                                        }}
                                    >
                                        {row.status === 'active' ? 'Đang bán' : 'Tạm dừng'}
                                    </Box>
                                </TableCell>
                                <TableCell align="right" sx={{
                                    borderBottom: '1px dashed var(--palette-divider)',
                                    padding: '16px',
                                }}>
                                    <Icon icon="eva:more-vertical-fill" width={20} height={20} style={{ color: 'var(--palette-text-disabled)' }} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Divider sx={{ borderStyle: 'dashed' }} />
            <Box sx={{ p: 2, textAlign: 'right' }}>
                <Button
                    size="small"
                    color="inherit"
                    endIcon={<Icon icon="eva:arrow-ios-forward-fill" />}
                    sx={{
                        p: '4px',
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 600,
                        '&:hover': {
                            bgcolor: 'var(--palette-action-hover)',
                        }
                    }}
                >
                    Xem tất cả
                </Button>
            </Box>
        </DashboardCard>
    );
};




const TopCustomers = ({ customers }: { customers: any[] }) => {
    return (
        <DashboardCard sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.125rem', mb: 3 }}>Khách hàng tiêu biểu</Typography>
            <Stack spacing={3}>
                {customers?.map((customer) => (
                    <Stack key={customer._id} direction="row" alignItems="center" spacing={2}>
                        <Avatar src={customer.avatar} sx={{ width: 40, height: 40 }} />
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{customer.fullName}</Typography>
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'var(--palette-text-disabled)' }}>
                                <Icon icon="solar:cart-bold" width={16} />
                                <Typography variant="caption">{customer.totalSpent?.toLocaleString()}đ</Typography>
                            </Stack>
                        </Box>
                        <Box sx={{
                            width: 32, height: 32, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: 'rgba(255, 171, 0, 0.16)', color: '#ffab00'
                        }}>
                            <Icon icon="solar:medal-star-bold" width={20} />
                        </Box>
                    </Stack>
                ))}
            </Stack>
        </DashboardCard>
    );
};



const ProgressCard = ({ title, total, percent, color, bgIcon }: any) => {
    const isConversion = title === "Conversion";
    const chartColor = isConversion ? "#FF3030" : "#00b8d9";
    const chartGradient = isConversion ? "#5be49b" : "#4cf5e1";

    const chartOptions: any = {
        chart: { sparkline: { enabled: true } },
        stroke: { lineCap: 'round' },
        grid: { padding: { top: -15, bottom: -15 } },
        plotOptions: {
            radialBar: {
                hollow: { size: '62%' },
                track: {
                    background: 'rgba(255,255,255,0.08)',
                    strokeWidth: '100%',
                    margin: 0
                },
                dataLabels: {
                    name: { show: false },
                    value: {
                        offsetY: 6,
                        color: '#fff',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        formatter: (val: number) => `${val}%`,
                    },
                },
            },
        },
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'dark',
                type: 'vertical',
                gradientToColors: [chartGradient],
                stops: [0, 100]
            }
        },
        colors: [chartColor]
    };

    return (
        <Box sx={{
            p: 3,
            gap: 3,
            borderRadius: '16px',
            display: 'flex',
            overflow: 'hidden',
            position: 'relative',
            alignItems: 'center',
            color: 'var(--palette-common-white)',
            bgcolor: color,
            height: 120,
        }}>
            <Box sx={{
                width: 120,
                height: 120,
                position: 'absolute',
                right: -40,
                opacity: 0.08,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                zIndex: 0,
            }}>
                {bgIcon}
            </Box>

            <Box sx={{
                width: 80,
                height: 80,
                flexShrink: 0,
                position: 'relative',
                zIndex: 1,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
                backgroundSize: '6px 6px',
            }}>
                <Chart
                    type="radialBar"
                    series={[percent]}
                    options={chartOptions}
                    width={80}
                    height={80}
                />
            </Box>

            <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1 }}>{total}</Typography>
                <Typography sx={{
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    lineHeight: 1.57143,
                    opacity: 0.64,
                    mt: 0.5
                }}>
                    {title}
                </Typography>
            </Box>
        </Box>
    );
};

const TicketServiceUsageChart = ({ data }: { data: any[] }) => {
    const labels = data?.map(d => d.name) || [];
    const seriesData = data?.map(d => d.count) || [];

    const chartOptions: any = {
        chart: { type: 'bar', toolbar: { show: false } },
        plotOptions: { bar: { columnWidth: '32%', borderRadius: 4, distributed: true } },
        xaxis: { categories: labels, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { show: true } },
        grid: { strokeDashArray: 3, borderColor: 'var(--palette-divider)' },
        legend: { show: false },
        colors: ['#B71833', '#FFAB00', '#00B8D9'],
        dataLabels: { enabled: false }
    };

    const series = [{ name: 'Số lượng sử dụng', data: seriesData }];

    return (
        <DashboardCard sx={{ p: 3, pb: '20px' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.125rem', mb: 3 }}>Thống kê dịch vụ</Typography>
            <Chart options={chartOptions} series={series} type="bar" height={280} />
        </DashboardCard>
    );
};

const SystemStatsGrid = ({ stats }: { stats: any }) => {
    const statsData = [
        { title: "Tổng người dùng", total: stats?.users?.total?.toLocaleString() || "0", percent: stats?.users?.percent || 0, trend: stats?.users?.trend || [], color: "#FF3030" },
        { title: "Nhân viên quản trị", total: stats?.admins?.total?.toLocaleString() || "0", percent: stats?.admins?.percent || 0, trend: stats?.admins?.trend || [], color: "#00b8d9" },
        { title: "Tổng thú cưng", total: stats?.userTickets?.total?.toLocaleString() || "0", percent: stats?.userTickets?.percent || 0, trend: stats?.userTickets?.trend || [], color: "#ff5630" }
    ];

    return (
        <>
            {statsData.map((stat, index) => (
                <Grid key={index} sx={{ flexGrow: 0, flexBasis: 'auto', width: 'calc(100% * 4 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 4) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))' }}>
                    <SummaryWidget title={stat.title} total={stat.total} percent={stat.percent} color={stat.color} chartData={stat.trend} />
                </Grid>
            ))}
        </>
    );
};

export const SystemPage = () => {
    const { user } = useAuthStore();
    const [activeIndex, setActiveIndex] = useState(0);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await getSystemStats();
                if (res.success) {
                    setStats(res.data);
                }
            } catch (error) {
                console.error("Error fetching system stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const handleNext = () => setActiveIndex((prev) => (prev + 1) % CAROUSEL_DATA.length);
    const handlePrev = () => setActiveIndex((prev) => (prev - 1 + CAROUSEL_DATA.length) % CAROUSEL_DATA.length);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <>
            <Box sx={{ width: '100%', mb: 0, px: 0 }}>
                <ImportBatchDraftBanner />
            </Box>
            <Grid
            container
            sx={{
                '--Grid-columns': 12,
                '--Grid-columnSpacing': 'calc(3 * var(--spacing))',
                '--Grid-rowSpacing': 'calc(3 * var(--spacing))',
                flexFlow: 'wrap',
                minWidth: '0px',
                boxSizing: 'border-box',
                display: 'flex',
                gap: 'var(--Grid-rowSpacing) var(--Grid-columnSpacing)',
                '& > *': {
                    '--Grid-parent-rowSpacing': 'calc(3 * var(--spacing))',
                    '--Grid-parent-columnSpacing': 'calc(3 * var(--spacing))',
                    '--Grid-parent-columns': 12,
                }
            }}
        >
            <Grid
                sx={{
                    flexGrow: 0,
                    flexBasis: 'auto',
                    width: 'calc(100% * 8 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 8) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))',
                }}
            >
                <WelcomeWidget
                    title={`Chào mừng trở lại 👋 \n ${user?.fullName || 'Quản trị viên'}`}
                    description="Chào mừng bạn đến với hệ thống quản trị. Hãy bắt đầu quản lý các dịch vụ và đơn hàng của bạn ngay hôm nay."
                    img="https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/illustrations/characters/character-present.webp"
                    bgImg="https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/background/background-5.webp"
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
                            Khám phá ngay
                        </Button>
                    }
                />
            </Grid >

            <Grid
                sx={{
                    flexGrow: 0,
                    flexBasis: 'auto',
                    width: 'calc(100% * 4 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 4) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))',
                }}
            >
                <DashboardCard
                    sx={{
                        backgroundColor: 'var(--palette-common-black)',
                        height: '320px',
                        overflow: 'hidden',
                    }}
                >
                    {/* Carousel Content */}
                    <div className="m-auto max-w-full overflow-hidden relative h-full">
                        <ul
                            className="flex list-none p-0 m-0 h-full transition-transform duration-500 ease-in-out"
                            style={{ transform: `translate3d(-${activeIndex * 100}%, 0px, 0px)` }}
                        >
                            {CAROUSEL_DATA.map((item, index) => (
                                <li key={index} className="block relative min-w-0 flex-[0_0_100%] h-full">
                                    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
                                        {/* Text Content Overlay */}
                                        <div className="absolute bottom-0 z-[9] w-full p-[calc(3*var(--spacing))] flex flex-col gap-[var(--spacing)] text-[var(--palette-common-white)]">
                                            <span className="m-0 font-bold text-[0.75rem] uppercase text-[var(--palette-primary-light)]">
                                                Thông tin hệ thống
                                            </span>
                                            <Typography
                                                variant="h5"
                                                sx={{
                                                    fontWeight: 600,
                                                    fontSize: '1.1875rem',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    color: 'inherit',
                                                }}
                                            >
                                                {item.title}
                                            </Typography>
                                            <p className="m-0 font-normal text-[0.875rem] leading-[1.57143] overflow-hidden text-ellipsis whitespace-nowrap">
                                                {item.description}
                                            </p>
                                        </div>

                                        {/* Image with Overlay */}
                                        <span className="relative inline-block align-bottom w-full h-full overflow-hidden">
                                            <span className="absolute top-0 left-0 w-full h-full z-[1] bg-[linear-gradient(to_bottom,transparent_0%,var(--palette-common-black)_75%)]"></span>
                                            <img
                                                alt={item.title}
                                                className="top-0 left-0 w-full h-full object-cover vertical-middle"
                                                src={item.image}
                                            />
                                        </span>
                                    </Box>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Navigation Dots */}
                    <ul className="absolute z-[10] flex gap-[2px] h-[20px] top-[16px] left-[16px] text-[var(--palette-primary-light)] list-none p-0 m-0">
                        {CAROUSEL_DATA.map((_, index) => (
                            <li key={index}>
                                <button
                                    type="button"
                                    aria-label={`dot-${index}`}
                                    onClick={() => setActiveIndex(index)}
                                    className={`inline-flex items-center justify-center relative bg-transparent border-none p-0 cursor-pointer w-[20px] h-[20px] 
                                               before:content-[''] before:w-[8px] before:h-[8px] before:rounded-full before:bg-current 
                                               before:transition-[width,opacity] before:duration-200 before:ease-[cubic-bezier(0.4,0,0.6,1)]
                                               ${index === activeIndex ? 'before:opacity-100' : 'before:opacity-[0.24]'}`}
                                />
                            </li>
                        ))}
                    </ul>

                    {/* Carousel Arrows */}
                    <div className="absolute top-[8px] right-[8px] z-[10] inline-flex items-center gap-[4px] text-[var(--palette-common-white)]">
                        <button
                            type="button"
                            aria-label="Prev button"
                            onClick={handlePrev}
                            className="inline-flex items-center justify-center relative bg-transparent cursor-pointer rounded-full p-[var(--spacing)] border-none transition-all duration-250 ease-[cubic-bezier(0.4,0,0.6,1)] hover:bg-[rgba(255,255,255,0.08)]"
                        >
                            <svg className="user-select-none inline-block flex-shrink-0 fill-current text-[1.5rem] w-[20px] h-[20px] transition-fill duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]" focusable="false" aria-hidden="true" viewBox="0 0 24 24">
                                <path fill="currentColor" fillRule="evenodd" d="M15.488 4.43a.75.75 0 0 1 .081 1.058L9.988 12l5.581 6.512a.75.75 0 1 1-1.138.976l-6-7a.75.75 0 0 1 0-.976l6-7a.75.75 0 0 1 1.057-.081" clipRule="evenodd"></path>
                            </svg>
                        </button>
                        <button
                            type="button"
                            aria-label="Next button"
                            onClick={handleNext}
                            className="inline-flex items-center justify-center relative bg-transparent cursor-pointer rounded-full p-[var(--spacing)] border-none transition-all duration-250 ease-[cubic-bezier(0.4,0,0.6,1)] hover:bg-[rgba(255,255,255,0.08)]"
                        >
                            <svg className="user-select-none inline-block flex-shrink-0 fill-current text-[1.5rem] w-[20px] h-[20px] transition-fill duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]" focusable="false" aria-hidden="true" viewBox="0 0 24 24">
                                <path fill="currentColor" fillRule="evenodd" d="M8.512 4.43a.75.75 0 0 1 1.057.082l6 7a.75.75 0 0 1 0 .976l-6 7a.75.75 0 0 1-1.138-.976L14.012 12L8.431 5.488a.75.75 0 0 1 .08-1.057" clipRule="evenodd"></path>
                            </svg>
                        </button>
                    </div>
                </DashboardCard>
            </Grid>

            {/* Stats Cards */}
            <SystemStatsGrid stats={stats?.systemStats} />

            {/* Advanced Charts Section */}
            <Grid
                sx={{
                    flexGrow: 0,
                    flexBasis: 'auto',
                    width: 'calc(100% * 4 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 4) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))',
                }}
            >
                <UserTicketDistributionChart data={stats?.userTicketDistribution} />
            </Grid>

            <Grid
                sx={{
                    flexGrow: 0,
                    flexBasis: 'auto',
                    width: 'calc(100% * 8 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 8) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))',
                }}
            >
                <TicketServiceUsageChart data={stats?.ticketServiceUsage} />
            </Grid>

            <Grid
                sx={{
                    flexGrow: 0,
                    flexBasis: 'auto',
                    width: 'calc(100% * 8 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 8) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))',
                }}
            >
                <NewTicketsTable tickets={stats?.newTickets} />
            </Grid>

            <Grid
                sx={{
                    flexGrow: 0,
                    flexBasis: 'auto',
                    width: 'calc(100% * 4 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 4) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))',
                }}
            >
                <DashboardCard sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.125rem', mb: 3 }}>Sản phẩm bán chạy</Typography>
                    <Stack spacing={3}>
                        {stats?.topSellingTickets?.map((item: any) => (
                            <Stack key={item._id} direction="row" alignItems="center" spacing={2}>
                                <Avatar variant="rounded" src={item.image} sx={{ width: 48, height: 48, bgcolor: 'var(--palette-background-neutral)' }} />
                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>{item.name}</Typography>
                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)' }}>Đã bán: {item.totalQuantity}</Typography>
                                </Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{item.totalRevenue?.toLocaleString()}đ</Typography>
                            </Stack>
                        ))}
                    </Stack>
                </DashboardCard>
            </Grid>

            {/* Bottom Section */}
            <Grid
                sx={{
                    flexGrow: 0,
                    flexBasis: 'auto',
                    width: 'calc(100% * 4 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 4) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))',
                }}
            >
                <TopCustomers customers={stats?.topCustomers} />
            </Grid>

            <Grid
                sx={{
                    flexGrow: 0,
                    flexBasis: 'auto',
                    width: 'calc(100% * 4 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 4) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))',
                }}
            >
                <DashboardCard sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.125rem', mb: 3 }}>Nhân viên tiêu biểu</Typography>
                    <Stack spacing={3}>
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar src="https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/avatar/avatar-1.webp" sx={{ width: 40, height: 40 }} />
                            <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{user?.fullName || 'Admin'}</Typography>
                                <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)' }}>Quản trị viên xuất sắc</Typography>
                            </Box>
                        </Stack>
                    </Stack>
                </DashboardCard>
            </Grid>

            <Grid
                sx={{
                    flexGrow: 0,
                    flexBasis: 'auto',
                    width: 'calc(100% * 4 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 4) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))',
                }}
            >
                <Stack spacing={3}>
                    <ProgressCard
                        title="Conversion"
                        total="38,566"
                        percent={48}
                        color="#B71833"
                        bgIcon={
                            <svg width="120" height="120" viewBox="0 0 24 24">
                                <circle cx="12" cy="6" r="4" fill="currentColor"></circle>
                                <ellipse cx="12" cy="17" fill="currentColor" rx="7" ry="4"></ellipse>
                            </svg>
                        }
                    />
                    <ProgressCard
                        title="Applications"
                        total="55,566"
                        percent={75}
                        color="var(--palette-info-dark)"
                        bgIcon={
                            <svg width="120" height="120" viewBox="0 0 24 24">
                                <path fill="currentColor" fillRule="evenodd" d="M3.172 5.172C2 6.343 2 8.229 2 12s0 5.657 1.172 6.828S6.229 20 10 20h4c3.771 0 5.657 0 6.828-1.172S22 15.771 22 12s0-5.657-1.172-6.828S17.771 4 14 4h-4C6.229 4 4.343 4 3.172 5.172M18.576 7.52a.75.75 0 0 1-.096 1.056l-2.196 1.83c-.887.74-1.605 1.338-2.24 1.746c-.66.425-1.303.693-2.044.693s-1.384-.269-2.045-.693c-.634-.408-1.352-1.007-2.239-1.745L5.52 8.577a.75.75 0 0 1 .96-1.153l2.16 1.799c.933.777 1.58 1.315 2.128 1.667c.529.34.888.455 1.233.455s.704-.114 1.233-.455c.547-.352 1.195-.89 2.128-1.667l2.159-1.8a.75.75 0 0 1 1.056.097" clipRule="evenodd" />
                            </svg>
                        }
                    />
                </Stack>
            </Grid>
        </Grid >
        </>
    );
};
