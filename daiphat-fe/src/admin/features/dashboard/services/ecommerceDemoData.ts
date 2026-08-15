import type { AdminEcommerceOverview } from "./dashboardService";

const now = () => new Date().toISOString();
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

/** Bật khi BE chưa có số liệu — tắt khi API overview đã đủ data live. */
export const FORCE_ECOMMERCE_DEMO = true;

/** Dữ liệu mẫu khi BE chưa có số liệu — gỡ khi live data đủ. */
export const DEMO_ECOMMERCE_OVERVIEW: AdminEcommerceOverview = {
    summary: {
        totalTickets: 1_248,
        totalOrders: 386,
        monthlyRevenue: 86_450_000,
        revenueMonthPercent: 12.4,
    },
    soldTicketsThisMonth: 3_842,
    ordersThisMonth: 164,
    allTimeRevenue: 254_780_000,
    actionItems: [
        { type: "PENDING_PAYMENT", label: "Chờ thanh toán", count: 18 },
        { type: "PREPARING", label: "Đang chuẩn bị vé", count: 12 },
        { type: "PENDING_PICKUP", label: "Chờ khách lấy vé", count: 9 },
        { type: "RESERVED", label: "Vé đang giữ chỗ", count: 27 },
        { type: "VENDOR_HELD", label: "Vé người bán đang giữ", count: 64 },
    ],
    orderDistribution: [
        { type: "PENDING_PAYMENT", label: "Chờ thanh toán", count: 18 },
        { type: "PAID", label: "Đã thanh toán", count: 42 },
        { type: "PREPARING", label: "Đang chuẩn bị vé", count: 12 },
        { type: "PENDING_PICKUP", label: "Chờ khách lấy vé", count: 9 },
        { type: "COMPLETED", label: "Hoàn tất", count: 278 },
        { type: "CANCELLED", label: "Đã hủy", count: 27 },
    ],
    serialDistribution: [
        { type: "IN_STOCK", label: "Trong kho", count: 1_560 },
        { type: "RESERVED", label: "Đang giữ chỗ", count: 86 },
        { type: "SOLD", label: "Đã bán", count: 3_842 },
        { type: "WITH_STREET_AGENT", label: "Người bán giữ", count: 214 },
        { type: "PROXY_HOLDING", label: "Đại lý giữ hộ", count: 48 },
        { type: "EXPIRED", label: "Hết hạn", count: 31 },
    ],
    dailyRevenue: [
        { date: "02/08", amount: 4_200_000 },
        { date: "03/08", amount: 5_150_000 },
        { date: "04/08", amount: 4_680_000 },
        { date: "05/08", amount: 6_240_000 },
        { date: "06/08", amount: 5_890_000 },
        { date: "07/08", amount: 7_320_000 },
        { date: "08/08", amount: 8_100_000 },
        { date: "09/08", amount: 6_750_000 },
        { date: "10/08", amount: 5_430_000 },
        { date: "11/08", amount: 7_880_000 },
        { date: "12/08", amount: 9_150_000 },
        { date: "13/08", amount: 8_420_000 },
        { date: "14/08", amount: 7_640_000 },
        { date: "15/08", amount: 6_980_000 },
    ],
    topStations: [
        { stationId: "1", stationName: "TP.HCM", soldQuantity: 1_240 },
        { stationId: "2", stationName: "Đồng Tháp", soldQuantity: 860 },
        { stationId: "3", stationName: "Cần Thơ", soldQuantity: 640 },
        { stationId: "4", stationName: "Bến Tre", soldQuantity: 420 },
        { stationId: "5", stationName: "Vũng Tàu", soldQuantity: 310 },
    ],
    topCustomers: [
        { customerName: "Nguyễn Văn A", orderCount: 24, totalSpent: 15_400_000 },
        { customerName: "Trần Thị B", orderCount: 18, totalSpent: 12_800_000 },
        { customerName: "Lê Văn C", orderCount: 12, totalSpent: 9_600_000 },
        { customerName: "Phạm Thị D", orderCount: 9, totalSpent: 7_200_000 },
        { customerName: "Hoàng Văn E", orderCount: 7, totalSpent: 5_450_000 },
    ],
    inventoryRisks: [
        { stationId: "1", stationName: "TP.HCM", drawDate: "2026-08-16", sellableQuantity: 42, vendorHeldQuantity: 88, risk: "CAO" },
        { stationId: "2", stationName: "Đồng Tháp", drawDate: "2026-08-17", sellableQuantity: 120, vendorHeldQuantity: 54, risk: "TRUNG BÌNH" },
        { stationId: "3", stationName: "Cần Thơ", drawDate: "2026-08-16", sellableQuantity: 210, vendorHeldQuantity: 36, risk: "THẤP" },
        { stationId: "4", stationName: "Bến Tre", drawDate: "2026-08-18", sellableQuantity: 18, vendorHeldQuantity: 40, risk: "CAO" },
        { stationId: "5", stationName: "Vũng Tàu", drawDate: "2026-08-17", sellableQuantity: 95, vendorHeldQuantity: 22, risk: "THẤP" },
    ],
    vendorRisks: [
        { vendorName: "Đại lý Hùng Phát", heldQuantity: 86, status: "Cần xử lý" },
        { vendorName: "Đại lý Minh Ngọc", heldQuantity: 54, status: "Chờ kiểm" },
        { vendorName: "Đại lý Ánh Dương", heldQuantity: 41, status: "Đang giữ vé" },
        { vendorName: "Đại lý Phú An", heldQuantity: 28, status: "Đang giữ vé" },
    ],
    recentOrders: [
        { id: "1", orderCode: "DP-24081", customerName: "Nguyễn Văn A", total: 1_250_000, status: "Hoàn tất", createdAt: hoursAgo(1) },
        { id: "2", orderCode: "DP-24082", customerName: "Trần Thị B", total: 850_000, status: "Đang chuẩn bị vé", createdAt: hoursAgo(3) },
        { id: "3", orderCode: "DP-24083", customerName: "Lê Văn C", total: 450_000, status: "Chờ khách lấy vé", createdAt: hoursAgo(5) },
        { id: "4", orderCode: "DP-24084", customerName: "Phạm Thị D", total: 2_100_000, status: "Hoàn tất", createdAt: hoursAgo(8) },
        { id: "5", orderCode: "DP-24085", customerName: "Hoàng Văn E", total: 320_000, status: "Chờ thanh toán", createdAt: hoursAgo(11) },
        { id: "6", orderCode: "DP-24086", customerName: "Võ Thị F", total: 680_000, status: "Đã thanh toán", createdAt: now() },
    ],
};

export const DEMO_KPI_SPARKLINES = {
    openTickets: [980, 1020, 1080, 1110, 1180, 1210, 1248],
    soldMonth: [2400, 2680, 2910, 3120, 3380, 3610, 3842],
    revenueMonth: [4.2, 5.2, 4.7, 6.2, 5.9, 7.3, 8.1, 6.8, 5.4, 7.9, 9.2, 8.4, 7.6, 7.0],
    totalOrders: [280, 300, 318, 340, 358, 372, 386],
    ordersMonth: [90, 105, 118, 130, 142, 154, 164],
    allTimeRevenue: [180, 195, 210, 222, 235, 245, 255],
};

export const isEcommerceOverviewEmpty = (data?: AdminEcommerceOverview | null) => {
    if (!data) return true;
    const noKpi =
        !data.summary?.totalOrders &&
        !data.summary?.monthlyRevenue &&
        !data.soldTicketsThisMonth &&
        !data.ordersThisMonth;
    const noLists =
        !(data.recentOrders?.length) &&
        !(data.dailyRevenue?.some((point) => point.amount > 0)) &&
        !(data.topStations?.length) &&
        !(data.actionItems?.length);
    return Boolean(noKpi && noLists);
};
