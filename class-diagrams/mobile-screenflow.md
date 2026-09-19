# Danh Sách Toàn Bộ Màn Hình Mobile — DaiPhat Lottery Platform
*(Mobile Application Screen Catalog & UI Structure)*

> Danh sách tổng hợp đầy đủ toàn bộ màn hình ứng dụng di động **DaiPhat Mobile** (Flutter), được phân chia theo luồng nghiệp vụ rõ ràng, có tiêu đề song ngữ Anh - Việt, tiện sao chép và đưa vào tài liệu.

---

### I. Nhóm Xác thực tài khoản / Authentication Flow
1. **Màn hình Đăng nhập** / *Login Screen* (`LoginView` — `/login`)
   * Đăng nhập bằng Số điện thoại / Email & Mật khẩu.
   * Đăng nhập nhanh 1 chạm bằng Google Sign-In.
   * Chế độ xem trước với tư cách Khách (Guest mode).
   * Điều hướng sang Đăng ký & Quên mật khẩu.

2. **Màn hình Đăng ký** / *Registration Screen* (`RegisterView` — `/register`)
   * Form tạo tài khoản mới: Họ tên, Số điện thoại, Email, Mật khẩu, Xác nhận mật khẩu.
   * Xác thực form thời gian thực & xác nhận điều khoản dịch vụ Đại Phát.

3. **Màn hình Quên mật khẩu** / *Forgot Password Screen* (`ForgotPasswordView` — `/forgot-password`)
   * Nhập SĐT/Email để nhận mã OTP qua SMS/Email.
   * Xác thực mã OTP và thiết lập mật khẩu mới.

---

### II. Nhóm Khung điều hướng & Khám phá chính / Main Shell & Discovery
4. **Khung giao diện chính** / *Main Layout & Bottom Navigation Shell* (`MainLayout` — 5 Tab Bottom Navigation Bar)
   * Quản lý chuyển đổi và duy trì trạng thái 5 tab: Mua vé, Dò vé, Trang chủ, Tiện ích, Tài khoản.

5. **Màn hình Trang chủ** / *Home Screen* (`HomeView` — `/` - Tab 3)
   * Header: Thông tin tài khoản, icon Giỏ hàng (kèm badge), icon Chuông thông báo.
   * Banner sự kiện / khuyến mãi "Săn Lộc Vàng".
   * Bảng kết quả xổ số kiến thiết 3 miền mới nhất (kèm chọn ngày quay).
   * Phím tắt tiện ích nhanh: Mua vé nhanh, Dò số, Gieo quẻ, Chatbot AI.
   * Danh sách bài viết & tin tức trao thưởng nổi bật.

6. **Màn hình Dò vé số / Tra cứu kết quả** / *Check Lottery Ticket / Results Lookup* (`CheckTicketView` — `/check-ticket` - Tab 2)
   * Bàn phím số / ô nhập số vé cần tra cứu.
   * Chọn đài phát hành và ngày mở thưởng (qua Bottom Sheet).
   * Hiển thị bảng đối soát chi tiết (Giải trúng, số tiền trúng, hướng dẫn nhận thưởng).

7. **Màn hình Lịch mở thưởng** / *Lottery Draw Schedule Screen* (`ScheduleView` — `/schedule`)
   * Lịch quay số mở thưởng các đài theo từng thứ trong tuần (Thứ 2 đến Chủ Nhật) cho 3 miền Bắc, Trung, Nam.

8. **Màn hình Tiện ích mở rộng** / *Utilities & Extended Services Screen* (`UtilitiesTwoView` — `/utilities-2` - Tab 4)
   * Hub tập trung các tiện ích: Gieo quẻ may mắn, Cẩm nang xổ số, Thống kê cầu số đẹp, Hướng dẫn nhận thưởng.

---

### III. Nhóm Mua vé, Giỏ hàng & Thanh toán / Buy Ticket, Cart & Checkout Flow
9. **Màn hình Chọn mua vé số** / *Buy Lottery Ticket Screen* (`BuyTicketView` — `/buy-ticket` - Tab 1)
   * Danh sách vé số có sẵn trong kho lưu trữ kèm ảnh scan phôi vé thực tế.
   * Bộ lọc tìm vé: Chọn đài, ngày mở thưởng, tìm theo 2 số cuối / 3 số cuối / dãy số may mắn.
   * Chọn vé vào giỏ, chọn số lượng vé, giữ chỗ tạm thời (TTL).
   * Thanh nổi tóm tắt giỏ hàng chuyển nhanh sang Cart.

10. **Màn hình Giỏ hàng** / *Shopping Cart Screen* (`CartView` — `/cart`)
    * Danh sách vé đã chọn: Dãy số, nhà đài, ngày xổ, số lượng, đơn giá, thành tiền.
    * Đếm ngược thời gian giữ chỗ vé (Countdown 10 phút).
    * Tăng/giảm số lượng, xoá vé, nút "Tiến hành thanh toán".

11. **Màn hình Xác nhận thanh toán** / *Checkout & Order Confirmation Screen* (`CheckoutView` — `/checkout`)
    * Tóm tắt đơn hàng (số lượng vé, tổng tiền).
    * Chọn hình thức nhận vé: **Giữ hộ vé** hoặc **Nhận tại quầy** (chọn ngày & giờ hẹn nhận vé).
    * Điền thông tin người nhận (Họ tên, SĐT).
    * Chọn phương thức thanh toán: Cổng PayOS quét mã QR VietQR.

12. **Màn hình Cổng thanh toán WebView** / *PayOS Payment Gateway WebView* (`PaymentWebView` — `/checkout/payment-webview`)
    * Nhúng trình duyệt WebView hiển thị cổng thanh toán PayOS (mã VietQR tự động khớp giao dịch).
    * Tự động bắt deep link `daiphat://payment` khi thanh toán hoàn tất.

13. **Màn hình Kết quả thanh toán** / *Payment & Checkout Result Screen* (`CheckoutResultView` — `/checkout/result`)
    * Hiển thị trạng thái giao dịch: Thành công, Đang xử lý, Huỷ bỏ hoặc Thất bại.
    * Thông tin mã đơn hàng, số tiền đã trả, nút điều hướng xem đơn hàng hoặc tiếp tục mua sắm.

---

### IV. Nhóm Quản lý Vé & Đơn hàng cá nhân / My Tickets & Order Management
14. **Màn hình Vé đã mua của tôi** / *My Purchased Tickets Screen* (`MyTicketsView` — `/profile/tickets`)
    * Tab phân loại vé: Chờ mở thưởng, Đã có kết quả (Trúng thưởng / Không trúng), Đã nhận thưởng.
    * Lọc theo kênh mua: Mua Online hoặc Mua tại quầy.
    * Card vé hiển thị dãy số, nhà đài, ngày xổ, ảnh thu nhỏ phôi vé scan.

15. **Màn hình Chi tiết vé số** / *Ticket Details & Scan Verification Screen* (`MyTicketDetailView` — `/profile/tickets/:id`)
    * Xem ảnh chụp phôi vé thật mặt trước / mặt sau độ phân giải cao.
    * Bảng đối soát chi tiết từng giải quay thưởng.
    * Nút "Yêu cầu đổi thưởng" (nếu vé trúng giải).

16. **Màn hình Đơn hàng của tôi** / *My Order History Screen* (`MyOrdersView` — `/profile/orders`)
    * Danh sách toàn bộ đơn hàng đã đặt theo thời gian.
    * Bộ lọc trạng thái: Tất cả, Chờ thanh toán, Đã thanh toán, Chờ nhận quầy, Đã hoàn tất, Đã huỷ.

17. **Màn hình Chi tiết đơn hàng** / *Order Details Screen* (`OrderDetailView` — `/profile/orders/:id`)
    * Thông tin đơn hàng: Mã đơn, ngày giờ đặt, trạng thái thanh toán, hình thức nhận vé, hẹn giờ nhận quầy.
    * Danh sách từng vé trong đơn kèm ảnh scan.
    * Hành động: Tiếp tục thanh toán PayOS hoặc Yêu cầu hoàn tiền (nếu đơn hợp lệ).

---

### V. Nhóm Đổi thưởng & Hoàn tiền / Prize Payouts & Refunds
18. **Màn hình Danh sách yêu cầu đổi thưởng** / *Prize Payout Requests Screen* (`PrizePayoutsView` — `/profile/prize-payouts`)
    * Danh sách các yêu cầu lĩnh thưởng vé trúng của người dùng.
    * Tiến độ xử lý: Chờ duyệt, Đã duyệt, Đã chuyển khoản, Bị từ chối.

19. **Màn hình Chi tiết đổi thưởng** / *Prize Payout Details Screen* (`PrizePayoutDetailView` — `/profile/prize-payouts/:id`)
    * Chi tiết giải thưởng, số tiền trúng, thuế thu nhập cá nhân (nếu có), số tiền thực nhận.
    * Thông tin tài khoản ngân hàng thụ hưởng & ảnh CCCD đã xác thực.
    * Timeline trạng thái ủy nhiệm chi chuyển tiền từ Đại Phát.

20. **Màn hình Danh sách yêu cầu hoàn tiền** / *Refund Requests Screen* (`RefundsView` — `/profile/refunds`)
    * Danh sách các yêu cầu hoàn tiền do sự cố đơn hàng hoặc hủy vé hợp lệ.
    * Trạng thái: Chờ duyệt, Đã duyệt, Đã chuyển khoản, Bị từ chối.

21. **Màn hình Chi tiết hoàn tiền** / *Refund Details Screen* (`RefundDetailView` — `/profile/refunds/:id`)
    * Mã yêu cầu, đơn hàng gốc, lý do hoàn tiền, số tiền hoàn, tài khoản nhận tiền và timeline duyệt.

---

### VI. Nhóm Hồ sơ cá nhân & Cài đặt / Profile & Account Settings
22. **Màn hình Tài khoản chính** / *Profile & Account Hub Screen* (`ProfileView` — `/profile` - Tab 5)
    * Header tài khoản: Avatar, Họ tên, SĐT, Email, Hạng thành viên/điểm thưởng.
    * Menu điều hướng đến tất cả các phân hệ quản lý cá nhân và nút Đăng xuất.

23. **Màn hình Tổng quan tài khoản** / *Account Stats & Overview Screen* (`ProfileOverviewView` — `/profile/overview`)
    * Dashboard thống kê: Tổng số vé đã mua, tổng tiền chi tiêu, tổng số lần trúng thưởng, tổng tiền thưởng đã nhận, biểu đồ may mắn.

24. **Màn hình Xem chi tiết hồ sơ** / *Profile Details Screen* (`ProfileDetailView` — `/profile/detail`)
    * Xem thông tin định danh: Họ tên, Số điện thoại, Email, Số CCCD, Địa chỉ, Ngày tham gia.

25. **Màn hình Chỉnh sửa hồ sơ** / *Edit Profile Screen* (`ProfileEditView` — `/profile/edit`)
    * Form cập nhật họ tên, email, ngày sinh, địa chỉ và thay đổi ảnh đại diện (avatar).

26. **Màn hình Bảo mật & Mật khẩu** / *Security & Password Screen* (`SecurityView` — `/profile/security`)
    * Đổi mật khẩu đăng nhập, bật xác thực 2 lớp (2FA), quản lý thiết bị đăng nhập.

27. **Màn hình Cài đặt thông báo** / *Push Notification Settings Screen* (`NotificationSettingsView` — `/profile/notification-settings`)
    * Bật/tắt thông báo đẩy FCM: Báo giờ khóa sổ mua vé, Báo kết quả đài yêu thích, Báo cập nhật đơn hàng và đổi thưởng.

---

### VII. Nhóm Tài khoản ngân hàng / Linked Bank Accounts (VietQR)
28. **Màn hình Danh sách tài khoản ngân hàng** / *Linked Bank Accounts Screen* (`BankAccountsView` — `/profile/bank-accounts`)
    * Danh sách các tài khoản ngân hàng thụ hưởng đã liên kết.
    * Huy hiệu `⭐ Mặc định`, thao tác đổi tài khoản chính nhận thưởng, xoá tài khoản.

29. **Màn hình Thêm / Sửa tài khoản ngân hàng** / *Add / Edit Bank Account Form* (`BankAccountFormPage`)
    * Form nhập số tài khoản, tên chủ tài khoản in hoa không dấu, nút chọn ngân hàng.

30. **Màn hình Tìm kiếm ngân hàng VietQR** / *VietQR Bank Search & Selection Screen* (`BankSearchScreen`)
    * Danh sách toàn bộ các ngân hàng Việt Nam (logo, tên viết tắt, tên đầy đủ, mã BIN).
    * Thanh tìm kiếm nhanh theo tên ngân hàng.

---

### VIII. Nhóm Khiếu nại & Hỗ trợ / Support & Customer Complaints
31. **Màn hình Danh sách khiếu nại** / *Support & Complaints List Screen* (`ComplaintsView` — `/profile/complaints`)
    * Danh sách các phiếu khiếu nại/hỗ trợ đã gửi.
    * Trạng thái: Mới tiếp nhận, Đang xử lý, Đã giải quyết, Đã đóng.

32. **Màn hình Tạo / Sửa khiếu nại** / *Create / Edit Complaint Form* (`ComplaintFormPage`)
    * Form chọn loại sự cố, nhập tiêu đề, mô tả, chọn mã đơn hàng/giao dịch liên quan và tải ảnh minh chứng.

33. **Màn hình Chi tiết khiếu nại & Chat CSKH** / *Complaint Details & Support Chat Screen* (`ComplaintDetailView` — `/profile/complaints/:id`)
    * Xem tiến trình xử lý và khung chat trao đổi trực tiếp 2 chiều với chuyên viên hỗ trợ.

---

### IX. Nhóm Tương tác, Giải trí & Nội dung / Interactive, Fortune & Content
34. **Màn hình Gieo quẻ may mắn** / *Fortune Cast / Daily Divination Screen* (`FortuneCastView` — `/fortune`)
    * Ống xăm quẻ may mắn: Tương tác lắc điện thoại hoặc chạm để gieo quẻ (rung + âm thanh).
    * Hiển thị thẻ quẻ: Lời thơ, giải nghĩa tài lộc, con số may mắn trong ngày.
    * Nút "Chọn số này mua vé" chuyển thẳng sang màn hình Mua vé.

35. **Màn hình Tin tức & Cẩm nang bài viết** / *Lottery Blog & News Screen* (`BlogScreen` — `/blog`)
    * Danh sách tin tức thị trường xổ số, cẩm nang chọn số, tin trao giải Jackpot, lọc theo danh mục.

36. **Màn hình Chi tiết bài viết** / *Blog Post Details Screen* (`BlogDetailScreen`)
    * Xem toàn bộ nội dung bài viết định dạng HTML, hình ảnh, tác giả, bài viết liên quan.

37. **Màn hình Tất cả bài viết** / *All Blog Posts Screen* (`_BlogAllScreen`)
    * Danh sách phân trang và tìm kiếm toàn bộ kho bài viết.

38. **Màn hình Trợ lý AI Chatbot** / *AI Assistant & Support Chatbot Screen* (`ChatScreen` — `/chat`)
    * Khung chat thời gian thực WebSocket STOMP với AI và tư vấn viên.
    * Gợi ý câu hỏi nhanh (Dò kết quả hôm nay, Hướng dẫn nạp tiền, Cách nhận thưởng...).

39. **Màn hình Trung tâm thông báo** / *Notification Center Screen* (`NotificationView` — `/notifications`)
    * Danh sách thông báo phân loại: Tất cả, Kết quả xổ số, Đơn hàng, Tin tức khuyến mãi.

---

### X. Nhóm Quản trị viên / Nhân viên nội bộ / Internal Admin Scanner
40. **Màn hình Quét vé bằng Mobile App cho Web Admin** / *Admin Ticket Scanner (Camera Live Stream)* (`AdminScanView` — `/admin/scan`)
    * Dành riêng cho Admin/Staff: Sử dụng camera điện thoại chụp quét ảnh vé số vật lý theo luồng real-time để truyền ảnh lên Web Admin nhận diện OCR và nhập kho.

---

### XI. Các Modal Bottom Sheet nghiệp vụ quan trọng / Core Action Bottom Sheets
* **S1. Modal Yêu cầu lĩnh thưởng & Chụp CCCD** / *Prize Payout Request & Citizen ID (CCCD) Upload Sheet* (`PrizePayoutRequestSheet`): Chọn tài khoản nhận tiền thưởng, mở camera/thư viện chụp ảnh CCCD 2 mặt để xác thực.
* **S2. Modal Yêu cầu hoàn tiền đơn hàng** / *Order Refund Request Sheet* (`RefundRequestSheet`): Chọn lý do hoàn tiền, chọn tài khoản ngân hàng thụ hưởng.
* **S3. Modal Chọn ngày giờ nhận vé tại quầy** / *Store Pickup Date & Time Picker Sheet* (`CheckoutDateTimePicker`): Lịch cuộn chọn ngày và khung giờ hẹn đến quầy lấy vé vật lý.
* **S4. Modal Bộ lọc tìm kiếm vé nâng cao** / *Advanced Ticket Search & Filter Sheet* (`TicketSearchFilterSheet`): Lọc theo Miền, Đài, Ngày quay, Đầu số / Đuôi số may mắn.
* **S5. Modal Chọn chứng từ tham chiếu khiếu nại** / *Complaint Reference Picker Sheet* (`ComplaintRefPickerSheet`): Chọn mã đơn hàng hoặc mã giao dịch gặp sự cố để gắn vào phiếu khiếu nại.
