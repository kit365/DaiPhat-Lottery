export const mockTicketServiceOrders = [
    {
        _id: "BK1",
        code: "MN000001",
        userId: {
            fullName: "Nguyễn Văn A",
            email: "nguyenvana@gmail.com",
            phone: "0123456789",
            avatar: "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/avatar/avatar-1.webp"
        },
        ticketServiceId: { name: "Mua hộ XSMN" },
        start: new Date().toISOString(),
        total: 50000,
        ticketServiceOrderStatus: "pending",
        ticketIds: ["T1"],
        ticketStaffMap: [
            {
                ticketId: { _id: "T1", name: "Vé TP.HCM", type: "Vé số", provider: "XS Miền Nam", quantity: 5, avatar: "" },
                staffId: { _id: "S1", fullName: "Nhân viên B" },
                status: "pending"
            }
        ]
    },
    {
        _id: "BK2",
        code: "MN000002",
        userId: {
            fullName: "Trần Thị C",
            email: "trantic@gmail.com",
            phone: "0987654321",
            avatar: "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/avatar/avatar-2.webp"
        },
        ticketServiceId: { name: "Mua hộ XSMN" },
        start: new Date().toISOString(),
        total: 100000,
        ticketServiceOrderStatus: "in-progress",
        ticketIds: ["T2"],
        ticketStaffMap: [
            {
                ticketId: { _id: "T2", name: "Vé Tiền Giang", type: "Vé số", provider: "XS Miền Nam", quantity: 10, avatar: "" },
                staffId: { _id: "admin", fullName: "Admin User" },
                status: "in-progress"
            }
        ]
    }
];
