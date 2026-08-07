# Plan FE Responsive — Chỉnh từng trang

Mục tiêu: Đồng bộ spacing, padding, breadcrumb, font size, và responsive trên **tất cả trang client**, chỉnh **từng trang một**, không gộp.

---

## Vấn đề chung cần giải quyết

| Vấn đề | Mô tả |
|---|---|
| **Header chồng nội dung (mobile)** | Header fixed + Search bar sticky = ~148px. Nhiều trang chỉ dùng `mt-[70px]` hoặc `pt-[80px]` → nội dung bị che |
| **BottomNav chồng nội dung (mobile)** | BottomNav fixed 75px ở bottom. Nhiều trang thiếu `pb-[100px]` → nội dung bị cắt |
| **Padding không đồng bộ** | Mỗi trang dùng giá trị khác nhau: `pt-16`, `mt-[70px]`, `pt-[80px]`, `pt-24`... |
| **Thiếu Breadcrumb** | Một số trang có, một số không, style cũng không thống nhất |
| **Font size không đồng bộ** | Heading dùng lẫn lộn inline styles thay vì CSS class `.client-heading` |

---

## Quy chuẩn chung (áp dụng cho tất cả trang)

```
Mobile:  pt-[148px] pb-[100px]   ← Header(~80px) + SearchBar(~68px) | BottomNav(~75px) + safe
Desktop: pt-[100px] pb-12        ← Header(~80px) + spacing | Không có BottomNav
```

> [!IMPORTANT]
> Các trang auth (Login, Register, Forgot Password) **KHÔNG** cần chỉnh vì Header được ẩn bởi `ClientHeaderGuard` và không có BottomNav.

---

## Danh sách trang cần chỉnh (theo thứ tự ưu tiên)

### Phase 1: Trang chính (Người dùng thấy đầu tiên)

---

#### 1️⃣ Trang chủ — `HomePage.tsx`

**File**: `src/client/features/home/HomePage.tsx`

**Hiện trạng**: ✅ Đã sửa padding `pt-[148px] pb-[100px] lg:pt-24 lg:pb-8`

**Còn cần làm**:
- [x] Kiểm tra bảng kết quả XS (`ResultsMatrix`) trên mobile — đã thêm `overflow-x: auto` và `min-w-[650px]` để hiển thị kiểu Minh Ngọc
- [x] `MobileLotterySelector` — đã được đẩy xuống nhờ padding-top của main wrapper
- [x] `HomeSidebar` (banner "Săn Lộc Vàng") — không bị che nhờ `pb-[100px]`
- [x] `LeftSidebar` desktop — hiển thị tốt
- [x] Desktop padding: đã thống nhất thành `lg:pt-[100px] lg:pb-12`

---

#### 2️⃣ Trang mua vé — `BuyTicketPage.tsx`

**File**: `src/client/features/buy-ticket/BuyTicketPage.tsx`

**Hiện trạng**: ✅ Đã sửa padding + Breadcrumb

**Còn cần làm**:
- [ ] Card chọn ngày/đài (`Ngày Quay` / `Chọn đài`) — khi mở dropdown trên mobile, kiểm tra có bị che không
- [ ] Bảng danh sách vé (bottom) — trên mobile < 375px, các số vé có bị bể grid không
- [ ] Nút "Mua ngay" / "Thêm giỏ hàng" sticky bottom — conflict với BottomNav trên mobile?
- [ ] `BuyTicketBanners` sidebar — xem có responsive đúng trên tablet không

---

### Phase 2: Trang giao dịch (Cart/Checkout)

---

#### 3️⃣ Giỏ hàng — `CartPage.tsx`

**File**: `src/client/features/cart/CartPage.tsx`

**Hiện trạng**: ❌ Chưa sửa — dùng `mt-[70px] lg:mt-[80px]`, thiếu bottom padding

**Cần làm**:
- [ ] Đổi `mt-[70px] lg:mt-[80px]` → `pt-[148px] lg:pt-[100px]`
- [ ] Thêm `pb-[100px] lg:pb-12` (hoặc kiểm tra `pb-20` hiện tại)
- [ ] Kiểm tra nút "Tiến hành thanh toán" sticky — conflict với BottomNav
- [ ] Kiểm tra card vé khi số lượng nhiều trên mobile

---

#### 4️⃣ Thanh toán — `CheckoutPage.tsx`

**File**: `src/client/features/cart/CheckoutPage.tsx`

**Hiện trạng**: ❌ Chưa sửa — dùng `mt-[70px] lg:mt-[80px]`

**Cần làm**:
- [ ] Đổi `mt-[70px] lg:mt-[80px]` → `pt-[148px] lg:pt-[100px]`
- [ ] Thêm `pb-[100px] lg:pb-20`
- [ ] Form thanh toán (thông tin khách, phương thức) — kiểm tra layout 2 cột trên tablet
- [ ] Nút "Xác nhận thanh toán" — nên sticky bottom trên mobile, cần tránh BottomNav

---

#### 5️⃣ Kết quả thanh toán — `CheckoutResultPage.tsx`

**File**: `src/client/features/cart/CheckoutResultPage.tsx`

**Hiện trạng**: ❌ Chưa sửa — dùng `mt-[70px] lg:mt-[80px]`

**Cần làm**:
- [ ] Đổi `mt-[70px] lg:mt-[80px]` → `pt-[148px] lg:pt-[100px]`
- [ ] Thêm `pb-[100px] lg:pb-12`
- [ ] Card kết quả (✅/❌) — centered, kiểm tra trên mobile nhỏ

---

### Phase 3: Trang cá nhân (Profile)

---

#### 6️⃣ Profile Layout — `ProfilePage.tsx`

**File**: `src/client/features/profile/pages/ProfilePage.tsx`

**Hiện trạng**: ✅ Đã sửa padding + Breadcrumb

**Còn cần làm**:
- [ ] Loading state vẫn dùng `pt-[80px]` → cần sửa thành `pt-[148px] lg:pt-[100px]`
- [ ] Sidebar tab navigation — trên mobile hiện cuộn ngang, cần kiểm tra có bị BottomNav che không
- [ ] Avatar upload button — kiểm tra responsive

**Profile Tabs cần kiểm tra (17 tabs)**:

| Tab | File | Ưu tiên | Ghi chú |
|---|---|---|---|
| Tổng quan | `OverviewTab.tsx` | 🔴 Cao | Dashboard stats, charts |
| Vé của tôi | `TicketsTab.tsx` | 🔴 Cao | **65KB** — file lớn nhất, bảng vé phức tạp |
| Đơn hàng | `OrdersTab.tsx` | 🔴 Cao | Bảng đơn hàng, filter |
| Chi tiết đơn | `OrderDetailTab.tsx` | 🔴 Cao | **58KB** — nhiều sections |
| Tài khoản | `ProfileInfoTab.tsx` | 🟡 Trung bình | Form edit |
| Yêu cầu hoàn tiền | `RefundsTab.tsx` | 🟡 Trung bình | Bảng + filter |
| Chi tiết hoàn tiền | `RefundDetailTab.tsx` | 🟡 Trung bình | **34KB** — flow phức tạp |
| Trả thưởng | `PrizePayoutsTab.tsx` | 🟡 Trung bình | Bảng |
| Chi tiết trả thưởng | `PrizePayoutDetailTab.tsx` | 🟡 Trung bình | Timeline |
| Khiếu nại | `ComplaintsTab.tsx` | 🟢 Thấp | Bảng |
| Chi tiết khiếu nại | `ComplaintDetailTab.tsx` | 🟢 Thấp | Chat UI |
| Ngân hàng | `BankAccountsTab.tsx` | 🟢 Thấp | Card list |
| Số yêu thích | `FavoritesTab.tsx` | 🟢 Thấp | Grid |
| Thông báo | `NotificationsTab.tsx` | 🟢 Thấp | List |
| Nhận thông báo | `ResultNotificationSettingsTab.tsx` | 🟢 Thấp | Settings |
| Bảo mật | `SecurityTab.tsx` | 🟢 Thấp | Form |
| Điểm | `PointsTab.tsx` | 🟢 Thấp | Simple |

---

### Phase 4: Trang nội dung

---

#### 7️⃣ Danh sách bài viết — `BlogListPage.tsx`

**File**: `src/client/features/blog/components/BlogListPage.tsx`

**Hiện trạng**: ✅ Đã sửa padding + Breadcrumb

**Còn cần làm**:
- [ ] `BlogHeroSection` — hero image aspect ratio trên mobile
- [ ] `BlogSearchFilter` — input search + dropdown sort trên mobile
- [ ] `RightSidebarBlog` — trên mobile nằm dưới, kiểm tra spacing
- [ ] `BlogPostCard` — thumbnail + text layout trên mobile nhỏ

---

#### 8️⃣ Chi tiết bài viết — `BlogDetailPage.tsx`

**File**: `src/client/features/blog/components/BlogDetailPage.tsx`

**Hiện trạng**: ✅ Đã sửa padding

**Còn cần làm**:
- [ ] Hero image với Breadcrumb overlay — text có đọc được trên mobile không
- [ ] Nội dung bài viết (HTML content) — hình ảnh trong bài có `max-width: 100%` chưa
- [ ] Social share buttons — vị trí trên mobile

---

### Phase 5: Trang tiện ích

---

#### 9️⃣ Lịch mở thưởng — `SchedulePage.tsx`

**File**: `src/client/features/schedule/components/SchedulePage.tsx`

**Hiện trạng**: ❌ Chưa sửa — dùng `pt-16 lg:pt-24`

**Cần làm**:
- [ ] Đổi `pt-16 lg:pt-24 pb-12 lg:pb-20` → `pt-[148px] pb-[100px] lg:pt-[100px] lg:pb-20`
- [ ] Bảng lịch mở thưởng — cần `overflow-x: auto` cho bảng rộng trên mobile
- [ ] Kiểm tra tab selector (Miền Nam / Miền Trung / Miền Bắc) trên mobile

---

#### 🔟 Gieo quẻ — `FortuneCastPage.tsx`

**File**: `src/client/features/fortune/FortuneCastPage.tsx`

**Hiện trạng**: ❌ Chưa sửa — dùng `pt-16 lg:pt-24 pb-28 lg:pb-20`

**Cần làm**:
- [ ] Đổi `pt-16 lg:pt-24` → `pt-[148px] lg:pt-[100px]`
- [ ] `pb-28` mobile có thể giữ (đã đủ cho BottomNav), nhưng nên thống nhất `pb-[100px]`
- [ ] Card gieo quẻ — kiểm tra animation trên mobile
- [ ] Kết quả quẻ — text và hình ảnh có responsive không

---

#### 1️⃣1️⃣ Trang tĩnh (Giới thiệu, Liên hệ, Điều khoản...) — `StaticPageView.tsx`

**File**: `src/client/features/static-page/StaticPageView.tsx`

**Hiện trạng**: ✅ Đã sửa padding

**Còn cần làm**:
- [ ] HTML content từ CMS — kiểm tra hình ảnh, bảng có responsive không
- [ ] Breadcrumb đã có nhưng cần kiểm tra style thống nhất

---

### Phase 6: Hạ tầng chung

---

#### 1️⃣2️⃣ Header — `header.tsx`

**File**: `src/client/components/layout/header.tsx`

**Cần kiểm tra**:
- [ ] Desktop nav items — khi resize ~1024px, menu có bị tràn không
- [ ] Cart dropdown — trên mobile có accessible không
- [ ] Notification dropdown — scroll nội dài
- [ ] Profile dropdown — vị trí khi gần edge phải

---

#### 1️⃣3️⃣ BottomNav — `BottomNav.tsx`

**File**: `src/client/components/layout/BottomNav.tsx`

**Cần kiểm tra**:
- [ ] Safe area inset — iPhone X+ notch
- [ ] Active tab indicator animation
- [ ] "Vé của tôi" tab ẩn khi chưa login — layout shift?

---

#### 1️⃣4️⃣ Footer — `Footer.tsx`

**File**: `src/client/components/layout/Footer.tsx`

**Cần kiểm tra**:
- [ ] Footer có bị BottomNav che trên mobile không → cần `mb-[75px] lg:mb-0`
- [ ] Grid links 4 cột → mobile nên 2 cột hoặc 1 cột
- [ ] Thông tin liên hệ / social icons — touch target size
