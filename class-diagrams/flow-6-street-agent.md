# Luồng 6 — Bán vé qua Street Agent

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

**Enums liên quan**

| Enum | Giá trị |
|------|---------|
| `StreetAgentProfileStatus` | ACTIVE · INACTIVE |
| `UserStatus` | ACTIVE · PENDING · LOCKED · BANNED · DELETED |
| `LotteryTicketSerialStatus` | IN_STOCK · RESERVED · SOLD · PROXY_HOLDING · PENDING_RETURN · RETURNED · EXPIRED · INTERNAL_FAULT · ISSUER_FAULT |
