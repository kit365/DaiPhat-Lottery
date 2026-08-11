"use client";

import { Grid, Box, Typography, Button, Divider, Menu, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Avatar } from "@mui/material"
import WelcomeWidget from "@/admin/components/dashboard/WelcomeWidget";
import SummaryWidget from "@/admin/components/dashboard/SummaryWidget";
import DashboardCard from "@/admin/components/dashboard/DashboardCard";
import { useAuthStore } from "@/stores/useAuthStore";
import { Icon } from '@/admin/components/ui/AdminIcon';
import { useState, useEffect } from "react";
import { getEcommerceStats } from "@/admin/features/dashboard/services/dashboardService";
import Chart from '@/components/ApexChartCompat';

const SalesByCategory = ({ data }: { data: any[] }) => {
    const total = data?.reduce((acc, curr) => acc + curr.total, 0) || 0;
    const labels = data?.map(item => item.label) || ['Trống', 'Trống'];
    const series = data?.map(item => (total > 0 ? (item.total / total) * 100 : 0)) || [0, 0];

    const chartOptions: any = {
        chart: { type: 'radialBar' },
        labels: labels,
        stroke: { lineCap: 'round' },
        plotOptions: {
            radialBar: {
                hollow: { size: '40%' },
                track: {
                    background: 'rgba(145, 158, 171, 0.08)',
                    strokeWidth: '100%',
                },
                dataLabels: {
                    name: {
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--palette-text-secondary)',
                        offsetY: -10,
                    },
                    value: {
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: 'var(--palette-text-primary)',
                        offsetY: 5,
                        formatter: (val: number) => `${val.toFixed(2)}%`,
                    },
                    total: {
                        show: true,
                        label: 'Tổng thu',
                        formatter: () => {
                            if (total >= 1000000) return (total / 1000000).toFixed(1) + 'M';
                            if (total >= 1000) return (total / 1000).toFixed(1) + 'K';
                            return total.toString();
                        },
                    }
                }
            }
        },
        colors: ['#FF3030', '#ffab00', '#00b8d9'],
        legend: { show: false }
    };

    return (
        <DashboardCard>
            <Box sx={{ p: 3, pb: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.125rem' }}>Doanh số theo danh mục</Typography>
            </Box>

            <Box sx={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Chart options={chartOptions} series={series} type="radialBar" width={300} height={300} />
            </Box>

            <Divider sx={{ borderStyle: 'dashed' }} />

            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                {labels.map((label: string, index: number) => (
                    <Box key={`${label}-${index}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: chartOptions.colors[index] }} />
                        <Typography sx={{ fontSize: '0.813rem', fontWeight: 600, color: 'var(--palette-text-secondary)' }}>{label}</Typography>
                    </Box>
                ))}
            </Box>
        </DashboardCard>
    );
};

const YearlySales = ({ data }: { data: number[] }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = (year?: string) => {
        if (year && typeof year === 'string') setSelectedYear(year);
        setAnchorEl(null);
    };

    const chartOptions: any = {
        chart: {
            type: 'area',
            toolbar: { show: false },
            zoom: { enabled: false },
        },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0,
                stops: [0, 100]
            }
        },
        xaxis: {
            categories: ['Thg 1', 'Thg 2', 'Thg 3', 'Thg 4', 'Thg 5', 'Thg 6', 'Thg 7', 'Thg 8', 'Thg 9', 'Thg 10', 'Thg 11', 'Thg 12'],
        },
        yaxis: { labels: { show: true } },
        grid: { strokeDashArray: 3, borderColor: 'var(--palette-divider)' },
        legend: { show: false },
        colors: ['#FF3030'],
    };

    const series = [
        { name: 'Doanh thu', data: Array.isArray(data) ? data : Array(12).fill(0) }
    ];

    return (
        <DashboardCard sx={{ p: 3, pb: '20px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.125rem' }}>Doanh s? h�ng nam</Typography>
                    <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', mt: 0.5 }}>
                        <span style={{ fontWeight: 600, color: 'var(--palette-success-main)' }}>(+43%)</span> so v?i nam ngo�i
                    </Typography>
                </Box>
                <Button
                    size="small"
                    variant="outlined"
                    onClick={handleClick}
                    endIcon={<Icon icon={open ? "eva:chevron-up-fill" : "eva:chevron-down-fill"} />}
                    sx={{
                        color: 'inherit',
                        height: '34px',
                        textTransform: 'none',
                        fontWeight: 600,
                        border: 'solid 1px rgba(145, 158, 171, 0.24)',
                    }}
                >
                    {selectedYear}
                </Button>
                <Menu
                    anchorEl={anchorEl}
                    open={open}
                    onClose={() => handleClose()}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    PaperProps={{ sx: { mt: 1, borderRadius: '12px', minWidth: 100, p: 0.5 } }}
                >
                    {['2023', '2024', '2025'].map((year) => (
                        <MenuItem
                            key={year}
                            selected={year === selectedYear}
                            onClick={() => handleClose(year)}
                            sx={{ borderRadius: '8px', mb: 0.5 }}
                        >
                            {year}
                        </MenuItem>
                    ))}
                </Menu>
            </Box>

            <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'var(--palette-primary-main)' }} />
                        <Typography sx={{ fontSize: '0.813rem', fontWeight: 500, color: 'var(--palette-text-secondary)' }}>Doanh thu</Typography>
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {(Array.isArray(data) ? data.reduce((a: number, b: number) => a + b, 0) : 0).toLocaleString()}đ
                    </Typography>
                </Box>
            </Box>

            <Chart options={chartOptions} series={series} type="area" height={280} />
        </DashboardCard>
    );
};

const TopCustomers = ({ customers }: { customers: any[] }) => {
    return (
        <DashboardCard sx={{ p: 0 }}>
            <Box sx={{ p: 3, pb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.125rem' }}>Kh�ch h�ng th�n thi?t</Typography>
            </Box>
            <TableContainer>
                <Table sx={{ minWidth: 640 }}>
                    <TableHead sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                        <TableRow>
                            <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: 'none' }}>Kh�ch h�ng</TableCell>
                            <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: 'none' }}>S? don</TableCell>
                            <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: 'none' }}>Chi ti�u</TableCell>
                            <TableCell align="right" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: 'none' }}>X?p h?ng</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {customers?.map((customer, index) => (
                            <TableRow key={customer._id} sx={{ '&:hover': { bgcolor: 'var(--palette-action-hover)' } }}>
                                <TableCell sx={{ borderBottom: 'dashed 1px var(--palette-divider)' }}>
                                    <Stack direction="row" alignItems="center" spacing={2}>
                                        <Avatar src={customer.avatar} sx={{ width: 40, height: 40 }} />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{customer.fullName}</Typography>
                                    </Stack>
                                </TableCell>
                                <TableCell sx={{ borderBottom: 'dashed 1px var(--palette-divider)', fontWeight: 600 }}>{customer.totalOrders ?? 0}</TableCell>
                                <TableCell sx={{ borderBottom: 'dashed 1px var(--palette-divider)', fontWeight: 600 }}>{(customer.totalSpent ?? 0).toLocaleString()}đ</TableCell>
                                <TableCell align="right" sx={{ borderBottom: 'dashed 1px var(--palette-divider)' }}>
                                    <Box
                                        sx={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '6px',
                                            px: 1,
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            color: index < 3 ? 'var(--palette-success-dark)' : 'var(--palette-text-secondary)',
                                            bgcolor: index < 3 ? 'rgba(34, 197, 94, 0.16)' : 'rgba(145, 158, 171, 0.16)',
                                        }}
                                    >
                                        #{index + 1}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </DashboardCard>
    );
};

export const EcommercePage = () => {
    const { user } = useAuthStore();
    const [activeIndex, setActiveIndex] = useState(0);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await getEcommerceStats();
                if (response.success) {
                    setStats(response.data);
                }
            } catch (error) {
                console.error("Failed to fetch ecommerce stats:", error);
            }
        };
        fetchStats();
    }, []);

    const featuredTickets = [
        {
            name: "Urban Explorer Sneakers",
            description: "NEW",
            image: "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/cover/cover-1.webp",
        },
        {
            name: "Retro Runner Shoes",
            description: "HOT",
            image: "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/cover/cover-2.webp",
        },
        {
            name: "Classic Leather Boots",
            description: "CLASSIC",
            image: "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/cover/cover-3.webp",
        }
    ];

    const handleNext = () => setActiveIndex((prev) => (prev + 1) % featuredTickets.length);
    const handlePrev = () => setActiveIndex((prev) => (prev - 1 + featuredTickets.length) % featuredTickets.length);

    return (
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
                    title={`Chào mừng quay trở lại 👋\n` + (user?.fullName || 'Admin')}
                    description="Hôm nay có gì mới? Hãy kiểm tra các chỉ số kinh doanh và lịch đặt gần đây."
                    img="https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/illustrations/characters/character-present.webp"
                />
            </Grid>

            {/* Featured Ticket Slide */}
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
                        position: 'relative'
                    }}
                >
                    <div className="m-auto max-w-full overflow-hidden relative h-full">
                        <ul
                            className="flex list-none p-0 m-0 h-full transition-transform duration-500 ease-in-out"
                            style={{ transform: `translate3d(-${activeIndex * 100}%, 0px, 0px)` }}
                        >
                            {featuredTickets.map((item, index) => (
                                <li key={index} className="block relative min-w-0 flex-[0_0_100%] h-full">
                                    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
                                        <div className="absolute bottom-0 z-[9] w-full p-[calc(3*var(--spacing))] flex flex-col gap-[var(--spacing)] text-[var(--palette-common-white)]">
                                            <span className="m-0 font-bold text-[0.75rem] uppercase text-[var(--palette-success-light)]">
                                                {item.description}
                                            </span>
                                            <Typography
                                                variant="h5"
                                                sx={{
                                                    fontWeight: 700,
                                                    fontSize: '1.25rem',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    color: 'inherit',
                                                }}
                                            >
                                                {item.name}
                                            </Typography>
                                        </div>
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 0, left: 0, right: 0, bottom: 0,
                                                background: 'linear-gradient(to bottom, rgba(22, 28, 36, 0) 0%, rgba(22, 28, 36, 1) 100%)',
                                                zIndex: 8
                                            }}
                                        />
                                        <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </Box>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="flex items-center absolute top-[calc(1.5*var(--spacing))] right-[calc(1.5*var(--spacing))] z-[9] text-[var(--palette-common-white)]">
                        <button type="button" onClick={handlePrev} className="inline-flex items-center justify-center relative bg-transparent cursor-pointer rounded-full p-[var(--spacing)] border-none transition-all duration-250 ease-[cubic-bezier(0.4,0,0.6,1)] hover:bg-[rgba(255,255,255,0.08)]">
                            <Icon icon="eva:chevron-left-fill" width={20} />
                        </button>
                        <button type="button" onClick={handleNext} className="inline-flex items-center justify-center relative bg-transparent cursor-pointer rounded-full p-[var(--spacing)] border-none transition-all duration-250 ease-[cubic-bezier(0.4,0,0.6,1)] hover:bg-[rgba(255,255,255,0.08)]">
                            <Icon icon="eva:chevron-right-fill" width={20} />
                        </button>
                    </div>
                </DashboardCard>
            </Grid>

            {/* Stats Summary Section */}
            <Grid sx={{ flexGrow: 0, flexBasis: 'auto', width: 'calc(100% * 4 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 4) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))' }}>
                <SummaryWidget title="Tổng sản phẩm" total={stats?.summary?.totalTickets?.toString() || "0"} percent={0} color="#FF3030" chartData={[25, 66, 41, 89, 63, 25, 44, 12]} />
            </Grid>
            <Grid sx={{ flexGrow: 0, flexBasis: 'auto', width: 'calc(100% * 4 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 4) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))' }}>
                <SummaryWidget
                    title="T?ng don h�ng"
                    total={stats?.summary?.totalOrders?.toString() || "0"}
                    percent={0}
                    color="#ffab00"
                    chartData={[15, 32, 45, 32, 56, 32, 44, 55]}
                    recentSources={stats?.recentOrders?.map((o: any) => ({
                        id: o._id,
                        label: o.userId?.fullName || o.fullName || "Kh�ch h�ng",
                        amount: o.total - (o.shipping?.fee || 0),
                        time: o.createdAt,
                        type: 'order'
                    }))}
                />
            </Grid>
            <Grid sx={{ flexGrow: 0, flexBasis: 'auto', width: 'calc(100% * 4 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 4) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))' }}>
                <SummaryWidget
                    title="Doanh thu th�ng"
                    total={(stats?.summary?.monthlyRevenue?.toLocaleString() || "0") + "d"}
                    percent={stats?.summary?.revenueMonthPercent || 0}
                    color="#00b8d9"
                    chartData={[56, 44, 32, 45, 32, 15, 25, 12]}
                    recentSources={stats?.summary?.recentRevenueSources}
                />
            </Grid>

            <Grid sx={{ flexGrow: 0, flexBasis: 'auto', width: 'calc(100% * 4 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 4) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))' }}>
                <SalesByCategory data={stats?.topCategories} />
            </Grid>
            <Grid sx={{ flexGrow: 0, flexBasis: 'auto', width: 'calc(100% * 8 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 8) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))' }}>
                <YearlySales data={stats?.yearlyRevenueChart?.total ?? stats?.yearlyRevenueChart} />
            </Grid>

            <Grid sx={{ flexGrow: 0, flexBasis: 'auto', width: 'calc(100% * 8 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 8) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))' }}>
                <TopCustomers customers={stats?.topCustomers} />
            </Grid>
        </Grid>
    );
};

export default EcommercePage;
