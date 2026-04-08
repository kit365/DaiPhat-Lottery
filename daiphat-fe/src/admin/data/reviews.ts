export const mockReviews = [
    {
        _id: "R1",
        targetName: "Royal Canin (Mock)",
        customerName: "Nguyễn Văn A",
        rating: 5,
        comment: "Sản phẩm rất tốt, chó nhà mình ăn rất ngon miệng!",
        status: "approved",
        createdAt: new Date().toISOString()
    },
    {
        _id: "R2",
        targetName: "Combo Spa (Mock)",
        customerName: "Trần Thị B",
        rating: 4,
        comment: "Nhân viên nhiệt tình, tắm sạch sẽ.",
        status: "pending",
        createdAt: new Date(Date.now() - 3600000).toISOString()
    }
];
