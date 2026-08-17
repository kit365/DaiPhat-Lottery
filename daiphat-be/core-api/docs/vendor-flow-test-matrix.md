# Vendor flow test matrix

| Rule | Phase | Expected behavior | Test | Status |
|---|---:|---|---|---|
| VEN-001 | 1 | Default vendor unit price is 9,000 VND | `VendorSettingsContractTest#defaults_match_business_contract` | GREEN |
| VEN-002 | 1 | Deposit equals vendor batch value multiplied by configured rate | `VendorDepositCalculatorTest#calculates_ten_percent_of_vendor_value` | GREEN |
| VEN-003 | 1 | Invalid prices and deposit rates are rejected | `VendorDepositCalculatorTest#rejects_invalid_inputs` | GREEN |
| VEN-004 | 1 | Settlement derives sold quantity and on-time cash breakdown | `VendorSettlementCalculatorTest#settles_eighty_sold_twenty_returned` | GREEN |
| VEN-005 | 1 | Late FORFEIT_DEPOSIT keeps deposit and still pays commission on sold units | `VendorSettlementCalculatorTest#late_forfeit_deposit` | GREEN |
| VEN-006 | 1 | FORCE_PURCHASE_ALL charges every allocated unit and applies deposit | `VendorSettlementCalculatorTest#late_force_purchase_all` | GREEN |
| VEN-007 | 1 | Daily cap is contract cap multiplied by confidence tier and reduced by confirmed quantity | `VendorDailyCapCalculatorTest#calculates_remaining_daily_cap` | GREEN |
| VEN-008 | 1 | Expired/incomplete contract and legacy deposit block allocation | `StreetAgentProfileVendorEligibilityTest` | GREEN |
| VEN-101 | 2 | Draft reservation expires after configured TTL (default 15 minutes) | `VendorDraftReservationTest` | GREEN |
| VEN-102 | 2 | Proposal preserves counter reserve and balances stations | `VendorAllocationPlannerTest` | GREEN |
| VEN-103 | 2 | Active serial allocation is unique at database level | Flyway partial unique index + locked serial query | GREEN |
| VEN-104 | 2 | Lucky pattern evaluates exact and positioned digit matches | `LuckyPatternMatcherTest` | GREEN |
| VEN-105 | 2 | Cap/open-batch/locked-serial checks block unsafe draft creation | `VendorAllocationServiceTest` | GREEN |
| VEN-106 | 2 | Batch model owns draft → handover and draft release lifecycle | `VendorAllocationBatchModelTest` | GREEN |
| VEN-107 | 2 | Confirm rejects vendor unit price above ticket face value | `VendorAllocationBatchModelTest#rejects_confirm_when_vendor_unit_price_exceeds_face_value` | GREEN |
| VEN-109 | 2 | Suggestion groups by station→ticketNumber, plans with cap/reserve, excludes lucky | `VendorAllocationSuggestionBuilderTest` + `VendorAllocationServiceTest#suggestion_groups_inventory_and_applies_daily_cap_plan` | GREEN |
| VEN-201 | 3 | Confirm rejects a deposit below the required amount, but retains the actual received amount when it is sufficient | `VendorAllocationBatchModelTest#rejects_confirm_when_actual_deposit_is_below_required_amount`, `VendorAllocationServiceTest#confirm_records_actual_deposit_and_updates_profile_balance_once` | GREEN |
| VEN-202 | 3 | Confirm snapshots unit price, deposit rate, late policy and return cutoff; later setting changes cannot affect this batch | `VendorAllocationBatchModelTest#owns_draft_handover_and_release_lifecycle` | GREEN |
| VEN-203 | 3 | Profile deposit balance is changed exactly once in the confirm transaction and uses a pessimistic profile lock | `VendorAllocationServiceTest#confirm_records_actual_deposit_and_updates_profile_balance_once` + `StreetAgentProfileRepository#findByIdForUpdate` | GREEN |
| VEN-204 | 3 | Only handed-over serials of the return-open batch can be scanned; a returned serial goes back to `IN_STOCK` | `VendorAllocationBatchModelTest#returns_serial_then_settles_with_actual_deposit_refund`, `VendorAllocationServiceTest#return_session_and_scan_returned_serial_to_stock` | GREEN |
| VEN-205 | 3 | On-time settlement refunds the actual deposit received; it can settle only once from `RETURN_OPEN` | `VendorAllocationBatchModelTest#returns_serial_then_settles_with_actual_deposit_refund` | GREEN |
| VEN-206 | 3 | Late settlement uses the policy snapshot: forfeit keeps the deposit; force-purchase charges all allocated units and offsets the actual deposit | `VendorSettlementCalculatorTest#late_forfeit_deposit`, `VendorSettlementCalculatorTest#late_force_purchase_all` | GREEN |
| VEN-207 | 3 | Returned vendor serials remain `IN_STOCK` with `returnBatchLineId = null`, therefore the existing supplier-return query can pick them up | `VendorAllocationServiceTest#return_session_and_scan_returned_serial_to_stock` + `LotteryTicketSerialRepository` return-candidate query | GREEN |
| VEN-208 | 3 | Controller forwards cọc/serial/operator correctly and mutations require edit authority | `VendorAllocationControllerTest` | GREEN |
| VEN-209 | 3 | Batch response exposes snapshot/balance/serial allocation state needed by FE without recomputing money | `VendorAllocationServiceTest` | GREEN |
| VEN-210 | 3 | Daily cap continues to consume SETTLED/LATE_SETTLED quantities; only CANCELLED/EXPIRED free capacity | `AllocationBatchStatus#isCapConsuming` + `VendorAllocationService` CAP_CONSUMING list (no dedicated assertion yet) | YELLOW |
| VEN-211 | 3 | Draft create locks profile and maps open-batch unique index violations to `VENDOR_ALLOCATION_OPEN_BATCH_EXISTS` | `VendorAllocationService#createDraft` + `uq_allocation_batch_one_open_per_profile` (no dedicated IT yet) | YELLOW |
| VEN-212 | 3 | Confirmation quote recomputes live settings; confirm recomputes again in transaction; rejects expired/past-draw drafts | `GET /confirmation-quote` + `VendorDepositCalculator` (quote↔confirm parity test still pending) | YELLOW |
| VEN-301 | 4 | Vendor daily report cash = sold × faceValue (not grossCashRemitted / forced purchase) | `VendorDailySalesCashCalculatorTest` + projection adapters | GREEN |
| VEN-302 | 4 | Confidence uses configurable weights/window/thresholds from Settings; experience caps tier; caps monotonic | `VendorConfidenceCalculatorTest`, `VendorConfidencePolicyValidatorTest` | GREEN |
| VEN-303 | 4 | Settlement projection is 1:1 with allocation batch and idempotent on retry | `uq_agent_settlements_batch` + `VendorSettlementProjectionService` | YELLOW |
| VEN-304 | 4 | PostgreSQL/Testcontainers persistence + concurrency suite | `VendorAllocationSchemaFlywayIT` (set `RUN_TESTCONTAINERS=true`); full concurrency still manual | YELLOW |
| VEN-305 | 4 | FE uses server confirmation quote / settlement projections; CREATE/EDIT gating | `ConfirmVendorDepositDialog`, `VendorAllocationPage`, batch drawer sections | GREEN |
| VEN-306 | 4 | Profile confidence + daily sales report UI/API wiring; batchId deep-link opens drawer | `StreetAgentDetailPage` + `/confidence` + `/daily-sales-reports` | GREEN |
| VEN-307 | 4 | Browser E2E happy path (draft → confirm → return → settle) | Manual / not automated in CI | PENDING |
| VEN-308 | 4 | Finalize yesterday reports only when no open batch on that report date | `existsOpenBatch(agentId, businessDate)` + `deletedAt IS NULL` | YELLOW |
| VEN-309 | 4 | Bulk confidence policy update validates group then recalculates all profiles | `PUT /vendor-confidence-policy` + `VendorConfidenceService#recalculateAllProfiles` | YELLOW |
