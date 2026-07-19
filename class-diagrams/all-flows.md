# Class Diagrams — DaiPhat Lottery Platform (All Flows)

> 7 luồng nghiệp vụ lõi · Mỗi block `mermaid` là 1 luồng độc lập · Chèn từng block vào draw.io riêng lẻ

---

## Luồng 1 — Đặt hàng & Thanh toán Online

> **Actors:** Customer, System, PayOS  
> **Mô tả:** Khách chọn vé trên app/web → tạo đơn hàng → thanh toán qua PayOS → hệ thống xác nhận và giao vé.

```mermaid
classDiagram
direction TB

class User {
    +UUID id
    +String username
    +String email
    +String phone
    +UserStatus status
    +placeOrder()
    +cancelOrder()
}

class Order {
    +UUID id
    +String orderCode
    +OrderType orderType
    +OrderReceiveType receiveType
    +Decimal totalAmount
    +OrderStatus status
    +DateTime cancelledAt
    +String cancelReason
    +markPaid()
    +markPreparing()
    +markPendingPickup()
    +complete()
    +cancel()
    +isFullyPaid()
}

class OrderDetail {
    +Long id
    +Decimal price
    +OrderDetailStatus status
}

class Transaction {
    +Long id
    +Decimal amount
    +TransactionType type
    +PaymentGateway gateway
    +Long gatewayOrderCode
    +String paymentRef
    +TransactionStatus status
    +DateTime paidAt
    +DateTime cancelledAt
    +String failureReason
    +markPayOsSuccess()
    +markCancelled()
    +releaseGatewayAttempt()
}

class LotteryTicketSerial {
    +Long id
    +String serialNumber
    +LotteryTicketSerialStatus status
    +Boolean verified
    +reserve()
    +releaseReservation()
    +sellOnline()
    +expire()
}

User "1" --> "0..*" Order : places
Order "1" *-- "1..*" OrderDetail : contains
Order "1" *-- "1..*" Transaction : has
OrderDetail "*" --> "1" LotteryTicketSerial : references
```

---

## Luồng 2 — Mua vé tại quầy (Offline)

> **Actors:** Customer, Operator (Staff)  
> **Mô tả:** Khách đến quầy → nhân viên tạo đơn trực tiếp → thu tiền mặt hoặc chuyển khoản → xác nhận QR → giao vé tại chỗ.

```mermaid
classDiagram
direction TB

class User {
    +UUID id
    +String username
    +String email
    +String phone
    +UserStatus status
    +Role role
}

class Order {
    +UUID id
    +String orderCode
    +OrderType orderType
    +OrderReceiveType receiveType
    +Decimal totalAmount
    +OrderStatus status
    +DateTime expectedPickupAt
    +DateTime actualPickedUpAt
    +markPaid()
    +markPreparing()
    +markPendingPickup()
    +complete()
    +cancel()
    +isFullyPaid()
}

class OrderDetail {
    +Long id
    +Decimal price
    +OrderDetailStatus status
}

class Transaction {
    +Long id
    +Decimal amount
    +TransactionType type
    +PaymentGateway gateway
    +TransactionStatus status
    +DateTime paidAt
    +String failureReason
    +collectCash()
    +markCancelled()
    +markRefunded()
}

class LotteryTicketSerial {
    +Long id
    +String serialNumber
    +LotteryTicketSerialStatus status
    +Boolean verified
    +DateTime verifiedAt
    +reserve()
    +sellOffline()
    +expire()
}

User "1" --> "0..*" Order : places
User "1" --> "0..*" Transaction : collects
Order "1" *-- "1..*" OrderDetail : contains
Order "1" *-- "1..*" Transaction : has
OrderDetail "*" --> "1" LotteryTicketSerial : references
```

---

## Luồng 4 — Nhập kho vé

> **Actors:** Operator, System  
> **Mô tả:** Nhân viên nhập serial vé (scan hoặc thủ công) → hệ thống kiểm tra trùng lặp, ngày mở thưởng, vé hỏng → cập nhật tồn kho.

```mermaid
classDiagram
direction TB

class LotteryRegion {
    +Long id
    +String code
    +String name
    +LotteryStationType type
    +Integer minNumber
    +Integer maxNumber
}

class LotteryStation {
    +Long id
    +String name
    +String province
    +Decimal price
    +Integer inventoryCount
    +List~DayOfWeek~ drawDays
    +LocalTime drawTime
    +Date nextDrawDate
    +LotteryStationStatus status
    +recalculateInventory()
    +create()
    +read()
    +update()
    +delete()
}

class LotteryTicket {
    +Long id
    +String numbers
    +Date drawDate
    +String batchCode
    +Integer quantity
    +Decimal priceSnapshot
    +LotteryTicketStatus status
    +create()
    +read()
    +update()
    +delete()
    +syncAggregateState()
    +resolveAggregateStatus()
}

class LotteryTicketSerial {
    +Long id
    +String serialNumber
    +LotteryTicketSerialStatus status
    +DateTime importedAt
    +Boolean verified
    +DateTime verifiedAt
    +String damagedReason
    +String damagedEvidenceUrl
    +initializeImport()
    +reserve()
    +releaseReservation()
    +sellOnline()
    +sellOffline()
    +expire()
}

class User {
    +UUID id
    +String username
    +String phone
    +Role role
    +importTickets()
    +markDamaged()
}

LotteryStation "*" --> "1" LotteryRegion : belongs to
LotteryStation "1" o-- "0..*" LotteryTicket : holds
LotteryTicket "1" *-- "1..*" LotteryTicketSerial : consists of
LotteryTicketSerial "*" --> "1" User : importedBy
```

---

## Luồng 5 — Yêu cầu & Xử lý Hoàn tiền

> **Actors:** Customer, Operator/Admin  
> **Mô tả:** Khách hoặc nhân viên tạo yêu cầu hoàn tiền → Admin/Operator duyệt hoặc từ chối → hệ thống chuyển khoản về tài khoản ngân hàng của khách.

```mermaid
classDiagram
direction TB

class User {
    +UUID id
    +String username
    +String email
    +String phone
    +UserStatus status
    +requestRefund()
    +reviewRefund()
}

class Order {
    +UUID id
    +String orderCode
    +OrderType orderType
    +Decimal totalAmount
    +OrderStatus status
    +cancel()
}

class OrderDetail {
    +Long id
    +Decimal price
    +OrderDetailStatus status
}

class RefundRequest {
    +Long id
    +RefundType refundType
    +Decimal refundAmount
    +String refundReason
    +RefundRequestRole requestRole
    +RefundRequestStatus status
    +String rejectReason
    +DateTime reviewedAt
    +String transferEvidenceUrl
    +DateTime transferredAt
    +create()
    +approve()
    +reject()
    +transfer()
    +cancel()
}

class OrderRefund {
    +Long id
    +Decimal refundAmount
    +String refundReason
    +String bankAccountNo
    +String bankAccountName
    +String bankName
    +OrderRefundStatus status
    +DateTime refundAt
}

class UserBankAccount {
    +Long id
    +String bankName
    +String bankLogo
    +String bankBin
    +String bankAccountNo
    +String bankAccountName
    +Boolean isDefault
    +create()
    +update()
    +delete()
}

User "1" --> "0..*" UserBankAccount : owns
User "1" --> "0..*" RefundRequest : requests
User "1" --> "0..*" RefundRequest : reviews
Order "1" --> "0..*" RefundRequest : triggers
RefundRequest "*" --> "1" Order : for
RefundRequest "*" --> "1" UserBankAccount : paid to
Order "1" *-- "1..*" OrderDetail : contains
OrderDetail "1" *-- "0..*" OrderRefund : has
```

---

## Luồng 6 — Bán vé qua Street Agent

> **Actors:** Vendor/StreetAgent, Operator, System  
> **Mô tả:** Đại lý bán dạo nhận vé từ hệ thống → bán trực tiếp cho khách ngoài thực địa → đối soát doanh số và hoa hồng.

```mermaid
classDiagram
direction TB

class User {
    +UUID id
    +String username
    +String email
    +String phone
    +UserStatus status
    +Role role
    +activate()
    +ban()
    +lockAccount()
}

class Role {
    +UUID id
    +String code
    +String name
    +Set~Permission~ permissions
}

class StreetAgentProfile {
    +Long id
    +String firstName
    +String lastName
    +String phone
    +String cccd
    +String imageUrl
    +String contactAddress
    +String contactProvince
    +String coverageArea
    +Decimal commissionRate
    +Decimal depositBalance
    +String depositAdjustmentReason
    +Date contractStartDate
    +Date contractEndDate
    +StreetAgentProfileStatus status
    +create()
    +read()
    +update()
    +delete()
    +adjustDeposit()
    +activate()
    +deactivate()
}

class LotteryTicketSerial {
    +Long id
    +String serialNumber
    +LotteryTicketSerialStatus status
    +Boolean verified
    +reserve()
    +sellOffline()
    +expire()
}

class LotteryTicket {
    +Long id
    +String numbers
    +Date drawDate
    +Integer quantity
    +LotteryTicketStatus status
    +syncAggregateState()
}

class LotteryStation {
    +Long id
    +String name
    +String province
    +Decimal price
    +Integer inventoryCount
    +LotteryStationStatus status
    +recalculateInventory()
}

User "*" --> "1" Role : has
User "1" --> "0..1" StreetAgentProfile : linked to
LotteryTicketSerial "*" --> "1" User : assignedTo
LotteryTicket "1" *-- "1..*" LotteryTicketSerial : consists of
LotteryStation "1" o-- "0..*" LotteryTicket : holds
```

---

## Luồng 7 — Đối soát & Trả thưởng (Prize Payout)

> **Actors:** Customer, Operator/Admin, System  
> **Mô tả:** Sau khi kết quả xổ số công bố → hệ thống đối chiếu serial vé với kết quả → xác định giải thắng → Admin duyệt trả thưởng → chuyển khoản về tài khoản khách.

```mermaid
classDiagram
direction TB

class LotteryRegion {
    +Long id
    +String code
    +String name
    +LotteryStationType type
    +Integer minNumber
    +Integer maxNumber
}

class LotteryStation {
    +Long id
    +String name
    +String province
    +Decimal price
    +List~DayOfWeek~ drawDays
    +LocalTime drawTime
    +LotteryStationStatus status
    +read()
}

class PrizeStructure {
    +Long id
    +String prizeCode
    +String prizeDisplayName
    +PrizeLevel prizeLevel
    +Decimal prizeValue
    +Integer quantity
    +Integer matchDigits
    +MatchFrom matchFrom
    +Integer displayOrder
    +Boolean isActive
    +validate()
    +matchesTicket()
    +create()
    +update()
}

class LotteryResult {
    +Long id
    +Date drawDate
    +String source
    +LotteryResultStatus status
    +Boolean isOfficial
    +DateTime lastSyncedAt
    +DateTime publishedAt
    +syncResult()
    +ensureResultForBoard()
    +read()
}

class LotteryResultDetail {
    +Long id
    +String winningNumber
    +PrizeLevel prizeLevel
    +String prizeCode
    +String prizeDisplayName
    +Integer displayOrder
}

class OrderDetail {
    +Long id
    +Decimal price
    +OrderDetailStatus status
}

class LotteryTicketSerial {
    +Long id
    +String serialNumber
    +LotteryTicketSerialStatus status
    +Boolean verified
    +matchAgainstResult()
}

LotteryStation "*" --> "1" LotteryRegion : belongs to
LotteryStation "1" --> "0..*" LotteryResult : records
LotteryResult "1" *-- "1..*" LotteryResultDetail : contains
LotteryResultDetail "*" --> "1" PrizeStructure : uses
PrizeStructure "*" --> "1" LotteryRegion : defined for
OrderDetail "*" --> "1" LotteryTicketSerial : references
LotteryTicketSerial "*" --> "0..1" LotteryResultDetail : matched by
```

---

## Luồng 8 — Đồng bộ kết quả xổ số (Auto Sync)

> **Actors:** System (Scheduler)  
> **Mô tả:** Scheduler tự động polling kết quả từ nguồn bên ngoài → lưu vào `LotteryResult` + `LotteryResultDetail` → retry khi nguồn lỗi.

```mermaid
classDiagram
direction TB

class LotteryResultSyncScheduler {
    +Integer backlogBatchSize
    +Integer drawDeadlineMinutes
    +Integer livePollSeconds
    +bootstrapLivePolling()
    +syncHistoricalBacklog()
    +refreshLivePollingTask()
    +performLivePollingCycle()
    +startLivePolling()
    +stopLivePolling()
}

class LotteryStation {
    +Long id
    +String name
    +String province
    +List~DayOfWeek~ drawDays
    +LocalTime drawTime
    +Date nextDrawDate
    +LotteryStationStatus status
    +read()
}

class LotteryRegion {
    +Long id
    +String code
    +String name
    +LotteryStationType type
}

class LotteryResult {
    +Long id
    +Date drawDate
    +String source
    +LotteryResultStatus status
    +Boolean isOfficial
    +DateTime lastSyncedAt
    +DateTime publishedAt
    +syncResult()
    +ensureResultForBoard()
    +read()
    +create()
    +update()
}

class LotteryResultDetail {
    +Long id
    +String winningNumber
    +PrizeLevel prizeLevel
    +String prizeCode
    +String prizeDisplayName
    +Integer displayOrder
    +create()
    +update()
}

class PrizeStructure {
    +Long id
    +String prizeCode
    +PrizeLevel prizeLevel
    +Decimal prizeValue
    +Integer matchDigits
    +MatchFrom matchFrom
    +Boolean isActive
    +matchesTicket()
}

LotteryResultSyncScheduler ..> LotteryStation : observes
LotteryResultSyncScheduler ..> LotteryResult : syncs
LotteryStation "*" --> "1" LotteryRegion : belongs to
LotteryStation "1" --> "0..*" LotteryResult : records
LotteryResult "1" *-- "1..*" LotteryResultDetail : contains
LotteryResultDetail "*" --> "1" PrizeStructure : uses
```

---

## Enums tham chiếu

| Enum | Giá trị |
|------|---------|
| `UserStatus` | ACTIVE · PENDING · LOCKED · BANNED · DELETED |
| `OrderType` | ONLINE · DIRECT |
| `OrderReceiveType` | PICKUP · DELIVERY |
| `OrderStatus` | PENDING_PAYMENT · PAID · PREPARING · PENDING_PICKUP · COMPLETED · CANCELLED |
| `OrderDetailStatus` | ACTIVE · INACTIVE · REFUND_PENDING · REFUNDED |
| `TransactionType` | ONLINE · OFFLINE |
| `TransactionStatus` | PENDING · COMPLETED · FAILED · CANCELLED · REFUNDED |
| `PaymentGateway` | PAYOS |
| `OrderRefundStatus` | PENDING · APPROVED · REJECTED |
| `LotteryStationStatus` | DRAFT · PENDING_APPROVAL · ACTIVE · INACTIVE |
| `LotteryStationType` | MIEN_BAC · MIEN_TRUNG · MIEN_NAM |
| `LotteryTicketStatus` | IN_STOCK · SOLD_OUT · EXPIRED · RESERVED · SOLD · PROXY_HOLDING · PENDING_RETURN · RETURNED · INTERNAL_FAULT · ISSUER_FAULT |
| `LotteryTicketSerialStatus` | IN_STOCK · RESERVED · SOLD · PROXY_HOLDING · PENDING_RETURN · RETURNED · EXPIRED · INTERNAL_FAULT · ISSUER_FAULT |
| `RefundType` | FULL_ORDER · ORDER_DETAIL |
| `RefundRequestStatus` | PENDING · APPROVED · REJECTED · TRANSFERRED · CANCELLED |
| `RefundRequestRole` | CUSTOMER · STAFF · ADMIN |
| `StreetAgentProfileStatus` | ACTIVE · INACTIVE |
| `LotteryResultStatus` | PENDING · DRAWING · PARTIAL · WAITING_FOR_AUDIT · COMPLETED · FAILED |
| `PrizeLevel` | SPECIAL · FIRST · SECOND · THIRD · FOURTH · FIFTH · SIXTH · SEVENTH · EIGHTH · SUB_SPECIAL · CONSOLATION |
| `MatchFrom` | LAST · EXACT · ANY · SPECIAL_CONSOLATION_1 · SPECIAL_CONSOLATION_2 |
