# Luồng 4 — Nhập kho vé

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

**Enums liên quan**

| Enum | Giá trị |
|------|---------|
| `LotteryStationStatus` | DRAFT · PENDING_APPROVAL · ACTIVE · INACTIVE |
| `LotteryTicketStatus` | IN_STOCK · SOLD_OUT · EXPIRED · RESERVED · SOLD · PROXY_HOLDING · PENDING_RETURN · RETURNED · INTERNAL_FAULT · ISSUER_FAULT |
| `LotteryTicketSerialStatus` | IN_STOCK · RESERVED · SOLD · PROXY_HOLDING · PENDING_RETURN · RETURNED · EXPIRED · INTERNAL_FAULT · ISSUER_FAULT |
| `LotteryStationType` | MIEN_BAC · MIEN_TRUNG · MIEN_NAM |
