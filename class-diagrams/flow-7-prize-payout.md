# Luồng 7 — Đối soát & Trả thưởng (Prize Payout)

> **Actors:** Customer, Operator/Admin, System  
> **Mô tả:** Sau khi kết quả xổ số được công bố → hệ thống đối chiếu serial vé với kết quả → xác định giải thắng → Admin duyệt trả thưởng → chuyển khoản về tài khoản khách.

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

**Enums liên quan**

| Enum | Giá trị |
|------|---------|
| `LotteryResultStatus` | PENDING · DRAWING · PARTIAL · WAITING_FOR_AUDIT · COMPLETED · FAILED |
| `PrizeLevel` | SPECIAL · FIRST · SECOND · THIRD · FOURTH · FIFTH · SIXTH · SEVENTH · EIGHTH · SUB_SPECIAL · CONSOLATION |
| `MatchFrom` | LAST · EXACT · ANY · SPECIAL_CONSOLATION_1 · SPECIAL_CONSOLATION_2 |
| `LotteryStationType` | MIEN_BAC · MIEN_TRUNG · MIEN_NAM |
