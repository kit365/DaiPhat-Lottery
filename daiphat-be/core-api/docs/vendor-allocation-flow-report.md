# Báo cáo flow vendor: onboarding → bàn giao → nhận trả → quyết toán

Ngày kiểm tra: 2026-08-11 (Asia/Ho_Chi_Minh)

## 1. Phạm vi đã hoàn thiện

Flow hiện tại đi theo thứ tự:

1. Tạo tài khoản/hồ sơ người bán dạo.
2. Sinh hợp đồng dự thảo, in/xem PDF và tải bản đã ký.
3. Kiểm tra điều kiện nhận vé theo ngày kinh doanh.
4. Chọn mệnh giá (nếu kho có nhiều mệnh giá) và nhận gợi ý serial.
5. Tạo phiếu nháp, giữ serial theo TTL.
6. Báo giá cọc và xác nhận bàn giao.
7. Mở phiên nhận trả, kiểm nhận serial trả về.
8. Xem trước và quyết toán theo snapshot của batch.

Màn danh sách phiếu vendor đã dùng cùng kiểu DataGrid, filter, trạng thái và menu thao tác với danh sách phiếu trả nhà cung cấp; phần nghiệp vụ trả vendor vẫn tách bằng `returnBatchType=STREET_AGENT_RETURN`.

## 2. Thay đổi BE chính

- API suggestion/draft nhận và kiểm tra `faceValue`; một batch không thể trộn mệnh giá.
- Nếu có nhiều mệnh giá, API trả `availableFaceValues`; caller phải chọn một mệnh giá trước khi tạo draft.
- Nếu chỉ có một mệnh giá, BE tự chọn.
- Draft kiểm tra serial được chọn cùng mệnh giá, quota từng đài và trạng thái kho.
- Khi revalidate draft, quota được tính trên đúng mệnh giá của batch; tồn kho/serial được khóa theo thứ tự ổn định để giảm nguy cơ deadlock giữa hai nhân viên.
- Danh sách return batch mặc định chỉ là `SUPPLIER_RETURN`; vendor return phải truyền type riêng.
- Quyết toán bị chặn khi còn serial `RETURN_PENDING_INSPECTION`, số tiền không khớp preview hoặc batch đã quyết toán.
- Chỉ sau khi kiểm nhận, serial trả mới được đưa vào trạng thái trả vendor và tổng line/header được đồng bộ.

## 3. Các bảng và quan hệ cần kiểm tra

| Bảng | Vai trò |
|---|---|
| `street_agent_profiles` | Hồ sơ, hợp đồng, cap, confidence, tiền cọc đang giữ |
| `allocation_batches` | Phiếu giao theo vendor/ngày, snapshot tài chính và lifecycle |
| `allocation_batch_details` | Phân bổ theo đài/mệnh giá |
| `agent_ticket_stocks` | Serial vật lý thuộc batch, trạng thái giữ/giao/trả/bán |
| `lottery_ticket_serials` | Serial kho gốc và trạng thái tồn kho |
| `return_batches` | Phiếu trả; phân biệt `SUPPLIER_RETURN` và `STREET_AGENT_RETURN` |
| `return_batch_lines` | Dòng nhận trả theo đài |
| `agent_deposit_transactions` | Audit nhận/hoàn/giữ/cấn trừ tiền cọc |
| `agent_settlements` | Kết quả quyết toán vendor |
| `daily_sales_reports`, `daily_sales_report_details` | Nền tảng báo cáo; chưa phải phần ghi nhận chính của flow này |

Quan hệ quan trọng:

```text
allocation_batches
  └─ allocation_batch_details
       └─ agent_ticket_stocks ── lottery_ticket_serials ── lottery_tickets
allocation_batches ──(source_allocation_batch_id)── return_batches [STREET_AGENT_RETURN]
return_batches ── return_batch_lines ── agent_ticket_stocks.vendor_return_batch_line_id
```

## 4. SQL smoke test local

```sql
SELECT id, batch_code, street_agent_profile_id, business_date, status,
       allocated_quantity, returned_quantity, sold_quantity,
       deposit_required_amount, deposit_received_amount, settled_at
FROM allocation_batches
WHERE deleted_at IS NULL
ORDER BY id DESC;

SELECT id, return_batch_type, source_allocation_batch_id,
       lottery_supplier_id, status, draw_date, total_quantity
FROM return_batches
WHERE deleted_at IS NULL
ORDER BY id DESC;

SELECT allocation_batch_id, status, COUNT(*) AS quantity
FROM agent_ticket_stocks
GROUP BY allocation_batch_id, status
ORDER BY allocation_batch_id, status;

SELECT id, allocation_id, agent_id, required_amount, paid_amount,
       returned_amount, status
FROM agent_deposit_transactions
ORDER BY id DESC;

SELECT id, allocation_batch_id, returned_value, sold_value,
       commission_amount, deposit_amount, status
FROM agent_settlements
ORDER BY id DESC;
```

Observed local smoke data:

- Batch `VND-45D76F53`, id `1`, `RETURN_OPEN`, allocated `50`, deposit required/received `45,000`.
- Vendor return batch id `2`, type `STREET_AGENT_RETURN`, source allocation batch `1`, status `INSPECTING`.
- 50 stocks đang ở `RETURN_PENDING_INSPECTION`; vì chưa kiểm nhận nên header/line return quantity bằng 0 là đúng trạng thái tạm thời. Sau thao tác kiểm nhận, cần chạy lại query và phải thấy line/header tăng theo số serial accepted.
- Supplier return batch vẫn là type `SUPPLIER_RETURN`, không bị lẫn vào list vendor.

## 5. Test thủ công đề nghị

### Onboarding và hợp đồng

- Tạo vendor mới, kiểm tra profile/user liên kết và trạng thái ban đầu.
- Ngày kết thúc trước ngày bắt đầu: phải bị chặn ngay trên form và BE.
- Hợp đồng tương lai/hết hạn/thiếu bản ký: allocation bị chặn với lý do rõ ràng.
- In PDF, tải bản đã ký, reload trang và mở lại file.

### Suggestion và draft

- Kho chỉ có một mệnh giá: BE tự chọn, FE không bắt chọn lại.
- Kho có nhiều mệnh giá: chọn từng mệnh giá, kiểm tra không tạo được draft mixed denomination.
- Chọn serial khác trong cùng quota đài: thành công; vượt quota: bị chặn.
- Hai cửa sổ tạo draft đồng thời: không trùng serial, không phá reserve quầy.
- Draft hết TTL/cancel: serial được nhả và batch không còn xuất hiện ở nhóm đang mở.

### Confirm bàn giao

- Cọc thiếu, đủ, dư; setting thay đổi sau draft không làm thay đổi snapshot.
- Confirm lại batch đã confirm: bị từ chối.
- Refresh/reload sau confirm: trạng thái, số lượng và deposit balance khớp DB.

### Nhận trả và quyết toán

- Mở phiên trả từ batch `CONFIRMED`; serial ngoài batch/đã trả/đã bán phải bị từ chối.
- Kiểm nhận một phần: line/header chỉ tăng theo serial accepted; settlement vẫn bị khóa nếu còn pending.
- Kiểm nhận đủ: preview hoạt động, sold = allocated - returned.
- Trả đúng hạn: hoàn cọc đúng snapshot và commission đúng số bán.
- Trả trễ `FORFEIT_DEPOSIT`/`FORCE_PURCHASE_ALL`: số tiền preview và số tiền nhân viên xác nhận phải khớp tuyệt đối.
- Không double settle; serial trả về `IN_STOCK`, serial không trả chuyển `SOLD`.
- Supplier return list không hiển thị batch vendor; vendor list không hiển thị batch supplier.

### UI/responsive

- Danh sách batch: filter vendor/status/date, server-side search theo mã phiếu/đại lý, pagination, menu theo quyền và lifecycle.
- Chi tiết batch: thông tin tổng quan trước, nhóm serial theo số vé/đài; không render 100 serial phẳng cùng lúc.
- Nút preview/settle chỉ enabled khi đủ điều kiện kiểm nhận; lỗi có retry và không toast trùng.
- Breadcrumb Dashboard, danh sách vendor và danh sách batch phải điều hướng được.

## 6. Kiểm tra tự động đã chạy

- FE: `npx tsc --noEmit --incremental false --pretty false` — pass.
- FE: `npm run build` — pass; chỉ còn các warning accessibility/eslint có sẵn ở phần khác.
- BE: `mvnd -DskipTests compile` — pass.
- BE targeted: `mvnd -Dtest=VendorAllocationServiceTest,ReturnBatchServiceTest test` — 27 tests pass.

Claude chưa truy cập được vì tab yêu cầu đăng nhập; không gửi dữ liệu dự án vào đó. Grok đã được hỏi một lượt bounded review và các khuyến nghị về DataGrid/filter/action state đã được áp dụng.

## 7. Điểm cần theo dõi sau smoke test

Sau khi bấm “Kiểm nhận” trên batch vendor, chạy lại SQL kiểm tra `return_batch_lines.total_quantity` và `return_batches.total_quantity`. Nếu vẫn bằng 0 trong khi stock đã accepted, đó là lỗi đồng bộ aggregate cần sửa ở BE; không nên sửa bằng tay trong DB.
