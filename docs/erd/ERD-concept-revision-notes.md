# Conceptual ERD Revision Notes

Source: `DaiPhatLottery_ERD-concept final.drawio.xml`  
Output: [`DaiPhatLottery_ERD-concept-final.drawio`](./DaiPhatLottery_ERD-concept-final.drawio) (also copied to Downloads)

## P0 — Vendor stock & settlement

- Added **`Agent_Ticket_Stock`** between `Allocation_Batch_Detail` and `Lottery_Ticket_Serial`
- Removed direct Serial ↔ Allocation_Batch_Detail relationship
- Added `Allocation_Batch_Detail` → `Lottery_Station`
- Fixed `Allocation_Batch` → `Agent_Settlement` to **1:1**
- Renamed display label `Agent` → `Street_Agent_Profile (Agent)`

## P0 — Prize payout links

- Added `Prize_Payout_Installment`
- Linked `Prize_Payout_Request` → `Order_Detail`, `Lottery_Ticket_Serial`, `User_Bank_Account`, `Transaction`, installments
- Clarified Order ↔ Refund multiplicity and Order_Detail → Refund_Request
- Annotated `Transaction` as polymorphic cash ledger

## P0 — Prize claim (issuer reclaim)

- Added `Prize_Claim_Submission` + `Prize_Claim_Submission_Line`
- Linked claim lines → serial; claim → issuer `Lottery_Station`; optional line → payout
- Note explaining dual prize path (pay customer vs reclaim from issuer)

## P1 — User generalization

- Added `User` + `Role`
- ISA links: User → Customer / Operator / Street_Agent_Profile
- Rewired `Notification` to `User` (removed Customer→Notification and Notification→Agent)
- Fixed dangling edges into Support and Chat; User → Conversation

## P1 — Returns, contracts, patterns, adjustments

- Annotated Return_Batch XOR (STREET_AGENT_RETURN vs SUPPLIER_RETURN)
- Added `Contract`, `Lucky_Pattern_Config`, `Supplier_Settlement_Adjustment`

## P2 — Peripheral cleanup

- Renamed `Support_Request` → `Support_Ticket`
- Added `Support_Ticket_Comment`
- Replaced Blog_Post→Blog_Tag 1:N with **`Blog_Post_Tag`** associative entity
- Added bounded-context frame labels (Core / Content / Support / Actors)

## Intentionally omitted from conceptual model

- `agency_funds` (undefined agency/retailer concept)
- OCR / file-import technical tables (optional warehouse scope)
- Physical soft-reservation columns on serials (owned conceptually by Order_Detail / Agent_Ticket_Stock)
