# Vendor draw.io mapping — Phase 1

## Phase 1A — ERD checklist LOCKED

| # | Quyết định | Phase 1 LOCKED | Entity / SQL |
|---|---|---|---|
| 1 | `StreetAgentProfile.user_id` | **nullable + unique** (0..1). Target `NOT NULL` sau wire create-flow | `@OneToOne` + `unique`; cột nullable |
| 2 | Skeleton `agent_id` | **BIGINT → `street_agent_profiles.id`** (không trỏ `users`) | Settlement / deposit / report → `StreetAgentProfileEntity` |
| 3 | `AgentSettlement` value fields | **Một** field `returnedValue` / `returned_value` (không thêm `returnValue`) | Entity + SQL khớp |
| 4 | `DailySalesReportDetail.detailId` | **FK → `allocation_batch_details.id`** (Phase 4 chốt) | `@ManyToOne AllocationBatchDetailEntity`; unique `(report_id, detail_id)` |

Operator `collected_by` / `confirmed_by` = UUID → `users.id` (UUID thuần, chưa map `UserEntity`).

## Quyết định bảng

| Draw.io / Code | Hành động Phase 1 |
|---|---|
| `allocation_batch_serials` (không trên draw.io) | **Loại bỏ** |
| `Agent_Ticket_Stock` | **Thêm** `agent_ticket_stocks` + wire flow |
| `Agent_Settlement` / `Agent_Deposit_Transaction` / `Daily_Sales_Report*` | Skeleton entity + bảng, **chưa** service |
| `Street_Agent_Profile.user_id` | UNIQUE FK → `users`; Phase 1 nullable (0..1) |

## User ↔ Street_Agent_Profile

```
User (UUID) 1 ─── 0..1 Street_Agent_Profile (BIGINT)  [Phase 1 LOCKED]
Target: User 1 ─── 1 Profile (nullable = false) sau khi wire create-flow
Street_Agent_Profile.user_id → users.id
```

- `@OneToOne` + `@JoinColumn(unique = true)` — một user tối đa một profile
- `user_id` **nullable** cho tới khi backfill / wire create
- `UserEntity.streetAgentProfile` = `mappedBy = "user"` (navigation ngược)

## Agent_Ticket_Stock

### Field gốc draw.io
- `allocation_batch_detail_id` → `allocation_batch_details.id`
- `lottery_ticket_id` → `lottery_tickets.id`

### Field bổ sung (cập nhật ERD)
- `allocation_batch_id` → `allocation_batches.id` (denorm query only, không owner cascade)
- `lottery_ticket_serial_id` → `lottery_ticket_serials.id`
- `status`, `reserved_at`, `reserved_expires_at`, `returned_at`, `sold_at`
- `lucky_override`, `lucky_override_reason`, `lucky_override_by`, `lucky_override_at`

### Cascade
```
AllocationBatchEntity
└── details                    // cascade + orphanRemoval
    └── agentTicketStocks      // cascade + orphanRemoval ONLY here
```

### Invariant
`stock.lottery_ticket_id` phải = `lottery_ticket_serial.ticket.id` — validate bằng `DomainException`, không dùng `assert`.

### Lifecycle timestamps (domain)
| Status | Timestamps |
|---|---|
| DRAFT_RESERVED | reservedAt, reservedExpiresAt set |
| HANDED_OVER | reservedExpiresAt = null |
| RETURNED | returnedAt set |
| SOLD | soldAt set |

## Skeleton FK checklist (LOCKED)

| Bảng | Field | Quyết định Phase 1 |
|---|---|---|
| `agent_settlements` | `agent_id` | BIGINT FK → `street_agent_profiles.id` |
| `agent_settlements` | `returned_value` | Một field (không tạo `return_value` thứ hai) |
| `agent_settlements` | `report_id` | BIGINT FK → `daily_sales_reports.id` (nullable) |
| `agent_settlements` | `collected_by` | UUID FK → `users.id` (nullable) |
| `agent_settlements` | `allocation_batch_id` | BIGINT FK → `allocation_batches.id` |
| `agent_deposit_transactions` | `agent_id` | BIGINT FK → profile |
| `agent_deposit_transactions` | `allocation_id` | BIGINT FK → `allocation_batches.id` |
| `agent_deposit_transactions` | `collected_by` | UUID FK → users |
| `daily_sales_reports` | `agent_id` | BIGINT FK → profile |
| `daily_sales_reports` | `batch_id` | **Không thêm** |
| `daily_sales_reports` | `confirmed_by` | UUID FK → users (nullable) |
| `daily_sales_report_details` | `detail_id` | BIGINT nullable, **không FK** |

`status` / `payment_method` = VARCHAR. Java skeleton `status = "pending"` khớp SQL `DEFAULT 'pending'`.

## Điểm lệch draw.io (không tự sửa trong Phase 1)

- `Allocation_Batch_Detail`: note `productId` vs field `lotteryStationId`
- `Daily_Sales_Report`: note `batchId` vs box không có
- `Daily_Sales_Report_Detail`: note `productId` vs `detail_id`
- `Street_Agent_Profile`: note `depositBalance` vs box
- `Agent_Ticket_Stock` mô tả nghi dán nhầm `Allocation_Batch`
- Note settlement: `Ticket_Allocation` vs `Allocation_Batch`

## Flyway

Sửa trực tiếp `V202608041100__vendor_allocation_schema.sql` chỉ an toàn khi **chưa** apply shared (VPS/prod). Local: `DROP TABLE` tay các bảng vendor rồi chạy lại Flyway (không cần script).

`user_id` Phase 1: ADD COLUMN nullable + `ALTER … DROP NOT NULL` (tránh DO block `SET NOT NULL` khi bảng trống siết nhầm cột).
