export const mockEcommerceStats = {
    summary: {
        totalRevenue: 254780000,
        totalOrders: 345,
        totalTicketServiceOrders: 185,
        totalTickets: 1245,
        totalUsers: 2240,
        monthlyRevenue: 85000000,
        revenueMonthPercent: 15.5,
        shopRevenue: 58000000,
        ticketServiceRevenue: 27000000,
        allTimeRevenue: {
            total: 254780000,
            shop: 195000000,
            ticketService: 59780000,
        },
        recentRevenueSources: [
            { id: 1, type: 'order', label: 'Vé số TP.HCM', amount: 1250000, time: new Date().toISOString() },
            { id: 2, type: 'ticketServiceOrder', label: 'Dịch vụ Mua hộ', amount: 850000, time: new Date().toISOString() },
            { id: 3, type: 'order', label: 'Vé số Miền Bắc', amount: 450000, time: new Date().toISOString() },
            { id: 4, type: 'ticketServiceOrder', label: 'Dịch vụ Tra cứu', amount: 1200000, time: new Date().toISOString() }
        ]
    },
    yearlyRevenueChart: {
        total: [40, 55, 65, 50, 75, 85, 70, 95, 100, 90, 110, 130].map(v => v * 1000000),
        shop: [25, 35, 45, 30, 50, 55, 45, 65, 70, 60, 75, 85].map(v => v * 1000000),
        ticketService: [15, 20, 20, 20, 25, 30, 25, 30, 30, 30, 35, 45].map(v => v * 1000000),
    },
    // Fields for OrderStatisticsPage
    totalOrders: 345,
    pendingOrders: 12,
    confirmedOrders: 28,
    thisMonthRevenue: 85000000,
    orderDistribution: [
        { _id: 'pending', count: 45 },
        { _id: 'confirmed', count: 82 },
        { _id: 'shipping', count: 34 },
        { _id: 'completed', count: 156 },
        { _id: 'cancelled', count: 28 }
    ],
    topTickets: [
        { name: 'XS TP.HCM', totalQuantity: 1200 },
        { name: 'Vietlott 6/45', totalQuantity: 850 },
        { name: 'XS Cần Thơ', totalQuantity: 640 },
        { name: 'XS Miền Bắc', totalQuantity: 420 },
        { name: 'Power 6/55', totalQuantity: 310 }
    ],
    revenueTrend: [
        { month: 'T1', total: 45000000 },
        { month: 'T2', total: 52000000 },
        { month: 'T3', total: 48000000 },
        { month: 'T4', total: 65000000 },
        { month: 'T5', total: 72000000 },
        { month: 'T6', total: 85000000 }
    ],
    recentRevenueSources: [
        { id: 1, type: 'order', label: 'Đơn hàng #1234', amount: 1250000, time: new Date().toISOString() },
        { id: 2, type: 'order', label: 'Đơn hàng #1235', amount: 850000, time: new Date().toISOString() }
    ],
    // Fields for TicketServiceStatisticsPage
    popularTicketServices: [
        { _id: 'Mua hộ vé số', count: 124 },
        { _id: 'Tra cứu KQXS', count: 85 },
        { _id: 'Soi cầu VIP', count: 42 }
    ],
    staffPerformance: [
        { name: 'Nguyễn Staff A', count: 54 },
        { name: 'Trần Staff B', count: 42 },
        { name: 'Lê Staff C', count: 38 }
    ],
    totalTicketServiceOrders: 185,
    pendingTicketServiceOrders: 8,
    confirmedTicketServiceOrders: 15,
    // Fields for StaffStatisticsPage
    ticketServicePerformance: [
        { _id: '1', name: 'Nguyễn Staff A', count: 54 },
        { _id: '2', name: 'Trần Staff B', count: 42 },
        { _id: '3', name: 'Lê Staff C', count: 38 },
        { _id: '4', name: 'Phạm Staff D', count: 25 },
        { _id: '5', name: 'Hoàng Staff E', count: 18 }
    ],
    workAttendance: [
        { name: 'Ca Sáng', count: 4 },
        { name: 'Ca Chiều', count: 5 },
        { name: 'Ca Tối', count: 3 }
    ]
};

export const mockAnalyticsStats = {
    weeklySales: {
        total: 5250000,
        percent: 12.5,
        data: [4000, 5200, 3900, 6500, 5100, 7300, 6250],
        allTime: {
            total: 254780000
        },
        recentRevenueSources: [
            { id: 1, type: 'order', label: 'Vé số', amount: 125000, time: new Date().toISOString() },
            { id: 2, type: 'order', label: 'Dịch vụ', amount: 85000, time: new Date().toISOString() }
        ]
    },
    newUsers: {
        total: 148,
        percent: 25.2,
        data: [15, 18, 14, 22, 16, 20, 13]
    },
    purchaseOrders: {
        total: 456,
        percent: 5.4,
        data: [35, 42, 38, 55, 40, 58, 48]
    },
    tickets: {
        total: 3842,
        percent: 10.8,
        data: [320, 335, 342, 356, 378, 390, 321]
    },
    orderDistribution: [
        { label: 'Hoàn thành', value: 65 },
        { label: 'Đang xử lý', value: 15.2 },
        { label: 'Chờ thanh toán', value: 12.1 },
        { label: 'Đã hủy', value: 7.7 }
    ],
    websiteVisits: [2200, 2500, 2800, 3400, 3100, 3800, 4200, 4500, 4800, 5200, 5500, 5800]
};

export const mockSystemStats = {
    systemStats: {
        users: { total: 2240, percent: 15.5, trend: [40, 55, 45, 75, 65, 85, 70] },
        admins: { total: 12, percent: 0, trend: [12, 12, 12, 12, 12, 12, 12] },
        tickets: { total: 3842, percent: 10.8, trend: [320, 335, 342, 356, 378, 390, 321] }
    },
    regionDistribution: [
        { label: 'Miền Nam', count: 1450 },
        { label: 'Miền Bắc', count: 1120 },
        { label: 'Miền Trung', count: 845 },
        { label: 'Vietlott', count: 427 }
    ],
    ticketServiceUsage: [
        { name: 'Mua hộ vé số', count: 456 },
        { name: 'Dò số tự động', count: 284 },
        { name: 'Soi cầu VIP', count: 142 }
    ],
    newTickets: [
        { _id: '1', name: 'XS TP.HCM - Thứ 2', priceNew: 10000, status: 'active' },
        { _id: '2', name: 'Vietlott 6/45', priceNew: 10000, status: 'active' },
        { _id: '3', name: 'XS Tiền Giang - CN', priceNew: 10000, status: 'active' }
    ],
    topSellingTickets: [
        { _id: '1', name: 'XS TP.HCM', image: '', totalQuantity: 1560, totalRevenue: 15600000 },
        { _id: '2', name: 'Vietlott Jackpot', image: '', totalQuantity: 1320, totalRevenue: 13200000 },
        { _id: '3', name: 'XS Miền Bắc', image: '', totalQuantity: 850, totalRevenue: 8500000 }
    ],
    topCustomers: [
        { _id: '1', fullName: 'Nguyễn Văn A', avatar: '', totalSpent: 15400000 },
        { _id: '2', fullName: 'Trần Thị B', avatar: '', totalSpent: 12800000 },
        { _id: '3', fullName: 'Lê Văn C', avatar: '', totalSpent: 9600000 }
    ],
    cpu: 12,
    memory: 28,
    storage: 45,
    status: 'online',
    uptime: '45d 10h 15m'
};
