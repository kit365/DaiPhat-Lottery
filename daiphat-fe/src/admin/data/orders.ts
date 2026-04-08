export const mockOrders = [
    {
        _id: "ORD001",
        code: "WDP-001",
        customerName: "Nguyễn Văn A (Mock)",
        phone: "0987123456",
        total: 1250000,
        paymentStatus: "paid",
        orderStatus: "completed",
        paymentMethod: "vnpay",
        createdAt: "2024-03-20T10:30:00Z"
    },
    {
        _id: "ORD002",
        code: "WDP-002",
        customerName: "Trần Thị B (Mock)",
        phone: "0912345678",
        total: 450000,
        paymentStatus: "unpaid",
        orderStatus: "pending",
        paymentMethod: "cod",
        createdAt: "2024-03-21T09:15:00Z"
    },
    {
        _id: "ORD003",
        code: "WDP-003",
        customerName: "Lê Văn C (Mock)",
        phone: "0934567890",
        total: 890000,
        paymentStatus: "paid",
        orderStatus: "shipping",
        paymentMethod: "momo",
        createdAt: "2024-03-21T14:45:00Z"
    }
];
