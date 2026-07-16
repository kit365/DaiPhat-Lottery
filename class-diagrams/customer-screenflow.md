# Customer Screenflow — DaiPhat Lottery Platform

```mermaid
flowchart LR

    %% ── START ──
    Start([Bắt đầu]) --> AuthCheck{Đã đăng nhập?}

    %% ── AUTH FLOW ──
    AuthCheck -->|Chưa| LoginPage[Trang Đăng nhập\n/login]
    AuthCheck -->|Rồi| HomePage

    LoginPage --> ForgotPw[Quên mật khẩu\n/forgot-password]
    ForgotPw --> ResetPw[Nhập OTP &\nđặt lại mật khẩu]
    ResetPw --> LoginPage

    LoginPage --> RegisterPage[Trang Đăng ký\n/register]
    RegisterPage --> VerifyOTP[Xác thực OTP]
    VerifyOTP --> ProfileSetup[Thiết lập hồ sơ\nlần đầu]
    ProfileSetup --> HomePage

    LoginPage -->|Đăng nhập thành công| HomePage

    %% ── HOME PAGE ──
    HomePage[Trang chủ\n/] --> BuyTicket[Mua vé\n/buy-ticket]
    HomePage --> Schedule[Lịch mở thưởng\n/lich-mo-thuong]
    HomePage --> BlogList[Danh sách tin tức\n/blogs]
    HomePage --> ProfileArea[Hồ sơ cá nhân\n/profile]
    HomePage --> Chatbot[Chatbot hỗ trợ]

    %% ── BUY TICKET FLOW ──
    BuyTicket --> |Chọn vé| AddToCart{Thêm vào\ngiỏ hàng}
    AddToCart -->|Chưa đăng nhập| LoginPage
    AddToCart -->|Đã đăng nhập| CartPage[Giỏ hàng\n/cart]

    CartPage --> |Điều chỉnh số lượng| CartPage
    CartPage --> |Tiến hành đặt mua| CheckoutPage[Xác nhận đơn hàng\n/checkout]

    CheckoutPage --> |Chọn ngày giờ nhận vé| PickupTime[Chọn thời gian nhận\n CheckoutDateTimePicker]
    PickupTime --> CheckoutPage
    CheckoutPage --> |Xác nhận| PayOS[Cổng thanh toán\nPayOS]

    PayOS --> PayResult{Kết quả\nthanh toán}
    PayResult -->|Thành công\n/checkout/result| CheckoutSuccess[Đặt hàng thành công\nCheckout Result Page]
    PayResult -->|Huỷ\n/payment/payos/cancel| CheckoutCancel[Đặt hàng bị huỷ\nCheckout Result Page]
    PayResult -->|Lỗi| CheckoutFail[Thanh toán thất bại\nCheckout Result Page]

    CheckoutCancel -->|Thử lại| CartPage
    CheckoutFail -->|Thử lại| CartPage
    CheckoutSuccess --> ProfileOrders[Đơn hàng của tôi\n/profile/orders]

    %% ── BLOG FLOW ──
    BlogList --> BlogDetail[Chi tiết bài viết\n/blogs/detail/:slug]

    %% ── SCHEDULE PAGE ──
    Schedule --> HomePage

    %% ── PROFILE FLOW ──
    ProfileArea --> Overview[Tổng quan\n/profile/overview]
    ProfileArea --> ProfileInfo[Thông tin cá nhân\n/profile/info]
    ProfileArea --> ProfileOrders[Đơn hàng của tôi\n/profile/orders]
    ProfileArea --> RefundList[Yêu cầu hoàn tiền\n/profile/refunds]
    ProfileArea --> ComplaintList[Khiếu nại\n/profile/complaints]
    ProfileArea --> BankAccounts[Tài khoản ngân hàng\n/profile/bank-accounts]
    ProfileArea --> MyTickets[Vé đã mua\n/profile/tickets]
    ProfileArea --> Favorites[Đài yêu thích\n/profile/favorites]
    ProfileArea --> Notifications[Thông báo\n/profile/notifications]
    ProfileArea --> Settings[Bảo mật & Cài đặt\n/profile/settings]

    %% ── ORDER DETAIL FLOW ──
    ProfileOrders --> OrderDetail[Chi tiết đơn hàng\n/profile/orders/:id]
    OrderDetail --> |Đủ điều kiện hoàn tiền| RefundModal[Modal Yêu cầu\nhoàn tiền]
    RefundModal --> |Gửi yêu cầu| RefundList

    %% ── REFUND DETAIL FLOW ──
    RefundList --> RefundDetail[Chi tiết hoàn tiền\n/profile/refunds/:id]
    RefundDetail --> RefundStatus{Trạng thái\nhoàn tiền}
    RefundStatus -->|APPROVED / TRANSFERRED| RefundDone([Hoàn tiền thành công])
    RefundStatus -->|REJECTED| RefundReject([Yêu cầu bị từ chối])
    RefundStatus -->|PENDING| RefundWait([Đang chờ duyệt])

    %% ── COMPLAINT FLOW ──
    ComplaintList --> ComplaintDetail[Chi tiết khiếu nại\n/profile/complaints/:id]
    ComplaintDetail --> ComplaintChat[Timeline hội thoại\nkhiếu nại]

    %% ── BANK ACCOUNT FLOW ──
    BankAccounts --> AddBank[Thêm tài khoản\nngân hàng]
    BankAccounts --> EditBank[Sửa tài khoản\nngân hàng]

    %% ── SECURITY FLOW ──
    Settings --> ChangePassword[Đổi mật khẩu]

    %% ── END STATES ──
    RefundDone --> ProfileArea
    RefundReject --> ProfileArea
    RefundWait --> ProfileArea
    CheckoutSuccess --> HomePage
```

---

**Màu ghi chú theo luồng:**

| Luồng | Screens |
|-------|---------|
| Xác thực | Login · Register · Forgot Password · Verify OTP · Profile Setup |
| Mua vé | Buy Ticket → Cart → Checkout → PayOS → Checkout Result |
| Hồ sơ | Overview · Info · Tickets · Favorites · Notifications · Settings |
| Đơn hàng | Orders → Order Detail → Refund Modal |
| Hoàn tiền | Refunds → Refund Detail → Status |
| Khiếu nại | Complaints → Complaint Detail → Timeline Chat |
| Ngân hàng | Bank Accounts → Add/Edit |
| Nội dung | Blog List → Blog Detail · Lottery Schedule |
