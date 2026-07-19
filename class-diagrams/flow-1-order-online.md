# Luồng 1 — Đặt hàng & Thanh toán Online

> **Actors:** Customer, System, PayOS  
> **Mô tả:** Khách hàng chọn vé trên app/web → tạo đơn hàng → thanh toán qua PayOS → hệ thống xác nhận và giao vé.

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

**Enums liên quan**

| Enum | Giá trị |
|------|---------|
| `OrderType` | ONLINE · DIRECT |
| `OrderStatus` | PENDING_PAYMENT · PAID · PREPARING · PENDING_PICKUP · COMPLETED · CANCELLED |
| `OrderDetailStatus` | ACTIVE · INACTIVE · REFUND_PENDING · REFUNDED |
| `TransactionType` | ONLINE · OFFLINE |
| `TransactionStatus` | PENDING · COMPLETED · FAILED · CANCELLED · REFUNDED |
| `PaymentGateway` | PAYOS |
| `LotteryTicketSerialStatus` | IN_STOCK · RESERVED · SOLD · EXPIRED · ... |
