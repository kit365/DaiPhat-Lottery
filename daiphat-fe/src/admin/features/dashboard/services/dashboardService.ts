import { apiApp } from '@/api';
import type { ApiResponse } from '@/types/api.type';

const BASE_URL = '/admin/dashboard';

/** Placeholder stats — BE chưa có endpoint dashboard đầy đủ. */
const ECOMMERCE_STATS = {
    summary: {
        totalRevenue: 254_780_000,
        totalOrders: 345,
        totalTicketServiceOrders: 185,
        totalTickets: 1_245,
        totalUsers: 2_240,
        monthlyRevenue: 85_000_000,
        revenueMonthPercent: 15.5,
        shopRevenue: 58_000_000,
        ticketServiceRevenue: 27_000_000,
        allTimeRevenue: {
            total: 254_780_000,
            shop: 195_000_000,
            ticketService: 59_780_000,
        },
        recentRevenueSources: [
            { id: 1, type: 'order', label: 'Vé số TP.HCM', amount: 1_250_000, time: new Date().toISOString() },
            { id: 2, type: 'ticketServiceOrder', label: 'Dịch vụ Mua hộ', amount: 850_000, time: new Date().toISOString() },
            { id: 3, type: 'order', label: 'Vé số Miền Bắc', amount: 450_000, time: new Date().toISOString() },
            { id: 4, type: 'ticketServiceOrder', label: 'Dịch vụ Tra cứu', amount: 1_200_000, time: new Date().toISOString() },
        ],
    },
    yearlyRevenueChart: {
        total: [40, 55, 65, 50, 75, 85, 70, 95, 100, 90, 110, 130].map((v) => v * 1_000_000),
        shop: [25, 35, 45, 30, 50, 55, 45, 65, 70, 60, 75, 85].map((v) => v * 1_000_000),
        ticketService: [15, 20, 20, 20, 25, 30, 25, 30, 30, 30, 35, 45].map((v) => v * 1_000_000),
    },
    totalOrders: 345,
    pendingOrders: 12,
    confirmedOrders: 28,
    thisMonthRevenue: 85_000_000,
    orderDistribution: [
        { _id: 'pending', count: 45 },
        { _id: 'confirmed', count: 82 },
        { _id: 'shipping', count: 34 },
        { _id: 'completed', count: 156 },
        { _id: 'cancelled', count: 28 },
    ],
    topTickets: [
        { name: 'XS TP.HCM', totalQuantity: 1200 },
        { name: 'Vietlott 6/45', totalQuantity: 850 },
        { name: 'XS Cần Thơ', totalQuantity: 640 },
        { name: 'XS Miền Bắc', totalQuantity: 420 },
        { name: 'Power 6/55', totalQuantity: 310 },
    ],
    revenueTrend: [
        { month: 'T1', total: 45_000_000 },
        { month: 'T2', total: 52_000_000 },
        { month: 'T3', total: 48_000_000 },
        { month: 'T4', total: 65_000_000 },
        { month: 'T5', total: 72_000_000 },
        { month: 'T6', total: 85_000_000 },
    ],
    recentRevenueSources: [
        { id: 1, type: 'order', label: 'Đơn hàng #1234', amount: 1_250_000, time: new Date().toISOString() },
        { id: 2, type: 'order', label: 'Đơn hàng #1235', amount: 850_000, time: new Date().toISOString() },
    ],
    popularTicketServices: [
        { _id: 'Mua hộ vé số', count: 124 },
        { _id: 'Tra cứu KQXS', count: 85 },
        { _id: 'Soi cầu VIP', count: 42 },
    ],
    staffPerformance: [
        { name: 'Nguyễn Staff A', count: 54 },
        { name: 'Trần Staff B', count: 42 },
        { name: 'Lê Staff C', count: 38 },
    ],
    totalTicketServiceOrders: 185,
    pendingTicketServiceOrders: 8,
    confirmedTicketServiceOrders: 15,
    ticketServicePerformance: [
        { _id: '1', name: 'Nguyễn Staff A', count: 54 },
        { _id: '2', name: 'Trần Staff B', count: 42 },
        { _id: '3', name: 'Lê Staff C', count: 38 },
        { _id: '4', name: 'Phạm Staff D', count: 25 },
        { _id: '5', name: 'Hoàng Staff E', count: 18 },
    ],
    workAttendance: [
        { name: 'Ca Sáng', count: 4 },
        { name: 'Ca Chiều', count: 5 },
        { name: 'Ca Tối', count: 3 },
    ],
    topCategories: [
        { label: 'Vé số', total: 195_000_000 },
        { label: 'Dịch vụ', total: 59_780_000 },
    ],
    topCustomers: [
        { _id: '1', fullName: 'Nguyễn Văn A', avatar: '', totalOrders: 24, totalSpent: 15_400_000 },
        { _id: '2', fullName: 'Trần Thị B', avatar: '', totalOrders: 18, totalSpent: 12_800_000 },
        { _id: '3', fullName: 'Lê Văn C', avatar: '', totalOrders: 12, totalSpent: 9_600_000 },
        { _id: '4', fullName: 'Phạm Thị D', avatar: '', totalOrders: 9, totalSpent: 7_200_000 },
        { _id: '5', fullName: 'Hoàng Văn E', avatar: '', totalOrders: 7, totalSpent: 5_450_000 },
    ],
    recentOrders: [
        {
            _id: 'ord-1234',
            fullName: 'Nguyễn Văn A',
            total: 1_250_000,
            createdAt: new Date().toISOString(),
            shipping: { fee: 0 },
        },
        {
            _id: 'ord-1235',
            fullName: 'Trần Thị B',
            total: 850_000,
            createdAt: new Date(Date.now() - 3_600_000).toISOString(),
            shipping: { fee: 0 },
        },
        {
            _id: 'ord-1236',
            fullName: 'Lê Văn C',
            total: 450_000,
            createdAt: new Date(Date.now() - 7_200_000).toISOString(),
            shipping: { fee: 30_000 },
        },
        {
            _id: 'ord-1237',
            fullName: 'Phạm Thị D',
            total: 2_100_000,
            createdAt: new Date(Date.now() - 10_800_000).toISOString(),
            shipping: { fee: 0 },
        },
    ],
} as const;

const ANALYTICS_STATS = {
    weeklySales: {
        total: 5_250_000,
        percent: 12.5,
        data: [4000, 5200, 3900, 6500, 5100, 7300, 6250],
        allTime: { total: 254_780_000 },
        recentRevenueSources: [
            { id: 1, type: 'order', label: 'Vé số', amount: 125_000, time: new Date().toISOString() },
            { id: 2, type: 'order', label: 'Dịch vụ', amount: 85_000, time: new Date().toISOString() },
        ],
    },
    newUsers: { total: 148, percent: 25.2, data: [15, 18, 14, 22, 16, 20, 13] },
    purchaseOrders: { total: 456, percent: 5.4, data: [35, 42, 38, 55, 40, 58, 48] },
    tickets: { total: 3842, percent: 10.8, data: [320, 335, 342, 356, 378, 390, 321] },
    orderDistribution: [
        { label: 'Hoàn thành', value: 65 },
        { label: 'Đang xử lý', value: 15.2 },
        { label: 'Chờ thanh toán', value: 12.1 },
        { label: 'Đã hủy', value: 7.7 },
    ],
    websiteVisits: [2200, 2500, 2800, 3400, 3100, 3800, 4200, 4500, 4800, 5200, 5500, 5800],
} as const;

const SYSTEM_STATS = {
    systemStats: {
        users: { total: 2240, percent: 15.5, trend: [40, 55, 45, 75, 65, 85, 70] },
        admins: { total: 12, percent: 0, trend: [12, 12, 12, 12, 12, 12, 12] },
        tickets: { total: 3842, percent: 10.8, trend: [320, 335, 342, 356, 378, 390, 321] },
    },
    regionDistribution: [
        { label: 'Miền Nam', count: 1450 },
        { label: 'Miền Bắc', count: 1120 },
        { label: 'Miền Trung', count: 845 },
        { label: 'Vietlott', count: 427 },
    ],
    ticketServiceUsage: [
        { name: 'Mua hộ vé số', count: 456 },
        { name: 'Dò số tự động', count: 284 },
        { name: 'Soi cầu VIP', count: 142 },
    ],
    newTickets: [
        { _id: '1', name: 'XS TP.HCM - Thứ 2', priceNew: 10000, status: 'active' },
        { _id: '2', name: 'Vietlott 6/45', priceNew: 10000, status: 'active' },
        { _id: '3', name: 'XS Tiền Giang - CN', priceNew: 10000, status: 'active' },
    ],
    topSellingTickets: [
        { _id: '1', name: 'XS TP.HCM', image: '', totalQuantity: 1560, totalRevenue: 15_600_000 },
        { _id: '2', name: 'Vietlott Jackpot', image: '', totalQuantity: 1320, totalRevenue: 13_200_000 },
        { _id: '3', name: 'XS Miền Bắc', image: '', totalQuantity: 850, totalRevenue: 8_500_000 },
    ],
    topCustomers: [
        { _id: '1', fullName: 'Nguyễn Văn A', avatar: '', totalSpent: 15_400_000 },
        { _id: '2', fullName: 'Trần Thị B', avatar: '', totalSpent: 12_800_000 },
        { _id: '3', fullName: 'Lê Văn C', avatar: '', totalSpent: 9_600_000 },
    ],
    cpu: 12,
    memory: 28,
    storage: 45,
    status: 'online',
    uptime: '45d 10h 15m',
} as const;

const mockSuccess = <T>(data: T) => ({ success: true, data });

export const getEcommerceStats = async () => mockSuccess(ECOMMERCE_STATS);

export const getAnalyticsStats = async () => mockSuccess(ANALYTICS_STATS);

export const getSystemStats = async () => mockSuccess(SYSTEM_STATS);

export const getDetailedOrderStats = async (_startDate?: string, _endDate?: string) =>
    mockSuccess(ECOMMERCE_STATS);

export const getDetailedStaffStats = async (_startDate?: string, _endDate?: string) =>
    mockSuccess(ECOMMERCE_STATS);

export const getStaffingStatus = async (date?: string) => {
    const response = await apiApp.get(`${BASE_URL}/staffing-status`, {
        params: { date },
        skipGlobalErrorToast: true,
    });
    return response.data as ApiResponse<unknown>;
};
