export const mockCoupons = [
    {
        _id: "CP1",
        code: "LUCKY2024",
        name: "Đại Phát Khởi Đầu 2024",
        description: "Giảm 10% cho tất cả các loại vé số",
        typeDiscount: "percentage",
        value: 10,
        minOrderValue: 500000,
        maxDiscountValue: 100000,
        usageLimit: 100,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        status: "active",
        createdAt: new Date().toISOString()
    },
    {
        _id: "CP2",
        code: "FREESHIP100",
        name: "Miễn Phí Vận Chuyển",
        description: "Giảm 30k phí vận chuyển cho đơn từ 1tr",
        typeDiscount: "fixed",
        value: 30000,
        minOrderValue: 1000000,
        maxDiscountValue: 30000,
        usageLimit: 500,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        status: "active",
        createdAt: new Date().toISOString()
    }
];
