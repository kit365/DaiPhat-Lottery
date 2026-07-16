# Luồng 2 — Mua vé tại quầy (Offline)

> **Actors:** Customer, Operator (Staff)  
> **Mô tả:** Khách đến quầy → nhân viên tạo đơn hàng trực tiếp → thu tiền mặt hoặc chuyển khoản → xác nhận QR → giao vé tại chỗ.

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

**Enums liên quan**

| Enum | Giá trị |
|------|---------|
| `OrderType` | **DIRECT** (luồng offline) · ONLINE |
| `OrderReceiveType` | PICKUP · DELIVERY |
| `OrderStatus` | PENDING_PAYMENT · PAID · PREPARING · PENDING_PICKUP · COMPLETED · CANCELLED |
| `TransactionType` | **OFFLINE** (luồng offline) · ONLINE |
| `TransactionStatus` | PENDING · COMPLETED · FAILED · CANCELLED · REFUNDED |
| `LotteryTicketSerialStatus` | IN_STOCK · RESERVED · SOLD · EXPIRED · ... |
