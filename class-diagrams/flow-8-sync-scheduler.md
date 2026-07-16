# Luồng 8 — Đồng bộ kết quả xổ số (Auto Sync)

> **Actors:** System (Scheduler)  
> **Mô tả:** Scheduler tự động polling kết quả xổ số từ nguồn bên ngoài → lưu vào `LotteryResult` + `LotteryResultDetail` → retry khi nguồn lỗi.

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

**Enums liên quan**

| Enum | Giá trị |
|------|---------|
| `LotteryResultStatus` | PENDING · DRAWING · PARTIAL · WAITING_FOR_AUDIT · COMPLETED · FAILED |
| `LotteryStationStatus` | DRAFT · PENDING_APPROVAL · ACTIVE · INACTIVE |
| `PrizeLevel` | SPECIAL · FIRST · SECOND · THIRD · FOURTH · FIFTH · SIXTH · SEVENTH · EIGHTH · SUB_SPECIAL · CONSOLATION |
| `MatchFrom` | LAST · EXACT · ANY · SPECIAL_CONSOLATION_1 · SPECIAL_CONSOLATION_2 |
