# Cơ chế chọn vé cho vendor

Tài liệu này mô tả cách hệ thống hiện tại chọn từng serial vé để giao cho vendor và giữ lại vé cho quầy.

Phạm vi tài liệu:

- Lọc serial đủ điều kiện.
- Đánh dấu số đẹp.
- Chừa vé cho quầy.
- Chia số lượng giữa các đài và các số vé.
- Cách FE gửi lựa chọn về BE.
- Cách BE lock serial khi tạo phiếu nháp.
- Các giới hạn cần lưu ý trước khi đưa vào production.

## 1. Các khái niệm

Một vé hiển thị trên FE có hai lớp dữ liệu:

| Lớp | Ý nghĩa |
|---|---|
| `lottery_tickets` | Số vé/nhóm vé, ví dụ `001234` |
| `lottery_ticket_serials` | Từng tờ vật lý cụ thể của số đó |

Vendor được giao theo `serialId`, không giao theo số vé tổng quát.

Ví dụ:

```text
Số vé 001234
├── Serial A001
├── Serial A002
└── Serial A003
```

Nếu vendor nhận 2 tờ của số `001234`, hệ thống phải giữ đúng hai serial cụ thể, không chỉ lưu số `001234`.

## 2. Lọc danh sách ứng viên

BE bắt đầu từ query `findVendorAllocationCandidates(businessDate)` trong:

`src/main/java/com/daiphat/coreapi/infrastructure/persistence/repository/lotteries/LotteryTicketSerialRepository.java`

Một serial chỉ được đưa vào danh sách ứng viên khi:

- `serial.deleted_at IS NULL`.
- `serial.status = IN_STOCK`.
- `serial.ticket_condition = GOOD`.
- `serial.return_batch_line_id IS NULL`.
- Ticket có `draw_date` đúng ngày kinh doanh.
- Ticket chưa bị xóa và `is_active = TRUE`.
- Station chưa bị xóa, `is_active = TRUE`, `status = ACTIVE`.

Kết quả được sắp xếp theo:

```text
station.name ASC
→ ticket.numbers ASC
→ serial.serial_number ASC
```

Thứ tự này rất quan trọng vì nó được dùng để xác định serial nào nằm trong nhóm giữ cho quầy.

## 3. Đánh dấu số đẹp

Số đẹp được precompute trên serial:

- `is_lucky = TRUE`
- `lucky_badges` chứa các badge tương ứng

Các pattern được đối chiếu bởi `LuckyPatternMatcher` với các loại:

- `EXACT`: khớp toàn bộ số.
- `DIGIT_MATCH + PREFIX`: khớp đầu số.
- `DIGIT_MATCH + SUFFIX`: khớp cuối số.
- `DIGIT_MATCH + ANYWHERE`: khớp ở bất kỳ vị trí nào.

Mặc định:

```text
is_lucky = TRUE → không đưa vào gợi ý vendor
```

Nếu nhân viên có quyền override số đẹp, FE phải gửi thêm lý do override. BE vẫn kiểm tra quyền và lý do, không tin dữ liệu FE gửi lên một cách mù quáng.

## 4. Chừa vé cho quầy

Setting:

```text
STREET_AGENT_COUNTER_RESERVE_PER_STATION = 10
```

BE đếm riêng các serial thường của từng station, sau đó đánh dấu các serial cuối cùng theo thứ tự query là vé giữ cho quầy.

Ví dụ station có 100 serial thường:

```text
Serial 001 → 090: vendor eligible
Serial 091 → 100: COUNTER_RESERVE
```

Số đẹp không được tính là vé vendor eligible và không thay thế cho 10 vé thường phải giữ.

Nếu station có:

```text
8 serial thường + 20 serial số đẹp
```

thì station đó vẫn không có đủ 10 vé thường cho quầy. Số đẹp không được dùng để bù vào quota 10 vé quầy.

Logic nằm trong `VendorAllocationSuggestionBuilder.annotate(...)`.

## 5. Tính sức chứa vendor theo từng station

Với mỗi station:

```text
vendorCapacity = normalSerialCount - counterReservePerStation
```

Ví dụ:

| Station | Vé thường | Giữ quầy | Vendor tối đa |
|---|---:|---:|---:|
| HCM | 100 | 10 | 90 |
| Đà Nẵng | 80 | 10 | 70 |
| Hà Nội | 40 | 10 | 30 |

Số đẹp không nằm trong `vendorCapacity`.

Sau đó BE còn trừ số lượng vendor đã giao trong cùng ngày để tính `remainingDailyCap`.

## 6. Chia số lượng giữa các đài

`VendorAllocationPlanner` chia theo round-robin giữa các station.

Ví dụ cần giao 8 vé cho 3 đài:

```text
Đài A: 1
Đài B: 1
Đài C: 1
Đài A: 1
Đài B: 1
Đài C: 1
Đài A: 1
Đài B: 1
```

Kết quả:

```text
A = 3, B = 3, C = 2
```

Nếu một đài đạt sức chứa, planner bỏ qua đài đó và tiếp tục chia cho các đài còn lại.

Ví dụ:

```text
A capacity = 2
B capacity = 10
C capacity = 10
```

thì sau khi A đủ 2, các lượt còn lại tiếp tục vào B và C.

## 7. Chia tiếp giữa các số vé trong một đài

Sau khi có số lượng cần lấy ở station, BE dùng `pickEvenlyAcrossTicketNumbers(...)`.

Ví dụ các số trong một đài:

```text
001001: A001, A002
001002: B001, B002
001003: C001, C002
```

Nếu cần 4 serial:

```text
A001, B001, C001, A002
```

Mục tiêu là tránh giao dồn toàn bộ serial của một số vé cho cùng một vendor.

## 8. Dữ liệu BE trả về cho FE

Mỗi nhóm số vé có:

- `availableCount`: tổng serial đang nhìn thấy.
- `selectableCount`: số serial vendor có thể chọn.
- `suggestedCount`: số lượng BE đề xuất.
- `vendorEligible`: nhóm có được chọn hay không.
- `blockedReason`: lý do bị chặn.
- `serials`: danh sách serial chi tiết.

Mỗi serial có:

- `serialId`.
- `serialNumber`.
- `lucky`.
- `luckyBadges`.
- `vendorEligible`.
- `blockedReason`.
- `suggested`.

Các lý do chặn hiện tại:

```text
LUCKY_PATTERN
COUNTER_RESERVE
```

## 9. Cách FE hiện tại chọn serial

FE nhận `suggestedCount` theo từng số vé và khởi tạo số lượng được chọn bằng giá trị đó.

Khi tính danh sách gửi lên BE, FE hiện tại:

1. Lọc serial `vendorEligible`.
2. Lấy các serial đầu tiên theo thứ tự danh sách.
3. Lấy đủ số lượng `selectedQty` của nhóm số vé.
4. Gửi `serialIds` vào API tạo draft.

API:

```http
POST /api/v1/vendor-allocations/drafts
```

Body:

```json
{
  "streetAgentProfileId": 7,
  "businessDate": "2026-08-06",
  "serialIds": [101, 205, 309],
  "luckyOverrideReason": null
}
```

## 10. Lock serial khi tạo draft

Gợi ý ban đầu chưa khóa database.

Khi tạo draft, BE:

1. Kiểm tra vendor có batch đang mở hay không.
2. Kiểm tra không vượt daily cap.
3. Lock pessimistic các serial được gửi lên.
4. Kiểm tra serial vẫn còn `IN_STOCK` và `GOOD`.
5. Kiểm tra đúng ngày kinh doanh.
6. Kiểm tra quyền override nếu có số đẹp.
7. Kiểm tra tổng số serial còn lại của station vẫn lớn hơn hoặc bằng reserve.
8. Tạo `allocation_batch` ở trạng thái `DRAFT`.
9. Đổi serial sang `RESERVED`.
10. Gắn `reserved_by_allocation_batch_id`.

Khi hai nhân viên cùng chọn một serial:

```text
Nhân viên A lock trước → tạo draft thành công
Nhân viên B lock sau → serial không còn hợp lệ → bị từ chối
```

Draft hết TTL hoặc bị hủy:

```text
RESERVED → IN_STOCK
```

Xác nhận bàn giao:

```text
RESERVED → WITH_STREET_AGENT
```

## 11. Điểm cần lưu ý trong phiên bản hiện tại

### 11.1. BE có đánh dấu serial suggested nhưng FE không dùng trực tiếp

BE trả về `serial.suggested = true`, nhưng FE hiện chỉ dùng `suggestedCount`, sau đó tự lấy các serial eligible đầu tiên.

Vì vậy:

- Số lượng tổng vẫn đúng.
- Các serial được FE chọn vẫn phải eligible trong UI.
- Nhưng serial thực tế có thể không trùng tuyệt đối với serial BE đã đánh dấu `suggested`.

### 11.2. Reserve hiện được kiểm tra theo tổng số lượng

BE kiểm tra:

```text
normalAvailable - selectedNormal >= reserve
```

BE chưa lưu riêng cờ `COUNTER_RESERVE` trên từng serial và chưa bắt buộc serial cụ thể phải nằm ngoài nhóm 10 serial cuối.

Do đó API hiện tại phù hợp với thao tác qua UI, nhưng chưa phải cơ chế khóa cứng chống client tự gửi một serial thuộc nhóm giữ quầy.

### 11.3. Gợi ý không phải là lock

Giữa lúc xem gợi ý và lúc bấm tạo draft, nhân viên khác vẫn có thể lấy mất serial. Đây là lý do BE phải lock lại ở bước tạo draft và không được tin danh sách FE đang giữ trong memory.

## 12. Cách kiểm tra khi test

### Kiểm tra số lượng giữ quầy

Với mỗi station:

```sql
SELECT
    s.id,
    s.name,
    COUNT(*) FILTER (
        WHERE lts.status = 'IN_STOCK'
          AND lts.ticket_condition = 'GOOD'
          AND lts.return_batch_line_id IS NULL
          AND lts.is_lucky = FALSE
    ) AS normal_count,
    COUNT(*) FILTER (
        WHERE lts.status = 'IN_STOCK'
          AND lts.ticket_condition = 'GOOD'
          AND lts.return_batch_line_id IS NULL
          AND lts.is_lucky = TRUE
    ) AS lucky_count,
    COUNT(*) FILTER (
        WHERE lts.status = 'IN_STOCK'
          AND lts.ticket_condition = 'GOOD'
          AND lts.return_batch_line_id IS NULL
          AND lts.is_lucky = FALSE
    ) AS sellable_count
FROM lottery_stations s
JOIN lottery_ticket_serials lts ON lts.station_id = s.id
WHERE s.deleted_at IS NULL
  AND s.is_active = TRUE
  AND s.status = 'ACTIVE'
  AND lts.deleted_at IS NULL
GROUP BY s.id, s.name
ORDER BY s.name;
```

### Kiểm tra serial sau khi tạo draft

```sql
SELECT
    lts.id,
    lts.serial_number,
    lts.status,
    lts.reserved_by_allocation_batch_id,
    abs.status AS allocation_status
FROM lottery_ticket_serials lts
JOIN agent_ticket_stocks abs
  ON abs.lottery_ticket_serial_id = lts.id
WHERE abs.allocation_batch_id = :batch_id
ORDER BY lts.station_id, lts.serial_number;
```

### Kiểm tra còn đủ vé quầy

```sql
SELECT
    station_id,
    COUNT(*) AS remaining_normal_serials
FROM lottery_ticket_serials
WHERE deleted_at IS NULL
  AND status = 'IN_STOCK'
  AND ticket_condition = 'GOOD'
  AND return_batch_line_id IS NULL
  AND is_lucky = FALSE
GROUP BY station_id
ORDER BY station_id;
```

Mỗi station phải còn tối thiểu bằng giá trị:

```text
STREET_AGENT_COUNTER_RESERVE_PER_STATION
```

## 13. Hướng nên nâng cấp nếu muốn BE quyết định tuyệt đối

Nếu nghiệp vụ yêu cầu “FE không được tự chọn lệch serial”, nên đổi API từ:

```json
{
  "serialIds": [101, 102, 103]
}
```

sang dạng yêu cầu số lượng:

```json
{
  "stationAllocations": [
    { "stationId": 1, "quantity": 50 },
    { "stationId": 2, "quantity": 50 }
  ]
}
```

BE sẽ tự:

1. Lọc số đẹp.
2. Chừa reserve cho quầy.
3. Chia đều theo số vé.
4. Lock serial.
5. Chọn serial cuối cùng.
6. Trả danh sách serial đã chọn cho FE.

Đây là hướng an toàn hơn cho production. Phiên bản hiện tại vẫn có thể dùng để test Phase 2/3 qua UI, nhưng không nên xem `suggested` là một cam kết cứng về serial nếu chưa thay đổi API.
