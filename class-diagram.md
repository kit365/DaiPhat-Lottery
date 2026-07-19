# Class Diagram — DaiPhat Lottery Platform

> **7 luồng nghiệp vụ lõi** (bỏ luồng Giao hàng):
> 1. Đặt hàng & thanh toán online · 2. Mua vé tại quầy · 4. Nhập kho vé
> 5. Yêu cầu & xử lý hoàn tiền · 6. Bán vé qua street agent
> 7. Đối soát & trả thưởng · 8. Đồng bộ kết quả xổ số

```mermaid
classDiagram
direction TB

%% ═══════════════════════════════════════
%%  MODULE 1 — IDENTITY & RBAC
%% ═══════════════════════════════════════

class User {
    +UUID id
    +String username
    +String email
    +String phone
    +String imageUrl
    +UserStatus status
    +Role role
    +create()
    +read()
    +update()
    +delete()
    +ban()
    +activate()
    +lockAccount()
}

class Role {
    +UUID id
    +String code
    +String name
    +String description
    +Set~Permission~ permissions
    +create()
    +read()
    +update()
    +delete()
}

class Permission {
    +UUID id
    +String code
    +String module
    +String name
    +Integer position
}

%% ═══════════════════════════════════════
%%  MODULE 2 — ORDER & PAYMENT (Luồng 1 + 2)
%% ═══════════════════════════════════════

class Order {
    +UUID id
    +String orderCode
    +OrderType orderType
    +OrderReceiveType receiveType
    +Decimal totalAmount
    +OrderStatus status
    +DateTime cancelledAt
    +String cancelReason
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
    +Long gatewayOrderCode
    +String paymentRef
    +TransactionStatus status
    +DateTime paidAt
    +DateTime cancelledAt
    +String failureReason
    +markPayOsSuccess()
    +collectCash()
    +markCancelled()
    +markRefunded()
    +releaseGatewayAttempt()
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

%% ═══════════════════════════════════════
%%  MODULE 3 — LOTTERY WAREHOUSE (Luồng 4)
%% ═══════════════════════════════════════

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

%% ═══════════════════════════════════════
%%  MODULE 4 — REFUND (Luồng 5)
%% ═══════════════════════════════════════

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

%% ═══════════════════════════════════════
%%  MODULE 5 — STREET AGENT (Luồng 6)
%% ═══════════════════════════════════════

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
}

%% ═══════════════════════════════════════
%%  MODULE 6 — PRIZE & RESULT (Luồng 7 + 8)
%% ═══════════════════════════════════════

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

%% ═══════════════════════════════════════
%%  MODULE 7 — SCHEDULER (Luồng 8)
%% ═══════════════════════════════════════

class LotteryResultSyncScheduler {
    +Integer backlogBatchSize
    +Integer drawDeadlineMinutes
    +Integer livePollSeconds
    +bootstrapLivePolling()
    +refreshLivePollingTask()
    +syncHistoricalBacklog()
    +performLivePollingCycle()
    +startLivePolling()
    +stopLivePolling()
}

%% ═══════════════════════════════════════
%%  RELATIONSHIPS
%% ═══════════════════════════════════════

%% Identity
User "*" --> "1" Role : has
Role "1" *-- "0..*" Permission : grants

%% Order & Payment
User "1" --> "0..*" Order : places
Order "1" *-- "1..*" OrderDetail : contains
Order "1" *-- "0..*" Transaction : has
Order "1" --> "0..*" RefundRequest : triggers
OrderDetail "*" --> "1" LotteryTicketSerial : references
OrderDetail "1" *-- "0..*" OrderRefund : has
Transaction "*" --> "0..1" User : collectedBy
OrderRefund "*" --> "0..1" User : approvedBy

%% Lottery Warehouse
LotteryStation "*" --> "1" LotteryRegion : belongs to
LotteryStation "1" o-- "0..*" LotteryTicket : holds
LotteryTicket "1" *-- "1..*" LotteryTicketSerial : consists of
LotteryTicketSerial "*" --> "1" User : importedBy

%% Refund
RefundRequest "*" --> "1" Order : for
RefundRequest "*" --> "1" UserBankAccount : paid to
RefundRequest "*" --> "1" User : requestedBy
RefundRequest "*" --> "0..1" User : reviewedBy
User "1" --> "0..*" UserBankAccount : owns

%% Prize & Result
LotteryStation "1" --> "0..*" LotteryResult : records
LotteryResult "1" *-- "1..*" LotteryResultDetail : contains
LotteryResultDetail "*" --> "1" PrizeStructure : uses
PrizeStructure "*" --> "1" LotteryRegion : defined for

%% Scheduler
LotteryResultSyncScheduler ..> LotteryResult : syncs
LotteryResultSyncScheduler ..> LotteryStation : observes
```

---

## Enums tham chiếu

| Enum | Giá trị |
|------|---------|
| `UserStatus` | ACTIVE · PENDING · LOCKED · BANNED · DELETED |
| `OrderType` | ONLINE · DIRECT |
| `OrderStatus` | PENDING_PAYMENT · PAID · PREPARING · PENDING_PICKUP · COMPLETED · CANCELLED |
| `OrderDetailStatus` | ACTIVE · INACTIVE · REFUND_PENDING · REFUNDED |
| `TransactionType` | ONLINE · OFFLINE |
| `TransactionStatus` | PENDING · COMPLETED · FAILED · CANCELLED · REFUNDED |
| `PaymentGateway` | PAYOS |
| `OrderRefundStatus` | PENDING · APPROVED · REJECTED |
| `LotteryStationStatus` | DRAFT · PENDING_APPROVAL · ACTIVE · INACTIVE |
| `LotteryTicketStatus` | IN_STOCK · SOLD_OUT · EXPIRED · RESERVED · SOLD · PROXY_HOLDING · PENDING_RETURN · RETURNED · INTERNAL_FAULT · ISSUER_FAULT |
| `LotteryTicketSerialStatus` | IN_STOCK · RESERVED · SOLD · PROXY_HOLDING · PENDING_RETURN · RETURNED · EXPIRED · INTERNAL_FAULT · ISSUER_FAULT |
| `RefundType` | FULL_ORDER · ORDER_DETAIL |
| `RefundRequestStatus` | PENDING · APPROVED · REJECTED · TRANSFERRED · CANCELLED |
| `RefundRequestRole` | CUSTOMER · STAFF · ADMIN |
| `StreetAgentProfileStatus` | ACTIVE · INACTIVE |
| `LotteryResultStatus` | PENDING · DRAWING · PARTIAL · WAITING_FOR_AUDIT · COMPLETED · FAILED |
| `PrizeLevel` | SPECIAL · FIRST · SECOND · THIRD · FOURTH · FIFTH · SIXTH · SEVENTH · EIGHTH · SUB_SPECIAL · CONSOLATION |
| `MatchFrom` | LAST · EXACT · ANY · SPECIAL_CONSOLATION_1 · SPECIAL_CONSOLATION_2 |
