# Luồng 5 — Yêu cầu & Xử lý Hoàn tiền

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

**Enums liên quan**

| Enum | Giá trị |
|------|---------|
| `RefundType` | FULL_ORDER · ORDER_DETAIL |
| `RefundRequestStatus` | PENDING · APPROVED · REJECTED · TRANSFERRED · CANCELLED |
| `RefundRequestRole` | CUSTOMER · STAFF · ADMIN |
| `OrderRefundStatus` | PENDING · APPROVED · REJECTED |
| `OrderDetailStatus` | ACTIVE · INACTIVE · REFUND_PENDING · REFUNDED |
