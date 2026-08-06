# Vendor Phase 3 — FE handoff

BE is the source of truth for the lifecycle and financial calculations. FE must never recalculate commission, deposit or late-policy amounts from current system settings.

## API contract

### Confirm handover

`POST /api/v1/vendor-allocations/{id}/confirm`

```json
{ "depositReceivedAmount": 90000 }
```

The submit dialog must show `depositRequiredAmount` from the draft context, but submit the actual cash received. BE rejects an amount below the required deposit. An amount above it is permitted and is held as received.

### Return workflow

```text
POST /{id}/return-session
POST /{id}/returns       { "serialIds": [101, 102] }
GET  /{id}/settlement-preview
POST /{id}/settle
```

Only invoke return-session from `CONFIRMED`. Only send serials whose `allocationStatus` is `HANDED_OVER`. After a successful scan, refetch the batch: returned serials are `RETURNED` / `IN_STOCK` and must be disabled in the UI.

## Types to add

`VendorAllocationBatch` must include:

- `returnCutoffSnapshot`, `depositRequiredAmount`, `depositReceivedAmount`
- `depositBalanceBefore`, `depositBalanceAfter`, `depositReceivedAt`, `settledAt`
- `returnedQuantity`, `soldQuantity`
- `grossCashRemitted`, `commissionPayable`, `depositRefundAmount`, `depositForfeitedAmount`, `forcedPurchaseAmount`, `additionalAmountDue`
- `details[]` with station/date allocated-returned-sold counts
- `serials[]` with `allocationStatus`, `ticketStatus`, `returnedAt`

Create `VendorSettlementPreview` from the preview response. It contains the authoritative `late` flag and `latePolicySnapshot`.

## UI behavior

### Draft / confirm

- DRAFT remains editable and cancellable until its reservation TTL expires.
- Confirm opens a money dialog with required deposit, actual received amount and resulting held balance. Do not keep the old one-click confirm action.
- A confirmed/open batch blocks creating another batch for the vendor.

### Return and settlement

- Add actions by status in the batch list: `CONFIRMED` → “Mở nhận vé trả”; `RETURN_OPEN` → “Quét vé trả”, “Xem quyết toán”, “Quyết toán”; terminal batches → read-only detail.
- A scanner/manual multi-serial input should collect IDs then call the return endpoint. Show per-serial result by refetching; do not optimistically mark stock as returned.
- Preview and settlement show separate figures: vendor cash remitted, commission, deposit refund/forfeit, forced-purchase amount and additional amount due.
- Show a late warning solely from `preview.late`; display its policy snapshot. Disable settle while preview is loading or the batch is not `RETURN_OPEN`.

## Query invalidation

After return-session, returns or settle: invalidate batch detail, batch list, open batch, vendor profile and allocation suggestion.

After **confirm**: invalidate batch detail/list/open/profile only — **do not** refetch suggestions (held deposit while the batch is open is expected; open-batch gate blocks a new draft).

## Acceptance smoke test

1. Draft a valid batch and confirm with the required deposit.
2. Open a return session, return a subset of serials, then inspect preview.
3. Settle before cutoff and verify refund / terminal `SETTLED` UI.
4. Repeat after cutoff for `FORFEIT_DEPOSIT` and verify `LATE_SETTLED` + no refund.
5. Set policy to `FORCE_PURCHASE_ALL`, confirm another batch, settle late and verify forced purchase / additional due.
6. Try returning an external or previously returned serial and show the BE error without changing UI state.
